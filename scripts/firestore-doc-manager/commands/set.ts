import { readFileSync } from "node:fs";

import { getFirestoreAdmin } from "@repo/gcp-firebase";

import { initFirestore } from "../firebase-config.js";
import type { SharedFlags } from "../parse-args.js";
import {
  describeTarget,
  resolveDocumentRef,
} from "../resolve-doc-ref.js";

function readJsonFile(filePath: string): Record<string, unknown> {
  const raw = readFileSync(filePath, "utf8");
  const parsed = JSON.parse(raw) as unknown;
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new Error(`JSON file must contain an object: ${filePath}`);
  }
  return parsed as Record<string, unknown>;
}

export async function runSet(flags: SharedFlags): Promise<void> {
  const data = readJsonFile(flags.file!);
  const target = describeTarget(flags);

  if (flags.dryRun) {
    console.log(`[dry-run] Would set (replace) ${target}`);
    console.log(JSON.stringify(data, null, 2));
    return;
  }

  const config = initFirestore(flags.projectId);
  const firestore = getFirestoreAdmin(config);
  const docRef = resolveDocumentRef(firestore, flags);
  await docRef.set(data);

  console.log(`Set ${target}`);
}
