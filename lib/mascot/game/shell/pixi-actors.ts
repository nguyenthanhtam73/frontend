import { AnimatedSprite, Application, Assets, Container, Sprite, Spritesheet, TextureStyle, type Ticker } from "pixi.js";

import { rendererResolution } from "@/lib/game/core/dpr";
import { mascotAssetUrl } from "@/lib/mascot/asset-url";
import { createBlinkClock, stepBlinkClock, type BlinkClock } from "@/lib/mascot/idle";
import { actorSheetPlan, attachIfMounted, createShellLife, destroyShellLife, setActorReady } from "@/lib/mascot/game/shell/pixi-guard";
import {
  IDLE_BLINK_FRAME,
  SHEET_ANCHOR_Y,
  actorClip,
  idleLoopIndexes,
  sheetJsonUrlFromArt,
  sheetKeyFromArt,
  type ActorClip,
} from "@/lib/mascot/game/actor-sheet";

/**
 * Bé Da on a spritesheet.
 * https://pixijs.com/8.x/guides/components/assets
 * https://pixijs.com/8.x/guides/components/textures
 * AnimatedSprite advances with the application ticker's deltaTime, not Ticker.shared.
 */

const sheets = new Map<string, Promise<Spritesheet>>();

let scaleModeSet = false;

export function applyLinearScaleMode(): void {
  if (scaleModeSet) return;
  scaleModeSet = true;
  TextureStyle.defaultOptions.scaleMode = "linear";
}

export function loadActorSheet(art: readonly string[]): Promise<Spritesheet> {
  applyLinearScaleMode();
  const key = sheetKeyFromArt(art);
  let pending = sheets.get(key);
  if (!pending) {
    // The JSON URL carries `?v=`. Pixi's spritesheet parser copies that query
    // onto the sibling PNG, so the raster is not stuck on the old immutable copy.
    // The map key is sheetKeyFromArt, which ignores the query.
    pending = Assets.load<Spritesheet>(mascotAssetUrl(sheetJsonUrlFromArt(art))).then((sheet) => {
      const texture = Object.values(sheet.textures)[0];
      if (texture?.source) {
        // Full-resolution sample. Mipmaps would pick a soft level on a phone.
        texture.source.scaleMode = "linear";
        texture.source.autoGenerateMipmaps = false;
      }
      return sheet;
    });
    sheets.set(key, pending);
  }
  return pending;
}

export type ActorNodes = {
  key: string;
  root: Container;
  anim: AnimatedSprite;
  clip: ActorClip;
  height: number;
  /** Closed-eye idle frame. Alpha is this character's own blink. */
  blink: Sprite | null;
  clock: BlinkClock;
};

function clipFrames(sheet: Spritesheet, clip: ActorClip) {
  const frames = sheet.animations[clip] ?? [];
  if (clip !== "idle" || frames.length === 0) return frames;
  const open = idleLoopIndexes(frames.length).map((index) => frames[index]).filter((frame) => frame != null);
  return open.length > 0 ? open : frames;
}

function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;
}

export function createActor(sheet: Spritesheet, key: string): ActorNodes {
  const root = new Container();
  root.eventMode = "none";
  const idle = sheet.animations.idle ?? [];
  const frames = clipFrames(sheet, "idle");
  const anim = new AnimatedSprite(frames.length > 0 ? frames : (sheet.animations.walk ?? idle));
  anim.anchor.set(0.5, SHEET_ANCHOR_Y);
  anim.animationSpeed = 0.08;
  anim.loop = true;
  anim.autoUpdate = false;
  anim.roundPixels = true;
  anim.eventMode = "none";
  anim.play();
  root.addChild(anim);
  const blinkTexture = idle[IDLE_BLINK_FRAME];
  let blink: Sprite | null = null;
  if (blinkTexture && frames.length > 0 && frames.length < idle.length) {
    blink = new Sprite(blinkTexture);
    blink.anchor.set(0.5, SHEET_ANCHOR_Y);
    blink.alpha = 0;
    blink.roundPixels = true;
    blink.eventMode = "none";
    root.addChild(blink);
  }
  return { key, root, anim, clip: "idle", height: 0, blink, clock: createBlinkClock(Math.random()) };
}

export function setActorClip(actor: ActorNodes, sheet: Spritesheet, clip: ActorClip): void {
  if (actor.clip === clip) return;
  const frames = clipFrames(sheet, clip);
  if (!frames?.length) return;
  actor.clip = clip;
  actor.anim.textures = frames;
  actor.anim.animationSpeed = clip === "walk" ? 0.2 : clip === "wave" ? 0.16 : 0.07;
  actor.anim.gotoAndPlay(0);
  if (clip !== "idle" && actor.blink) actor.blink.alpha = 0;
}

export function layoutActor(actor: ActorNodes, height: number): void {
  const next = Math.max(48, Math.round(height));
  const width = next * (220 / 250);
  if (actor.height !== next) {
    actor.height = next;
    actor.anim.height = next;
    actor.anim.width = width;
  }
  if (actor.blink && (actor.blink.height !== next || actor.blink.width !== width)) {
    actor.blink.height = next;
    actor.blink.width = width;
  }
}

