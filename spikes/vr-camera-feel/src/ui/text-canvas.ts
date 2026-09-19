import { CanvasTexture, LinearFilter, SRGBColorSpace } from "three";

export type TextCanvas = {
  texture: CanvasTexture;
  draw(lines: string[], colors?: (string | undefined)[]): void;
  dispose(): void;
};

/** A 2D canvas used as a texture: the cheapest way to show changing text inside a WebXR scene. */
export function createTextCanvas(width: number, height: number, fontPx: number): TextCanvas {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("2D canvas is not available");
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.minFilter = LinearFilter;
  texture.generateMipmaps = false;
  const lineHeight = Math.round(fontPx * 1.35);

  return {
    texture,
    draw(lines, colors = []) {
      ctx.fillStyle = "#0b0d11";
      ctx.fillRect(0, 0, width, height);
      ctx.font = `${fontPx}px ui-monospace, Menlo, monospace`;
      ctx.textBaseline = "top";
      lines.forEach((line, i) => {
        ctx.fillStyle = colors[i] ?? "#e6e8ec";
        ctx.fillText(line, 12, 8 + i * lineHeight);
      });
      texture.needsUpdate = true;
    },
    dispose() {
      texture.dispose();
    },
  };
}
