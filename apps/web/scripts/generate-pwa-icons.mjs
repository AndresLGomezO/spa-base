import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import zlib from "node:zlib";

const BRAND_COLOR = { r: 0x00, g: 0xa1, b: 0xe5, a: 0xff };
const CORNER_RADIUS_RATIO = 6 / 32;

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = crc & 1 ? 0xedb88320 ^ (crc >>> 1) : crc >>> 1;
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const typeBuffer = Buffer.from(type, "ascii");
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])));
  return Buffer.concat([length, typeBuffer, data, crc]);
}

function isInsideRoundedRect(x, y, size, radius) {
  const left = radius;
  const right = size - radius - 1;
  const top = radius;
  const bottom = size - radius - 1;

  if (x >= left && x <= right) {
    return y >= 0 && y < size;
  }
  if (y >= top && y <= bottom) {
    return x >= 0 && x < size;
  }

  const corners = [
    { cx: left, cy: top },
    { cx: right, cy: top },
    { cx: left, cy: bottom },
    { cx: right, cy: bottom },
  ];

  return corners.some(({ cx, cy }) => {
    const dx = x - cx;
    const dy = y - cy;
    return dx * dx + dy * dy <= radius * radius;
  });
}

function createRoundedSquarePng(size) {
  const radius = Math.round(size * CORNER_RADIUS_RATIO);
  const row = Buffer.alloc(1 + size * 4);

  const raw = Buffer.alloc(size * row.length);
  for (let y = 0; y < size; y += 1) {
    const offset = y * row.length;
    row[0] = 0;
    for (let x = 0; x < size; x += 1) {
      const pixelOffset = 1 + x * 4;
      if (isInsideRoundedRect(x, y, size, radius)) {
        row[pixelOffset] = BRAND_COLOR.r;
        row[pixelOffset + 1] = BRAND_COLOR.g;
        row[pixelOffset + 2] = BRAND_COLOR.b;
        row[pixelOffset + 3] = BRAND_COLOR.a;
      } else {
        row[pixelOffset] = 0;
        row[pixelOffset + 1] = 0;
        row[pixelOffset + 2] = 0;
        row[pixelOffset + 3] = 0;
      }
    }
    row.copy(raw, offset);
  }

  const signature = Buffer.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
  ]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const idat = zlib.deflateSync(raw, { level: 9 });
  return Buffer.concat([
    signature,
    pngChunk("IHDR", ihdr),
    pngChunk("IDAT", idat),
    pngChunk("IEND", Buffer.alloc(0)),
  ]);
}

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const iconsDir = path.resolve(scriptDir, "../public/icons");

await mkdir(iconsDir, { recursive: true });

for (const size of [192, 512]) {
  const outputPath = path.join(iconsDir, `icon-${size}.png`);
  const png = createRoundedSquarePng(size);
  await writeFile(outputPath, png);
  const hash = createHash("sha256").update(png).digest("hex").slice(0, 8);
  console.log(`Wrote ${outputPath} (${png.length} bytes, sha256:${hash})`);
}