export function stepActors(actors: Iterable<ActorNodes>, ticker: Ticker): void {
  const reduced = prefersReducedMotion();
  for (const actor of actors) {
    actor.anim.update(ticker);
    if (!actor.blink) continue;
    const alpha = stepBlinkClock(actor.clock, Math.min(ticker.deltaMS || 0, 100), Math.random, reduced);
    actor.blink.alpha = actor.clip === "idle" ? alpha : 0;
  }
}

export function destroyActor(actor: ActorNodes): void {
  actor.root.destroy({ children: true, texture: false, textureSource: false });
}

type LayerOptions = {
  canvas: HTMLCanvasElement;
  root: HTMLElement;
};

/** Transparent character layer. The room photo and the DOM names stay put. */
export async function startActorLayer(options: LayerOptions): Promise<{ destroy: () => void }> {
  applyLinearScaleMode();
  const app = new Application();
  const viewW = options.root.clientWidth || 1;
  const viewH = options.root.clientHeight || 1;
  await app.init({
    canvas: options.canvas,
    resizeTo: options.root,
    resolution: rendererResolution(window.devicePixelRatio || 1, viewW, viewH),
    autoDensity: true,
    antialias: false,
    backgroundAlpha: 0,
    preference: "webgl",
    powerPreference: "low-power",
  });
  app.ticker.maxFPS = 60;
  app.ticker.minFPS = 20;
  app.stage.sortableChildren = true;

  const actors = new Map<string, { nodes: ActorNodes; sheet: Spritesheet }>();
  const failed = new Set<string>();
  const life = createShellLife();
  let busy = false;

  const tick = (ticker: Ticker) => {
    if (life.destroyed) return;
    const people = options.root.querySelectorAll<HTMLElement>("[data-actor]");
    const live = new Set<string>();
    const rootBox = options.root.getBoundingClientRect();
    const scale = rootBox.width / (options.root.clientWidth || 1) || 1;
    people.forEach((el, index) => {
      const id = el.dataset.friendId || el.dataset.spaYou || `actor-${index}`;
      live.add(id);
      const layers = (el.dataset.art ?? "").split(/\s+/).filter(Boolean);
      const key = sheetKeyFromArt(layers);
      const have = actors.get(id);
      if (!layers.length) return;
      const plan = actorSheetPlan({
        ready: Boolean(have && have.nodes.key === key),
        failed: failed.has(key),
        busy,
      });
      if (plan === "fallback") {
        el.dataset.actorFallback = "1";
        delete el.dataset.actorReady;
        return;
      }
      delete el.dataset.actorFallback;
      if (plan === "wait") return;
      if (plan === "start") {
        setActorReady(el.dataset, false);
        if (have) destroyActor(have.nodes);
        actors.delete(id);
        busy = true;
        const person = el;
        void loadActorSheet(layers)
          .then((sheet) => {
            if (life.destroyed) return;
            const nodes = createActor(sheet, key);
            const attached = attachIfMounted(life, nodes, (ready) => {
              ready.root.zIndex = index;
              app.stage.addChild(ready.root);
              actors.set(id, { nodes: ready, sheet });
            });
            if (!attached) destroyActor(nodes);
            else setActorReady(person.dataset, true);
            delete person.dataset.actorFallback;
          })
          .catch(() => {
            failed.add(key);
            person.dataset.actorFallback = "1";
            delete person.dataset.actorReady;
          })
          .finally(() => {
            busy = false;
          });
        return;
      }
      if (!have) return;
      setActorReady(el.dataset, true);
      const art = el.querySelector<HTMLElement>(".beda-spa-art") ?? el;
      const box = art.getBoundingClientRect();
      const moving = el.dataset.moving === "1";
      const clip = actorClip(moving, el.dataset.pose);
      setActorClip(have.nodes, have.sheet, clip);
      const drawn = box.height / scale || 140;
      layoutActor(have.nodes, drawn);
      have.nodes.root.position.set(
        Math.round((box.left + box.width / 2 - rootBox.left) / scale),
        Math.round((box.bottom - rootBox.top) / scale - (1 - SHEET_ANCHOR_Y) * have.nodes.anim.height),
      );
      have.nodes.root.scale.x = el.dataset.face === "left" ? -1 : 1;
      have.nodes.root.zIndex = Math.round((box.bottom - rootBox.top) / scale);
      have.nodes.anim.update(ticker);
    });
    for (const [id, actor] of actors) {
      if (live.has(id)) continue;
      destroyActor(actor.nodes);
      actors.delete(id);
    }
  };
  app.ticker.add(tick);

  return {
    destroy() {
      destroyShellLife(life, () => undefined);
      app.ticker.remove(tick);
      for (const actor of actors.values()) destroyActor(actor.nodes);
      actors.clear();
      app.destroy({ removeView: false }, { children: true, texture: false, textureSource: false });
    },
  };
}

export function actorLookFromArt(art: readonly string[]): { key: string } {
  return { key: sheetKeyFromArt(art) };
}
