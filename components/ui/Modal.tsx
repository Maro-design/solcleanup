"use client";

/**
 * Accessible dialog: role="dialog", aria-modal, labelled title, Escape to
 * close, focus moved in on open and restored on close, Tab trapped inside.
 */
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useId, useRef, type ReactNode } from "react";
import { X } from "lucide-react";

interface ModalProps {
  open: boolean;
  onClose?: () => void;
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  /** When false, Escape/backdrop do nothing (e.g. while a transaction is in flight). */
  dismissible?: boolean;
  wide?: boolean;
  /** Children draw the whole panel (own heading, padding, surface); the title becomes the dialog's accessible name. */
  bare?: boolean;
}

export function Modal({ open, onClose, title, description, children, dismissible = true, wide = false, bare = false }: ModalProps) {
  const panel = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const descId = useId();

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const node = panel.current;
    const focusables = () =>
      Array.from(
        node?.querySelectorAll<HTMLElement>('a[href],button:not([disabled]),input,select,textarea,[tabindex]:not([tabindex="-1"])') ?? [],
      );
    (focusables()[0] ?? node)?.focus();
    document.documentElement.style.overflow = "hidden";

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && dismissible) onClose?.();
      if (e.key !== "Tab") return;
      const items = focusables();
      if (items.length === 0) return;
      const first = items[0]!;
      const last = items[items.length - 1]!;
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.documentElement.style.overflow = "";
      previous?.focus?.();
    };
  }, [open, dismissible, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <div
            className="absolute inset-0 bg-[rgb(var(--shadow-ink)/0.45)] backdrop-blur-sm"
            onClick={() => dismissible && onClose?.()}
            aria-hidden
          />
          <motion.div
            ref={panel}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={description ? descId : undefined}
            tabIndex={-1}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ type: "spring", stiffness: 260, damping: 30 }}
            className={
              bare
                ? `relative max-h-[92dvh] w-full overflow-y-auto rounded-t-3xl sm:rounded-3xl ${wide ? "sm:max-w-[560px]" : "sm:max-w-[440px]"}`
                : `relative max-h-[92dvh] w-full overflow-y-auto rounded-t-2xl border border-line bg-raised p-6 shadow-[0_24px_64px_rgb(var(--shadow-ink)/0.16)] sm:rounded-2xl sm:p-8 ${wide ? "sm:max-w-[640px]" : "sm:max-w-[480px]"}`
            }
          >
            {bare ? (
              <>
                <h2 id={titleId} className="sr-only">
                  {title}
                </h2>
                {children}
              </>
            ) : (
            <>
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <h2 id={titleId} className="heading text-20 font-medium text-hi">
                  {title}
                </h2>
                {description && (
                  <p id={descId} className="mt-2 text-14 text-mid">
                    {description}
                  </p>
                )}
              </div>
              {dismissible && onClose && (
                <button
                  type="button"
                  onClick={onClose}
                  className="lift -mr-2 -mt-2 inline-flex size-10 shrink-0 items-center justify-center rounded-lg border border-transparent text-mid hover:bg-overlay hover:text-hi"
                  aria-label="Close dialog"
                >
                  <X size={16} strokeWidth={1.5} />
                </button>
              )}
            </div>
            {children}
            </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
