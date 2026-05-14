import { AnimatePresence, motion } from "framer-motion";
import { WifiOff } from "lucide-react";
import useNetworkStatus from "../../hooks/useNetworkStatus";

const OfflineBanner = () => {
  const isOnline = useNetworkStatus();

  return (
    <AnimatePresence>
      {!isOnline && (
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[99999] flex items-center gap-3 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-2xl border border-slate-700 text-sm font-semibold"
        >
          <WifiOff size={16} className="text-rose-400 shrink-0" />
          <span>No internet connection</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default OfflineBanner;
