// src/components/ui/Toast.tsx
import { useEffect } from "react";

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

  useEffect(() => {
    const t = setTimeout(() => onClose?.(), durationMs);
    return () => clearTimeout(t);
  }, [onClose, durationMs]);

  const base = "fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-lg text-sm";
  const tone =
    kind === "error"   ? "bg-red-600 text-white"   :
    kind === "success" ? "bg-green-600 text-white" :
                          "bg-gray-800 text-white"; // info

  return (
    <div className={`${base} ${tone}`}>
      {body}
      {href && (
        <>
          {" "}<a className="underline" href={href} target="_blank" rel="noreferrer">
            Etherscan
          </a>
        </>
      )}
    </div>
  );
}
