import type { DataSource } from "./component.js";

export type ComponentClickAction =
  | {
      readonly type: "entityRecord";
      /** "current" = list/card row record; relation path = FK or dotted path (e.g. contactId, contact.name) */
      readonly target: "current" | { readonly relationFieldPath: string };
    }
  | {
      readonly type: "externalUrl";
      readonly url: DataSource;
      readonly openInNewTab?: boolean;
    };
