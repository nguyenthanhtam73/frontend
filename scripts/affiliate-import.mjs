/**
 * Turn a weekly Shopee affiliate CSV into lib/affiliate/products.json.
 *
 *   npm run import:affiliate -- data/affiliate/w20261124.csv
 *
 * `batch` is the CSV sub_id2 value. Commit the CSV and the JSON together.
 * The product-page `url` is kept for the batch record and must never be
 * rendered as a link — shoppers only open `affLink`.
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DEFAULT_OUT = path.join(ROOT, "lib", "affiliate", "products.json");

const STEP_BY_GROUP = {
  "sữa rửa mặt": "cleanser",
  serum: "serum",
  "kem dưỡng": "moisturizer",
  "chống nắng": "sunscreen",
  "tẩy trang": "makeup_remover",
  "hỗ trợ": "support",
};

/** Longer notes first so "da mụn" is not read as the shorter "mụn" note. */
const FIT_NOTES = [
  { note: "lỗ chân lông/mụn", tags: ["pores", "acne"] },
  { note: "da khô/thường", tags: ["dry", "normal"] },
  { note: "cấp ẩm/dịu da", tags: ["hydration", "sensitive"] },
  { note: "da dầu", tags: ["oily"] },
  { note: "da mụn", tags: ["acne"] },
  { note: "thâm sạm", tags: ["dark_spots"] },
  { note: "phục hồi", tags: ["barrier"] },
  { note: "giá mềm", tags: ["budget"] },
  { note: "mụn", tags: ["acne"] },
];

const REQUIRED_COLUMNS = [
  "nhom",
  "ten",
  "gia_vnd",
  "gia_goc_vnd",
  "hoa_hong",
  "sao",
  "danh_gia",
  "da_ban",
  "shop",
  "url",
  "aff_link",
  "sub_id1",
  "sub_id2",
  "ban_chay",
];

function normalizeNote(value) {
  return value.normalize("NFC").trim().toLocaleLowerCase("vi");
}

/** Parenthetical at the end of `ten` → fit tags. No note → general item. */
export function parseFitNote(ten) {
  const raw = String(ten ?? "").normalize("NFC").trim();
  const match = raw.match(/^(.*)\s+\(([^)]+)\)\s*$/u);
  if (!match) {
    return { name: raw, fit: [] };
  }
  const note = normalizeNote(match[2]);
  const known = FIT_NOTES.find((entry) => entry.note === note);
  if (!known) {
    const allowed = FIT_NOTES.map((entry) => entry.note).join(", ");
    throw new Error(`Unknown fit note "(${match[2].trim()})" on "${raw}". Known notes: ${allowed}`);
  }
  return { name: match[1].trim(), fit: [...known.tags] };
}

export function parseGroupStep(nhom) {
  const key = normalizeNote(String(nhom ?? ""));
  const step = STEP_BY_GROUP[key];
  if (!step) {
    throw new Error(
      `Unknown nhom "${nhom}". Known groups: ${Object.keys(STEP_BY_GROUP).join(", ")}`,
    );
  }
  return step;
}

/** Empty gia_goc_vnd → null. Other amounts must be whole VND. */
export function parseOptionalPrice(raw) {
  const text = String(raw ?? "").trim();
  if (!text) return null;
  if (!/^\d+$/.test(text)) {
    throw new Error(`Invalid VND amount "${text}"`);
  }
  return Number(text);
}

export function parseRequiredPrice(raw, column) {
  const price = parseOptionalPrice(raw);
  if (price == null) {
    throw new Error(`Missing ${column}`);
  }
  return price;
}

export function parseRating(raw) {
  const text = String(raw ?? "").trim();
  if (!/^\d+(?:\.\d+)?$/.test(text)) {
    throw new Error(`Invalid sao "${text}"`);
  }
  return Number(text);
}

/** "31k" → 31000, "2tr+" → 2000000, "770" → 770. Used only to precompute a rank. */
export function parseSocialCount(raw) {
  const text = String(raw ?? "")
    .trim()
    .toLowerCase()
    .replace(/\+$/u, "")
    .replace(",", ".");
  if (!text) return 0;
  const match = text.match(/^(\d+(?:\.\d+)?)(tr|k)?$/u);
  if (!match) return 0;
  const value = Number(match[1]);
  if (match[2] === "tr") return Math.round(value * 1_000_000);
  if (match[2] === "k") return Math.round(value * 1_000);
  return Math.round(value);
}

