import { spawn } from "node:child_process";

export type UnlockPdfOptions = {
  /** Override qpdf binary path (defaults to `qpdf` on PATH). */
  readonly qpdfPath?: string;
  /** Inject spawn for tests. */
  readonly spawnFn?: typeof spawn;
};

export class PdfUnlockError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PdfUnlockError";
  }
}

/**
 * Cheap heuristic: encrypted PDFs declare an `/Encrypt` dictionary.
 * False negatives are possible for exotic wrappers; qpdf is the authority.
 */
export function isPdfEncrypted(bytes: Buffer): boolean {
  // Search a bounded prefix+suffix window to avoid scanning huge files.
  const head = bytes
    .subarray(0, Math.min(bytes.length, 64 * 1024))
    .toString("latin1");
  if (head.includes("/Encrypt")) {
    return true;
  }
  if (bytes.length > 64 * 1024) {
    const tail = bytes
      .subarray(Math.max(0, bytes.length - 64 * 1024))
      .toString("latin1");
    return tail.includes("/Encrypt");
  }
  return false;
}

function runQpdf(
  args: readonly string[],
  input: Buffer,
  options: UnlockPdfOptions = {},
): Promise<Buffer> {
  const qpdfPath = options.qpdfPath?.trim() || "qpdf";
  const spawnFn = options.spawnFn ?? spawn;

  return new Promise((resolve, reject) => {
    const child = spawnFn(qpdfPath, [...args], {
      stdio: ["pipe", "pipe", "pipe"],
    });

    const stdoutChunks: Buffer[] = [];
    const stderrChunks: Buffer[] = [];

    child.stdout?.on("data", (chunk: Buffer) => {
      stdoutChunks.push(chunk);
    });
    child.stderr?.on("data", (chunk: Buffer) => {
      stderrChunks.push(chunk);
    });

    child.on("error", (error) => {
      reject(
        new PdfUnlockError(
          error instanceof Error
            ? `Failed to run qpdf: ${error.message}`
            : "Failed to run qpdf.",
        ),
      );
    });

    child.on("close", (code) => {
      if (code === 0) {
        resolve(Buffer.concat(stdoutChunks));
        return;
      }
      // Never include stderr (may echo password-related diagnostics).
      reject(
        new PdfUnlockError(
          "PDF is password-protected and provided password did not unlock it.",
        ),
      );
    });

    child.stdin?.on("error", () => {
      // Ignore EPIPE when qpdf exits early.
    });
    child.stdin?.end(input);
  });
}

/**
 * Decrypt a password-protected PDF via qpdf.
 * Reads/writes via stdin/stdout so decrypted bytes never touch disk.
 */
export async function unlockPdf(
  bytes: Buffer,
  password: string,
  options: UnlockPdfOptions = {},
): Promise<Buffer> {
  if (!password) {
    throw new PdfUnlockError("PDF password is required.");
  }

  return runQpdf(
    [`--password=${password}`, "--decrypt", "-", "-"],
    bytes,
    options,
  );
}
