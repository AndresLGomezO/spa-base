import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
} from "react";

import { Button } from "../button/Button";
import { Modal } from "../modal/Modal";
import { Text } from "../typography/Text";
import {
  clamp,
  computeLayout,
  CROP_OUTPUT_SIZE,
  CROP_PREVIEW_SIZE,
  cropImageToBlob,
  KEYBOARD_STEP,
  validateFile,
} from "./photo-upload.utils";

export type PhotoCropShape = "circle" | "rect";

interface PhotoCropDialogLabels {
  readonly title?: string;
  readonly description?: string;
  readonly upload?: string;
  readonly cancel?: string;
  readonly reset?: string;
}

interface PhotoCropDialogProps {
  readonly open: boolean;
  readonly file: File | null;
  readonly cropShape?: PhotoCropShape;
  readonly uploading?: boolean;
  readonly labels?: PhotoCropDialogLabels;
  readonly onOpenChange: (open: boolean) => void;
  readonly onCropComplete: (file: File) => void;
}

function useValidationError(open: boolean, file: File | null): string | null {
  return useMemo(
    () => (open && file ? validateFile(file) : null),
    [open, file],
  );
}

function useImageUrl(
  open: boolean,
  file: File | null,
  validationError: string | null,
) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !file || validationError) {
      queueMicrotask(() => setImageUrl(null));
      return;
    }
    const url = URL.createObjectURL(file);
    queueMicrotask(() => setImageUrl(url));
    return () => URL.revokeObjectURL(url);
  }, [open, file, validationError]);

  return imageUrl;
}

export function PhotoCropDialog({
  open,
  file,
  cropShape = "rect",
  uploading = false,
  labels,
  onOpenChange,
  onCropComplete,
}: PhotoCropDialogProps) {
  const validationError = useValidationError(open, file);
  const imageUrl = useImageUrl(open, file, validationError);
  const cropKey = open && file ? `${file.name}-${file.size}` : "closed";

  const handleOpenChange = useCallback(
    (next: boolean) => {
      if (uploading) return;
      onOpenChange(next);
    },
    [onOpenChange, uploading],
  );

  return (
    <Modal
      open={open}
      onClose={() => handleOpenChange(false)}
      title={labels?.title ?? "Crop photo"}
    >
      <CropDialogContent
        key={cropKey}
        imageUrl={imageUrl}
        validationError={validationError}
        file={file}
        cropShape={cropShape}
        uploading={uploading}
        labels={labels}
        onCropComplete={onCropComplete}
        onOpenChange={handleOpenChange}
      />
    </Modal>
  );
}

interface CropDialogContentProps {
  readonly imageUrl: string | null;
  readonly validationError: string | null;
  readonly file: File | null;
  readonly cropShape: PhotoCropShape;
  readonly uploading: boolean;
  readonly labels?: PhotoCropDialogLabels;
  readonly onCropComplete: (file: File) => void;
  readonly onOpenChange: (open: boolean) => void;
}

