// src/components/ui/Toast.tsx
import { useEffect, useRef, useState } from "react";

type Kind = "info" | "success" | "error";

type Props = {
  kind?: Kind;             // default "info"
  text?: string;           // primary text prop
  message?: string;        // alias for text (for components that pass `message`)
  href?: string;           // optional link (e.g., Etherscan)
  onClose?: () => void;
  durationMs?: number;     // default 4500
};

export default function Toast({
  kind = "info",
  text,
  message,
  href,
  onClose,
  durationMs = 4500,
}: Props) {
  const body = text ?? message ?? "";
  if (!body) return null;

  // --- Hover pause logic ---
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [remaining, setRemaining] = useState(durationMs);
  const startRef = useRef<number | null>(null);

  const clearTimer = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const startTimer = () => {
    startRef.current = Date.now();
    timerRef.current = setTimeout(() => {
      onClose?.();
    }, remaining);
  };

  useEffect(() => {
    if (!onClose) return;
    startTimer();
    return clearTimer;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleMouseEnter = () => {
    if (!onClose) return;
    clearTimer();
    if (startRef.current) {
      const elapsed = Date.now() - startRef.current;
      setRemaining((r) => Math.max(0, r - elapsed));
    }
  };

  const handleMouseLeave = () => {
    if (!onClose) return;
    if (remaining > 0) startTimer();
  };

  // --- Styling ---
  const base =
    "fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-lg text-sm flex items-center gap-2 max-w-sm";
  const tone =
    kind === "error"
      ? "bg-red-600 text-white"
      : kind === "success"
      ? "bg-green-600 text-white"
      : "bg-gray-800 text-white"; // info

  return (
    <div
      className={`${base} ${tone}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <span className="flex-1">
        {body}
        {href && (
          <>
            {" "}
            <a
              className="underline font-medium"
              href={href}
              target="_blank"
              rel="noreferrer"
            >
              View on Etherscan
            </a>
          </>
        )}
      </span>
      {onClose && (
        <button
          onClick={onClose}
          className="ml-2 text-white/80 hover:text-white font-bold"
          title="Close"
        >
          ×
        </button>
      )}
    </div>
  );
}