/** Reviews dominate, then units sold. One integer so the client never sees the raw counts. */
export function popularityRank(reviewCount, sold) {
  return parseSocialCount(reviewCount) * 10_000_000 + parseSocialCount(sold);
}

/** Acids and peels. Weekly names that match this stay out of a calm or reactive routine. */
export function isAcidProduct(name) {
  return /aha|bha|pha|micro-peeling|peeling/iu.test(String(name ?? ""));
}

const AFF_LINK_RE = /^https:\/\/s\.shopee\.vn\/[A-Za-z0-9]+$/;
const PRODUCT_URL_PREFIX = "https://shopee.vn/product/";
/** Shoppers only see products that pay more than this. 8% itself is rejected. */
const MIN_COMMISSION_PERCENT = 8;

/**
 * "4,5%" / "7.5%" / "10%" → a percent number. Returns null when the cell is not a percent.
 */
export function parseCommissionPercent(raw) {
  const text = String(raw ?? "")
    .trim()
    .replace(/\s+/g, "")
    .replace("%", "")
    .replace(",", ".");
  if (!/^\d+(?:\.\d+)?$/.test(text)) return null;
  return Number(text);
}

/** Empty, 0, or false is unflagged. 1 or true is a bestseller exception. */
export function parseBanChay(raw) {
  const text = String(raw ?? "").trim().toLowerCase();
  if (!text || text === "0" || text === "false" || text === "no") return false;
  if (text === "1" || text === "true" || text === "yes") return true;
  return null;
}

const MAX_BAN_CHAY = 15;

function failRow(rowNumber, item, problems) {
  throw new Error(`Row ${rowNumber}: ${problems.join("; ")}\n${JSON.stringify(item)}`);
}

/** RFC-style CSV: commas, quotes, and "" escapes. */
export function parseCsv(text) {
  const src = String(text ?? "").replace(/^\uFEFF/, "");
  const rows = [];
  let row = [];
  let cell = "";
  let inQuotes = false;

  for (let i = 0; i < src.length; i += 1) {
    const ch = src[i];
    if (inQuotes) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          cell += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        cell += ch;
      }
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
      continue;
    }
    if (ch === ",") {
      row.push(cell);
      cell = "";
      continue;
    }
    if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && src[i + 1] === "\n") i += 1;
      row.push(cell);
      cell = "";
      if (row.some((value) => value.trim() !== "")) rows.push(row);
      row = [];
      continue;
    }
    cell += ch;
  }
  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    if (row.some((value) => value.trim() !== "")) rows.push(row);
  }
  return rows;
}

function requireCell(row, header, column) {
  const index = header.indexOf(column);
  if (index < 0) throw new Error(`Missing column ${column}`);
  return row[index] ?? "";
}

