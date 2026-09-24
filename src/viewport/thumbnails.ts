import * as THREE from "three";

import { lensToVFovDeg } from "@/domain/lens";
import type { Framing } from "@/domain/types";

const THUMB_WIDTH = 320;
const THUMB_HEIGHT = 136;

export function renderShotPixels(
  gl: THREE.WebGLRenderer,
  scene3d: THREE.Scene,
  framing: Framing,
  lensMm: number
): { pixels: Uint8Array; width: number; height: number } {
  const camera = new THREE.PerspectiveCamera(
    lensToVFovDeg(lensMm),
    THUMB_WIDTH / THUMB_HEIGHT,
    0.1,
    1000
  );
  camera.position.set(framing.position[0], framing.position[1], framing.position[2]);
  camera.lookAt(framing.aim[0], framing.aim[1], framing.aim[2]);
  camera.updateMatrixWorld(true);

  const target = new THREE.WebGLRenderTarget(THUMB_WIDTH, THUMB_HEIGHT);
  const previousTarget = gl.getRenderTarget();
  // gl.render can throw (a shader compile failure, a lost context); the
  // renderer must never stay pointed at this offscreen target after that,
  // or the live view breaks on the next frame, and the target itself must
  // never leak. Both run in finally, so they happen whether render
  // succeeds or throws.
  try {
    gl.setRenderTarget(target);
    gl.render(scene3d, camera);

    const pixels = new Uint8Array(THUMB_WIDTH * THUMB_HEIGHT * 4);
    gl.readRenderTargetPixels(target, 0, 0, THUMB_WIDTH, THUMB_HEIGHT, pixels);
    return { pixels, width: THUMB_WIDTH, height: THUMB_HEIGHT };
  } finally {
    gl.setRenderTarget(previousTarget);
    target.dispose();
  }
}

export function pixelsToPngBlob(
  pixels: Uint8Array,
  width: number,
  height: number
): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;
  const imageData = ctx.createImageData(width, height);

  // WebGL reads pixels bottom-to-top; canvas ImageData is top-to-bottom, so
  // each row is copied into its vertically mirrored position.
  const rowBytes = width * 4;
  for (let y = 0; y < height; y++) {
    const srcStart = y * rowBytes;
    const destStart = (height - 1 - y) * rowBytes;
    imageData.data.set(pixels.subarray(srcStart, srcStart + rowBytes), destStart);
  }
  ctx.putImageData(imageData, 0, 0);

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
      } else {
        reject(new Error("Thumbnail render produced no image data"));
      }
    }, "image/png");
  });
}

export async function renderShotThumbnail(
  gl: THREE.WebGLRenderer,
  scene3d: THREE.Scene,
  framing: Framing,
  lensMm: number
): Promise<Blob> {
  const { pixels, width, height } = renderShotPixels(gl, scene3d, framing, lensMm);
  return pixelsToPngBlob(pixels, width, height);
}
