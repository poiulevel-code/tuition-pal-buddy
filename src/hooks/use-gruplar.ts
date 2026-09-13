import { useEffect, useState } from "react";
import { GRUPLAR, gruplarCacheOku, gruplariDinle, type GrupBilgi } from "@/lib/talebeler";

export function useGruplar(): GrupBilgi[] {
  const [gruplar, setGruplar] = useState<GrupBilgi[]>(GRUPLAR);

  // Açılışta son bilinen grup listesi anında gösterilir, ardından canlı veri gelir.
  useEffect(() => {
    const yerel = gruplarCacheOku();
    if (yerel) setGruplar(yerel);
  }, []);

  useEffect(() => gruplariDinle(setGruplar), []);
  return gruplar;
}