export function parseAffiliateCsv(text) {
  const rows = parseCsv(text);
  if (rows.length < 2) throw new Error("CSV has no product rows");
  const header = rows[0].map((column) => column.trim());
  for (const column of REQUIRED_COLUMNS) {
    if (!header.includes(column)) throw new Error(`Missing column ${column}`);
  }

  const items = [];
  let batch = "";
  const seenAff = new Set();
  const seenUrl = new Set();
  for (let i = 1; i < rows.length; i += 1) {
    const row = rows[i];
    const cell = (column) => requireCell(row, header, column).trim();
    const subId2 = cell("sub_id2");
    if (!subId2) throw new Error(`Row ${i + 1} is missing sub_id2`);
    if (!batch) batch = subId2;
    if (subId2 !== batch) {
      throw new Error(`Mixed sub_id2 values (${batch} and ${subId2}). One CSV is one batch.`);
    }
    const parsedName = parseFitNote(cell("ten"));
    const affLink = cell("aff_link");
    const url = cell("url");
    const subId1 = cell("sub_id1");
    const commissionRaw = cell("hoa_hong");
    const commissionPercent = parseCommissionPercent(commissionRaw);
    const banChay = parseBanChay(cell("ban_chay"));
    const item = {
      step: parseGroupStep(cell("nhom")),
      name: parsedName.name,
      fit: parsedName.fit,
      priceVnd: parseRequiredPrice(cell("gia_vnd"), "gia_vnd"),
      originalPriceVnd: parseOptionalPrice(cell("gia_goc_vnd")),
      commission: commissionRaw,
      rating: parseRating(cell("sao")),
      reviewCount: cell("danh_gia"),
      sold: cell("da_ban"),
      shop: cell("shop"),
      url,
      affLink,
      subId1,
      subId2,
      acid: isAcidProduct(parsedName.name),
      popularity: popularityRank(cell("danh_gia"), cell("da_ban")),
      banChay: banChay === true,
    };
    const problems = [];
    if (!AFF_LINK_RE.test(affLink)) {
      problems.push(`aff_link must match ^https://s\\.shopee\\.vn/[A-Za-z0-9]+$ (got ${affLink || "empty"})`);
    }
    if (!url.startsWith(PRODUCT_URL_PREFIX)) {
      problems.push(`url must start with ${PRODUCT_URL_PREFIX}`);
    }
    if (subId1 !== "dadiary") problems.push(`sub_id1 must be dadiary (got ${subId1 || "empty"})`);
    if (banChay == null) {
      problems.push(`ban_chay must be empty, 0, 1, true, or false (got ${cell("ban_chay") || "empty"})`);
    }
    if (commissionPercent == null) {
      problems.push(`hoa_hong must look like 8.5% or 4,5% (got ${commissionRaw || "empty"})`);
    } else if (commissionPercent <= MIN_COMMISSION_PERCENT && banChay !== true) {
      problems.push(`hoa_hong must be above 8% unless ban_chay is true (got ${commissionRaw})`);
    }
    if (seenAff.has(affLink)) problems.push(`duplicate aff_link ${affLink}`);
    if (seenUrl.has(url)) problems.push(`duplicate url ${url}`);
    if (problems.length > 0) failRow(i + 1, item, problems);
    seenAff.add(affLink);
    seenUrl.add(url);
    items.push(item);
  }

  const flagged = items.filter((item) => item.banChay).length;
  if (flagged > MAX_BAN_CHAY) {
    throw new Error(
      `Too many ban_chay rows: ${flagged}. At most ${MAX_BAN_CHAY} products may be flagged ban_chay.`,
    );
  }

  // A step with no rows (this batch: Tẩy trang) is omitted. The shop UI shows
  // nothing for that step — it does not render an empty card.
  return { batch, items };
}

/** Fields the browser is allowed to ship. Commission, product url, sub ids, and raw counts stay out. */
export function toPublicCatalog(catalog) {
  return {
    batch: catalog.batch,
    items: catalog.items.map((item) => ({
      step: item.step,
      name: item.name,
      fit: item.fit,
      priceVnd: item.priceVnd,
      originalPriceVnd: item.originalPriceVnd,
      rating: item.rating,
      sold: item.sold,
      shop: item.shop,
      affLink: item.affLink,
      acid: item.acid,
      popularity: item.popularity,
    })),
  };
}

export function formatAffiliateCatalog(catalog) {
  return `${JSON.stringify(toPublicCatalog(catalog), null, 2)}\n`;
}

function isDirectRun() {
  const entry = process.argv[1];
  if (!entry) return false;
  return path.resolve(entry) === fileURLToPath(import.meta.url);
}

if (isDirectRun()) {
  const csvPath = process.argv[2];
  if (!csvPath) {
    console.error("Usage: node scripts/affiliate-import.mjs <csv> [out.json]");
    process.exit(1);
  }
  const outPath = process.argv[3]
    ? path.resolve(process.argv[3])
    : DEFAULT_OUT;
  try {
    const catalog = parseAffiliateCsv(readFileSync(path.resolve(csvPath), "utf8"));
    mkdirSync(path.dirname(outPath), { recursive: true });
    writeFileSync(outPath, formatAffiliateCatalog(catalog));
    console.log(`Wrote ${catalog.items.length} items, batch ${catalog.batch}\n  ${outPath}`);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}
