import { EventEmitter } from "node:events";
import { describe, expect, it, vi } from "vitest";

import { isPdfEncrypted, unlockPdf, PdfUnlockError } from "./unlock-pdf.js";

function createFakeSpawn(options: {
  readonly exitCode?: number;
  readonly stdout?: Buffer;
  readonly onSpawn?: (args: readonly string[]) => void;
}) {
  return vi.fn((_cmd: string, args: readonly string[]) => {
    options.onSpawn?.(args);
    const child = new EventEmitter() as EventEmitter & {
      stdout: EventEmitter;
      stderr: EventEmitter;
      stdin: { end: (buf: Buffer) => void; on: () => void };
    };
    child.stdout = new EventEmitter();
    child.stderr = new EventEmitter();
    child.stdin = {
      end: () => {
        queueMicrotask(() => {
          if (options.stdout) {
            child.stdout.emit("data", options.stdout);
          }
          child.emit("close", options.exitCode ?? 0);
        });
      },
      on: () => undefined,
    };
    return child;
  });
}

describe("isPdfEncrypted", () => {
  it("returns true when /Encrypt appears in the PDF", () => {
    const bytes = Buffer.from("%PDF-1.4\n/Encrypt << /Filter /Standard >>");
    expect(isPdfEncrypted(bytes)).toBe(true);
  });

  it("returns false for an unencrypted PDF", () => {
    const bytes = Buffer.from("%PDF-1.4\n1 0 obj<<>>endobj");
    expect(isPdfEncrypted(bytes)).toBe(false);
  });
});

describe("unlockPdf", () => {
  it("spawns qpdf with password and decrypt flags", async () => {
    const seen: string[][] = [];
    const spawnFn = createFakeSpawn({
      stdout: Buffer.from("%PDF-unlocked"),
      onSpawn: (args) => {
        seen.push([...args]);
      },
    });

    const result = await unlockPdf(Buffer.from("%PDF-locked"), "secret", {
      spawnFn: spawnFn as never,
    });

    expect(result.toString()).toBe("%PDF-unlocked");
    expect(seen[0]).toEqual(["--password=secret", "--decrypt", "-", "-"]);
  });

  it("maps non-zero exit to PdfUnlockError without leaking stderr", async () => {
    const spawnFn = createFakeSpawn({ exitCode: 2 });

    await expect(
      unlockPdf(Buffer.from("%PDF-locked"), "wrong", {
        spawnFn: spawnFn as never,
      }),
    ).rejects.toBeInstanceOf(PdfUnlockError);

    await expect(
      unlockPdf(Buffer.from("%PDF-locked"), "wrong", {
        spawnFn: spawnFn as never,
      }),
    ).rejects.toThrow(
      "PDF is password-protected and provided password did not unlock it.",
    );
  });

  it("rejects empty password", async () => {
    await expect(unlockPdf(Buffer.from("%PDF"), "")).rejects.toBeInstanceOf(
      PdfUnlockError,
    );
  });
});
