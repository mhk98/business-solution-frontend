import { useEffect } from "react";

const useSessionExpiry = (onExpiringSoon) => {
  useEffect(() => {
    const checkExpiry = () => {
      const refreshToken = localStorage.getItem("refreshToken");
      if (!refreshToken) return;

      try {
        const payload = JSON.parse(atob(refreshToken.split(".")[1]));
        const expiresAt = payload.exp * 1000;
        const msUntilExpiry = expiresAt - Date.now();
        const thirtyMinutes = 30 * 60 * 1000;

        if (msUntilExpiry > 0 && msUntilExpiry <= thirtyMinutes) {
          onExpiringSoon?.();
        }
      } catch {
        // malformed token — ignore
      }
    };

    checkExpiry();
    const interval = setInterval(checkExpiry, 60 * 1000);
    return () => clearInterval(interval);
  }, [onExpiringSoon]);
};

export default useSessionExpiry;
