import { getFirestoreAdmin } from "@repo/gcp-firebase";

import { initFirestore } from "../firebase-config.js";
import type { SharedFlags } from "../parse-args.js";
import {
  describeTarget,
  resolveDocumentRef,
} from "../resolve-doc-ref.js";

export async function runDelete(flags: SharedFlags): Promise<void> {
  const target = describeTarget(flags);

  if (flags.dryRun) {
    console.log(`[dry-run] Would delete ${target}`);
    return;
  }

  const config = initFirestore(flags.projectId);
  const firestore = getFirestoreAdmin(config);
  const docRef = resolveDocumentRef(firestore, flags);
  const snapshot = await docRef.get();

  if (!snapshot.exists) {
    throw new Error(`Document not found: ${target}`);
  }

  await docRef.delete();
  console.log(`Deleted ${target}`);
}
