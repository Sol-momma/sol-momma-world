// Stub — implemented in Task 11
import { createScene, type SceneHandle } from "../scene-base";

export function init(canvas: HTMLCanvasElement): SceneHandle {
  return createScene(canvas, { setup: () => {} });
}
