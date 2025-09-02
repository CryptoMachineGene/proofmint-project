import { useEffect } from "react";

type Props = {
  kind: "success" | "error";
  text: string;
  onClose?: () => void;
  durationMs?: number;
};

export default function Toast({ kind, text, onClose, durationMs = 4500 }: Props) {
  useEffect(() => {
    const t = setTimeout(() => onClose?.(), durationMs);
    return () => clearTimeout(t);
  }, [onClose, durationMs]);

  const base = "fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-lg text-sm";
  const tone =
    kind === "success"
      ? "bg-green-600 text-white"
      : "bg-red-600 text-white";

  return (
    <div className={`${base} ${tone}`}>
      {text}
    </div>
  );
}
