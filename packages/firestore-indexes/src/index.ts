export type {
  FirestoreCompositeIndex,
  FirestoreFieldOverride,
  FirestoreIndexField,
  FirestoreIndexesFile,
} from "./types.js";
export {
  buildFindByFieldIndex,
  buildOwnershipCreatedAtIndex,
  buildOwnershipFkIndex,
  buildOwnershipListIndex,
  computeIndexSignature,
  dedupeIndexes,
  indexesForEntities,
  indexesForEntity,
  resolveEntityCollection,
} from "./build-indexes.js";
