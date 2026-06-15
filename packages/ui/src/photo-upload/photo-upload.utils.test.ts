import { describe, expect, it } from "vitest";

import {
  clamp,
  computeLayout,
  outputFormatForSourceFile,
  resolveCropDimensions,
  validateFile,
} from "./photo-upload.utils";

describe("photo-upload.utils", () => {
  it("validateFile rejects unsupported mime types", () => {
    const file = new File(["x"], "doc.pdf", { type: "application/pdf" });
    expect(validateFile(file)).toMatch(/JPEG, PNG, or WebP/i);
  });

  it("validateFile rejects files over 5 MB", () => {
    const file = new File([new Uint8Array(5 * 1024 * 1024 + 1)], "big.png", {
      type: "image/png",
    });
    expect(validateFile(file)).toMatch(/5 MB/i);
  });

  it("validateFile honors a custom max size", () => {
    const file = new File([new Uint8Array(1024 * 1024 + 1)], "big.png", {
      type: "image/png",
    });
    expect(validateFile(file, 1024 * 1024)).toMatch(/1 MB/i);
  });

  it("validateFile accepts supported image types", () => {
    const file = new File(["x"], "photo.png", { type: "image/png" });
    expect(validateFile(file)).toBeNull();
  });

  it("resolveCropDimensions returns square preview and output sizes", () => {
    expect(resolveCropDimensions("square")).toEqual({
      previewW: 320,
      previewH: 320,
      outputW: 400,
      outputH: 400,
    });
  });

  it("resolveCropDimensions returns 4:3 preview and output sizes", () => {
    expect(resolveCropDimensions("landscape43")).toEqual({
      previewW: 320,
      previewH: 240,
      outputW: 400,
      outputH: 300,
    });
  });

  it("resolveCropDimensions returns 16:9 preview and output sizes", () => {
    expect(resolveCropDimensions("landscape169")).toEqual({
      previewW: 320,
      previewH: 180,
      outputW: 400,
      outputH: 225,
    });
  });

  it("computeLayout centers image to cover square crop area", () => {
    const layout = computeLayout(800, 400, 320, 320);
    expect(layout.displayW).toBe(640);
    expect(layout.displayH).toBe(320);
    expect(layout.x).toBe(-160);
    expect(layout.y).toBe(0);
  });

  it("computeLayout centers image to cover 4:3 crop area", () => {
    const layout = computeLayout(800, 400, 320, 240);
    expect(layout.displayW).toBe(480);
    expect(layout.displayH).toBe(240);
    expect(layout.x).toBe(-80);
    expect(layout.y).toBe(0);
  });

  it("outputFormatForSourceFile preserves alpha-capable formats", () => {
    expect(
      outputFormatForSourceFile(
        new File(["x"], "logo.png", { type: "image/png" }),
      ),
    ).toEqual({
      mime: "image/png",
      extension: "png",
      supportsAlpha: true,
    });
  });

  it("clamp keeps image edges inside square crop bounds", () => {
    expect(clamp({ x: 100, y: 100 }, 640, 320, 320, 320)).toEqual({
      x: 0,
      y: 0,
    });
    expect(clamp({ x: -500, y: -200 }, 640, 320, 320, 320)).toEqual({
      x: -320,
      y: 0,
    });
  });

  it("clamp keeps image edges inside 16:9 crop bounds", () => {
    expect(clamp({ x: 50, y: 20 }, 640, 360, 320, 180)).toEqual({
      x: 0,
      y: 0,
    });
  });
});
