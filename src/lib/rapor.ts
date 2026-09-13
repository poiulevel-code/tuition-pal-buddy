import { GRUPLAR, type Grup, type GrupBilgi, type Talebe } from "./talebeler";

export function tamRaporOlustur({
  talebeler,
  ayKey,
  ayEtiket,
  tutar,
  grupId,
  gruplar = GRUPLAR,
}: {
  talebeler: Talebe[];
  ayKey: string;
  ayEtiket: string;
  tutar: number;
  grupId?: Grup;
  gruplar?: GrupBilgi[];
}) {
  const kapsam = grupId
    ? talebeler.filter((t) => t.grup === grupId)
    : talebeler;

  const para = (n: number) => `${n.toLocaleString("tr-TR")} Birr`;
  const s: string[] = [];

  s.push("SİEC JİGJİGA KURSU — KURS RAPORU");
  s.push(`Dönem: ${ayEtiket}`);
  if (grupId) {
    s.push(`Grup: ${gruplar.find((g) => g.id === grupId)?.ad ?? ""}`);
  }
  s.push("");

  // Genel özet
  const aidatKapsam = kapsam.filter((t) => !t.aidatHaric);
  const odeyen = aidatKapsam.filter((t) => t.aidat?.[ayKey]);
  const odemeyen = aidatKapsam.filter((t) => !t.aidat?.[ayKey]);
  s.push("1) GENEL ÖZET");
  s.push(`• Toplam talebe: ${kapsam.length}`);
  s.push(`• Aidat kapsamındaki talebe: ${aidatKapsam.length}`);
  s.push(`• Aylık aidat: ${para(tutar)}`);
  s.push(`• Ödeyen: ${odeyen.length} — Ödemeyen: ${odemeyen.length}`);
  s.push(`• Toplanan: ${para(odeyen.length * tutar)}`);
  s.push(`• Beklenen kalan: ${para(odemeyen.length * tutar)}`);
  s.push(`• Aylık hedef toplam: ${para(aidatKapsam.length * tutar)}`);
  s.push("");

  // Gruplara göre aidat
  s.push("2) GRUPLARA GÖRE AİDAT DURUMU");
  const kapsamGruplar = grupId
    ? gruplar.filter((g) => g.id === grupId)
    : gruplar;
  kapsamGruplar.forEach((g) => {
    const liste = aidatKapsam.filter((t) => t.grup === g.id);
    const o = liste.filter((t) => t.aidat?.[ayKey]).length;
    s.push(
      `• ${g.ad} (${g.hoca}): ${o}/${liste.length} ödedi — ${para(o * tutar)}`,
    );
  });
  const gruzsuz = aidatKapsam.filter((t) => !t.grup);
  if (gruzsuz.length && !grupId) {
    const o = gruzsuz.filter((t) => t.aidat?.[ayKey]).length;
    s.push(`• Grubu belirtilmemiş: ${o}/${gruzsuz.length} ödedi`);
  }
  s.push("");

  // Ödemeyenler
  s.push("3) AİDATI ÖDEMEYEN TALEBELER");
  if (odemeyen.length === 0) {
    s.push("Bu ay tüm talebeler aidatını ödemiştir. Allah razı olsun.");
  } else {
    odemeyen.forEach((t, i) => {
      const g = gruplar.find((x) => x.id === t.grup)?.ad ?? "-";
      s.push(`${i + 1}. ${t.isim} (${g})`);
    });
  }
  s.push("");

  s.push("Bu rapor Talebe Takip Paneli tarafından otomatik hazırlanmıştır.");
  s.push("SİEC Jigjiga Kursu");

  return s.join("\n");
}
