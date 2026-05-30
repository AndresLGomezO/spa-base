import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react";

import { Text } from "../typography/Text";
import { PhotoUpload } from "./PhotoUpload";

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
}: {
  readonly cropShape?: "circle" | "rect";
}) {
  const [value, setValue] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  return (
    <div className="max-w-md space-y-4">
      <PhotoUpload
        value={value}
        alt="Sample photo"
        cropShape={cropShape}
        uploading={uploading}
        labels={{
          select: "Select photo",
          change: "Change photo",
          cropTitle: "Crop photo",
          cropDescription: "Drag the image to position the crop area.",
          upload: "Upload",
          cancel: "Cancel",
          reset: "Reset",
          expand: "Photo preview",
        }}
        onUpload={async ({ file }) => {
          setUploading(true);
          await new Promise((resolve) => setTimeout(resolve, 800));
          setValue(URL.createObjectURL(file));
          setUploading(false);
        }}
        onError={(message) => {
          alert(message);
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

export const RectCrop: Story = {
  render: () => <PhotoUploadDemo cropShape="rect" />,
};

export const CircleCrop: Story = {
  render: () => <PhotoUploadDemo cropShape="circle" />,
};
