import { writeFileSync } from "node:fs";

import { getFirestoreAdmin } from "@repo/gcp-firebase";

import { initFirestore } from "../firebase-config.js";
import type { SharedFlags } from "../parse-args.js";
import {
  describeTarget,
  resolveCollectionRef,
} from "../resolve-doc-ref.js";
import { serializeFirestoreValue } from "../serialize-firestore-value.js";

function formatOutput(data: unknown, pretty: boolean): string {
  return pretty ? JSON.stringify(data, null, 2) : JSON.stringify(data);
}

export async function runList(flags: SharedFlags): Promise<void> {
  const config = initFirestore(flags.projectId);
  const firestore = getFirestoreAdmin(config);
  const collectionRef = resolveCollectionRef(firestore, flags);
  const target = describeTarget(flags);
  const snapshot = await collectionRef.limit(flags.limit).get();

  const rows = snapshot.docs.map((doc) => ({
    id: doc.id,
    data: serializeFirestoreValue(doc.data()),
  }));

  if (flags.out) {
    writeFileSync(flags.out, formatOutput(rows, true), "utf8");
    console.log(`Wrote ${rows.length} document(s) from ${target} to ${flags.out}`);
    return;
  }

  console.log(formatOutput(rows, flags.pretty));
}