function CropDialogContent({
  imageUrl,
  validationError,
  file,
  cropShape,
  uploading,
  labels,
  onCropComplete,
  onOpenChange,
}: CropDialogContentProps) {
  const S = CROP_PREVIEW_SIZE;

  const [imageLoaded, setImageLoaded] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [initialPosition, setInitialPosition] = useState({ x: 0, y: 0 });
  const [displaySize, setDisplaySize] = useState({ w: 0, h: 0 });
  const [cropError, setCropError] = useState<string | null>(null);

  const imgRef = useRef<HTMLImageElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{
    startX: number;
    startY: number;
    startPos: { x: number; y: number };
  } | null>(null);
  const positionRef = useRef(position);
  const scaleRef = useRef(1);
  const imgSizeRef = useRef({ w: 0, h: 0 });
  const rafRef = useRef(0);

  useEffect(() => {
    positionRef.current = position;
  }, [position]);

  const handleImageLoad = useCallback(() => {
    const img = imgRef.current;
    if (!img) return;
    const { naturalWidth: w, naturalHeight: h } = img;
    if (w <= 0 || h <= 0) return;
    const layout = computeLayout(w, h, S);
    scaleRef.current = layout.scale;
    imgSizeRef.current = { w, h };
    setDisplaySize({ w: layout.displayW, h: layout.displayH });
    setInitialPosition({ x: layout.x, y: layout.y });
    setPosition({ x: layout.x, y: layout.y });
    setImageLoaded(true);
  }, [S]);

  const clampPosition = useCallback(
    (x: number, y: number) => {
      const { w, h } = imgSizeRef.current;
      const scale = scaleRef.current;
      return clamp({ x, y }, w * scale, h * scale, S);
    },
    [S],
  );

  const handlePointerDown = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      if (!imageLoaded) return;
      event.preventDefault();
      dragRef.current = {
        startX: event.clientX,
        startY: event.clientY,
        startPos: { ...positionRef.current },
      };
      overlayRef.current?.setPointerCapture(event.pointerId);
    },
    [imageLoaded],
  );

  const handlePointerMove = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      const drag = dragRef.current;
      if (!drag) return;
      const dx = event.clientX - drag.startX;
      const dy = event.clientY - drag.startY;
      cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        if (!dragRef.current) return;
        setPosition(clampPosition(drag.startPos.x + dx, drag.startPos.y + dy));
      });
    },
    [clampPosition],
  );

  const handlePointerUp = useCallback((event: PointerEvent<HTMLDivElement>) => {
    overlayRef.current?.releasePointerCapture(event.pointerId);
    dragRef.current = null;
    cancelAnimationFrame(rafRef.current);
  }, []);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      if (!imageLoaded) return;
      let dx = 0;
      let dy = 0;
      switch (event.key) {
        case "ArrowLeft":
          dx = KEYBOARD_STEP;
          break;
        case "ArrowRight":
          dx = -KEYBOARD_STEP;
          break;
        case "ArrowUp":
          dy = KEYBOARD_STEP;
          break;
        case "ArrowDown":
          dy = -KEYBOARD_STEP;
          break;
        default:
          return;
      }
      event.preventDefault();
      setPosition((prev) => clampPosition(prev.x + dx, prev.y + dy));
    },
    [clampPosition, imageLoaded],
  );

  const handleReset = useCallback(() => {
    setPosition(initialPosition);
    setCropError(null);
  }, [initialPosition]);

  const handleCrop = useCallback(async () => {
    const img = imgRef.current;
    if (!file || !img || !imageLoaded) return;
    setCropError(null);
    try {
      const croppedFile = await cropImageToBlob({
        img,
        file,
        position: positionRef.current,
        scale: scaleRef.current,
        cropSize: S,
        outputSize: CROP_OUTPUT_SIZE,
      });
      onCropComplete(croppedFile);
    } catch (error) {
      setCropError(
        error instanceof Error ? error.message : "Failed to process image.",
      );
    }
  }, [file, imageLoaded, onCropComplete, S]);

  useEffect(() => {
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  const errorMessage = validationError ?? cropError;
  const maskClassName =
    cropShape === "circle"
      ? "rounded-full border-2 border-dashed border-primary/80"
      : "rounded-lg border-2 border-dashed border-primary/80";

  return (
    <>
      {labels?.description ? (
        <Text className="text-muted-foreground text-sm">
          {labels.description}
        </Text>
      ) : null}

      <div className="space-y-4 py-2">
        {errorMessage ? (
          <Text className="text-destructive text-sm" role="alert">
            {errorMessage}
          </Text>
        ) : file && imageUrl ? (
          <div
            className="bg-muted relative mx-auto overflow-hidden rounded-lg"
            style={{ width: S, height: S }}
          >
            <img
              ref={imgRef}
              src={imageUrl}
              alt=""
              className="pointer-events-none absolute left-0 top-0 max-w-none select-none"
              style={{
                transform: `translate3d(${position.x}px, ${position.y}px, 0)`,
                width: displaySize.w,
                height: displaySize.h,
                willChange: "transform",
              }}
              onLoad={handleImageLoad}
              draggable={false}
            />
            <div
              ref={overlayRef}
              role="application"
              aria-label="Crop area — drag or use arrow keys to position image"
              aria-roledescription="image crop control"
              tabIndex={0}
              className="absolute inset-0 cursor-grab outline-none active:cursor-grabbing focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              style={{ touchAction: "none" }}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
              onKeyDown={handleKeyDown}
            />
            <div
              className={`pointer-events-none absolute inset-0 ${maskClassName}`}
              aria-hidden
            />
          </div>
        ) : file ? (
          <div
            className="bg-muted mx-auto flex items-center justify-center rounded-lg"
            style={{ width: S, height: S }}
          >
            <Text className="text-muted-foreground text-sm">Loading…</Text>
          </div>
        ) : null}
      </div>

      <div className="flex flex-wrap justify-end gap-2">
        {imageLoaded ? (
          <Button
            type="button"
            variant="outline"
            onClick={handleReset}
            disabled={uploading}
          >
            {labels?.reset ?? "Reset"}
          </Button>
        ) : null}
        <Button
          type="button"
          variant="outline"
          onClick={() => onOpenChange(false)}
          disabled={uploading}
        >
          {labels?.cancel ?? "Cancel"}
        </Button>
        <Button
          type="button"
          onClick={() => void handleCrop()}
          disabled={!imageLoaded || uploading || Boolean(validationError)}
          loading={uploading}
        >
          {labels?.upload ?? "Upload"}
        </Button>
      </div>
    </>
  );
}
