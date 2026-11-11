export type ShellSceneName = "room" | "lobby";

export type ShellSprite = {
  id: string;
  x: number;
  y: number;
  facing: "left" | "right";
  art: readonly string[];
  local?: boolean;
  /** Idle, walk, or wave. The walker still wins while the feet are moving. */
  motion?: "idle" | "walk" | "wave";
};

export type ShellSnapshot = {
  scene: ShellSceneName;
  sky: string;
  sprites: readonly ShellSprite[];
};

export type ShellApi = {
  zoomBy: (factor: number) => void;
  recenter: () => void;
  panBy: (dx: number, dy: number, user?: boolean) => void;
};
