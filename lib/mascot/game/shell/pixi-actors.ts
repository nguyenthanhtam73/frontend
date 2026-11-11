import { AnimatedSprite, Application, Assets, Container, Graphics, Spritesheet, TextureStyle, type Ticker } from "pixi.js";

import { rendererResolution } from "@/lib/game/core/dpr";
import {
  SHEET_ANCHOR_Y,
  SHEET_FRAME,
  actorClip,
  lookFromArt,
  sheetJsonUrl,
  sheetKey,
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

export function loadActorSheet(outfit: string, hair: string): Promise<Spritesheet> {
  applyLinearScaleMode();
  const key = sheetKey(outfit, hair);
  let pending = sheets.get(key);
  if (!pending) {
    pending = Assets.load<Spritesheet>(sheetJsonUrl(outfit, hair)).then((sheet) => {
      const texture = Object.values(sheet.textures)[0];
      if (texture?.source) {
        texture.source.scaleMode = "linear";
        texture.source.autoGenerateMipmaps = true;
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
  shadow: Graphics;
  anim: AnimatedSprite;
  clip: ActorClip;
  height: number;
};

export function createActor(sheet: Spritesheet, key: string): ActorNodes {
  const root = new Container();
  root.sortableChildren = true;
  root.eventMode = "none";
  const shadow = new Graphics();
  shadow.ellipse(0, 2, 48, 12).fill({ color: 0x3c2a30, alpha: 0.22 });
  shadow.zIndex = 0;
  shadow.eventMode = "none";
  const frames = sheet.animations.idle ?? sheet.animations.walk ?? [];
  const anim = new AnimatedSprite(frames);
  anim.anchor.set(0.5, SHEET_ANCHOR_Y);
  anim.animationSpeed = 0.08;
  anim.loop = true;
  anim.autoUpdate = false;
  anim.roundPixels = true;
  anim.zIndex = 1;
  anim.eventMode = "none";
  anim.play();
  root.addChild(shadow, anim);
  return { key, root, shadow, anim, clip: "idle", height: 0 };
}

export function setActorClip(actor: ActorNodes, sheet: Spritesheet, clip: ActorClip): void {
  if (actor.clip === clip) return;
  const frames = sheet.animations[clip];
  if (!frames?.length) return;
  actor.clip = clip;
  actor.anim.textures = frames;
  actor.anim.animationSpeed = clip === "walk" ? 0.2 : clip === "wave" ? 0.16 : 0.07;
  actor.anim.gotoAndPlay(0);
}

export function layoutActor(actor: ActorNodes, height: number): void {
  const next = Math.max(48, Math.round(height));
  if (actor.height === next) return;
  actor.height = next;
  const anim = actor.anim;
  anim.height = next;
  anim.width = next * (SHEET_FRAME.w / SHEET_FRAME.h);
  const scale = next / SHEET_FRAME.h;
  actor.shadow.scale.set(scale);
}

export function stepActors(actors: Iterable<ActorNodes>, ticker: Ticker): void {
  for (const actor of actors) actor.anim.update(ticker);
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
  let busy = false;

  const tick = (ticker: Ticker) => {
    const people = options.root.querySelectorAll<HTMLElement>("[data-actor]");
    const live = new Set<string>();
    const rootBox = options.root.getBoundingClientRect();
    const scale = rootBox.width / (options.root.clientWidth || 1) || 1;
    people.forEach((el, index) => {
      const id = el.dataset.friendId || el.dataset.spaYou || `actor-${index}`;
      live.add(id);
      const outfit = el.dataset.outfit || "outfit_pajamas";
      const hair = el.dataset.hair || "hair_sleep_buns";
      const key = sheetKey(outfit, hair);
      const have = actors.get(id);
      if (!have || have.nodes.key !== key) {
        if (have) destroyActor(have.nodes);
        actors.delete(id);
        if (busy) return;
        busy = true;
        void loadActorSheet(outfit, hair)
          .then((sheet) => {
            const nodes = createActor(sheet, key);
            nodes.root.zIndex = index;
            app.stage.addChild(nodes.root);
            actors.set(id, { nodes, sheet });
          })
          .catch(() => undefined)
          .finally(() => {
            busy = false;
          });
        return;
      }
      const art = el.querySelector<HTMLElement>(".beda-spa-art") ?? el;
      const box = art.getBoundingClientRect();
      const moving = el.dataset.moving === "1";
      const clip = actorClip(moving, el.dataset.pose);
      setActorClip(have.nodes, have.sheet, clip);
      layoutActor(have.nodes, box.height / scale || 140);
      have.nodes.root.position.set(
        Math.round((box.left + box.width / 2 - rootBox.left) / scale),
        Math.round((box.bottom - rootBox.top) / scale),
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
      app.ticker.remove(tick);
      for (const actor of actors.values()) destroyActor(actor.nodes);
      actors.clear();
      app.destroy({ removeView: false }, { children: true, texture: false, textureSource: false });
    },
  };
}

export function actorLookFromArt(art: readonly string[]): { outfit: string; hair: string; key: string } {
  const look = lookFromArt(art);
  return { ...look, key: sheetKey(look.outfit, look.hair) };
}
