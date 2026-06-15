const CROP_PREVIEW_MAX_EDGE = 320;
const CROP_OUTPUT_MAX_EDGE = 400;
export const KEYBOARD_STEP = 10;

export type PhotoCropFrame = "square" | "landscape43" | "landscape169";

interface CropDimensions {
  readonly previewW: number;
  readonly previewH: number;
  readonly outputW: number;
  readonly outputH: number;
}

const JPEG_QUALITY = 0.9;

const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
export const DEFAULT_IMAGE_MAX_SIZE_BYTES = 5 * 1024 * 1024;

function formatMaxSizeMb(maxSizeBytes: number): string {
  const mb = maxSizeBytes / (1024 * 1024);
  return Number.isInteger(mb) ? String(mb) : mb.toFixed(1);
}

export function validateFile(
  file: File,
  maxSizeBytes: number = DEFAULT_IMAGE_MAX_SIZE_BYTES,
): string | null {
  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    return "Please choose a JPEG, PNG, or WebP image.";
  }
  if (file.size > maxSizeBytes) {
    return `Image must be ${formatMaxSizeMb(maxSizeBytes)} MB or smaller.`;
  }
  return null;
}

function scaleDimensions(
  width: number,
  height: number,
  maxEdge: number,
): { readonly w: number; readonly h: number } {
  const scale = maxEdge / Math.max(width, height);
  return {
    w: Math.round(width * scale),
    h: Math.round(height * scale),
  };
}

export function resolveCropDimensions(frame: PhotoCropFrame): CropDimensions {
  switch (frame) {
    case "square": {
      const preview = scaleDimensions(1, 1, CROP_PREVIEW_MAX_EDGE);
      const output = scaleDimensions(1, 1, CROP_OUTPUT_MAX_EDGE);
      return {
        previewW: preview.w,
        previewH: preview.h,
        outputW: output.w,
        outputH: output.h,
      };
    }
    case "landscape43": {
      const preview = scaleDimensions(4, 3, CROP_PREVIEW_MAX_EDGE);
      const output = scaleDimensions(4, 3, CROP_OUTPUT_MAX_EDGE);
      return {
        previewW: preview.w,
        previewH: preview.h,
        outputW: output.w,
        outputH: output.h,
      };
    }
    case "landscape169": {
      const preview = scaleDimensions(16, 9, CROP_PREVIEW_MAX_EDGE);
      const output = scaleDimensions(16, 9, CROP_OUTPUT_MAX_EDGE);
      return {
        previewW: preview.w,
        previewH: preview.h,
        outputW: output.w,
        outputH: output.h,
      };
    }
  }
}

export function computeLayout(
  naturalW: number,
  naturalH: number,
  cropW: number,
  cropH: number,
) {
  const scale = Math.max(cropW / naturalW, cropH / naturalH);
  const displayW = naturalW * scale;
  const displayH = naturalH * scale;
  const x = (cropW - displayW) / 2;
  const y = (cropH - displayH) / 2;
  return { scale, displayW, displayH, x, y };
}

export function clamp(
  pos: { x: number; y: number },
  displayW: number,
  displayH: number,
  cropW: number,
  cropH: number,
) {
  return {
    x: Math.max(cropW - displayW, Math.min(0, pos.x)),
    y: Math.max(cropH - displayH, Math.min(0, pos.y)),
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
  readonly cropW: number;
  readonly cropH: number;
  readonly outputW: number;
  readonly outputH: number;
}): Promise<File> {
  const { img, file, position, scale, cropW, cropH, outputW, outputH } = params;
  const sx = -position.x / scale;
  const sy = -position.y / scale;
  const sw = cropW / scale;
  const sh = cropH / scale;

  const canvas = document.createElement("canvas");
  canvas.width = outputW;
  canvas.height = outputH;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return Promise.reject(new Error("Failed to initialize canvas."));
  }

  const output = outputFormatForSourceFile(file);
  if (output.supportsAlpha) {
    ctx.clearRect(0, 0, outputW, outputH);
  }

  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, outputW, outputH);

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
