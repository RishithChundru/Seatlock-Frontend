/** Rectangle in CSS pixels, as returned by getBoundingClientRect(). */
export type Box = { left: number; top: number; width: number; height: number };

/**
 * Which part of the camera image is visible inside the on-screen viewfinder square.
 * The <video> uses object-fit: cover, so the image is scaled up to fill the element and the overflow
 * is cut off equally on both sides; we undo that to get source-pixel coordinates to crop and decode.
 */
export function viewfinderCrop(video: Box, square: Box, videoWidth: number, videoHeight: number) {
  const scale = Math.max(video.width / videoWidth, video.height / videoHeight);
  const offsetX = (video.width - videoWidth * scale) / 2;  // <= 0: hidden overflow on the left
  const offsetY = (video.height - videoHeight * scale) / 2;
  const x = (square.left - video.left - offsetX) / scale;
  const y = (square.top - video.top - offsetY) / scale;
  const size = square.width / scale;
  // Clamp to the image so a viewfinder at the screen edge never asks for pixels that don't exist.
  const sx = Math.max(0, Math.round(x)), sy = Math.max(0, Math.round(y));
  return {
    sx, sy,
    sw: Math.min(videoWidth - sx, Math.round(size)),
    sh: Math.min(videoHeight - sy, Math.round(square.height / scale)),
  };
}

/** Accept a code only after the same value is read in `needed` consecutive frames. */
export function makeConfirmer(needed = 2) {
  let last: string | null = null;
  let hits = 0;
  return (value: string | null): string | null => {
    if (!value) { last = null; hits = 0; return null; }
    hits = value === last ? hits + 1 : 1;
    last = value;
    return hits >= needed ? value : null;
  };
}
