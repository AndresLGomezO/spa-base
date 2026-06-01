import { Modal } from "../modal/Modal";

interface PhotoExpandDialogProps {
  readonly open: boolean;
  readonly imageUrl: string | null;
  readonly alt: string;
  readonly title?: string;
  readonly layer?: "default" | "nested";
  readonly onClose: () => void;
}

export function PhotoExpandDialog({
  open,
  imageUrl,
  alt,
  title = "Photo preview",
  layer = "nested",
  onClose,
}: PhotoExpandDialogProps) {
  return (
    <Modal open={open} onClose={onClose} title={title} size="lg" layer={layer}>
      {imageUrl ? (
        <div className="flex max-h-[70vh] items-center justify-center overflow-auto">
          <img
            src={imageUrl}
            alt={alt}
            className="max-h-[65vh] max-w-full object-contain"
          />
        </div>
      ) : null}
    </Modal>
  );
}
