import { useColorScheme, useDarkMode } from "@repo/theme/react";

export function ThemeToggle() {
  const { toggleColorScheme } = useColorScheme();
  const isDark = useDarkMode();

  return (
    <div className="fixed top-4 right-4 z-50">
      <button
        type="button"
        role="switch"
        aria-checked={isDark}
        aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
        onClick={toggleColorScheme}
        className="border-border bg-background text-foreground hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-md border px-3 py-1.5 text-sm shadow-sm"
      >
        {isDark ? "Light" : "Dark"}
      </button>
    </div>
  );
}
