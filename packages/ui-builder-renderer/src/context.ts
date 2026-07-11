import type { CSSProperties, ReactNode } from "react";

import type {
  ComponentClickAction,
  DashboardSectionComponentConfig,
  EntityFieldSelectorComponentConfig,
  FormFieldComponentConfig,
  IconComponentConfig,
  NotificationBellComponentConfig,
  MetricDerivedKpiComponentConfig,
  MetricKpiComponentConfig,
  MetricKpiPresentation,
  MetricWidgetComponentConfig,
  ChartComponentConfig,
  QueryViewerComponentConfig,
  ResolvedComponentClickTarget,
  ResponsiveGridBreakpoint,
  UserComponentConfig,
  SidebarCollapseComponentConfig,
  SidebarNavComponentConfig,
  SidebarTriggerComponentConfig,
  NavTabComponentConfig,
  ViewSearchComponentConfig,
  ViewFiltersComponentConfig,
  ViewDateFilterComponentConfig,
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
  /** When true, clicking the image opens a full-size preview modal. */
  readonly expandOnClick?: boolean;
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
  readonly formatFieldDisplayValue?: (
    fieldPath: string,
    rawValue: unknown,
  ) => string;
  /** Placeholder value when the record has no data (layout design preview). */
  readonly resolvePreviewSampleValue?: (
    fieldPath: string,
  ) => string | undefined;
  readonly resolveImage?: (
    fieldPath: string,
    rawValue: unknown,
    options: ImageResolveOptions,
  ) => ReactNode;
  readonly lucideIconRenderer?: (
    config: IconComponentConfig,
    atBreakpoint?: ResponsiveGridBreakpoint,
  ) => ReactNode;
  readonly userRenderer?: (config: UserComponentConfig) => ReactNode;
  readonly notificationBellRenderer?: (
    config: NotificationBellComponentConfig,
  ) => ReactNode;
  readonly sidebarNavRenderer?: (
    config: SidebarNavComponentConfig,
  ) => ReactNode;
  readonly sidebarCollapseRenderer?: (
    config: SidebarCollapseComponentConfig,
  ) => ReactNode;
  readonly sidebarTriggerRenderer?: (
    config: SidebarTriggerComponentConfig,
  ) => ReactNode;
  readonly navTabRenderer?: (config: NavTabComponentConfig) => ReactNode;
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
    options?: { readonly linkAppearance?: boolean },
  ) => ReactNode;
  readonly navigateComponentClick?: (
    target: ResolvedComponentClickTarget,
  ) => void;
  readonly pageHeaderRenderer?: () => ReactNode;
  readonly pageToolbarRenderer?: () => ReactNode;
  readonly pageMetricsRenderer?: () => ReactNode;
  readonly pageListRenderer?: () => ReactNode;
  readonly viewSearchRenderer?: (
    config: ViewSearchComponentConfig,
  ) => ReactNode;
  readonly viewFiltersRenderer?: (
    config: ViewFiltersComponentConfig,
  ) => ReactNode;
  readonly viewDateFilterRenderer?: (
    config: ViewDateFilterComponentConfig,
  ) => ReactNode;
  readonly registerPageListScrollElement?: (
    element: HTMLElement | null,
  ) => void;
  readonly wrapPageListScroll?: (listContent: ReactNode) => ReactNode;
  /** When true, relation field links use primary/underline styling (entity lists only). */
  readonly relationLinkAppearance?: boolean;
  /**
   * Current route pathname (no query/hash). Used by conditional styles with
   * `conditionKind: "activePath"`.
   */
  readonly resolveActivePathname?: () => string;
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
