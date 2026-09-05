#!/usr/bin/env node
/**
 * Simple labeled SVG diagrams for guide articles (not OG cards).
 * Run: node scripts/write-guide-svgs.mjs
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../public/guides");
const W = 800;
const H = 480;

function svg(inner) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img">
  <rect width="${W}" height="${H}" rx="28" fill="#E8F5F3"/>
  <rect x="18" y="18" width="${W - 36}" height="${H - 36}" rx="22" fill="#FFFFFF" opacity="0.55"/>
  ${inner}
</svg>
`;
}

function write(slug, name, inner) {
  const dir = resolve(ROOT, slug);
  mkdirSync(dir, { recursive: true });
  const file = resolve(dir, `${name}.svg`);
  writeFileSync(file, svg(inner), "utf8");
  console.log(file);
}

const t = (x, y, text, size = 22, fill = "#0F2E2C", weight = 700) =>
  `<text x="${x}" y="${y}" text-anchor="middle" font-family="ui-sans-serif, system-ui, sans-serif" font-size="${size}" font-weight="${weight}" fill="${fill}">${text}</text>`;

const card = (x, y, w, h, fill) =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="20" fill="${fill}"/>`;

// --- da-dau ---
write(
  "da-dau",
  "hero",
  `${card(80, 70, 280, 340, "#D8F0EE")}
  <ellipse cx="220" cy="220" rx="78" ry="96" fill="#F7D4C8"/>
  <path d="M220 140 C190 150 178 190 180 230 C182 280 200 318 220 330 C240 318 258 280 260 230 C262 190 250 150 220 140Z" fill="#F3B8A8" opacity="0.55"/>
  ${t(220, 390, "T-zone bóng", 20, "#2A8F88")}
  ${card(430, 70, 290, 340, "#F8E8EC")}
  <circle cx="575" cy="200" r="70" fill="#F4C7CE"/>
  <path d="M545 175 Q575 155 605 175 Q590 210 575 230 Q560 210 545 175Z" fill="#FFFFFF" opacity="0.7"/>
  ${t(575, 320, "Má bình thường", 20, "#C45C74")}
  ${t(400, 54, "Da dầu / da hỗn hợp", 24)}`,
);
write(
  "da-dau",
  "steps",
  `${t(400, 64, "3 bước nền mỗi ngày", 26)}
  ${card(50, 110, 220, 280, "#D8F0EE")}${t(160, 200, "1", 48, "#2A8F88")}${t(160, 260, "Rửa dịu", 22)}${t(160, 296, "Không sạch bóng", 16, "#2A5552", 500)}
  ${card(290, 110, 220, 280, "#E7F3EA")}${t(400, 200, "2", 48, "#3B7A5A")}${t(400, 260, "Gel mỏng", 22)}${t(400, 296, "Khi da hơi ẩm", 16, "#2A5552", 500)}
  ${card(530, 110, 220, 280, "#F8F0DC")}${t(640, 200, "3", 48, "#C48A2A")}${t(640, 260, "SPF sáng", 22)}${t(640, 296, "Hai ngón tay", 16, "#2A5552", 500)}`,
);
write(
  "da-dau",
  "do-avoid",
  `${t(400, 64, "Nên làm / nên tránh", 26)}
  ${card(50, 100, 330, 300, "#D8F0EE")}${t(215, 160, "Nên làm", 24, "#2A8F88")}
  ${t(215, 220, "Rửa dịu · dưỡng mỏng", 18, "#0F2E2C", 600)}
  ${t(215, 256, "SPF mỗi sáng", 18, "#0F2E2C", 600)}
  ${t(215, 292, "Patch-test chai mới", 18, "#0F2E2C", 600)}
  ${card(420, 100, 330, 300, "#F8E8EC")}${t(585, 160, "Nên tránh", 24, "#C45C74")}
  ${t(585, 220, "Chà hạt · muối", 18, "#0F2E2C", 600)}
  ${t(585, 256, "Bỏ dưỡng / bỏ SPF", 18, "#0F2E2C", 600)}
  ${t(585, 292, "Chồng nhiều acid", 18, "#0F2E2C", 600)}`,
);
write(
  "da-dau",
  "climate",
  `${t(400, 64, "Một ngày, ba khí hậu", 26)}
  ${card(40, 110, 230, 280, "#F8F0DC")}${t(155, 230, "☀", 42)}${t(155, 300, "Nắng xe máy", 20)}
  ${card(285, 110, 230, 280, "#D8E8F4")}${t(400, 230, "☂", 42)}${t(400, 300, "Mưa ẩm", 20)}
  ${card(530, 110, 230, 280, "#E7F0F5")}${t(645, 230, "❄", 42)}${t(645, 300, "Máy lạnh", 20)}`,
);

// --- mun ---
write(
  "mun",
  "hero",
  `${t(400, 70, "Tay xuống. Đừng nặn.", 28)}
  <circle cx="400" cy="230" r="92" fill="#F7D4C8"/>
  <circle cx="368" cy="215" r="8" fill="#0F2E2C"/>
  <circle cx="432" cy="215" r="8" fill="#0F2E2C"/>
  <path d="M368 268 Q400 286 432 268" fill="none" stroke="#0F2E2C" stroke-width="6" stroke-linecap="round"/>
  <path d="M250 180 L300 210" stroke="#C45C74" stroke-width="8" stroke-linecap="round"/>
  <path d="M250 210 L300 180" stroke="#C45C74" stroke-width="8" stroke-linecap="round"/>
  ${t(400, 380, "Gối sạch · lót mũ sạch · SPF sáng", 20, "#2A5552", 600)}`,
);
write(
  "mun",
  "one-active",
  `${t(400, 64, "Một hoạt chất, vài tuần", 26)}
  ${card(310, 110, 180, 260, "#D8F0EE")}
  <rect x="365" y="150" width="70" height="140" rx="20" fill="#2A8F88"/>
  ${t(400, 330, "Chọn 1", 22, "#2A8F88")}
  <rect x="80" y="180" width="50" height="100" rx="14" fill="#C5D5D4" opacity="0.7"/>
  <rect x="150" y="190" width="50" height="100" rx="14" fill="#C5D5D4" opacity="0.45"/>
  <rect x="600" y="180" width="50" height="100" rx="14" fill="#C5D5D4" opacity="0.7"/>
  <rect x="670" y="190" width="50" height="100" rx="14" fill="#C5D5D4" opacity="0.45"/>
  ${t(400, 430, "Patch-test 2–3 đêm rồi mới cả mặt", 18, "#2A5552", 600)}`,
);
write(
  "mun",
  "friction",
  `${t(400, 64, "Giảm ma sát", 26)}
  ${card(70, 110, 300, 280, "#E7F0F5")}
  <ellipse cx="220" cy="230" rx="90" ry="55" fill="#9DD7D4"/>
  ${t(220, 340, "Vỏ gối sạch", 20)}
  ${card(430, 110, 300, 280, "#F8E8EC")}
  <path d="M500 180 h160 v90 a40 40 0 0 1 -40 40 h-80 a40 40 0 0 1 -40 -40 z" fill="#C45C74"/>
  ${t(580, 340, "Lót mũ giặt được", 20)}`,
);
write(
  "mun",
  "doctor",
  `${t(400, 70, "Khi nào gặp bác sĩ", 26)}
  ${card(140, 120, 520, 260, "#F8E8EC")}
  <rect x="360" y="160" width="80" height="80" rx="16" fill="#C45C74"/>
  <rect x="390" y="172" width="20" height="56" rx="4" fill="#FFFFFF"/>
  <rect x="372" y="190" width="56" height="20" rx="4" fill="#FFFFFF"/>
  ${t(400, 290, "Đau · mủ · sưng lan · sẹo đang thành", 20)}
  ${t(400, 330, "Đừng tự tăng acid", 18, "#C45C74", 600)}`,
);

// --- kem-chong-nang ---
write(
  "kem-chong-nang",
  "amount",
  `${t(400, 64, "Lượng: hai ngón tay", 26)}
  ${card(90, 110, 280, 280, "#F8F0DC")}
  <rect x="190" y="160" width="80" height="160" rx="24" fill="#C48A2A"/>
  ${t(230, 360, "Tuýp không nhãn", 16, "#2A5552", 500)}
  ${card(430, 110, 280, 280, "#D8F0EE")}
  <path d="M500 300 h70 v-40 a16 16 0 0 1 16 -16 h10" fill="none" stroke="#2A8F88" stroke-width="18" stroke-linecap="round"/>
  <path d="M590 300 h70 v-40 a16 16 0 0 1 16 -16 h10" fill="none" stroke="#2A8F88" stroke-width="18" stroke-linecap="round"/>
  <ellipse cx="620" cy="200" rx="36" ry="14" fill="#F8F0DC" stroke="#C48A2A" stroke-width="4"/>
  ${t(570, 360, "≈ 1/4 thìa cà phê", 16, "#2A5552", 500)}`,
);
write(
  "kem-chong-nang",
  "zones",
  `${t(400, 58, "Thoa hết vùng", 26)}
  <ellipse cx="400" cy="250" rx="120" ry="150" fill="#F7D4C8"/>
  <ellipse cx="400" cy="175" rx="70" ry="28" fill="#F4C7CE" opacity="0.8"/>
  <ellipse cx="330" cy="250" rx="36" ry="40" fill="#F4C7CE" opacity="0.8"/>
  <ellipse cx="470" cy="250" rx="36" ry="40" fill="#F4C7CE" opacity="0.8"/>
  <ellipse cx="400" cy="250" rx="22" ry="30" fill="#F4C7CE" opacity="0.9"/>
  <ellipse cx="400" cy="330" rx="36" ry="22" fill="#F4C7CE" opacity="0.8"/>
  ${t(400, 430, "Trán · má · mũi · cằm · tai trước · cổ", 20, "#2A5552", 600)}`,
);
write(
  "kem-chong-nang",
  "textures",
  `${t(400, 64, "Đổi kết cấu, đừng bỏ SPF", 26)}
  ${card(80, 120, 280, 270, "#D8F0EE")}${t(220, 200, "Gel / fluid", 24, "#2A8F88")}${t(220, 250, "Mỏng, dễ giữ", 18, "#2A5552", 500)}
  ${card(440, 120, 280, 270, "#F8F0DC")}${t(580, 200, "Cream đặc", 24, "#C48A2A")}${t(580, 250, "Dễ bí ban ngày", 18, "#2A5552", 500)}`,
);
write(
  "kem-chong-nang",
  "where",
  `${t(400, 64, "Nắng thường ngày", 26)}
  ${card(60, 110, 320, 290, "#F8F0DC")}${t(220, 230, "▢", 48, "#C48A2A")}${t(220, 310, "Cửa sổ văn phòng", 20)}
  ${card(420, 110, 320, 290, "#D8F0EE")}${t(580, 230, "🛵", 48)}${t(580, 310, "Xe máy · cổ · tai", 20)}`,
);

// --- routine ---
write(
  "routine-cham-da",
  "ampm",
  `${t(400, 64, "Khung 3–4 bước", 26)}
  ${card(50, 110, 330, 290, "#F8F0DC")}${t(215, 170, "Sáng", 24, "#C48A2A")}
  ${t(215, 230, "Rửa → dưỡng → SPF", 20)}${t(215, 270, "SPF luôn cuối", 16, "#2A5552", 500)}
  ${card(420, 110, 330, 290, "#E7F0F5")}${t(585, 170, "Tối", 24, "#3D6B8A")}
  ${t(585, 230, "Rửa → (1 hoạt chất)", 20)}${t(585, 270, "→ dưỡng", 20)}`,
);
write(
  "routine-cham-da",
  "order",
  `${t(400, 64, "Nước → mỏng → đặc", 26)}
  <rect x="140" y="300" width="520" height="50" rx="16" fill="#9DD7D4"/>
  <rect x="180" y="230" width="440" height="50" rx="16" fill="#7EC4C1"/>
  <rect x="220" y="160" width="360" height="50" rx="16" fill="#C48A2A"/>
  ${t(400, 334, "Nước / toner loãng", 16, "#0F2E2C", 600)}
  ${t(400, 264, "Lotion / gel", 16, "#0F2E2C", 600)}
  ${t(400, 194, "SPF (sáng) / cream (tối)", 16, "#FFFFFF", 700)}`,
);
write(
  "routine-cham-da",
  "two-weeks",
  `${t(400, 58, "14 ngày ổn định", 26)}
  ${[0, 1].map((week) =>
    [0, 1, 2, 3, 4, 5, 6]
      .map((d) => {
        const x = 90 + d * 90;
        const y = 110 + week * 150;
        return `${card(x, y, 76, 120, week === 0 ? "#D8F0EE" : "#E7F3EA")}${t(x + 38, y + 70, "✓", 28, "#2A8F88")}`;
      })
      .join(""),
  ).join("")}`,
);
write(
  "routine-cham-da",
  "photo",
  `${t(400, 64, "Cùng góc, cùng cửa sổ", 26)}
  ${card(230, 110, 340, 280, "#D8F0EE")}
  <rect x="300" y="150" width="200" height="180" rx="24" fill="#0F2E2C"/>
  <circle cx="400" cy="240" r="36" fill="#9DD7D4"/>
  ${t(400, 420, "Không cần filter. Cần ảnh thật.", 18, "#2A5552", 600)}`,
);

// --- tham-mun ---
write(
  "tham-mun",
  "hero",
  `${t(400, 64, "Thâm phẳng ≠ sẹo lõm", 26)}
  ${card(70, 110, 300, 280, "#F1E8F4")}<ellipse cx="220" cy="230" rx="70" ry="90" fill="#E8D0C4"/><ellipse cx="220" cy="250" rx="28" ry="18" fill="#A67C52" opacity="0.55"/>${t(220, 360, "Thâm (phẳng)", 20)}
  ${card(430, 110, 300, 280, "#E7F0F5")}<ellipse cx="580" cy="230" rx="70" ry="90" fill="#E8D0C4"/><ellipse cx="580" cy="250" rx="22" ry="14" fill="#6B5344" opacity="0.35"/>${t(580, 360, "Sẹo (địa hình)", 20)}`,
);
write(
  "tham-mun",
  "protect",
  `${t(400, 64, "Bảo vệ thâm", 26)}
  ${card(40, 120, 230, 260, "#F8F0DC")}${t(155, 240, "SPF", 28, "#C48A2A")}${t(155, 290, "Mỗi sáng", 18)}
  ${card(285, 120, 230, 260, "#D8F0EE")}${t(400, 240, "Mũ", 28, "#2A8F88")}${t(400, 290, "Bóng râm", 18)}
  ${card(530, 120, 230, 260, "#F8E8EC")}${t(645, 240, "Không chà", 24, "#C45C74")}${t(645, 290, "Không nặn", 18)}`,
);
write(
  "tham-mun",
  "weekly",
  `${t(400, 64, "So ảnh theo tuần", 26)}
  ${card(90, 120, 280, 260, "#D8F0EE")}${t(230, 230, "Tuần 1", 24)}${t(230, 280, "Cùng cửa sổ", 18, "#2A5552", 500)}
  ${card(430, 120, 280, 260, "#E7F3EA")}${t(570, 230, "Tuần 3–4", 24)}${t(570, 280, "Cùng góc", 18, "#2A5552", 500)}
  ${t(400, 420, "Nắng gắt làm ảnh trông đậm hơn — chưa chắc vết xấu hơn", 16, "#2A5552", 500)}`,
);

// --- office ---
write(
  "da-dau-van-phong",
  "hero",
  `${t(400, 64, "Hai khí hậu, một ngày", 26)}
  ${card(50, 110, 330, 290, "#F8F0DC")}${t(215, 230, "Ngoài đường", 22)}${t(215, 280, "Nóng ẩm · mũ · SPF", 18, "#2A5552", 500)}
  ${card(420, 110, 330, 290, "#E7F0F5")}${t(585, 230, "Văn phòng", 22)}${t(585, 280, "Máy lạnh · T-zone bóng", 18, "#2A5552", 500)}`,
);
write(
  "da-dau-van-phong",
  "desk",
  `${t(400, 64, "Ngăn kéo văn phòng", 26)}
  ${card(80, 120, 280, 270, "#D8F0EE")}${t(220, 220, "Giấy thấm", 24, "#2A8F88")}${t(220, 270, "Nước uống", 20)}
  ${card(440, 120, 280, 270, "#F8E8EC")}${t(580, 220, "Không rửa", 24, "#C45C74")}${t(580, 270, "giữa giờ", 20)}`,
);
write(
  "da-dau-van-phong",
  "lunch",
  `${t(400, 70, "Bóng lúc 3 giờ chưa chắc sai", 24)}
  ${card(140, 130, 520, 240, "#D8F0EE")}
  ${t(400, 220, "Thấm dầu", 28, "#2A8F88")}
  ${t(400, 270, "Giữ lớp SPF · đừng rửa rồi ra nắng", 20, "#2A5552", 600)}`,
);

// --- da-kho ---
write(
  "da-kho",
  "hero",
  `${t(400, 64, "Căng sau rửa ≠ da sạch", 26)}
  ${card(70, 110, 300, 280, "#F8E8EC")}<ellipse cx="220" cy="220" rx="70" ry="88" fill="#F3B8A8"/>
  <path d="M190 250 Q220 238 250 250" fill="none" stroke="#C45C74" stroke-width="6" stroke-linecap="round"/>
  ${t(220, 360, "Rửa đến kít", 20, "#C45C74")}
  ${card(430, 110, 300, 280, "#D8F0EE")}<ellipse cx="580" cy="220" rx="70" ry="88" fill="#F7D4C8"/>
  <path d="M550 255 Q580 272 610 255" fill="none" stroke="#2A8F88" stroke-width="6" stroke-linecap="round"/>
  ${t(580, 360, "Dưỡng khi ẩm", 20, "#2A8F88")}`,
);
write(
  "da-kho",
  "layers",
  `${t(400, 64, "Khóa ẩm, rồi SPF", 26)}
  ${card(50, 110, 220, 280, "#D8F0EE")}${t(160, 200, "1", 48, "#2A8F88")}${t(160, 260, "Rửa dịu", 22)}${t(160, 296, "Không kít mặt", 16, "#2A5552", 500)}
  ${card(290, 110, 220, 280, "#F6EDE0")}${t(400, 200, "2", 48, "#B8864A")}${t(400, 260, "Dưỡng ẩm", 22)}${t(400, 296, "Khi da hơi ướt", 16, "#2A5552", 500)}
  ${card(530, 110, 220, 280, "#F8F0DC")}${t(640, 200, "3", 48, "#C48A2A")}${t(640, 260, "SPF sáng", 22)}${t(640, 296, "Da khô cũng nắng", 16, "#2A5552", 500)}`,
);
write(
  "da-kho",
  "climate",
  `${t(400, 64, "Một ngày, ba khí hậu", 26)}
  ${card(40, 110, 230, 280, "#E7F0F5")}${t(155, 230, "❄", 42)}${t(155, 300, "Máy lạnh", 20)}
  ${card(285, 110, 230, 280, "#D8E8F4")}${t(400, 230, "☂", 42)}${t(400, 300, "Mưa ẩm", 20)}
  ${card(530, 110, 230, 280, "#F8F0DC")}${t(645, 230, "☀", 42)}${t(645, 300, "Nắng xe máy", 20)}`,
);

// --- da-nhay-cam ---
write(
  "da-nhay-cam",
  "hero",
  `${t(400, 64, "Đỏ sau chai mới: dừng", 26)}
  <ellipse cx="280" cy="240" rx="88" ry="108" fill="#F7D4C8"/>
  <ellipse cx="280" cy="250" rx="58" ry="40" fill="#F4C7CE" opacity="0.7"/>
  <rect x="470" y="160" width="90" height="170" rx="28" fill="#C5D5D4"/>
  <path d="M455 175 L575 315" stroke="#C45C74" stroke-width="10" stroke-linecap="round"/>
  ${t(400, 400, "Không cố chịu cho quen", 20, "#C45C74")}`,
);
write(
  "da-nhay-cam",
  "minimal",
  `${t(400, 64, "Ba bước khi da đang kêu", 26)}
  ${card(50, 110, 220, 280, "#D8F0EE")}${t(160, 210, "Rửa dịu", 22, "#2A8F88")}${t(160, 260, "Ít hương", 16, "#2A5552", 500)}
  ${card(290, 110, 220, 280, "#E8F2EC")}${t(400, 210, "Dưỡng", 22, "#3B7A5A")}${t(400, 260, "Ít thành phần", 16, "#2A5552", 500)}
  ${card(530, 110, 220, 280, "#F8F0DC")}${t(640, 210, "SPF", 22, "#C48A2A")}${t(640, 260, "Kết cấu chịu được", 16, "#2A5552", 500)}`,
);
write(
  "da-nhay-cam",
  "patch",
  `${t(400, 58, "Patch-test 2–3 đêm", 26)}
  <ellipse cx="400" cy="250" rx="120" ry="150" fill="#F7D4C8"/>
  <circle cx="292" cy="230" r="22" fill="none" stroke="#2A8F88" stroke-width="6"/>
  <circle cx="400" cy="318" r="20" fill="none" stroke="#2A8F88" stroke-width="6"/>
  ${t(400, 430, "Sau tai · dọc hàm — chưa cả mặt", 18, "#2A5552", 600)}`,
);

// --- retinol-cho-nguoi-moi ---
write(
  "retinol-cho-nguoi-moi",
  "calendar",
  `${t(400, 58, "Hai đêm / tuần đã là bắt đầu", 24)}
  ${[0, 1, 2, 3, 4, 5, 6]
    .map((d) => {
      const x = 70 + d * 96;
      const active = d === 1 || d === 4;
      return `${card(x, 130, 84, 220, active ? "#F1E8F4" : "#E7F3EA")}${t(x + 42, 240, active ? "R" : "·", 32, active ? "#7A5A8A" : "#2A8F88")}${t(x + 42, 300, active ? "Retinol" : "Dưỡng", 14, "#2A5552", 600)}`;
    })
    .join("")}`,
);
write(
  "retinol-cho-nguoi-moi",
  "sandwich",
  `${t(400, 64, "Dưỡng → mỏng → dưỡng", 26)}
  <rect x="160" y="300" width="480" height="52" rx="16" fill="#9DD7D4"/>
  <rect x="200" y="220" width="400" height="52" rx="16" fill="#7A5A8A"/>
  <rect x="160" y="140" width="480" height="52" rx="16" fill="#9DD7D4"/>
  ${t(400, 334, "Dưỡng", 18, "#0F2E2C", 600)}
  ${t(400, 254, "Retinol mỏng", 18, "#FFFFFF", 700)}
  ${t(400, 174, "Dưỡng", 18, "#0F2E2C", 600)}
  ${t(400, 420, "Không phải lớp dày cho nhanh", 16, "#2A5552", 500)}`,
);
write(
  "retinol-cho-nguoi-moi",
  "daytime",
  `${t(400, 64, "Sáng hôm sau: SPF", 26)}
  ${card(70, 120, 300, 260, "#F8F0DC")}${t(220, 230, "SPF", 28, "#C48A2A")}${t(220, 280, "Hai ngón tay", 18)}
  ${card(430, 120, 300, 260, "#D8F0EE")}${t(580, 230, "Mũ", 28, "#2A8F88")}${t(580, 280, "Không thêm acid", 18)}`,
);
