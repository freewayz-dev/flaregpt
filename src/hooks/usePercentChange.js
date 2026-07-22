import { useEffect, useRef, useState } from "react";

// Tracks the percent change between the current value and the previous one
// this hook saw — a genuine delta computed from real consecutive live polls,
// not a fabricated number. Returns null until a second value has arrived.
export function usePercentChange(value) {
  const prevRef = useRef(null);
  const [percentChange, setPercentChange] = useState(null);

  useEffect(() => {
    if (value === undefined || value === null) return;

    // Skip if the value is identical to last time — both to avoid showing a
    // meaningless "+0.00%" and because React StrictMode intentionally
    // double-invokes effects in development, which would otherwise compare
    // a value to itself on first mount.
    if (
      prevRef.current !== null &&
      prevRef.current !== 0 &&
      prevRef.current !== value
    ) {
      setPercentChange(((value - prevRef.current) / prevRef.current) * 100);
    }
    prevRef.current = value;
  }, [value]);

  return percentChange;
}
