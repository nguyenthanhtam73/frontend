/**
 * Web voice for a room nudge. The server still sends its bạn/mình sentence
 * (POST /api/v1/mascot/rooms/:code/nudge and the room socket `nudge` event).
 * That payload has no variant field today, so the web reads `variant`, then
 * `type`, then `nudge_type` when one is present, and otherwise matches the
 * four backend templates in order. An unknown or missing type uses line 1.
 * Android keeps the server sentence.
 */

export type NudgeVoiceInput = {
  message?: string | null;
  variant?: unknown;
  type?: unknown;
  nudgeType?: unknown;
};

export type NudgeVoiceIndex = 1 | 2 | 3 | 4;

export type NudgeVoice = {
  index: NudgeVoiceIndex;
  name: string;
};

/** Same order as backend `roomquest.nudgeTemplates`. Used only to recognise the sentence. */
export const BACKEND_NUDGE_TEMPLATES = [
  "{name} đang chờ bạn chăm da hôm nay đó 💕",
  "{name} nhắc nhẹ: hôm nay mình chăm da cùng nhau nha ✨",
  "Bé Da của {name} đang vẫy bạn, vào chăm da hôm nay đi 💗",
  "{name} giữ một chỗ trên bảng hôm nay cho bạn đó 🌸",
] as const;

/** Shown when the sentence has no name we can lift out. */
export const NUDGE_NAME_FALLBACK = "Một người";

const SHAPES: { index: NudgeVoiceIndex; prefix: string; suffix: string }[] = BACKEND_NUDGE_TEMPLATES.map(
  (template, offset) => {
    const [prefix, suffix] = template.split("{name}");
    return { index: (offset + 1) as NudgeVoiceIndex, prefix: prefix ?? "", suffix: suffix ?? "" };
  },
);

function readIndex(value: unknown): NudgeVoiceIndex | null {
  if (typeof value === "number" && Number.isInteger(value) && value >= 1 && value <= 4) {
    return value as NudgeVoiceIndex;
  }
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (trimmed === "1" || trimmed === "2" || trimmed === "3" || trimmed === "4") {
    return Number(trimmed) as NudgeVoiceIndex;
  }
  return null;
}

function explicitIndex(input: NudgeVoiceInput): NudgeVoiceIndex | null {
  return readIndex(input.variant) ?? readIndex(input.type) ?? readIndex(input.nudgeType);
}

export function matchBackendNudge(message: string | null | undefined): NudgeVoice | null {
  const text = message?.trim() ?? "";
  if (!text) return null;
  for (const shape of SHAPES) {
    if (shape.prefix && !text.startsWith(shape.prefix)) continue;
    if (!text.endsWith(shape.suffix)) continue;
    const name = text.slice(shape.prefix.length, text.length - shape.suffix.length).trim();
    if (!name) continue;
    return { index: shape.index, name };
  }
  return null;
}

export function pickNudgeVoice(input: NudgeVoiceInput): NudgeVoice {
  const matched = matchBackendNudge(input.message);
  const index = explicitIndex(input) ?? matched?.index ?? 1;
  return { index, name: matched?.name || NUDGE_NAME_FALLBACK };
}

export function fillNudgeLine(template: string, name: string): string {
  return template.replaceAll("{name}", name);
}

/** Rewrite a stored nudge sentence. Error notes that are not a nudge stay as written. */
export function webNudgeNote(message: string, line: (index: NudgeVoiceIndex, name: string) => string): string {
  const matched = matchBackendNudge(message);
  if (!matched) return message;
  return line(matched.index, matched.name);
}
