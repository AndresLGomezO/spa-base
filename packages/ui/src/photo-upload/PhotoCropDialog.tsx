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
import { SegmentedSwitch } from "../segmented-switch/SegmentedSwitch";
import { Text } from "../typography/Text";
import {
  clamp,
  computeLayout,
  cropImageToBlob,
  KEYBOARD_STEP,
  resolveCropDimensions,
  validateFile,
  type PhotoCropFrame,
} from "./photo-upload.utils";

export type PhotoCropShape = "circle" | "rect";

interface PhotoCropDialogLabels {
  readonly title?: string;
  readonly description?: string;
  readonly upload?: string;
  readonly uploadOriginal?: string;
  readonly uploadCropped?: string;
  readonly cancel?: string;
  readonly reset?: string;
  readonly cropFrameSquare?: string;
  readonly cropFrameLandscape43?: string;
  readonly cropFrameLandscape169?: string;
  readonly cropMaskCircle?: string;
  readonly cropMaskRect?: string;
  readonly cropFrameAriaLabel?: string;
  readonly cropMaskAriaLabel?: string;
}

interface PhotoCropDialogProps {
  readonly open: boolean;
  readonly file: File | null;
  readonly cropShape?: PhotoCropShape;
  readonly defaultCropFrame?: PhotoCropFrame;
  readonly allowOriginalUpload?: boolean;
  readonly allowCrop?: boolean;
  readonly uploading?: boolean;
  readonly layer?: "default" | "nested";
  readonly labels?: PhotoCropDialogLabels;
  readonly onOpenChange: (open: boolean) => void;
  readonly onCropComplete: (file: File) => void;
  readonly onOriginalUpload?: (file: File) => void;
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
  defaultCropFrame = "square",
  allowOriginalUpload = true,
  allowCrop = true,
  uploading = false,
  layer = "nested",
  labels,
  onOpenChange,
  onCropComplete,
  onOriginalUpload,
}: PhotoCropDialogProps) {
  const validationError = useValidationError(open, file);
  const imageUrl = useImageUrl(open, file, validationError);
  const cropKey =
    open && file ? `${file.name}-${file.size}-${defaultCropFrame}` : "closed";

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
      title={labels?.title ?? "Adjust image"}
      layer={layer}
    >
      <CropDialogContent
        key={cropKey}
        imageUrl={imageUrl}
        validationError={validationError}
        file={file}
        defaultCropFrame={defaultCropFrame}
        defaultCropShape={cropShape}
        allowOriginalUpload={allowOriginalUpload}
        allowCrop={allowCrop}
        uploading={uploading}
        labels={labels}
        onCropComplete={onCropComplete}
        onOriginalUpload={onOriginalUpload}
        onOpenChange={handleOpenChange}
      />
    </Modal>
  );
}

interface CropDialogContentProps {
  readonly imageUrl: string | null;
  readonly validationError: string | null;
  readonly file: File | null;
  readonly defaultCropFrame: PhotoCropFrame;
  readonly defaultCropShape: PhotoCropShape;
  readonly allowOriginalUpload: boolean;
  readonly allowCrop: boolean;
  readonly uploading: boolean;
  readonly labels?: PhotoCropDialogLabels;
  readonly onCropComplete: (file: File) => void;
  readonly onOriginalUpload?: (file: File) => void;
  readonly onOpenChange: (open: boolean) => void;
}

