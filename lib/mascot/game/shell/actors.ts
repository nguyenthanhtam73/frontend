import {
  LOBBY_BOUNDS,
  LOBBY_FOUNTAIN,
  adoptServerPoint,
  createWalker,
  lobbyWorldSpeed,
  planRemoteGlide,
  sampleGlide,
  stepWalker,
  type Bounds,
  type Glide,
  type Obstacle,
  type Point,
  type Walker,
} from "@/lib/mascot/game/walk";

export type RemoteBook = {
  glides: Map<string, Glide>;
  targets: Map<string, Point>;
};

export function emptyRemoteBook(): RemoteBook {
  return { glides: new Map(), targets: new Map() };
}

/** Other people ease between the positions the current sync already delivers. */
export function stepRemotes(
  book: RemoteBook,
  actors: readonly { id: string; x: number; y: number }[],
  now: number,
  worldW: number,
  worldH: number,
  reduced: boolean,
): Map<string, Point> {
  const live = new Set(actors.map((actor) => actor.id));
  for (const id of book.glides.keys()) {
    if (!live.has(id)) {
      book.glides.delete(id);
      book.targets.delete(id);
    }
  }
  const drawn = new Map<string, Point>();
  for (const actor of actors) {
    const known = book.targets.get(actor.id);
    if (!known || Math.hypot(known.x - actor.x, known.y - actor.y) > 0.0008) {
      book.glides.set(
        actor.id,
        planRemoteGlide(book.glides.get(actor.id) ?? null, actor.x, actor.y, now, worldW, worldH),
      );
      book.targets.set(actor.id, { x: actor.x, y: actor.y });
    }
    const glide = book.glides.get(actor.id);
    drawn.set(actor.id, glide && !reduced ? sampleGlide(glide, now) : { x: actor.x, y: actor.y });
  }
  return drawn;
}

export function stepLocal(
  walker: Walker,
  dt: number,
  bounds: Bounds,
  obstacle: Obstacle | null,
  worldPx: number,
  reduced: boolean,
): Walker {
  const speed = lobbyWorldSpeed(worldPx, 1);
  return stepWalker(walker, dt, obstacle, bounds, reduced, speed, true);
}

export function placeLocal(walker: Walker, server: Point | null, owned: boolean): void {
  if (!server || walker.goal) return;
  const next = adoptServerPoint(walker, server, owned);
  if (next.x === walker.x && next.y === walker.y) return;
  walker.x = next.x;
  walker.y = next.y;
  walker.vx = 0;
  walker.vy = 0;
}

export function lobbyWalker(at: Point): Walker {
  return createWalker(at);
}

export { LOBBY_BOUNDS, LOBBY_FOUNTAIN };
