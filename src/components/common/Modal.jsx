import { useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { X } from "lucide-react";

/**
 * Standardized Premium Modal Component
 * 
 * Features:
 * - Uses React Portal to avoid stacking context issues (Sidebar/Header overlay)
 * - Standardized z-indices (9998 backdrop, 9999 modal)
 * - Full-screen responsive backdrop with blur
 * - Click-outside and Escape key closing
 * - Body scroll locking
 * - Framer Motion animations
 */
const Modal = ({
    isOpen,
    onClose,
    title,
    children,
    maxWidth = "max-w-2xl",
    showCloseButton = true
}) => {
    const titleId = useId();
    const panelRef = useRef(null);
    const previousFocusRef = useRef(null);
    const shouldReduceMotion = useReducedMotion();

    // Body scroll locking
    useEffect(() => {
        if (!isOpen || typeof window === "undefined") return undefined;

        const originalOverflow = document.body.style.overflow;
        const originalPaddingRight = document.body.style.paddingRight;
        const scrollbarWidth =
            window.innerWidth - document.documentElement.clientWidth;

        document.body.style.overflow = "hidden";
        if (scrollbarWidth > 0) {
            document.body.style.paddingRight = `${scrollbarWidth}px`;
        }

        return () => {
            document.body.style.overflow = originalOverflow;
            document.body.style.paddingRight = originalPaddingRight;
        };
    }, [isOpen]);

    // Escape key listener
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === "Escape") onClose?.();
        };
        if (isOpen) {
            window.addEventListener("keydown", handleKeyDown);
        }
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [isOpen, onClose]);

    useEffect(() => {
        if (!isOpen) return undefined;

        previousFocusRef.current = document.activeElement;
        const focusTimer = window.setTimeout(() => panelRef.current?.focus(), 0);

        return () => {
            window.clearTimeout(focusTimer);
            previousFocusRef.current?.focus?.();
        };
    }, [isOpen]);

    if (typeof document === "undefined") return null;

    const backdropTransition = shouldReduceMotion
        ? { duration: 0 }
        : { duration: 0.16, ease: "easeOut" };

    const panelTransition = shouldReduceMotion
        ? { duration: 0 }
        : { type: "spring", damping: 28, stiffness: 360 };

    const modalContent = (
        <AnimatePresence>
            {isOpen && (
                <div
                    className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-6 md:p-8"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby={titleId}
                >
                    {/* Backdrop Overlay */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={backdropTransition}
                        onClick={onClose}
                        className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[9998]"
                    />

                    {/* Modal Panel */}
                    <motion.div
                        ref={panelRef}
                        tabIndex={-1}
                        initial={{
                            opacity: 0,
                            scale: shouldReduceMotion ? 1 : 0.96,
                            y: shouldReduceMotion ? 0 : 16
                        }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{
                            opacity: 0,
                            scale: shouldReduceMotion ? 1 : 0.98,
                            y: shouldReduceMotion ? 0 : 12
                        }}
                        transition={panelTransition}
                        className={`relative w-full ${maxWidth} bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 z-[9999] flex flex-col max-h-[calc(100dvh-24px)] sm:max-h-[90vh] overflow-hidden outline-none`}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between gap-4 px-4 py-4 sm:px-6 sm:py-5 border-b border-slate-100 bg-slate-50/80">
                            <h2
                                id={titleId}
                                className="min-w-0 text-lg sm:text-xl font-black text-slate-900 tracking-tight leading-tight"
                            >
                                {title}
                            </h2>
                            {showCloseButton && (
                                <button
                                    onClick={onClose}
                                    className="h-10 w-10 flex items-center justify-center rounded-xl bg-white border border-slate-200 text-slate-400 hover:text-rose-600 hover:border-rose-200 hover:bg-rose-50 transition-all active:scale-90 shadow-sm"
                                    type="button"
                                    aria-label="Close modal"
                                >
                                    <X size={20} />
                                </button>
                            )}
                        </div>

                        {/* Body Container (Scrollable) */}
                        <div className="flex-1 overflow-y-auto overscroll-contain p-4 sm:p-6 scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
                            {children}
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );

    return createPortal(modalContent, document.body);
};

export default Modal;
