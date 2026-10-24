import { useEffect, useRef } from "react";

export default function useKeyboardShortcuts(callbacks) {
  const callbacksRef = useRef(callbacks);

  useEffect(() => {
    callbacksRef.current = callbacks;
  });

  useEffect(() => {
    const handler = (e) => {
      const target = e.target;
      const isTyping =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement ||
        target.isContentEditable;
      if (isTyping) return;

      const mod = e.ctrlKey || e.metaKey;
      const key = e.key.toLowerCase();

      if (mod && key === "z" && !e.shiftKey) {
        e.preventDefault();
        callbacksRef.current.onUndo?.();
      } else if (mod && (key === "y" || (key === "z" && e.shiftKey))) {
        e.preventDefault();
        callbacksRef.current.onRedo?.();
      } else if (mod && key === "o") {
        e.preventDefault();
        callbacksRef.current.onOpenPicker?.();
      } else if (e.key === "Escape") {
        callbacksRef.current.onEscape?.();
      } else if (!mod && key === "r") {
        callbacksRef.current.onRotate?.();
      } else if (!mod && (key === "+" || key === "=")) {
        e.preventDefault();
        callbacksRef.current.onZoomIn?.();
      } else if (!mod && key === "-") {
        e.preventDefault();
        callbacksRef.current.onZoomOut?.();
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);
}
