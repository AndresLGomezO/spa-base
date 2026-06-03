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

export interface LayoutRenderContext {
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
}
