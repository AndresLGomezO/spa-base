import { ChevronLeft } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button, Text } from "@repo/ui";

interface FormulaDefinitionSummaryNavigationProps {
  readonly navigationStack: readonly string[];
  readonly onNavigateToStackIndex: (index: number) => void;
}

export function FormulaDefinitionSummaryNavigation({
  navigationStack,
  onNavigateToStackIndex,
}: FormulaDefinitionSummaryNavigationProps) {
  const { t } = useTranslation("common");

  if (navigationStack.length <= 1) {
    return null;
  }

  const parentName = navigationStack[navigationStack.length - 2];

  return (
    <div className="space-y-2">
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => onNavigateToStackIndex(navigationStack.length - 2)}
      >
        <ChevronLeft aria-hidden className="size-4" />
        {t("formulas.summaryModal.backTo", { name: parentName ?? "" })}
      </Button>

      <nav aria-label={t("formulas.summaryModal.breadcrumbLabel")}>
        <ol className="text-muted-foreground flex flex-wrap items-center gap-1 text-xs">
          {navigationStack.map((name, index) => {
            const isLast = index === navigationStack.length - 1;
            return (
              <li key={`${name}-${index}`} className="flex items-center gap-1">
                {index > 0 ? <span aria-hidden>›</span> : null}
                {isLast ? (
                  <Text className="text-foreground font-medium">{name}</Text>
                ) : (
                  <button
                    type="button"
                    className="text-primary hover:text-primary/80 underline underline-offset-2"
                    onClick={() => onNavigateToStackIndex(index)}
                  >
                    {name}
                  </button>
                )}
              </li>
            );
          })}
        </ol>
      </nav>
    </div>
  );
}
