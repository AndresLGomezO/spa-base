import type { CSSProperties, ReactNode } from "react";

import type {
  ComponentClickAction,
  DashboardSectionComponentConfig,
  EntityFieldSelectorComponentConfig,
  FormFieldComponentConfig,
  IconComponentConfig,
  MetricDerivedKpiComponentConfig,
  MetricKpiComponentConfig,
  MetricKpiPresentation,
  MetricWidgetComponentConfig,
  ChartComponentConfig,
  QueryViewerComponentConfig,
  ResolvedComponentClickTarget,
  UserComponentConfig,
  ViewFilterComponentConfig,
  WizardActionsComponentConfig,
  WizardProgressComponentConfig,
  WizardStepHostComponentConfig,
  WizardStepStatusKind,
} from "@repo/ui-builder-core";

import type {
  DateDisplayFormat,
  DisplayFieldType,
  DisplayFormat,
} from "@repo/ui";

export interface FieldDisplayMeta {
  readonly fieldType?: DisplayFieldType;
  readonly displayFormat?: DisplayFormat;
  readonly dateDisplayFormat?: DateDisplayFormat;
  readonly isArray?: boolean;
}

export interface ImageResolveOptions {
  /** Primary image field from layout config; used for field `defaultImage` fallback. */
  readonly primaryFieldPath: string;
  /** Square image box size in px (8–1024). Ignored when fillContainer is true. */
  readonly imageSize?: number;
  readonly fillContainer?: boolean;
  readonly objectFit?: "contain" | "cover" | "fill";
  readonly className?: string;
  readonly style?: CSSProperties;
}

export type LayoutRenderMode = "listItem" | "detail" | "form" | "mainPage";

export interface WizardRenderStepMeta {
  readonly id: string;
  readonly label: string;
  readonly subtitle?: string;
  readonly icon?: string;
}

export interface WizardRenderState {
  readonly steps: readonly WizardRenderStepMeta[];
  readonly currentStepIndex: number;
  readonly stepStatuses: Readonly<Record<string, WizardStepStatusKind>>;
}

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
  readonly lucideIconRenderer?: (config: IconComponentConfig) => ReactNode;
  readonly userRenderer?: (config: UserComponentConfig) => ReactNode;
  readonly resolveCurrencyCode?: () => string | undefined;
  readonly isImagePresent?: (fieldPath: string, rawValue: unknown) => boolean;
  readonly metricKpiRenderer?: (
    config: MetricKpiComponentConfig,
    presentation?: MetricKpiPresentation,
  ) => ReactNode;
  readonly metricDerivedKpiRenderer?: (
    config: MetricDerivedKpiComponentConfig,
    presentation?: MetricKpiPresentation,
  ) => ReactNode;
  readonly chartRenderer?: (config: ChartComponentConfig) => ReactNode;
  readonly metricWidgetRenderer?: (
    config: MetricWidgetComponentConfig,
  ) => ReactNode;
  readonly queryViewerRenderer?: (
    config: QueryViewerComponentConfig,
  ) => ReactNode;
  readonly dashboardSectionRenderer?: (
    config: DashboardSectionComponentConfig,
  ) => ReactNode;
  readonly formFieldRenderer?: (
    config: FormFieldComponentConfig,
    containerClassName?: string,
  ) => ReactNode;
  readonly entityFieldSelectorRenderer?: (
    config: EntityFieldSelectorComponentConfig,
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
  readonly resolveComponentClickTarget?: (
    action: ComponentClickAction,
    hints?: { readonly boundFieldPath?: string },
  ) => ResolvedComponentClickTarget | null;
  readonly componentClickWrapper?: (
    target: ResolvedComponentClickTarget,
    children: ReactNode,
  ) => ReactNode;
  readonly navigateComponentClick?: (
    target: ResolvedComponentClickTarget,
  ) => void;
  readonly pageHeaderRenderer?: () => ReactNode;
  readonly pageToolbarRenderer?: () => ReactNode;
  readonly pageMetricsRenderer?: () => ReactNode;
  readonly pageListRenderer?: () => ReactNode;
  readonly viewFilterRenderer?: (
    config: ViewFilterComponentConfig,
  ) => ReactNode;
  readonly registerPageListScrollElement?: (
    element: HTMLElement | null,
  ) => void;
  readonly wrapPageListScroll?: (listContent: ReactNode) => ReactNode;
  readonly wizard?: WizardRenderState;
  readonly wizardProgressRenderer?: (
    config: WizardProgressComponentConfig,
  ) => ReactNode;
  readonly wizardStepHostRenderer?: (
    config: WizardStepHostComponentConfig,
  ) => ReactNode;
  readonly wizardActionsRenderer?: (
    config: WizardActionsComponentConfig,
  ) => ReactNode;
  /** Step body rendered inside wizard-step-host (bounded height, no step-level scroll). */
  readonly wizardStepContent?: boolean;
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
