import { useCallback, useRef } from "react";
import toast from "react-hot-toast";
import Sidebar from "./Sidebar";
import OfflineBanner from "./OfflineBanner";
import { useLayout } from "../../context/LayoutContext";
import ChatWidget from "../chat/ChatWidget";
import useSessionExpiry from "../../hooks/useSessionExpiry";
import { useRefreshTokenMutation } from "../../features/auth/auth";

const SidebarLayout = ({ children }) => {
  const { isSidebarOpen } = useLayout();
  const [refreshToken] = useRefreshTokenMutation();
  const toastShownRef = useRef(false);

  const handleExpiringSoon = useCallback(async () => {
    if (toastShownRef.current) return;
    toastShownRef.current = true;

    toast(
      (t) => (
        <div className="flex flex-col gap-2">
          <p className="text-sm font-semibold text-slate-800">
            Session expires in 30 minutes
          </p>
          <p className="text-xs text-slate-500">Save your work before it expires.</p>
          <div className="flex gap-2 mt-1">
            <button
              onClick={async () => {
                toast.dismiss(t.id);
                toastShownRef.current = false;
                try {
                  const storedToken = localStorage.getItem("refreshToken");
                  const res = await refreshToken(storedToken).unwrap();
                  if (res?.data?.accessToken) {
                    localStorage.setItem("token", res.data.accessToken);
                    toast.success("Session extended!");
                  }
                } catch {
                  toast.error("Could not extend session.");
                }
              }}
              className="px-3 py-1 rounded-lg bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 transition"
            >
              Extend Session
            </button>
            <button
              onClick={() => {
                toast.dismiss(t.id);
                toastShownRef.current = false;
              }}
              className="px-3 py-1 rounded-lg bg-slate-100 text-slate-700 text-xs font-semibold hover:bg-slate-200 transition"
            >
              Dismiss
            </button>
          </div>
        </div>
      ),
      { duration: Infinity, id: "session-expiry-warning" }
    );
  }, [refreshToken]);

  useSessionExpiry(handleExpiringSoon);

  return (
    <div className="flex min-h-dvh w-full min-w-0 bg-slate-50 relative overflow-x-hidden">
      <Sidebar />

      <div
        className={`flex-1 flex flex-col min-h-dvh min-w-0 transition-all duration-300 ${
          isSidebarOpen ? "lg:ml-[280px]" : "lg:ml-[88px]"
        }`}
      >
        <div className="flex-1 w-full min-w-0 relative">{children}</div>
      </div>

      <ChatWidget />
      <OfflineBanner />
    </div>
  );
};

export default SidebarLayout;
