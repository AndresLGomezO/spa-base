import { LanguageSwitcher } from "./LanguageSwitcher";
import { ThemeToggle } from "./ThemeToggle";

/**
 * Fixed top-right controls for theme and language.
 */
export function AppChrome() {
  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col items-end gap-2">
      <LanguageSwitcher className="border-border bg-muted/50 flex w-48 rounded-md border p-0.5" />
      <ThemeToggle />
    </div>
  );
}
