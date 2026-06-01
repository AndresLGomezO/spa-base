export type FirestoreIndexFieldOrder = "ASCENDING" | "DESCENDING";

export type FirestoreIndexField =
  | {
      readonly fieldPath: string;
      readonly order: FirestoreIndexFieldOrder;
    }
  | {
      readonly fieldPath: string;
      readonly arrayConfig: "CONTAINS";
    };

export type FirestoreCompositeIndex = {
  readonly collectionGroup: string;
  readonly queryScope: "COLLECTION" | "COLLECTION_GROUP";
  readonly fields: readonly FirestoreIndexField[];
};

export type FirestoreFieldOverride = {
  readonly collectionGroup: string;
  readonly fieldPath: string;
  readonly indexes: readonly {
    readonly order: FirestoreIndexFieldOrder;
    readonly queryScope: "COLLECTION" | "COLLECTION_GROUP";
  }[];
};

export type FirestoreIndexesFile = {
  readonly indexes: readonly FirestoreCompositeIndex[];
  readonly fieldOverrides?: readonly FirestoreFieldOverride[];
};
