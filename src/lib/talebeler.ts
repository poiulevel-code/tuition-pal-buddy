// Hafif giriş katmanı (façade).
//
// Amaç: uygulama açılırken Firebase kütüphanesini beklememek. Bu dosya
// yalnızca tipleri, sabitleri ve yerel önbelleği kullanır; Firestore kodu
// (ve Firebase kütüphanesi) ilk çizimden sonra arka planda yüklenir.
// Ekran, önbellekteki son bilinen veriyle anında dolar; canlı veri gelince
// üzerine yazılır.

import { cacheOku, CACHE } from "./yerelCache";
import type { GrupBilgi, HocaMailAyar, Talebe, EkstraHoca } from "./talebelerTipler";

export { GRUPLAR } from "./talebelerTipler";
export type {
  SayfaKaydi,
  KiraatYonu,
  Ders,
  Grup,
  Talebe,
  GrupBilgi,
  EkstraHoca,
  HocaMailAyar,
} from "./talebelerTipler";

type FirestoreModul = typeof import("./talebelerSupabase");

let modul: Promise<FirestoreModul> | null = null;

function veriKatmani(): Promise<FirestoreModul> {
  modul ??= import("./talebelerSupabase");
  return modul;
}

/** Dinleyicileri tembel bağlar: önbellek anında, canlı veri hemen ardından. */
function tembelDinle<T extends unknown[]>(
  bagla: (m: FirestoreModul) => (...a: T) => () => void,
  ...args: T
) {
  let unsub: (() => void) | null = null;
  let iptal = false;
  void veriKatmani().then((m) => {
    if (iptal) return;
    unsub = bagla(m)(...args);
  });
  return () => {
    iptal = true;
    unsub?.();
    unsub = null;
  };
}

export function talebeleriDinle(cb: (t: Talebe[]) => void, onError?: (e: Error) => void) {
  const yerel = cacheOku<Talebe[]>(CACHE.talebeler);
  if (yerel && yerel.length > 0) cb(yerel);
  return tembelDinle((m) => m.talebeleriDinle, cb, onError);
}

export function gruplariDinle(cb: (g: GrupBilgi[]) => void) {
  const yerel = gruplarCacheOku();
  if (yerel) cb(yerel);
  return tembelDinle((m) => m.gruplariDinle, cb);
}

export function aidatTutariniDinle(cb: (tutar: number) => void) {
  const yerel = cacheOku<number>(CACHE.aidatTutar);
  if (typeof yerel === "number") cb(yerel);
  return tembelDinle((m) => m.aidatTutariniDinle, cb);
}

export function hocaMailAyarDinle(cb: (a: HocaMailAyar) => void) {
  const yerel = cacheOku<HocaMailAyar>(CACHE.hocaMail);
  if (yerel) cb(yerel);
  return tembelDinle((m) => m.hocaMailAyarDinle, cb);
}

export function gruplarCacheOku(): GrupBilgi[] | null {
  const yerel = cacheOku<GrupBilgi[]>(CACHE.gruplar);
  return yerel && yerel.length > 0 ? yerel : null;
}

export function yeniGrupId() {
  return `grup_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

// ---- Yazma / okuma işlemleri (kullanıldığı anda yüklenir) ----

export async function talebeleriTazele(): Promise<Talebe[]> {
  return (await veriKatmani()).talebeleriTazele();
}

export async function talebeEkle(t: Omit<Talebe, "id">) {
  return (await veriKatmani()).talebeEkle(t);
}

export async function talebeGuncelle(id: string, patch: Partial<Omit<Talebe, "id">>) {
  return (await veriKatmani()).talebeGuncelle(id, patch);
}

export async function talebeSil(id: string) {
  return (await veriKatmani()).talebeSil(id);
}

export async function topluHedefGuncelle(ids: string[], hedef: number) {
  return (await veriKatmani()).topluHedefGuncelle(ids, hedef);
}

export async function aidatTutariniOku(): Promise<number> {
  return (await veriKatmani()).aidatTutariniOku();
}

export async function aidatTutariKaydet(tutar: number) {
  return (await veriKatmani()).aidatTutariKaydet(tutar);
}

export async function aidatOdemeAyarla(t: Talebe, ayKey: string, odendi: boolean) {
  return (await veriKatmani()).aidatOdemeAyarla(t, ayKey, odendi);
}

export async function ekstraHocalariKaydet(hocalar: EkstraHoca[]) {
  return (await veriKatmani()).ekstraHocalariKaydet(hocalar);
}

export async function gonderenBilgiKaydet(eposta: string, ad: string) {
  return (await veriKatmani()).gonderenBilgiKaydet(eposta, ad);
}

export async function hocaMailleriKaydet(mailler: Record<string, string>) {
  return (await veriKatmani()).hocaMailleriKaydet(mailler);
}

export async function aidatMailGonderimIsaretle(
  ayKey: string,
  grupId: string,
  mevcut: Record<string, string[]>,
) {
  return (await veriKatmani()).aidatMailGonderimIsaretle(ayKey, grupId, mevcut);
}

export async function gruplariKaydet(liste: GrupBilgi[]) {
  return (await veriKatmani()).gruplariKaydet(liste);
}