function CropDialogContent({
  imageUrl,
  validationError,
  file,
  defaultCropFrame,
  defaultCropShape,
  allowOriginalUpload,
  allowCrop,
  uploading,
  labels,
  onCropComplete,
  onOriginalUpload,
  onOpenChange,
}: CropDialogContentProps) {
  const [cropFrame, setCropFrame] = useState<PhotoCropFrame>(defaultCropFrame);
  const [cropMask, setCropMask] = useState<PhotoCropShape>(defaultCropShape);
  const cropDimensions = resolveCropDimensions(cropFrame);
  const cropW = cropDimensions.previewW;
  const cropH = cropDimensions.previewH;

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

  const initializeLayout = useCallback(() => {
    const img = imgRef.current;
    if (!img) return;
    const { naturalWidth: w, naturalHeight: h } = img;
    if (w <= 0 || h <= 0) return;
    const layout = computeLayout(w, h, cropW, cropH);
    scaleRef.current = layout.scale;
    imgSizeRef.current = { w, h };
    setDisplaySize({ w: layout.displayW, h: layout.displayH });
    setInitialPosition({ x: layout.x, y: layout.y });
    setPosition({ x: layout.x, y: layout.y });
    setImageLoaded(true);
  }, [cropH, cropW]);

  const handleImageLoad = useCallback(() => {
    initializeLayout();
  }, [initializeLayout]);

  useEffect(() => {
    setImageLoaded(false);
    setCropError(null);
  }, [cropFrame, file]);

  useEffect(() => {
    if (!imageLoaded) return;
    initializeLayout();
  }, [cropFrame, imageLoaded, initializeLayout]);

  const clampPosition = useCallback(
    (x: number, y: number) => {
      const { w, h } = imgSizeRef.current;
      const scale = scaleRef.current;
      return clamp({ x, y }, w * scale, h * scale, cropW, cropH);
    },
    [cropH, cropW],
  );

  const handlePointerDown = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      if (!imageLoaded || !allowCrop) return;
      event.preventDefault();
      dragRef.current = {
        startX: event.clientX,
        startY: event.clientY,
        startPos: { ...positionRef.current },
      };
      overlayRef.current?.setPointerCapture(event.pointerId);
    },
    [allowCrop, imageLoaded],
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
      if (!imageLoaded || !allowCrop) return;
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
    [allowCrop, clampPosition, imageLoaded],
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
        cropW,
        cropH,
        outputW: cropDimensions.outputW,
        outputH: cropDimensions.outputH,
      });
      onCropComplete(croppedFile);
    } catch (error) {
      setCropError(
        error instanceof Error ? error.message : "Failed to process image.",
      );
    }
  }, [
    cropDimensions.outputH,
    cropDimensions.outputW,
    cropH,
    cropW,
    file,
    imageLoaded,
    onCropComplete,
  ]);

  const handleOriginalUpload = useCallback(() => {
    if (!file) return;
    onOriginalUpload?.(file);
  }, [file, onOriginalUpload]);

  useEffect(() => {
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  const errorMessage = validationError ?? cropError;
  const activeMask = cropFrame === "square" ? cropMask : "rect";
  const maskClassName =
    activeMask === "circle"
      ? "rounded-full border-2 border-dashed border-primary/80"
      : "rounded-lg border-2 border-dashed border-primary/80";

  const frameOptions = useMemo(
    () => [
      {
        value: "square" as const,
        label: labels?.cropFrameSquare ?? "Square",
        ariaLabel: labels?.cropFrameSquare ?? "Square crop frame",
      },
      {
        value: "landscape43" as const,
        label: labels?.cropFrameLandscape43 ?? "4:3",
        ariaLabel: labels?.cropFrameLandscape43 ?? "4:3 crop frame",
      },
      {
        value: "landscape169" as const,
        label: labels?.cropFrameLandscape169 ?? "16:9",
        ariaLabel: labels?.cropFrameLandscape169 ?? "16:9 crop frame",
      },
    ],
    [labels],
  );

  const maskOptions = useMemo(
    () => [
      {
        value: "rect" as const,
        label: labels?.cropMaskRect ?? "Rectangle",
        ariaLabel: labels?.cropMaskRect ?? "Rectangle crop mask",
      },
      {
        value: "circle" as const,
        label: labels?.cropMaskCircle ?? "Circle",
        ariaLabel: labels?.cropMaskCircle ?? "Circle crop mask",
      },
    ],
    [labels],
  );

  return (
    <>
      {labels?.description ? (
        <Text className="text-muted-foreground text-sm">
          {labels.description}
        </Text>
      ) : null}

      <div className="space-y-4 py-2">
        {allowCrop ? (
          <div className="flex flex-col gap-3">
            <SegmentedSwitch
              value={cropFrame}
              onChange={setCropFrame}
              options={frameOptions}
              ariaLabel={labels?.cropFrameAriaLabel ?? "Crop frame"}
              fullWidth
            />
            {cropFrame === "square" ? (
              <SegmentedSwitch
                value={cropMask}
                onChange={setCropMask}
                options={maskOptions}
                ariaLabel={labels?.cropMaskAriaLabel ?? "Crop mask"}
                fullWidth
              />
            ) : null}
          </div>
        ) : null}

        {errorMessage ? (
          <Text className="text-destructive text-sm" role="alert">
            {errorMessage}
          </Text>
        ) : file && imageUrl && allowCrop ? (
          <div
            className="bg-muted relative mx-auto overflow-hidden rounded-lg"
            style={{ width: cropW, height: cropH }}
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
        ) : file && allowCrop ? (
          <div
            className="bg-muted mx-auto flex items-center justify-center rounded-lg"
            style={{ width: cropW, height: cropH }}
          >
            <Text className="text-muted-foreground text-sm">Loading…</Text>
          </div>
        ) : null}
      </div>

      <div className="flex flex-wrap justify-end gap-2">
        {imageLoaded && allowCrop ? (
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
        {allowOriginalUpload ? (
          <Button
            type="button"
            variant="outline"
            onClick={handleOriginalUpload}
            disabled={!file || uploading || Boolean(validationError)}
            loading={uploading}
          >
            {labels?.uploadOriginal ?? "Upload original"}
          </Button>
        ) : null}
        {allowCrop ? (
          <Button
            type="button"
            onClick={() => void handleCrop()}
            disabled={!imageLoaded || uploading || Boolean(validationError)}
            loading={uploading}
          >
            {labels?.uploadCropped ?? labels?.upload ?? "Upload cropped"}
          </Button>
        ) : null}
      </div>
    </>
  );
}
