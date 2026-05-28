import { useEffect } from "react";
import { STORAGE_HYDRATED_EVENT } from "./storage";

/** Re-run loader after cloud sync (login) or local storage reset. */
export function useStorageHydration(onHydrated: () => void): void {
  useEffect(() => {
    onHydrated();
    window.addEventListener(STORAGE_HYDRATED_EVENT, onHydrated);
    return () => window.removeEventListener(STORAGE_HYDRATED_EVENT, onHydrated);
  }, [onHydrated]);
}
