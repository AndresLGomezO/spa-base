import type { ReactNode } from "react";

import type { MetricKpiComponentConfig } from "@repo/ui-builder-core";

import type {
  DateDisplayFormat,
  DisplayFieldType,
  DisplayFormat,
} from "@repo/ui";

export interface FieldDisplayMeta {
  readonly fieldType?: DisplayFieldType;
  readonly displayFormat?: DisplayFormat;
  readonly dateDisplayFormat?: DateDisplayFormat;
}

export interface ImageResolveOptions {
  /** Primary image field from layout config; used for field `defaultImage` fallback. */
  readonly primaryFieldPath: string;
  /** Square image box size in px (24–96). */
  readonly imageSize?: number;
}

export type LayoutRenderMode = "listItem" | "detail" | "form";

export interface LayoutRenderContext {
  readonly mode?: LayoutRenderMode;
  readonly data: Record<string, unknown>;
  readonly locale: string;
  readonly resolveField: (path: string) => unknown;
  readonly resolveFieldMeta?: (path: string) => FieldDisplayMeta;
  readonly resolveFieldLabel?: (path: string) => string | undefined;
  /** Placeholder value when the record has no data (layout design preview). */
  readonly resolvePreviewSampleValue?: (
    fieldPath: string,
  ) => string | undefined;
  readonly resolveImage?: (
    fieldPath: string,
    rawValue: unknown,
    options: ImageResolveOptions,
  ) => ReactNode;
  readonly resolveCurrencyCode?: () => string | undefined;
  readonly isImagePresent?: (fieldPath: string, rawValue: unknown) => boolean;
  readonly metricKpiRenderer?: (config: MetricKpiComponentConfig) => ReactNode;
  readonly formFieldRenderer?: (
    fieldPath: string,
    containerClassName?: string,
  ) => ReactNode;
  readonly formSectionRenderer?: (
    title: string | undefined,
    children: ReactNode,
  ) => ReactNode;
  readonly formActionsRenderer?: () => ReactNode;
  readonly relatedRecordsRenderer?: (config: {
    readonly childEntity: string;
    readonly foreignKeyField: string;
  }) => ReactNode;
  readonly fieldAccessFilter?: (fieldPath: string) => boolean;
  readonly resolveRecordFieldLink?: (fieldPath: string) => {
    readonly href: string;
    readonly label: string;
  } | null;
}

export type ListItemRenderContext = LayoutRenderContext & {
  readonly mode: "listItem";
};

export type RecordRenderContext = LayoutRenderContext & {
  readonly mode: "detail";
};

export type FormRenderContext = LayoutRenderContext & {
  readonly mode: "form";
  readonly formErrors?: Readonly<Record<string, string | undefined>>;
};
