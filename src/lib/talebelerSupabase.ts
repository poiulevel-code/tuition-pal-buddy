// Veri katmanı: Lovable Cloud (Postgres) üzerinde çalışır.
//
// Tasarım ilkeleri:
// - Tek paylaşımlı abonelik: aynı veriyi kullanan bileşenler tekrar sorgu açmaz.
// - localStorage önbelleği: açılışta son bilinen veri anında gösterilir.
// - İyimser güncelleme: yazma işlemleri ekranı beklemeden günceller.
// - Açık sütun projeksiyonu ve sayfalı okuma (1000'erlik parçalar).
// - Canlı kanal yalnızca abone varken açık kalır, son abone ayrılınca kapanır.

import { supabase } from "@/lib/supabaseKendi";
import { cacheOku, cacheYaz, CACHE } from "./yerelCache";
import {
  GRUPLAR,
  type GrupBilgi,
  type EkstraHoca,
  type HocaMailAyar,
  type SayfaKaydi,
  type Talebe,
} from "./talebelerTipler";

const SAYFA_BOYU = 1000;

// Yalnızca gereken sütunlar (SELECT * kullanılmaz).
const TALEBE_SUTUN =
  "id,isim,grup,sinif,telefon,dogum,notlar,foto_url,kiraat,yon,sayfa,hedef_haftalik,fikih_konu,hadis_no,sira,aidat_sadece,aidat_haric,kiraat_gunler,fikih_gunler,hadis_gunler,gecmis,aidat";

const AYAR_SUTUN =
  "aidat_tutar,grup_liste,hoca_mailler,ekstra_hocalar,aidat_mail_gonderim,gonderen_eposta,gonderen_ad";

const AYAR_ID = "genel";

type Satir = Record<string, unknown>;

// ---- Dönüştürücüler ----

function sayi(v: unknown, vars: number): number {
  return typeof v === "number" && Number.isFinite(v) ? v : vars;
}

function metin(v: unknown): string | undefined {
  return typeof v === "string" && v ? v : undefined;
}

function harita(v: unknown): Record<string, number[]> {
  return v && typeof v === "object" && !Array.isArray(v)
    ? (v as Record<string, number[]>)
    : {};
}

function satirdanTalebe(r: Satir): Talebe {
  return {
    id: String(r["id"]),
    isim: typeof r["isim"] === "string" ? (r["isim"] as string) : "Talebe",
    kiraat: r["kiraat"] === true,
    kiraatGunler: harita(r["kiraat_gunler"]),
    sayfa: sayi(r["sayfa"], 1),
    hedefHaftalik: sayi(r["hedef_haftalik"], 5),
    gecmis: Array.isArray(r["gecmis"]) ? (r["gecmis"] as SayfaKaydi[]) : [],
    sira: sayi(r["sira"], 0),
    fotoUrl: metin(r["foto_url"]),
    telefon: metin(r["telefon"]),
    dogum: metin(r["dogum"]),
    notlar: metin(r["notlar"]),
    yon: r["yon"] === "ustten" ? "ustten" : "alttan",
    fikihKonu: sayi(r["fikih_konu"], 1),
    fikihGunler: harita(r["fikih_gunler"]),
    hadisNo: sayi(r["hadis_no"], 1),
    hadisGunler: harita(r["hadis_gunler"]),
    aidat:
      r["aidat"] && typeof r["aidat"] === "object"
        ? (r["aidat"] as Record<string, boolean>)
        : {},
    grup: metin(r["grup"]),
    sinif: metin(r["sinif"]),
    aidatSadece: r["aidat_sadece"] === true,
    aidatHaric: r["aidat_haric"] === true,
  };
}

/** Talebe alanlarını veritabanı sütunlarına çevirir (yalnızca verilenler). */
function talebedenSatir(t: Partial<Omit<Talebe, "id">>): Satir {
  const s: Satir = {};
  const ek = (k: string, v: unknown) => {
    if (v !== undefined) s[k] = v;
  };
  ek("isim", t.isim);
  ek("grup", t.grup ?? null);
  ek("sinif", t.sinif ?? undefined);
  ek("telefon", t.telefon);
  ek("dogum", t.dogum);
  ek("notlar", t.notlar);
  ek("foto_url", t.fotoUrl);
  ek("kiraat", t.kiraat);
  ek("yon", t.yon);
  ek("sayfa", t.sayfa);
  ek("hedef_haftalik", t.hedefHaftalik);
  ek("fikih_konu", t.fikihKonu);
  ek("hadis_no", t.hadisNo);
  ek("sira", t.sira);
  ek("aidat_sadece", t.aidatSadece);
  ek("aidat_haric", t.aidatHaric);
  ek("kiraat_gunler", t.kiraatGunler);
  ek("fikih_gunler", t.fikihGunler);
  ek("hadis_gunler", t.hadisGunler);
  ek("gecmis", t.gecmis);
  ek("aidat", t.aidat);
  if ("sinif" in t) s["sinif"] = t.sinif ?? null;
  if ("grup" in t) s["grup"] = t.grup ?? null;
  return s;
}

