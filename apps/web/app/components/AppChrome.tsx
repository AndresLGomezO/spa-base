import { LanguageSwitcher } from "./LanguageSwitcher";
import { ThemeToggle } from "./ThemeToggle";

/**
 * Fixed top-right controls for theme and language.
 */
export function AppChrome() {
  return (
    <div className="fixed top-4 right-4 z-50 flex w-52 flex-col items-stretch gap-2">
      <LanguageSwitcher fullWidth />
      <ThemeToggle fullWidth />
    </div>
  );
}
