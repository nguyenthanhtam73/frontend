import { AnimatedSprite, Application, Assets, Container, Spritesheet, TextureStyle, type Ticker } from "pixi.js";

import { rendererResolution } from "@/lib/game/core/dpr";
import { attachIfMounted, createShellLife, destroyShellLife } from "@/lib/mascot/game/shell/pixi-guard";
import {
  SHEET_ANCHOR_Y,
  actorClip,
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
    pending = Assets.load<Spritesheet>(sheetJsonUrlFromArt(art)).then((sheet) => {
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
};

export function createActor(sheet: Spritesheet, key: string): ActorNodes {
  const root = new Container();
  root.eventMode = "none";
  const frames = sheet.animations.idle ?? sheet.animations.walk ?? [];
  const anim = new AnimatedSprite(frames);
  anim.anchor.set(0.5, SHEET_ANCHOR_Y);
  anim.animationSpeed = 0.08;
  anim.loop = true;
  anim.autoUpdate = false;
  anim.roundPixels = true;
  anim.eventMode = "none";
  anim.play();
  root.addChild(anim);
  return { key, root, anim, clip: "idle", height: 0 };
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
  anim.width = next * (220 / 250);
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
      if (!have || have.nodes.key !== key) {
        if (have) destroyActor(have.nodes);
        actors.delete(id);
        if (busy) return;
        busy = true;
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
