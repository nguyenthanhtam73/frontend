/**
 * Client-side canvas PNG for before/after and streak cards.
 * Photos stay on-device (blob) until the user shares or downloads.
 */

import { sameOriginUploadUrl } from "@/lib/api/admin-skin-review";
import {
  beforeAfterCardLayout,
  coverSourceRect,
  formatShareDate,
  wrapLines,
  type SharePhotoRef,
} from "@/lib/share/before-after";
import { streakCardLayout } from "@/lib/share/streak-continue";
import { fetchImageAsDataUrl } from "@/lib/skin-review-share-image";

const FONT =
  '"Nunito Sans", "Segoe UI", system-ui, -apple-system, sans-serif';

const TEAL = "#2F8F8C";
const INK = "#1C2E32";
const MUTED = "#5A7176";
const WHITE = "#FFFFFF";

export type BeforeAfterCardCopy = {
  brandMark: string;
  headline: string;
  beforeLabel: string;
  afterLabel: string;
  ctaLine: string;
  disclaimer: string;
};

export type StreakCardCopy = {
  brandMark: string;
  headline: string;
  sub: string;
  ctaLine: string;
};

function createCardCanvas(width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

async function canvasToPngBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, "image/png");
  });
  if (!blob) throw new Error("image_render_empty");
  return blob;
}

async function loadImageElement(src: string): Promise<HTMLImageElement> {
  const img = new Image();
  img.decoding = "async";
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error("image_decode_failed"));
    img.src = src;
  });
  return img;
}

/** Fetch a user photo as a data URL so the canvas is never tainted. */
export async function loadSharePhoto(url: string): Promise<HTMLImageElement> {
  const sameOrigin = sameOriginUploadUrl(url);
  try {
    const dataUrl = await fetchImageAsDataUrl(sameOrigin);
    return loadImageElement(dataUrl);
  } catch {
    const dataUrl = await fetchImageAsDataUrl(url);
    return loadImageElement(dataUrl);
  }
}

function fillRoundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  fill: string | CanvasGradient,
) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  if (typeof ctx.roundRect === "function") {
    ctx.roundRect(x, y, w, h, radius);
  } else {
    ctx.moveTo(x + radius, y);
    ctx.arcTo(x + w, y, x + w, y + h, radius);
    ctx.arcTo(x + w, y + h, x, y + h, radius);
    ctx.arcTo(x, y + h, x, y, radius);
    ctx.arcTo(x, y, x + w, y, radius);
    ctx.closePath();
  }
  ctx.fillStyle = fill;
  ctx.fill();
}

function clipRoundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  if (typeof ctx.roundRect === "function") {
    ctx.roundRect(x, y, w, h, radius);
  } else {
    ctx.moveTo(x + radius, y);
    ctx.arcTo(x + w, y, x + w, y + h, radius);
    ctx.arcTo(x + w, y + h, x, y + h, radius);
    ctx.arcTo(x, y + h, x, y, radius);
    ctx.arcTo(x, y, x + w, y, radius);
    ctx.closePath();
  }
  ctx.clip();
}

function drawCoverImage(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  w: number,
  h: number,
  radius: number,
) {
  ctx.save();
  clipRoundRect(ctx, x, y, w, h, radius);
  const crop = coverSourceRect(img.naturalWidth || img.width, img.naturalHeight || img.height, w, h);
  ctx.drawImage(img, crop.sx, crop.sy, crop.sw, crop.sh, x, y, w, h);
  ctx.restore();
}

