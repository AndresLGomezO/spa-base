import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { toast } from "sonner";

import { Text } from "../typography/Text";
import { PhotoUpload } from "./PhotoUpload";

const defaultLabels = {
  select: "Select photo",
  change: "Change photo",
  cropTitle: "Adjust image",
  cropDescription:
    "Drag the image to position the crop area, or upload the original file.",
  upload: "Upload",
  uploadOriginal: "Upload original",
  uploadCropped: "Upload cropped",
  cancel: "Cancel",
  reset: "Reset",
  expand: "Photo preview",
  cropFrameSquare: "Square",
  cropFrameLandscape43: "4:3",
  cropFrameLandscape169: "16:9",
  cropMaskCircle: "Circle",
  cropMaskRect: "Rectangle",
  cropFrameAriaLabel: "Crop frame",
  cropMaskAriaLabel: "Crop mask",
};

const meta = {
  title: "Components/PhotoUpload",
  component: PhotoUpload,
  tags: ["autodocs"],
  parameters: {
    layout: "padded",
  },
} satisfies Meta<typeof PhotoUpload>;

export default meta;

type Story = StoryObj<typeof PhotoUpload>;

function PhotoUploadDemo({
  cropShape = "rect" as const,
  allowOriginalUpload = true,
  allowCrop = true,
}: {
  readonly cropShape?: "circle" | "rect";
  readonly allowOriginalUpload?: boolean;
  readonly allowCrop?: boolean;
}) {
  const [value, setValue] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  return (
    <div className="max-w-md space-y-4">
      <PhotoUpload
        value={value}
        alt="Sample photo"
        cropShape={cropShape}
        allowOriginalUpload={allowOriginalUpload}
        allowCrop={allowCrop}
        uploading={uploading}
        labels={defaultLabels}
        onUpload={async ({ file }) => {
          setUploading(true);
          await new Promise((resolve) => setTimeout(resolve, 800));
          setValue(URL.createObjectURL(file));
          setUploading(false);
        }}
        onError={(message) => {
          toast.error(message);
        }}
      />
      {value ? (
        <Text className="text-muted-foreground text-sm">
          Preview URL set after mock upload.
        </Text>
      ) : null}
    </div>
  );
}

export const Default: Story = {
  render: () => <PhotoUploadDemo cropShape="rect" />,
};

export const CropOnly: Story = {
  render: () => (
    <PhotoUploadDemo cropShape="rect" allowOriginalUpload={false} />
  ),
};

export const CircleCrop: Story = {
  render: () => <PhotoUploadDemo cropShape="circle" />,
};
