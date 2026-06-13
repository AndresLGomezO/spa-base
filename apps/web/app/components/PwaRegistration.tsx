import { useEffect } from "react";
import { registerSW } from "virtual:pwa-register";

export function PwaRegistration() {
  useEffect(() => {
    registerSW({ immediate: true });
  }, []);

  return null;
}
