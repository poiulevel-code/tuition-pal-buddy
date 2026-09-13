// Basit yerel önbellek yardımcıları (localStorage).
// Amaç: uygulama açıldığı anda son bilinen veriyi göstermek, sunucu
// yanıtını beklememek. Sunucudan yeni veri gelince önbellek tazelenir.

const ONEK = "dtt_cache_";

export function cacheOku<T>(anahtar: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(ONEK + anahtar);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function cacheYaz<T>(anahtar: string, deger: T) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(ONEK + anahtar, JSON.stringify(deger));
  } catch {
    /* kota dolabilir, yoksay */
  }
}

export const CACHE = {
  talebeler: "talebeler",
  gruplar: "gruplar",
  aidatTutar: "aidatTutar",
  hocaMail: "hocaMail",
} as const;
