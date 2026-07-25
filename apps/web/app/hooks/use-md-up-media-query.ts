import { useEffect, useState } from "react";

const MD_UP_MEDIA_QUERY = "(min-width: 768px)";

/** True at Tailwind `md` and up. */
export function useMdUpMediaQuery(): boolean {
  const [matches, setMatches] = useState(() => {
    if (typeof window === "undefined") {
      return true;
    }
    return window.matchMedia(MD_UP_MEDIA_QUERY).matches;
  });

  useEffect(() => {
    const media = window.matchMedia(MD_UP_MEDIA_QUERY);
    const update = () => setMatches(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  return matches;
}
