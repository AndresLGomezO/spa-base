export const CROP_PREVIEW_SIZE = 320;
export const CROP_OUTPUT_SIZE = 400;
const JPEG_QUALITY = 0.9;
export const KEYBOARD_STEP = 10;

const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;

export function validateFile(file: File): string | null {
  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    return "Please choose a JPEG, PNG, or WebP image.";
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return "Image must be 5 MB or smaller.";
  }
  return null;
}

export function computeLayout(
  naturalW: number,
  naturalH: number,
  cropSize: number,
) {
  const scale = Math.max(cropSize / naturalW, cropSize / naturalH);
  const displayW = naturalW * scale;
  const displayH = naturalH * scale;
  const x = (cropSize - displayW) / 2;
  const y = (cropSize - displayH) / 2;
  return { scale, displayW, displayH, x, y };
}

export function clamp(
  pos: { x: number; y: number },
  displayW: number,
  displayH: number,
  cropSize: number,
) {
  return {
    x: Math.max(cropSize - displayW, Math.min(0, pos.x)),
    y: Math.max(cropSize - displayH, Math.min(0, pos.y)),
  };
}

export function outputFormatForSourceFile(file: File): {
  readonly mime: string;
  readonly extension: string;
  readonly supportsAlpha: boolean;
} {
  switch (file.type) {
    case "image/png":
      return { mime: "image/png", extension: "png", supportsAlpha: true };
    case "image/webp":
      return { mime: "image/webp", extension: "webp", supportsAlpha: true };
    default:
      return { mime: "image/jpeg", extension: "jpg", supportsAlpha: false };
  }
}

export function cropImageToBlob(params: {
  readonly img: HTMLImageElement;
  readonly file: File;
  readonly position: { readonly x: number; readonly y: number };
  readonly scale: number;
  readonly cropSize: number;
  readonly outputSize: number;
}): Promise<File> {
  const { img, file, position, scale, cropSize, outputSize } = params;
  const sx = -position.x / scale;
  const sy = -position.y / scale;
  const size = cropSize / scale;

  const canvas = document.createElement("canvas");
  canvas.width = outputSize;
  canvas.height = outputSize;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return Promise.reject(new Error("Failed to initialize canvas."));
  }

  const output = outputFormatForSourceFile(file);
  if (output.supportsAlpha) {
    ctx.clearRect(0, 0, outputSize, outputSize);
  }

  ctx.drawImage(img, sx, sy, size, size, 0, 0, outputSize, outputSize);

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Failed to process image."));
          return;
        }
        const baseName = file.name.replace(/\.[^.]+$/, "") || "photo";
        resolve(
          new File([blob], `${baseName}.${output.extension}`, {
            type: output.mime,
          }),
        );
      },
      output.mime,
      output.mime === "image/jpeg" ? JPEG_QUALITY : undefined,
    );
  });
}

export function createUploadId(): string {
  return crypto.randomUUID();
}