// Türkçe alfabeye duyarlı A–Z sıralama; isimler eşitse "sira" karar verir.
const trKarsilastir = new Intl.Collator("tr", { sensitivity: "base" });
export function talebeleriTrSirala(liste: Talebe[]): Talebe[] {
  return [...liste].sort(
    (a, b) => trKarsilastir.compare(a.isim, b.isim) || (a.sira ?? 0) - (b.sira ?? 0),
  );
}

// ---- Paylaşımlı talebe aboneliği (tek sorgu + tek canlı kanal) ----

let talebeSon: Talebe[] | null = null;
const talebeAbone = new Set<(t: Talebe[]) => void>();
const talebeHataAbone = new Set<(e: Error) => void>();
let talebeKanal: ReturnType<typeof supabase.channel> | null = null;
let ilkYuklemeSurecte = false;

function talebeYay(liste: Talebe[]) {
  talebeSon = liste;
  cacheYaz(CACHE.talebeler, liste);
  talebeAbone.forEach((f) => f(liste));
}

function hataYay(e: unknown) {
  const hata = e instanceof Error ? e : new Error(String(e));
  console.error("Veri okuma hatası", hata);
  talebeHataAbone.forEach((f) => f(hata));
}

/** Tüm talebeleri 1000'erlik sayfalarla çeker. */
async function talebeleriCek(): Promise<Talebe[]> {
  const hepsi: Talebe[] = [];
  for (let bas = 0; ; bas += SAYFA_BOYU) {
    const { data, error } = await supabase
      .from("talebeler")
      .select(TALEBE_SUTUN)
      .order("isim", { ascending: true })
      .range(bas, bas + SAYFA_BOYU - 1);
    if (error) throw error;
    const parca = (data ?? []) as unknown as Satir[];
    hepsi.push(...parca.map(satirdanTalebe));
    if (parca.length < SAYFA_BOYU) break;
  }
  return talebeleriTrSirala(hepsi);
}

function talebeKanalAc() {
  if (talebeKanal) return;
  talebeKanal = supabase
    .channel("talebeler-canli")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "talebeler" },
      (payload) => {
        const mevcut = talebeSon ?? [];
        if (payload.eventType === "DELETE") {
          const id = String((payload.old as Satir)["id"] ?? "");
          talebeYay(mevcut.filter((t) => t.id !== id));
          return;
        }
        const yeni = satirdanTalebe(payload.new as Satir);
        const idx = mevcut.findIndex((t) => t.id === yeni.id);
        const liste = idx >= 0 ? mevcut.map((t) => (t.id === yeni.id ? yeni : t)) : [...mevcut, yeni];
        talebeYay(talebeleriTrSirala(liste));
      },
    )
    .subscribe();
}

function talebeKanalKapat() {
  if (!talebeKanal) return;
  void supabase.removeChannel(talebeKanal);
  talebeKanal = null;
}

export function talebeleriDinle(cb: (t: Talebe[]) => void, onError?: (e: Error) => void) {
  talebeAbone.add(cb);
  if (onError) talebeHataAbone.add(onError);

  // 1) Anında: bellekteki ya da önbellekteki son liste.
  const yerel = talebeSon ?? cacheOku<Talebe[]>(CACHE.talebeler);
  if (yerel && yerel.length > 0) {
    talebeSon = yerel;
    cb(yerel);
  }

  // 2) Arka planda: güncel veri + canlı kanal (yalnızca bir kez).
  if (!ilkYuklemeSurecte && !talebeKanal) {
    ilkYuklemeSurecte = true;
    void talebeleriCek()
      .then(talebeYay)
      .catch(hataYay)
      .finally(() => {
        ilkYuklemeSurecte = false;
      });
    talebeKanalAc();
  }

  return () => {
    talebeAbone.delete(cb);
    if (onError) talebeHataAbone.delete(onError);
    if (talebeAbone.size === 0) talebeKanalKapat();
  };
}

/**
 * PDF / Excel çıktıları için verileri doğrudan sunucudan okur.
 * Ulaşılamazsa eldeki en son liste döner (uygulama akışı bozulmaz).
 */
export async function talebeleriTazele(): Promise<Talebe[]> {
  try {
    const liste = await talebeleriCek();
    talebeYay(liste);
    return liste;
  } catch {
    return talebeSon ?? cacheOku<Talebe[]>(CACHE.talebeler) ?? [];
  }
}

