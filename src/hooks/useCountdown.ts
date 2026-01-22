import { useEffect, useMemo, useState } from "react";

function clamp0(n: number) {
  return Math.max(0, Math.floor(n));
}

export function useCountdown(target: Date, tickMs: number = 30_000) {
  const targetMs = target.getTime();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), tickMs);
    return () => window.clearInterval(id);
  }, [tickMs]);

  const msLeft = Math.max(0, targetMs - now);

  return useMemo(() => {
    const totalMinutes = clamp0(msLeft / (60 * 1000));
    const days = clamp0(totalMinutes / (60 * 24));
    const hours = clamp0((totalMinutes - days * 24 * 60) / 60);
    const minutes = clamp0(totalMinutes - days * 24 * 60 - hours * 60);
    return { msLeft, days, hours, minutes, isOver: msLeft <= 0 };
  }, [msLeft]);
}
