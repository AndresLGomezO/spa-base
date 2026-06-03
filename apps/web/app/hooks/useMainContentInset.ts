import { useEffect, useState } from "react";

interface MainContentInset {
  readonly top: number;
  readonly left: number;
  readonly width: number;
}

export function useMainContentInset(enabled: boolean): MainContentInset | null {
  const [inset, setInset] = useState<MainContentInset | null>(null);

  useEffect(() => {
    if (!enabled) {
      setInset(null);
      return;
    }

    const main = document.querySelector("main");
    if (!main) {
      return;
    }

    const update = () => {
      const rect = main.getBoundingClientRect();
      setInset({
        top: rect.top,
        left: rect.left,
        width: rect.width,
      });
    };

    update();

    const resizeObserver = new ResizeObserver(update);
    resizeObserver.observe(main);

    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [enabled]);

  return inset;
}