function talebeleriYerelUygula(donustur: (mevcut: Talebe[]) => Talebe[]) {
  const mevcut = talebeSon ?? cacheOku<Talebe[]>(CACHE.talebeler) ?? [];
  talebeYay(donustur(mevcut));
}

// ---- Yazma işlemleri ----

export async function talebeEkle(t: Omit<Talebe, "id">) {
  const { data, error } = await supabase
    .from("talebeler")
    .insert(talebedenSatir(t) as never)
    .select("id")
    .single();
  if (error) throw error;
  const id = String((data as unknown as Satir)["id"]);
  talebeleriYerelUygula((mevcut) =>
    mevcut.some((x) => x.id === id)
      ? mevcut
      : talebeleriTrSirala([...mevcut, { ...(t as Talebe), id }]),
  );
  return id;
}

export async function talebeGuncelle(id: string, patch: Partial<Omit<Talebe, "id">>) {
  talebeleriYerelUygula((mevcut) =>
    talebeleriTrSirala(mevcut.map((t) => (t.id === id ? { ...t, ...patch } : t))),
  );
  const { error } = await supabase
    .from("talebeler")
    .update(talebedenSatir(patch) as never)
    .eq("id", id);
  if (error) throw error;
}

export async function talebeSil(id: string) {
  talebeleriYerelUygula((mevcut) => mevcut.filter((t) => t.id !== id));
  const { error } = await supabase.from("talebeler").delete().eq("id", id);
  if (error) throw error;
}

export async function topluHedefGuncelle(ids: string[], hedef: number) {
  if (ids.length === 0) return;
  const kume = new Set(ids);
  talebeleriYerelUygula((mevcut) =>
    mevcut.map((t) => (kume.has(t.id) ? { ...t, hedefHaftalik: hedef } : t)),
  );
  // Tek sorguda toplu güncelleme (N+1 yok).
  const { error } = await supabase
    .from("talebeler")
    .update({ hedef_haftalik: hedef } as never)
    .in("id", ids);
  if (error) throw error;
}

export async function aidatOdemeAyarla(t: Talebe, ayKey: string, odendi: boolean) {
  const harita = { ...(t.aidat ?? {}), [ayKey]: odendi };
  await talebeGuncelle(t.id, { aidat: harita });
}

// ---- Paylaşımlı ayarlar aboneliği (tek satır, tek kanal) ----

type AyarVeri = Satir | undefined;
let ayarSon: AyarVeri;
let ayarSonVar = false;
const ayarAbone = new Set<(v: AyarVeri) => void>();
let ayarKanal: ReturnType<typeof supabase.channel> | null = null;
let ayarYuklemeSurecte = false;

async function ayarlariCek(): Promise<AyarVeri> {
  const { data, error } = await supabase
    .from("ayarlar")
    .select(AYAR_SUTUN)
    .eq("id", AYAR_ID)
    .maybeSingle();
  if (error) throw error;
  return (data ?? undefined) as unknown as AyarVeri;
}

function ayarYay(v: AyarVeri) {
  ayarSon = v;
  ayarSonVar = true;
  ayarAbone.forEach((f) => f(v));
}

function ayarlariDinle(cb: (v: AyarVeri) => void) {
  ayarAbone.add(cb);
  if (ayarSonVar) cb(ayarSon);

  if (!ayarYuklemeSurecte && !ayarKanal) {
    ayarYuklemeSurecte = true;
    void ayarlariCek()
      .then(ayarYay)
      .catch((e) => console.error("Ayarlar okunamadı", e))
      .finally(() => {
        ayarYuklemeSurecte = false;
      });
    ayarKanal = supabase
      .channel("ayarlar-canli")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "ayarlar", filter: `id=eq.${AYAR_ID}` },
        (payload) => ayarYay(payload.new as Satir),
      )
      .subscribe();
  }

  return () => {
    ayarAbone.delete(cb);
    if (ayarAbone.size === 0 && ayarKanal) {
      void supabase.removeChannel(ayarKanal);
      ayarKanal = null;
    }
  };
}

async function ayarKaydet(patch: Satir) {
  // Yerel kopya hemen tazelenir, ardından sunucuya yazılır.
  ayarYay({ ...(ayarSon ?? {}), ...patch });
  const { error } = await supabase
    .from("ayarlar")
    .upsert({ id: AYAR_ID, ...patch } as never, { onConflict: "id" });
  if (error) throw error;
}

// ---- Aidat tutarı ----

export async function aidatTutariniOku(): Promise<number> {
  try {
    const v = await ayarlariCek();
    return sayi(Number(v?.["aidat_tutar"]), 0);
  } catch {
    return cacheOku<number>(CACHE.aidatTutar) ?? 0;
  }
}

