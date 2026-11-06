export type ShellSceneName = "room" | "lobby";

export type ShellSprite = {
  id: string;
  x: number;
  y: number;
  facing: "left" | "right";
  art: readonly string[];
  local?: boolean;
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
