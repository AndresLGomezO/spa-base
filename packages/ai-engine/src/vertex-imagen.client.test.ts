import { describe, expect, it } from "vitest";

import { generateImagenImage } from "./vertex-imagen.client.js";

describe("generateImagenImage", () => {
  it("returns mock png bytes when mockEnabled", async () => {
    const result = await generateImagenImage(
      {
        projectId: "demo",
        region: "us-central1",
        imagenModelId: "imagen-3.0-generate-002",
        mockEnabled: true,
      },
      "Modern SaaS form mockup",
    );

    expect(result.mimeType).toBe("image/png");
    expect(result.buffer.length).toBeGreaterThan(0);
    expect(result.buffer.subarray(0, 4).toString("hex")).toBe("89504e47");
  });

  it("rejects empty prompt", async () => {
    await expect(
      generateImagenImage(
        {
          projectId: "demo",
          region: "us-central1",
          imagenModelId: "imagen-3.0-generate-002",
          mockEnabled: true,
        },
        "   ",
      ),
    ).rejects.toThrow("Imagen prompt is empty.");
  });
});