export function aidatTutariniDinle(cb: (tutar: number) => void) {
  const yerel = cacheOku<number>(CACHE.aidatTutar);
  if (!ayarSonVar && typeof yerel === "number") cb(yerel);
  return ayarlariDinle((v) => {
    const t = sayi(Number(v?.["aidat_tutar"]), 0);
    cacheYaz(CACHE.aidatTutar, t);
    cb(t);
  });
}

export async function aidatTutariKaydet(tutar: number) {
  await ayarKaydet({ aidat_tutar: tutar });
}

// ---- Hoca e-postaları ve aidat hatırlatma kaydı ----

function hocaMailCoz(ham0: AyarVeri): HocaMailAyar {
  const v = ham0 ?? {};
  const ham = Array.isArray(v["ekstra_hocalar"]) ? (v["ekstra_hocalar"] as unknown[]) : [];
  return {
    gonderen: typeof v["gonderen_eposta"] === "string" ? (v["gonderen_eposta"] as string) : "",
    gonderenAd: typeof v["gonderen_ad"] === "string" ? (v["gonderen_ad"] as string) : "",
    mailler:
      v["hoca_mailler"] && typeof v["hoca_mailler"] === "object"
        ? (v["hoca_mailler"] as Record<string, string>)
        : {},
    gonderilen:
      v["aidat_mail_gonderim"] && typeof v["aidat_mail_gonderim"] === "object"
        ? (v["aidat_mail_gonderim"] as Record<string, string[]>)
        : {},
    ekstraHocalar: ham
      .filter((h: unknown): h is Partial<EkstraHoca> => !!h && typeof h === "object")
      .map((h) => ({
        id: typeof h.id === "string" ? h.id : String(Math.random()),
        ad: typeof h.ad === "string" ? h.ad : "",
        eposta: typeof h.eposta === "string" ? h.eposta : "",
        grup: typeof h.grup === "string" && h.grup ? h.grup : undefined,
      }))
      .filter((h) => h.ad || h.eposta),
  };
}

export function hocaMailAyarDinle(cb: (a: HocaMailAyar) => void) {
  const yerel = cacheOku<HocaMailAyar>(CACHE.hocaMail);
  if (!ayarSonVar && yerel) cb(yerel);
  return ayarlariDinle((v) => {
    const ayar = hocaMailCoz(v);
    cacheYaz(CACHE.hocaMail, ayar);
    cb(ayar);
  });
}

export async function ekstraHocalariKaydet(hocalar: EkstraHoca[]) {
  await ayarKaydet({ ekstra_hocalar: hocalar });
}

export async function gonderenBilgiKaydet(eposta: string, ad: string) {
  await ayarKaydet({ gonderen_eposta: eposta.trim(), gonderen_ad: ad.trim() });
}

export async function hocaMailleriKaydet(mailler: Record<string, string>) {
  await ayarKaydet({ hoca_mailler: mailler });
}

export async function aidatMailGonderimIsaretle(
  ayKey: string,
  grupId: string,
  mevcut: Record<string, string[]>,
) {
  const liste = Array.from(new Set([...(mevcut[ayKey] ?? []), grupId]));
  await ayarKaydet({ aidat_mail_gonderim: { ...mevcut, [ayKey]: liste } });
}

// ---- Grup adları ve mesul hocalar ----

function grupListeCoz(v: AyarVeri): GrupBilgi[] {
  const liste = v?.["grup_liste"];
  if (Array.isArray(liste) && liste.length > 0) {
    return liste
      .map((x) => x as { id?: unknown; ad?: unknown; hoca?: unknown })
      .filter((x) => typeof x.id === "string" && (x.id as string).trim())
      .map((x) => ({
        id: (x.id as string).trim(),
        ad: typeof x.ad === "string" ? x.ad : "",
        hoca: typeof x.hoca === "string" ? x.hoca : "",
      }));
  }
  return GRUPLAR.map((g) => ({ id: g.id, ad: g.ad, hoca: g.hoca }));
}

export function gruplarCacheOku(): GrupBilgi[] | null {
  const yerel = cacheOku<GrupBilgi[]>(CACHE.gruplar);
  return yerel && yerel.length > 0 ? yerel : null;
}

export function gruplariDinle(cb: (g: GrupBilgi[]) => void) {
  const yerel = gruplarCacheOku();
  if (!ayarSonVar && yerel) cb(yerel);
  return ayarlariDinle((v) => {
    const liste = grupListeCoz(v);
    if (liste.length > 0) cacheYaz(CACHE.gruplar, liste);
    cb(liste);
  });
}

export function yeniGrupId() {
  return `grup_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

export async function gruplariKaydet(liste: GrupBilgi[]) {
  await ayarKaydet({
    grup_liste: liste.map((g) => ({ id: g.id, ad: g.ad.trim(), hoca: g.hoca.trim() })),
  });
}
