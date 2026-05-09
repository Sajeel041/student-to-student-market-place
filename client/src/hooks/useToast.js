import { useState, useRef, useCallback } from 'react';

export function useToast() {
  const [toast, setToast] = useState(null);
  const timerRef = useRef(null);

  const showToast = useCallback(({ msg, undo, kind = 'success' }) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    const id = Math.random().toString(36).slice(2);
    setToast({ id, msg, undo, kind });
    timerRef.current = setTimeout(() => setToast(t => t?.id === id ? null : t), 5000);
  }, []);

  const dismissToast = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setToast(null);
  }, []);

  return { toast, showToast, dismissToast };
}
