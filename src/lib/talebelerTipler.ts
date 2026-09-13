// Tipler ve sabitler: bu dosya Firebase'e bağlı DEĞİLDİR, bu yüzden
// uygulama açılışında ağır kütüphane yüklemeden kullanılabilir.

export type SayfaKaydi = { t: number; sayfa: number };

export type KiraatYonu = "alttan" | "ustten";

export type Ders = "kuran" | "fikih" | "hadis";

export type Grup = string;

export const GRUPLAR: { id: Grup; ad: string; hoca: string }[] = [
  { id: "seviye1", ad: "1. Seviye", hoca: "Abdurehim Hoca" },
  { id: "seviye2", ad: "2. Seviye", hoca: "Selahaddin Hoca" },
  { id: "hazirlik", ad: "Hazırlık", hoca: "Abdurrahman Hoca" },
];

export type Talebe = {
  id: string;
  isim: string;
  kiraat: boolean;
  kiraatGunler?: Record<string, number[]>;
  sayfa: number;
  hedefHaftalik?: number;
  gecmis: SayfaKaydi[];
  sira?: number;
  fotoUrl?: string;
  telefon?: string;
  dogum?: string;
  notlar?: string;
  yon?: KiraatYonu;
  fikihKonu?: number;
  fikihGunler?: Record<string, number[]>;
  hadisNo?: number;
  hadisGunler?: Record<string, number[]>;
  aidat?: Record<string, boolean>;
  grup?: Grup;
  sinif?: string;
  aidatSadece?: boolean;
  aidatHaric?: boolean;
};

export type GrupBilgi = { id: Grup; ad: string; hoca: string };

export type EkstraHoca = {
  id: string;
  ad: string;
  eposta: string;
  grup?: Grup; // boşsa genel özet gönderilir
};

export type HocaMailAyar = {
  /** Hocalara gönderilen maillerde görünecek gönderen adresi (Gmail). */
  gonderen?: string;
  /** Gönderen adı (isteğe bağlı). */
  gonderenAd?: string;
  mailler: Record<string, string>;
  gonderilen: Record<string, string[]>; // ayKey -> gönderilen grup id'leri
  ekstraHocalar: EkstraHoca[];
};
