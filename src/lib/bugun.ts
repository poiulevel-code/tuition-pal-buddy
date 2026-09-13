import { useEffect, useState } from "react";

export function gunBaslangiciTs(d = new Date()): number {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x.getTime();
}

/**
 * Bugünün tarihini (gün başlangıcı, ms) döndürür.
 * Gece yarısı geçildiğinde, sekme yeniden görünür olduğunda veya
 * pencere odaklandığında kendiliğinden güncellenir.
 */
export function useBugun(): number {
  const [bugun, setBugun] = useState<number>(() => gunBaslangiciTs());

  useEffect(() => {
    const kontrol = () => {
      const t = gunBaslangiciTs();
      setBugun((b) => (b === t ? b : t));
    };
    const id = window.setInterval(kontrol, 30_000);
    document.addEventListener("visibilitychange", kontrol);
    window.addEventListener("focus", kontrol);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", kontrol);
      window.removeEventListener("focus", kontrol);
    };
  }, []);

  return bugun;
}
