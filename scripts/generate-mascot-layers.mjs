/**
 * Writes public/mascot SVG layers. Every file shares viewBox 0 0 220 250
 * and the anchors in lib/mascot/layers.ts so a photo face/hair can replace
 * the defaults without moving outfits or accessories.
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve("public/mascot");
const INK = "#5C3344";
const SKIN = "#FFD0B8";
const HAIR = "#5A3842";
const HAIR_LITE = "#8E6872";
const PJ = "#FFB3D4";
const PANTS = "#D9C6FF";
const MOUTH = "#E06A80";

const svg = (body) =>
  `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 220 250" fill="none">${body}</svg>\n`;

function write(rel, body) {
  const file = path.join(ROOT, rel);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, svg(body));
}

const eye = (cx, cy, kind) => {
  if (kind === "shut" || kind === "laugh") {
    return `<path d="M${cx - 8} ${cy} q8 ${kind === "laugh" ? -7 : 6} 16 0" stroke="${INK}" stroke-width="2.4" stroke-linecap="round"/>`;
  }
  if (kind === "star") {
    return `<polygon points="${cx},${cy - 9} ${cx + 3},${cy - 2} ${cx + 9},${cy - 2} ${cx + 4},${cy + 2} ${cx + 6},${cy + 9} ${cx},${cy + 4} ${cx - 6},${cy + 9} ${cx - 4},${cy + 2} ${cx - 9},${cy - 2} ${cx - 3},${cy - 2}" fill="#FFE08A" stroke="${INK}" stroke-width="1.1"/>`;
  }
  const ry = kind === "wide" ? 11 : kind === "droop" ? 6 : 9;
  return `<ellipse cx="${cx}" cy="${cy}" rx="8" ry="${ry}" fill="#fff" stroke="${INK}" stroke-width="1.6"/><circle cx="${cx + 1}" cy="${cy + 1}" r="4" fill="#3C2632"/><circle cx="${cx + 3}" cy="${cy - 2}" r="1.5" fill="#fff"/>`;
};

const brows = (kind) => {
  const lift = kind === "up" ? -8 : kind === "sad" ? 4 : kind === "mad" ? 2 : 0;
  const curve = kind === "mad" ? 8 : kind === "sad" ? 6 : -6;
  return `<path d="M82 ${90 + lift} q12 ${curve} 22 0" stroke="${INK}" stroke-width="2.2" stroke-linecap="round"/><path d="M116 ${90 + lift} q12 ${curve} 22 0" stroke="${INK}" stroke-width="2.2" stroke-linecap="round"/>`;
};

const mouth = (kind) => {
  if (kind === "smile" || kind === "laugh") {
    return `<path d="M96 ${kind === "laugh" ? 116 : 120} q14 16 28 0" stroke="${MOUTH}" stroke-width="2.6" stroke-linecap="round"/>`;
  }
  if (kind === "o") return `<ellipse cx="110" cy="122" rx="6" ry="7" fill="${MOUTH}"/>`;
  if (kind === "yawn") return `<ellipse cx="110" cy="124" rx="8" ry="9" fill="#7A3E4E"/>`;
  if (kind === "frown" || kind === "cry") {
    return `<path d="M98 128 q12 -10 24 0" stroke="${MOUTH}" stroke-width="2.4" stroke-linecap="round"/>`;
  }
  if (kind === "pout") return `<path d="M100 124 q6 6 16 -1" stroke="${MOUTH}" stroke-width="2.6" stroke-linecap="round"/>`;
  return `<path d="M100 120 q10 8 20 0" stroke="${MOUTH}" stroke-width="2.3" stroke-linecap="round"/>`;
};

const cheeks = (kind) => {
  const blush = kind === "heavy" ? 0.8 : kind === "puff" ? 0.9 : 0.45;
  const rx = kind === "puff" ? 10 : 8;
  if (kind === "none") return "";
  return `<ellipse cx="80" cy="116" rx="${rx}" ry="6" fill="#FF8EAE" opacity="${blush}"/><ellipse cx="140" cy="116" rx="${rx}" ry="6" fill="#FF8EAE" opacity="${blush}"/>`;
};

const FACES = {
  normal: ["soft", "open", "soft", "light"],
  happy: ["up", "open", "smile", "light"],
  sparkle: ["up", "star", "smile", "light"],
  sleepy: ["sad", "shut", "yawn", "none"],
  acne: ["up", "wide", "o", "light"],
  oily: ["soft", "open", "smile", "light"],
  dry: ["sad", "droop", "soft", "none"],
  red: ["soft", "open", "soft", "heavy"],
  dark_spot: ["soft", "open", "smile", "light"],
  sad_pillow: ["sad", "droop", "frown", "light"],
  pouty_arms_crossed: ["mad", "droop", "pout", "puff"],
  note_on_mirror: ["mad", "droop", "pout", "light"],
  pot_on_head_corner: ["sad", "droop", "frown", "none"],
  suitcase_leaving: ["sad", "droop", "frown", "none"],
  waiting_door_sign: ["sad", "open", "cry", "none"],
  hug_return: ["up", "open", "laugh", "light"],
  laugh: ["up", "laugh", "laugh", "light"],
  startled: ["up", "wide", "o", "light"],
  pouty: ["mad", "droop", "pout", "puff"],
};

for (const [mood, [brow, eyes, lip, cheek]] of Object.entries(FACES)) {
  write(`faces/${mood}/brows.svg`, brows(brow));
  write(`faces/${mood}/eyes.svg`, `${eye(94, 102, eyes)}${eye(126, 102, eyes)}${mood === "waiting_door_sign" ? `<path d="M100 112 q2 12 1 18" stroke="#8EC7E6" stroke-width="2.4" stroke-linecap="round"/><path d="M122 112 q-1 12 1 18" stroke="#8EC7E6" stroke-width="2.4" stroke-linecap="round"/>` : ""}`);
  write(`faces/${mood}/mouth.svg`, mouth(lip));
  write(`faces/${mood}/cheeks.svg`, cheeks(cheek));
}

write(
  "body/body_chibi.svg",
  `<ellipse cx="110" cy="228" rx="46" ry="8" fill="#E7B3C8" opacity="0.45"/>
   <rect x="90" y="176" width="14" height="32" rx="7" fill="${SKIN}" stroke="${INK}" stroke-width="2"/>
   <rect x="116" y="176" width="14" height="32" rx="7" fill="${SKIN}" stroke="${INK}" stroke-width="2"/>
   <path d="M86 150 Q110 140 134 150 L138 176 Q110 184 82 176 Z" fill="${SKIN}" stroke="${INK}" stroke-width="2"/>
   <circle cx="110" cy="104" r="42" fill="${SKIN}" stroke="${INK}" stroke-width="2.2"/>
   <ellipse cx="70" cy="112" rx="8" ry="10" fill="${SKIN}" stroke="${INK}" stroke-width="2"/>
   <ellipse cx="150" cy="112" rx="8" ry="10" fill="${SKIN}" stroke="${INK}" stroke-width="2"/>`,
);

write(
  "body/body_sit.svg",
  `<ellipse cx="110" cy="214" rx="40" ry="16" fill="${SKIN}" stroke="${INK}" stroke-width="2"/>
   <path d="M86 150 Q110 140 134 150 L138 176 Q110 184 82 176 Z" fill="${SKIN}" stroke="${INK}" stroke-width="2"/>
   <circle cx="110" cy="104" r="42" fill="${SKIN}" stroke="${INK}" stroke-width="2.2"/>
   <ellipse cx="70" cy="112" rx="8" ry="10" fill="${SKIN}" stroke="${INK}" stroke-width="2"/>
   <ellipse cx="150" cy="112" rx="8" ry="10" fill="${SKIN}" stroke="${INK}" stroke-width="2"/>`,
);

write(
  "body/body_back.svg",
  `<ellipse cx="110" cy="214" rx="40" ry="16" fill="#F3C3D8"/>
   <path d="M78 156 Q110 142 142 156 L148 196 Q110 210 72 196 Z" fill="#FFB3D4" stroke="${INK}" stroke-width="2"/>
   <circle cx="110" cy="104" r="42" fill="${HAIR}" stroke="${INK}" stroke-width="2"/>`,
);

write(
  "outfit/outfit_cozy_pajamas.svg",
  `<rect x="90" y="178" width="14" height="28" rx="7" fill="${PANTS}" stroke="${INK}" stroke-width="2"/>
   <rect x="116" y="178" width="14" height="28" rx="7" fill="${PANTS}" stroke="${INK}" stroke-width="2"/>
   <path d="M78 148 Q110 136 142 148 L148 186 Q110 198 72 186 Z" fill="${PJ}" stroke="${INK}" stroke-width="2"/>
   <circle cx="96" cy="164" r="2.2" fill="#fff"/><circle cx="112" cy="174" r="2.2" fill="#fff"/><circle cx="128" cy="160" r="2.2" fill="#fff"/>`,
);

write(
  "hair/hair_sleep_buns.svg",
  `<path d="M68 108 Q62 58 110 50 Q158 58 152 108 Q148 76 110 72 Q72 76 68 108" fill="${HAIR}"/>
   <circle cx="64" cy="86" r="16" fill="${HAIR}"/>
   <circle cx="156" cy="86" r="16" fill="${HAIR}"/>
   <path d="M78 96 Q92 78 108 92 Q98 102 80 100 Z" fill="${HAIR}"/>
   <path d="M112 92 Q130 76 144 96 Q132 106 114 100 Z" fill="${HAIR}"/>
   <circle cx="60" cy="80" r="4" fill="${HAIR_LITE}" opacity="0.5"/>`,
);

write(
  "accessory/accessory_star_clip.svg",
  `<polygon points="156,54 160,64 170,64 162,70 165,80 156,74 147,80 150,70 142,64 152,64" fill="#FFE08A" stroke="${INK}" stroke-width="1.2"/>`,
);

function bumps(n, scale) {
  const pts = [[-16, -14, 4.6], [18, -6, 4.2], [-6, 8, 2.6], [7, 10, 2.4], [22, 6, 4], [-22, 2, 3.8], [2, -18, 3.4]];
  return pts.slice(0, n).map(([x, y, r]) => {
    const rr = r * scale;
    return `<g transform="translate(110 104)"><circle cx="${x}" cy="${y}" r="${rr}" fill="#F07184"/><circle cx="${x - rr * 0.3}" cy="${y - rr * 0.3}" r="${rr * 0.28}" fill="#fff"/></g>`;
  }).join("");
}
const levels = { light: [2, 0.8], medium: [4, 1], heavy: [7, 1.14] };
for (const [level, [n, scale]] of Object.entries(levels)) {
  write(`skin_marks/acne_${level}.svg`, bumps(n, scale));
  write(`skin_marks/oily_${level}.svg`, `<g transform="translate(110 104) scale(${scale})"><ellipse cx="0" cy="-24" rx="16" ry="7" fill="#fff" opacity="0.95"/>${n > 2 ? `<ellipse cx="2" cy="6" rx="7" ry="5" fill="#fff"/>` : ""}${n > 4 ? `<ellipse cx="18" cy="-4" rx="6" ry="3" fill="#FFF6C8"/>` : ""}</g>`);
  const flakes = [[-20, -4], [16, 2], [-8, 14], [22, -12], [0, -16], [-24, 10], [8, -8]].slice(0, n);
  write(`skin_marks/dry_${level}.svg`, `<g transform="translate(110 104) scale(${scale})" stroke="#E7C4A4" stroke-width="1.8" stroke-linecap="round">${flakes.map(([x, y]) => `<path d="M${x} ${y} q4 -4 8 1"/>`).join("")}</g>`);
  write(`skin_marks/red_${level}.svg`, `<g transform="translate(110 104)"><ellipse cx="-24" cy="10" rx="${10 + n}" ry="8" fill="#FF8EAE"/><ellipse cx="24" cy="10" rx="${10 + n}" ry="8" fill="#FF8EAE"/></g>`);
  const spots = [[-14, -8, 3.6], [16, 4, 3.2], [4, 14, 2.8], [-22, 8, 3], [20, -12, 2.6], [-4, -16, 2.4], [10, -2, 2.7]].slice(0, n);
  write(`skin_marks/dark_spot_${level}.svg`, `<g transform="translate(110 104) scale(${scale})">${spots.map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="#A56B52"/>`).join("")}</g>`);
}

write("messy/1.svg", `<g stroke="${HAIR_LITE}" stroke-width="1.8" stroke-linecap="round"><path d="M72 78 q-10 -12 2 -16"/><path d="M86 62 q-6 -14 6 -12"/><path d="M148 76 q12 -10 2 -16"/><path d="M132 60 q8 -12 -2 -14"/><path d="M110 56 q4 -12 10 -6"/></g>`);
write("messy/2.svg", `<g stroke="${HAIR_LITE}" stroke-width="1.8" stroke-linecap="round"><path d="M72 78 q-10 -12 2 -16"/><path d="M86 62 q-6 -14 6 -12"/><path d="M148 76 q12 -10 2 -16"/><path d="M132 60 q8 -12 -2 -14"/><path d="M110 56 q4 -12 10 -6"/></g><path d="M84 114 q10 8 18 0" stroke="#8A7494" stroke-width="2.6"/><path d="M118 114 q10 8 18 0" stroke="#8A7494" stroke-width="2.6"/>`);
write("messy/3.svg", `<g stroke="${HAIR}" stroke-width="2.3" fill="none"><path d="M70 70 q-16 -8 -8 -20 q14 -4 10 10"/><path d="M150 68 q18 -6 8 -22 q-16 0 -12 12"/><path d="M100 56 q8 -16 18 -6"/><path d="M78 60 q20 -18 28 -2" stroke="${HAIR_LITE}"/></g><g transform="translate(146 48) rotate(20)"><path d="M0 0 L18 -2" stroke="#A56B45" stroke-width="2" stroke-linecap="round"/><ellipse cx="16" cy="-6" rx="4" ry="2.4" fill="#8FCB86"/></g><path d="M84 114 q10 9 18 0" stroke="#8A7494" stroke-width="3"/><path d="M118 114 q10 9 18 0" stroke="#8A7494" stroke-width="3"/>`);
write("messy/4.svg", `<g stroke="${HAIR}" stroke-width="2.3" stroke-linecap="round"><path d="M96 58 L92 28"/><path d="M108 54 L110 22"/><path d="M120 58 L128 26"/><path d="M84 66 L70 40"/><path d="M136 66 L152 38"/></g><ellipse cx="94" cy="114" rx="10" ry="6" fill="#6C5A78" opacity="0.55"/><ellipse cx="126" cy="114" rx="10" ry="6" fill="#6C5A78" opacity="0.55"/><path d="M100 128 q3 10 2 16" stroke="#8EC7E6" stroke-width="2.4" stroke-linecap="round"/><path d="M122 128 q-2 10 0 16" stroke="#8EC7E6" stroke-width="2.4" stroke-linecap="round"/><circle cx="102" cy="146" r="2.4" fill="#B7E2F5"/><circle cx="122" cy="146" r="2.4" fill="#B7E2F5"/>`);

write("props/room_moon.svg", `<circle cx="40" cy="42" r="16" fill="#FFE7A3"/><circle cx="46" cy="38" r="12" fill="#000" opacity="0"/>`);
write("props/room_plant.svg", `<rect x="18" y="198" width="16" height="14" rx="3" fill="#E39AB8"/><ellipse cx="26" cy="190" rx="10" ry="12" fill="#7DBE8A"/>`);
write("props/room_pillow.svg", `<rect x="176" y="196" width="28" height="18" rx="8" fill="#fff" stroke="${INK}" stroke-width="1.5"/>`);
write("props/pillow.svg", `<rect x="78" y="156" width="64" height="40" rx="16" fill="#fff" stroke="${INK}" stroke-width="2"/>`);
write("props/suitcase.svg", `<rect x="28" y="168" width="36" height="28" rx="4" fill="#F0A35A" stroke="${INK}" stroke-width="2"/><path d="M38 168 v-8 h16 v8" stroke="${INK}" stroke-width="2"/>`);
write("props/door.svg", `<rect x="8" y="36" width="62" height="150" rx="6" fill="#F7E2C2" stroke="${INK}" stroke-width="2.4"/><circle cx="58" cy="112" r="3" fill="#E0A15A"/>`);
write("props/pot.svg", `<path d="M150 18 H206 V86" stroke="#E7B7CC" stroke-width="8" stroke-linecap="round"/><g transform="translate(132 48)"><path d="M8 28 h36 l-4 22 h-28 z" fill="#F0A35A" stroke="${INK}" stroke-width="2"/><ellipse cx="26" cy="28" rx="20" ry="6" fill="#E08A3E" stroke="${INK}" stroke-width="2"/></g>`);
write("props/zzz.svg", `<text x="156" y="78" font-size="14" font-family="ui-sans-serif, system-ui, sans-serif" font-weight="700" fill="${INK}">z</text><text x="168" y="64" font-size="16" font-weight="700" fill="${INK}" font-family="ui-sans-serif, system-ui, sans-serif">z</text><text x="180" y="50" font-size="18" font-weight="700" fill="${INK}" font-family="ui-sans-serif, system-ui, sans-serif">Z</text>`);
write("props/sparkles.svg", `<circle cx="168" cy="90" r="3" fill="#FFE08A" stroke="${INK}"/><circle cx="58" cy="96" r="2.4" fill="#FFE08A"/><circle cx="176" cy="130" r="2" fill="#FFE08A"/>`);

function note(text) {
  return `<rect x="150" y="48" width="62" height="74" rx="8" fill="#D7F1F8" stroke="${INK}" stroke-width="2"/><rect x="158" y="60" width="44" height="30" rx="4" fill="#FFF4B8" stroke="${INK}" stroke-width="1.3" transform="rotate(-6 180 75)"/><text x="162" y="78" font-size="8" font-family="ui-sans-serif, system-ui, sans-serif" fill="${INK}">${text}</text>`;
}
write("props/mirror.svg", note("Giận rồi đó!"));
write("props/mirror_en.svg", note("I'm mad!"));

function sign(lines) {
  const text = lines.map((line, i) => `<text x="164" y="${184 + i * 12}" text-anchor="middle" font-size="8" font-family="ui-sans-serif, system-ui, sans-serif" fill="${INK}">${line}</text>`).join("");
  return `<rect x="118" y="168" width="92" height="48" rx="8" fill="#FFF8E8" stroke="${INK}" stroke-width="2"/>${text}`;
}
write("props/sign_come_back.svg", sign(["Về chăm da", "đi mà"]));
write("props/sign_come_back_en.svg", sign(["Come take", "care of me"]));
write("props/sign_abandoned.svg", sign(["Tôi đã bị", "bỏ rơi ở đây"]));
write("props/sign_abandoned_en.svg", sign(["I was", "abandoned here"]));

const poses = {
  cleanser: `<circle cx="78" cy="116" r="8" fill="${SKIN}" stroke="${INK}" stroke-width="2"/><circle cx="142" cy="116" r="8" fill="${SKIN}" stroke="${INK}" stroke-width="2"/><circle cx="64" cy="98" r="5" fill="#fff" stroke="${INK}"/>`,
  moisturizer: `<circle cx="78" cy="116" r="8" fill="${SKIN}" stroke="${INK}" stroke-width="2"/><circle cx="142" cy="116" r="8" fill="${SKIN}" stroke="${INK}" stroke-width="2"/>`,
  toner: `<circle cx="142" cy="116" r="7" fill="${SKIN}" stroke="${INK}" stroke-width="2"/>`,
  serum: `<path d="M128 150 L140 112" stroke="${INK}" stroke-width="3" stroke-linecap="round"/><circle cx="142" cy="108" r="4" fill="#C9ECFF" stroke="${INK}"/>`,
  treatment: `<path d="M128 150 L140 118" stroke="${INK}" stroke-width="3" stroke-linecap="round"/><circle cx="142" cy="114" r="4" fill="#F7C9D4" stroke="${INK}"/>`,
  spf: `<circle cx="164" cy="78" r="12" fill="#FFE08A" stroke="${INK}" stroke-width="2"/>`,
  eye: `<circle cx="142" cy="112" r="6" fill="${SKIN}" stroke="${INK}" stroke-width="2"/>`,
  mask: `<rect x="82" y="92" width="56" height="40" rx="16" fill="#FFF6FB" stroke="${INK}" stroke-width="2"/><circle cx="98" cy="108" r="6" fill="#FDE7F1" stroke="${INK}"/><circle cx="124" cy="108" r="6" fill="#FDE7F1" stroke="${INK}"/>`,
  other: `<ellipse cx="98" cy="168" rx="10" ry="7" fill="${SKIN}" stroke="${INK}" stroke-width="2"/><ellipse cx="122" cy="168" rx="10" ry="7" fill="${SKIN}" stroke="${INK}" stroke-width="2"/>`,
};
for (const [name, body] of Object.entries(poses)) write(`props/pose_${name}.svg`, body);

write("fx/eyelids.svg", `<ellipse cx="94" cy="102" rx="9" ry="10" fill="${SKIN}" stroke="${INK}" stroke-width="1.4"/><ellipse cx="126" cy="102" rx="9" ry="10" fill="${SKIN}" stroke="${INK}" stroke-width="1.4"/>`);
write("fx/yawn.svg", `<ellipse cx="110" cy="126" rx="7" ry="8" fill="#7A3E4E"/><text x="150" y="70" font-size="16" font-family="ui-sans-serif, system-ui, sans-serif" font-weight="700" fill="${INK}">z</text>`);
write("fx/flies/flies.svg", `<g class="be-da-fly" transform="translate(168 70)"><ellipse cx="-5" cy="-3" rx="5" ry="2.6" fill="#fff" stroke="${INK}" stroke-width="0.6"/><ellipse cx="5" cy="-3" rx="5" ry="2.6" fill="#fff" stroke="${INK}" stroke-width="0.6"/><ellipse cx="0" cy="0" rx="5.5" ry="3.6" fill="#C4B07A" stroke="${INK}" stroke-width="1"/><circle cx="-1.4" cy="-0.5" r="0.7" fill="${INK}"/><circle cx="1.4" cy="-0.5" r="0.7" fill="${INK}"/></g><g class="be-da-fly be-da-fly-2" transform="translate(190 102)"><ellipse cx="0" cy="0" rx="5" ry="3.2" fill="#C4B07A" stroke="${INK}"/><ellipse cx="-5" cy="-2" rx="4" ry="2" fill="#fff"/></g><g class="be-da-fly be-da-fly-3" transform="translate(154 48)"><ellipse cx="0" cy="0" rx="4.5" ry="3" fill="#D3C08A" stroke="${INK}"/><ellipse cx="4" cy="-2" rx="4" ry="2" fill="#fff"/></g>`);

fs.writeFileSync(
  path.join(ROOT, "anchors.json"),
  JSON.stringify(
    {
      viewBox: "0 0 220 250",
      anchors: {
        headCenter: [110, 104],
        faceRadius: 42,
        eyeLeft: [94, 102],
        eyeRight: [126, 102],
        browLeft: [94, 90],
        browRight: [126, 90],
        mouth: [110, 122],
        cheekLeft: [80, 116],
        cheekRight: [140, 116],
        hairCrown: [110, 58],
        hairBunLeft: [64, 86],
        hairBunRight: [156, 86],
        accessoryClip: [156, 62],
        torsoCenter: [110, 168],
        outfitTop: 146,
        ground: [110, 228],
      },
    },
    null,
    2,
  ) + "\n",
);

console.log("wrote mascot layers");
