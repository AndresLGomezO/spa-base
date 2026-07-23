import { useEffect, useState } from "react";

const MD_UP_MEDIA_QUERY = "(min-width: 768px)";

/** True at Tailwind `md` and up — use popover; otherwise fullscreen modal. */
export function useGlobalSearchDesktop(): boolean {
  const [isDesktop, setIsDesktop] = useState(() => {
    if (typeof window === "undefined") {
      return true;
    }
    return window.matchMedia(MD_UP_MEDIA_QUERY).matches;
  });

  useEffect(() => {
    const media = window.matchMedia(MD_UP_MEDIA_QUERY);
    const update = () => setIsDesktop(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  return isDesktop;
}
