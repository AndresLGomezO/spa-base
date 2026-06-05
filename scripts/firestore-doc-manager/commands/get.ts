import { writeFileSync } from "node:fs";

import { getFirestoreAdmin } from "@repo/gcp-firebase";

import { initFirestore } from "../firebase-config.js";
import type { SharedFlags } from "../parse-args.js";
import {
  describeTarget,
  resolveDocumentRef,
} from "../resolve-doc-ref.js";
import { serializeFirestoreValue } from "../serialize-firestore-value.js";

function formatOutput(data: unknown, pretty: boolean): string {
  return pretty ? JSON.stringify(data, null, 2) : JSON.stringify(data);
}

export async function runGet(flags: SharedFlags): Promise<void> {
  const config = initFirestore(flags.projectId);
  const firestore = getFirestoreAdmin(config);
  const docRef = resolveDocumentRef(firestore, flags);
  const target = describeTarget(flags);
  const snapshot = await docRef.get();

  if (!snapshot.exists) {
    throw new Error(`Document not found: ${target}`);
  }

  const output = serializeFirestoreValue(snapshot.data()) as Record<string, unknown>;

  if (flags.out) {
    writeFileSync(flags.out, formatOutput(output, true), "utf8");
    console.log(`Wrote ${target} to ${flags.out}`);
    return;
  }

  console.log(formatOutput(output, flags.pretty));
}