function drawBrandGlyph(ctx: CanvasRenderingContext2D, x: number, y: number, size: number) {
  const g = ctx.createLinearGradient(x, y, x + size, y + size);
  g.addColorStop(0, "#5BB8B4");
  g.addColorStop(1, "#E8A0B8");
  fillRoundRect(ctx, x, y, size, size, size * 0.28, g);

  ctx.save();
  ctx.strokeStyle = WHITE;
  ctx.fillStyle = WHITE;
  ctx.lineWidth = Math.max(2, size * 0.07);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  const s = size / 32;
  ctx.beginPath();
  ctx.moveTo(x + 11 * s, y + 21 * s);
  ctx.lineTo(x + 11 * s, y + 13 * s);
  ctx.arcTo(x + 11 * s, y + 10 * s, x + 14 * s, y + 10 * s, 3 * s);
  ctx.lineTo(x + 18 * s, y + 10 * s);
  ctx.arcTo(x + 21 * s, y + 10 * s, x + 21 * s, y + 13 * s, 3 * s);
  ctx.lineTo(x + 21 * s, y + 14.5 * s);
  ctx.moveTo(x + 21 * s, y + 17.5 * s);
  ctx.lineTo(x + 21 * s, y + 19 * s);
  ctx.arcTo(x + 21 * s, y + 22 * s, x + 18 * s, y + 22 * s, 3 * s);
  ctx.lineTo(x + 14 * s, y + 22 * s);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(x + 22 * s, y + 14 * s, 1.4 * s, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawWordmark(ctx: CanvasRenderingContext2D, x: number, y: number, size: number) {
  ctx.font = `700 ${size}px ${FONT}`;
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = INK;
  ctx.fillText("Da", x, y);
  const daW = ctx.measureText("Da").width;
  ctx.fillStyle = TEAL;
  ctx.fillText("Diary", x + daW, y);
}

function fillCardBackground(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const g = ctx.createLinearGradient(0, 0, w * 0.2, h);
  g.addColorStop(0, "#EEF7F6");
  g.addColorStop(0.48, "#FFF6FA");
  g.addColorStop(1, "#F5F9F8");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}

export async function renderBeforeAfterCard(input: {
  before: SharePhotoRef;
  after: SharePhotoRef;
  copy: BeforeAfterCardCopy;
}): Promise<Blob> {
  const [beforeImg, afterImg] = await Promise.all([
    loadSharePhoto(input.before.url),
    loadSharePhoto(input.after.url),
  ]);
  await document.fonts?.ready?.catch?.(() => undefined);

  const layout = beforeAfterCardLayout();
  const canvas = createCardCanvas(layout.width, layout.height);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("image_render_empty");

  fillCardBackground(ctx, layout.width, layout.height);

  const glyph = 52;
  drawBrandGlyph(ctx, layout.header.x, layout.header.y + 4, glyph);
  drawWordmark(ctx, layout.header.x + glyph + 14, layout.header.y + 38, 32);
  ctx.font = `600 20px ${FONT}`;
  ctx.fillStyle = MUTED;
  ctx.textBaseline = "alphabetic";
  ctx.fillText(input.copy.brandMark, layout.header.x + glyph + 14, layout.header.y + 66);

  ctx.font = `700 28px ${FONT}`;
  ctx.fillStyle = INK;
  ctx.fillText(input.copy.headline, layout.header.x, layout.header.y + layout.header.h - 8);

  drawCoverImage(
    ctx,
    beforeImg,
    layout.before.x,
    layout.before.y,
    layout.before.w,
    layout.before.h,
    layout.radius,
  );
  drawCoverImage(
    ctx,
    afterImg,
    layout.after.x,
    layout.after.y,
    layout.after.w,
    layout.after.h,
    layout.radius,
  );

  const drawCaption = (label: string, date: string, box: typeof layout.beforeLabel) => {
    ctx.font = `700 18px ${FONT}`;
    ctx.fillStyle = TEAL;
    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";
    ctx.fillText(label.toUpperCase(), box.x + box.w / 2, box.y + 22);
    ctx.font = `600 22px ${FONT}`;
    ctx.fillStyle = INK;
    ctx.fillText(formatShareDate(date), box.x + box.w / 2, box.y + 50);
    ctx.textAlign = "left";
  };
  drawCaption(input.copy.beforeLabel, input.before.date, layout.beforeLabel);
  drawCaption(input.copy.afterLabel, input.after.date, layout.afterLabel);

  ctx.strokeStyle = "rgba(47, 143, 140, 0.22)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(layout.footer.x, layout.footer.y);
  ctx.lineTo(layout.footer.x + layout.footer.w, layout.footer.y);
  ctx.stroke();

  ctx.textAlign = "left";
  ctx.font = `600 22px ${FONT}`;
  ctx.fillStyle = MUTED;
  const discLines = wrapLines(
    input.copy.disclaimer,
    layout.footer.w,
    (s) => ctx.measureText(s).width,
    2,
  );
  discLines.forEach((line, i) => {
    ctx.fillText(line, layout.footer.x, layout.footer.y + 36 + i * 28);
  });

  ctx.font = `700 28px ${FONT}`;
  ctx.fillStyle = TEAL;
  ctx.fillText(
    input.copy.ctaLine,
    layout.footer.x,
    layout.footer.y + layout.footer.h - 8,
  );

  return canvasToPngBlob(canvas);
}

export async function renderStreakCard(input: {
  days: number;
  copy: StreakCardCopy;
}): Promise<Blob> {
  await document.fonts?.ready?.catch?.(() => undefined);

  const layout = streakCardLayout();
  const canvas = createCardCanvas(layout.width, layout.height);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("image_render_empty");

  fillCardBackground(ctx, layout.width, layout.height);

  const glyph = 56;
  drawBrandGlyph(ctx, layout.brand.x, layout.brand.y + 6, glyph);
  drawWordmark(ctx, layout.brand.x + glyph + 16, layout.brand.y + 44, 36);
  ctx.font = `600 22px ${FONT}`;
  ctx.fillStyle = MUTED;
  ctx.textBaseline = "alphabetic";
  ctx.fillText(input.copy.brandMark, layout.brand.x + glyph + 16, layout.brand.y + 76);

  ctx.textAlign = "center";
  ctx.font = `800 220px ${FONT}`;
  ctx.fillStyle = TEAL;
  ctx.fillText(String(Math.max(0, Math.floor(input.days))), layout.width / 2, layout.number.y + 190);

  ctx.font = `700 36px ${FONT}`;
  ctx.fillStyle = INK;
  const headlineLines = wrapLines(
    input.copy.headline,
    layout.sub.w,
    (s) => ctx.measureText(s).width,
    2,
  );
  headlineLines.forEach((line, i) => {
    ctx.fillText(line, layout.width / 2, layout.sub.y + 36 + i * 42);
  });

  ctx.font = `600 26px ${FONT}`;
  ctx.fillStyle = MUTED;
  const subLines = wrapLines(
    input.copy.sub,
    layout.sub.w,
    (s) => ctx.measureText(s).width,
    2,
  );
  subLines.forEach((line, i) => {
    ctx.fillText(line, layout.width / 2, layout.sub.y + 36 + headlineLines.length * 42 + 10 + i * 34);
  });

  ctx.font = `700 28px ${FONT}`;
  ctx.fillStyle = TEAL;
  ctx.fillText(input.copy.ctaLine, layout.width / 2, layout.footer.y + 56);
  ctx.textAlign = "left";

  return canvasToPngBlob(canvas);
}
