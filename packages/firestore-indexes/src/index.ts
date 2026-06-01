export type {
  FirestoreCompositeIndex,
  FirestoreFieldOverride,
  FirestoreIndexField,
  FirestoreIndexesFile,
} from "./types.js";
export {
  buildOwnershipFkIndex,
  buildOwnershipListIndex,
  dedupeIndexes,
  indexesForEntities,
  indexesForEntity,
  resolveEntityCollection,
} from "./build-indexes.js";
