import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Mail,
  Send,
  Check,
  UserPlus,
  Trash2,
  Menu,
  X,
  FileText,
  PenLine,
  RefreshCw,
} from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import {
  hocaMailAyarDinle,
  hocaMailleriKaydet,
  aidatMailGonderimIsaretle,
  aidatTutariniOku,
  ekstraHocalariKaydet,
  type EkstraHoca,
  type Grup,
  type HocaMailAyar,
  type Talebe,
} from "@/lib/talebeler";
import { aidatHatirlatmaGonder } from "@/lib/aidatMail.functions";
import { serbestMailGonder } from "@/lib/mail.functions";
import { mailDurumuAl } from "@/lib/mailDurum.functions";
import { tamRaporOlustur } from "@/lib/rapor";
import { useGruplar } from "@/hooks/use-gruplar";


const AY_ADLARI = [
  "Ocak",
  "Şubat",
  "Mart",
  "Nisan",
  "Mayıs",
  "Haziran",
  "Temmuz",
  "Ağustos",
  "Eylül",
  "Ekim",
  "Kasım",
  "Aralık",
];

type Alici = {
  anahtar: string;
  ad: string;
  grupEtiket: string;
  eposta: string;
  odeyen: number;
  toplam: number;
  odemeyenler: string[];
  ekstraId?: string;
};

export default function AidatHatirlatma({ talebeler }: { talebeler: Talebe[] }) {
  const simdi = new Date();
  const ayKey = `${simdi.getFullYear()}-${String(simdi.getMonth() + 1).padStart(2, "0")}`;
  const ayEtiket = `${AY_ADLARI[simdi.getMonth()]} ${simdi.getFullYear()}`;
  const gruplar = useGruplar();

  const [ayar, setAyar] = useState<HocaMailAyar>({
    mailler: {},
    gonderilen: {},
    ekstraHocalar: [],
  });
  const [taslak, setTaslak] = useState<Record<string, string>>({});
  const [tutar, setTutar] = useState(0);
  const [gonderiliyor, setGonderiliyor] = useState<string | null>(null);
  const [menuAcik, setMenuAcik] = useState(false);
  const [yeniAd, setYeniAd] = useState("");
  const [yeniEposta, setYeniEposta] = useState("");
  const [yeniGrup, setYeniGrup] = useState<string>("genel");

  const [sekme, setSekme] = useState<"hatirlatma" | "rapor" | "mesaj">(
    "hatirlatma",
  );
  // Rapor sekmesi
  const [raporAlici, setRaporAlici] = useState("elle");
  const [raporEposta, setRaporEposta] = useState("");
  const [raporKapsam, setRaporKapsam] = useState<string>("genel");
  const [raporKonu, setRaporKonu] = useState("");
  const [raporMetin, setRaporMetin] = useState("");
  // Mesaj sekmesi
  const [mesajSecimler, setMesajSecimler] = useState<string[]>([]);
  const [mesajEposta, setMesajEposta] = useState("");
  const [mesajKonu, setMesajKonu] = useState("");
  const [mesajMetin, setMesajMetin] = useState("");


  const [mailHazir, setMailHazir] = useState<boolean | null>(null);

  useEffect(() => {
    const unsub = hocaMailAyarDinle((a) => {
      setAyar(a);
      setTaslak((t) => ({ ...a.mailler, ...t }));
    });
    void aidatTutariniOku().then(setTutar);
    void mailDurumuAl()
      .then((d) => setMailHazir(Boolean(d?.hazir)))
      .catch(() => setMailHazir(false));
    return () => unsub();
  }, []);

  const mailSonuc = (s: {
    ok: boolean;
    baglantiYok: boolean;
    hata: string;
  }) => {
    if (s.baglantiYok) setMailHazir(false);
    if (!s.ok) {
      toast.error(s.hata || "E-posta gönderilemedi.");
      return false;
    }
    setMailHazir(true);
    return true;
  };

  const gonderilenler = ayar.gonderilen[ayKey] ?? [];

  const grupOzet = (grupId: Grup) => {
    const g = gruplar.find((x) => x.id === grupId)!;
    const liste = talebeler.filter((t) => t.grup === grupId);
    const odeyen = liste.filter((t) => t.aidat?.[ayKey]).length;
    return {
      grupEtiket: `${g.ad} · ${odeyen}/${liste.length} ödedi`,
      odeyen,
      toplam: liste.length,
      odemeyenler: liste.filter((t) => !t.aidat?.[ayKey]).map((t) => t.isim),
      grupAdi: g.ad,
    };
  };

  const genelOzet = () => {
    const odeyen = talebeler.filter((t) => t.aidat?.[ayKey]).length;
    return {
      grupEtiket: `Genel · ${odeyen}/${talebeler.length} ödedi`,
      odeyen,
      toplam: talebeler.length,
      odemeyenler: talebeler.filter((t) => !t.aidat?.[ayKey]).map((t) => t.isim),
      grupAdi: "",
    };
  };

  const alicilar: Alici[] = useMemo(() => {
    const sabit: Alici[] = gruplar.map((g) => {
      const o = grupOzet(g.id);
      return {
        anahtar: g.id,
        ad: g.hoca,
        grupEtiket: o.grupEtiket,
        eposta: taslak[g.id] ?? "",
        odeyen: o.odeyen,
        toplam: o.toplam,
        odemeyenler: o.odemeyenler,
      };
    });
    const ekstra: Alici[] = ayar.ekstraHocalar.map((h) => {
      const o = h.grup ? grupOzet(h.grup) : genelOzet();
      return {
        anahtar: `ekstra-${h.id}`,
        ad: h.ad,
        grupEtiket: o.grupEtiket,
        eposta: h.eposta,
        odeyen: o.odeyen,
        toplam: o.toplam,
        odemeyenler: o.odemeyenler,
        ekstraId: h.id,
      };
    });
    return [...sabit, ...ekstra];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [talebeler, ayKey, taslak, ayar.ekstraHocalar, gruplar]);

  const raporUret = (kapsam: string = raporKapsam) => {
    const grupId =
      kapsam === "genel" ? undefined : (kapsam as Grup);
    return tamRaporOlustur({ talebeler, ayKey, ayEtiket, tutar, grupId, gruplar });
  };

  useEffect(() => {
    if (sekme !== "rapor") return;
    setRaporMetin(raporUret());
    setRaporKonu(
      `Kurs Raporu — ${ayEtiket}${
        raporKapsam === "genel"
          ? ""
          : ` (${gruplar.find((g) => g.id === raporKapsam)?.ad ?? ""})`
      }`,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sekme, raporKapsam, talebeler, tutar, gruplar]);

  const seciliEposta = (secim: string, elle: string) => {
    if (secim === "elle") return elle.trim();
    return (alicilar.find((a) => a.anahtar === secim)?.eposta ?? "").trim();
  };

  const serbestGonder = async (
    tur: "rapor" | "mesaj",
    eposta: string,
    konu: string,
    metin: string,
  ) => {
    if (!eposta) {
      toast.error("Alıcı e-posta adresi gerekli.");
      return;
    }
    if (!konu.trim() || !metin.trim()) {
      toast.error("Konu ve mesaj boş olamaz.");
      return;
    }
    setGonderiliyor(tur);
    try {
      const s = await serbestMailGonder({
        data: { eposta, konu, metin, gonderen: ayar.gonderen, gonderenAd: ayar.gonderenAd },
      });
      if (mailSonuc(s)) toast.success(`${eposta} adresine gönderildi.`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "E-posta gönderilemedi.");
    } finally {
      setGonderiliyor(null);
    }
  };

  const mesajGonderCoklu = async () => {
    const secili = alicilar.filter(
      (a) => mesajSecimler.includes(a.anahtar) && a.eposta.trim(),
    );
    const elleAdres = mesajEposta.trim();
    const hedefler = [
      ...secili.map((a) => a.eposta.trim()),
      ...(elleAdres ? [elleAdres] : []),
    ];
    if (hedefler.length === 0) {
      toast.error("En az bir alıcı seçin veya e-posta yazın.");
      return;
    }
    if (!mesajKonu.trim() || !mesajMetin.trim()) {
      toast.error("Konu ve mesaj boş olamaz.");
      return;
    }
    setGonderiliyor("mesaj");
    try {
      let basarili = 0;
      for (const eposta of hedefler) {
        // eslint-disable-next-line no-await-in-loop
        const s = await serbestMailGonder({
          data: {
            eposta,
            konu: mesajKonu,
            metin: mesajMetin,
            gonderen: ayar.gonderen,
            gonderenAd: ayar.gonderenAd,
          },
        });
        if (!mailSonuc(s)) break;
        basarili += 1;
      }
      if (basarili > 0) {
        toast.success(
          basarili === 1
            ? `${hedefler[0]} adresine gönderildi.`
            : `${basarili} kişiye gönderildi.`,
        );
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "E-posta gönderilemedi.");
    } finally {
      setGonderiliyor(null);
    }
  };

  const raporuTumHocalaraGonder = async () => {
    const hedefler = alicilar.filter((a) => a.eposta.trim());
    if (hedefler.length === 0) {
      toast.error("Gönderilecek kayıtlı hoca e-postası yok.");
      return;
    }
    if (!raporKonu.trim() || !raporMetin.trim()) {
      toast.error("Konu ve rapor metni boş olamaz.");
      return;
    }
    setGonderiliyor("rapor-tum");
    try {
      let basarili = 0;
      for (const a of hedefler) {
        // eslint-disable-next-line no-await-in-loop
        const s = await serbestMailGonder({
          data: {
            eposta: a.eposta.trim(),
            konu: raporKonu,
            metin: raporMetin,
            gonderen: ayar.gonderen,
            gonderenAd: ayar.gonderenAd,
          },
        });
        if (!mailSonuc(s)) break;
        basarili += 1;
      }
      if (basarili > 0) {
        toast.success(`${basarili} hocaya rapor gönderildi.`);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "E-posta gönderilemedi.");
    } finally {
      setGonderiliyor(null);
    }
  };


  const gonder = async (a: Alici) => {
    const eposta = a.eposta.trim();
    if (!eposta) {
      toast.error("Önce hocanın e-posta adresini yazın.");
      return false;
    }
    setGonderiliyor(a.anahtar);
    try {
      if (!a.ekstraId) {
        await hocaMailleriKaydet({ ...ayar.mailler, ...taslak });
      }
      const grupAdi = a.ekstraId
        ? (ayar.ekstraHocalar.find((h) => h.id === a.ekstraId)?.grup
            ? gruplar.find(
                (g) =>
                  g.id ===
                  ayar.ekstraHocalar.find((h) => h.id === a.ekstraId)?.grup,
              )?.ad
            : undefined) ?? ""
        : (gruplar.find((g) => g.id === a.anahtar)?.ad ?? "");
      const s = await aidatHatirlatmaGonder({
        data: {
          eposta,
          hocaAdi: a.ad,
          grupAdi,
          ayEtiket,
          tutar,
          odeyen: a.odeyen,
          toplam: a.toplam,
          odemeyenler: a.odemeyenler,
          gonderen: ayar.gonderen,
          gonderenAd: ayar.gonderenAd,
        },
      });
      if (!mailSonuc(s)) return false;
      await aidatMailGonderimIsaretle(ayKey, a.anahtar, ayar.gonderilen);
      toast.success(`${a.ad} adresine hatırlatma gönderildi.`);
      return true;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "E-posta gönderilemedi.");
      return false;
    } finally {
      setGonderiliyor(null);
    }
  };

  const gonderilmeyen = alicilar.filter(
    (a) => !gonderilenler.includes(a.anahtar) && a.eposta.trim(),
  );

  const hepsineGonder = async () => {
    for (const a of gonderilmeyen) {
      // eslint-disable-next-line no-await-in-loop
      const ok = await gonder(a);
      if (!ok) break;
    }
  };

  const hocaEkle = async () => {
    const ad = yeniAd.trim();
    const eposta = yeniEposta.trim();
    if (!ad) {
      toast.error("Hocanın adını yazın.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(eposta)) {
      toast.error("Geçerli bir e-posta adresi yazın.");
      return;
    }
    const yeni: EkstraHoca = {
      id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
      ad,
      eposta,
      grup: yeniGrup === "genel" ? undefined : (yeniGrup as Grup),
    };
    try {
      await ekstraHocalariKaydet([...ayar.ekstraHocalar, yeni]);
      setYeniAd("");
      setYeniEposta("");
      setYeniGrup("genel");
      toast.success(`${ad} eklendi.`);
    } catch {
      toast.error("Hoca eklenemedi.");
    }
  };

  const hocaSil = async (id: string, ad: string) => {
    try {
      await ekstraHocalariKaydet(ayar.ekstraHocalar.filter((h) => h.id !== id));
      toast.success(`${ad} kaldırıldı.`);
    } catch {
      toast.error("Hoca kaldırılamadı.");
    }
  };

  const mailSil = async (anahtar: string, ad: string) => {
    const yeni = { ...ayar.mailler, ...taslak, [anahtar]: "" };
    setTaslak((t) => ({ ...t, [anahtar]: "" }));
    try {
      await hocaMailleriKaydet(yeni);
      toast.success(`${ad} e-postası silindi.`);
    } catch {
      toast.error("E-posta silinemedi.");
    }
  };

  const tumMailleriSil = async () => {
    const bos: Record<string, string> = {};
    gruplar.forEach((g) => {
      bos[g.id] = "";
    });
    setTaslak(bos);
    try {
      await hocaMailleriKaydet(bos);
      toast.success("Tüm hoca e-postaları silindi.");
    } catch {
      toast.error("E-postalar silinemedi.");
    }
  };

  return (
    <div className="rounded-md border border-border/60 px-3 py-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Mail className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">E-posta Merkezi</span>
        </div>
        <Button
          size="icon"
          variant="ghost"
          aria-label="Hoca yönetimi menüsü"
          onClick={() => setMenuAcik((v) => !v)}
        >
          {menuAcik ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        </Button>
      </div>

      {mailHazir === false && (
        <div className="mb-3 rounded-md border border-border/60 bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
          Mail servisi şu anda bağlı değil. Panelin tüm bölümleri çalışır;
          hazırladığınız metinleri kopyalayıp kendi e-postanızdan
          gönderebilirsiniz.
        </div>
      )}


      {!menuAcik && (
        <div className="mb-3 grid grid-cols-3 gap-1 rounded-md bg-muted/40 p-1">
          {(
            [
              ["hatirlatma", "Hatırlatma", Mail],
              ["rapor", "Rapor", FileText],
              ["mesaj", "Mesaj", PenLine],
            ] as const
          ).map(([id, ad, Ikon]) => (
            <button
              key={id}
              type="button"
              onClick={() => setSekme(id)}
              className={`flex items-center justify-center gap-1 rounded-sm px-2 py-1.5 text-xs font-medium transition-colors ${
                sekme === id
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Ikon className="h-3.5 w-3.5" />
              {ad}
            </button>
          ))}
        </div>
      )}


      {menuAcik ? (
        <div className="space-y-4">
          <p className="text-xs text-muted-foreground">
            Hoca e-postalarını buradan düzenleyin, silin veya yeni hoca ekleyin.
          </p>

          <div className="space-y-2">
            {alicilar.map((a) => (
              <div key={a.anahtar} className="rounded-md bg-muted/30 px-2 py-2">
                <Label className="mb-1 flex items-center justify-between text-xs">
                  <span className="font-medium text-foreground">{a.ad}</span>
                  <span className="flex items-center gap-2">
                    <button
                      type="button"
                      aria-label={`${a.ad} e-postasını sil`}
                      className="text-muted-foreground transition-colors hover:text-destructive"
                      onClick={() =>
                        a.ekstraId
                          ? void hocaSil(a.ekstraId, a.ad)
                          : void mailSil(a.anahtar, a.ad)
                      }
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </span>
                </Label>
                <Input
                  type="email"
                  inputMode="email"
                  placeholder="hoca@gmail.com"
                  className="h-9"
                  value={a.eposta}
                  disabled={!!a.ekstraId}
                  onChange={(e) =>
                    setTaslak((t) => ({ ...t, [a.anahtar]: e.target.value }))
                  }
                  onBlur={() =>
                    void hocaMailleriKaydet({ ...ayar.mailler, ...taslak })
                  }
                />
              </div>
            ))}
          </div>

          <Button
            variant="outline"
            className="w-full text-destructive"
            onClick={() => void tumMailleriSil()}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Tüm hoca e-postalarını sil
          </Button>

          <div className="rounded-md border border-dashed border-border/60 px-3 py-3">
            <div className="mb-2 flex items-center gap-2">
              <UserPlus className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Yeni Hoca Ekle</span>
            </div>
            <div className="space-y-2">
              <Input
                placeholder="Hocanın adı"
                className="h-9"
                value={yeniAd}
                onChange={(e) => setYeniAd(e.target.value)}
              />
              <Input
                type="email"
                inputMode="email"
                placeholder="hoca@gmail.com"
                className="h-9"
                value={yeniEposta}
                onChange={(e) => setYeniEposta(e.target.value)}
              />
              <Select value={yeniGrup} onValueChange={setYeniGrup}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Grup seçin" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="genel">Genel (tüm kurs özeti)</SelectItem>
                  {gruplar.map((g) => (
                    <SelectItem key={g.id} value={g.id}>
                      {g.ad}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="secondary"
                className="w-full"
                onClick={() => void hocaEkle()}
              >
                <UserPlus className="mr-2 h-4 w-4" />
                Hocayı kaydet
              </Button>
            </div>
          </div>
        </div>
      ) : sekme === "hatirlatma" ? (
        <>

          <p className="mb-3 text-xs text-muted-foreground">
            {ayEtiket} ayı hatırlatması.
            {gonderilmeyen.length > 0 && (
              <span className="ml-1 font-medium text-destructive">
                {gonderilmeyen.length} hocaya henüz gönderilmedi.
              </span>
            )}
          </p>

          <div className="space-y-2">
            {alicilar.map((a) => {
              const gonderildi = gonderilenler.includes(a.anahtar);
              return (
                <div
                  key={a.anahtar}
                  className="flex items-center justify-between gap-2 rounded-md bg-muted/30 px-2 py-2"
                >
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">{a.ad}</div>
                    <div className="truncate text-xs text-muted-foreground">
                      {a.eposta.trim() || "e-posta yok"} · {a.grupEtiket}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {gonderildi && (
                      <Check className="h-4 w-4 text-primary" aria-label="gönderildi" />
                    )}
                    <Button
                      size="sm"
                      disabled={gonderiliyor === a.anahtar || !a.eposta.trim()}
                      onClick={() => void gonder(a)}
                    >
                      <Send className="mr-1 h-3.5 w-3.5" />
                      {gonderiliyor === a.anahtar ? "..." : "Gönder"}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>

          <Button
            variant="outline"
            className="mt-3 w-full"
            disabled={!!gonderiliyor || gonderilmeyen.length === 0}
            onClick={() => void hepsineGonder()}
          >
            <Mail className="mr-2 h-4 w-4" />
            Tüm hocalara gönder ({gonderilmeyen.length})
          </Button>
        </>
      ) : sekme === "rapor" ? (
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Aidat ve tahsilat durumunu içeren tam kurs raporunu mesûle
            gönderin. Metni göndermeden önce düzenleyebilirsiniz.
          </p>

          <div className="space-y-1">
            <Label className="text-xs">Rapor kapsamı</Label>
            <Select value={raporKapsam} onValueChange={setRaporKapsam}>
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="genel">
                  Tüm kurs ({gruplar.map((g) => g.ad).join(" + ")})
                </SelectItem>
                {gruplar.map((g) => (
                  <SelectItem key={g.id} value={g.id}>
                    {g.ad}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Alıcı</Label>
            <Select value={raporAlici} onValueChange={setRaporAlici}>
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="elle">E-postayı elle yaz</SelectItem>
                {alicilar
                  .filter((a) => a.eposta.trim())
                  .map((a) => (
                    <SelectItem key={a.anahtar} value={a.anahtar}>
                      {a.ad} — {a.eposta}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
            {raporAlici === "elle" && (
              <Input
                type="email"
                inputMode="email"
                placeholder="mesul@gmail.com"
                className="h-9"
                value={raporEposta}
                onChange={(e) => setRaporEposta(e.target.value)}
              />
            )}
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Konu</Label>
            <Input
              className="h-9"
              value={raporKonu}
              onChange={(e) => setRaporKonu(e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <Label className="text-xs">Rapor metni</Label>
              <button
                type="button"
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                onClick={() => setRaporMetin(raporUret())}
              >
                <RefreshCw className="h-3 w-3" /> Yenile
              </button>
            </div>
            <Textarea
              rows={14}
              className="font-mono text-xs"
              value={raporMetin}
              onChange={(e) => setRaporMetin(e.target.value)}
            />
          </div>

          <Button
            className="w-full"
            disabled={gonderiliyor === "rapor"}
            onClick={() =>
              void serbestGonder(
                "rapor",
                seciliEposta(raporAlici, raporEposta),
                raporKonu,
                raporMetin,
              )
            }
          >
            <Send className="mr-2 h-4 w-4" />
            {gonderiliyor === "rapor" ? "Gönderiliyor..." : "Raporu gönder"}
          </Button>

          <Button
            variant="outline"
            className="w-full"
            disabled={gonderiliyor === "rapor-tum"}
            onClick={() => void raporuTumHocalaraGonder()}
          >
            <Mail className="mr-2 h-4 w-4" />
            {gonderiliyor === "rapor-tum"
              ? "Gönderiliyor..."
              : `Tüm hocalara gönder (${alicilar.filter((a) => a.eposta.trim()).length})`}
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Serbest mesaj yazıp istediğiniz kişiye gönderin.
          </p>

          <div className="space-y-1">
            <Label className="text-xs">Alıcılar</Label>
            <div className="rounded-md border">
              <label className="flex items-center gap-2 border-b px-3 py-2 text-sm font-medium">
                <input
                  type="checkbox"
                  className="h-4 w-4"
                  checked={
                    alicilar.filter((a) => a.eposta.trim()).length > 0 &&
                    mesajSecimler.length ===
                      alicilar.filter((a) => a.eposta.trim()).length
                  }
                  onChange={(e) =>
                    setMesajSecimler(
                      e.target.checked
                        ? alicilar
                            .filter((a) => a.eposta.trim())
                            .map((a) => a.anahtar)
                        : [],
                    )
                  }
                />
                Tümünü seç
              </label>
              <div className="max-h-40 overflow-y-auto">
                {alicilar
                  .filter((a) => a.eposta.trim())
                  .map((a) => (
                    <label
                      key={a.anahtar}
                      className="flex items-center gap-2 px-3 py-1.5 text-sm"
                    >
                      <input
                        type="checkbox"
                        className="h-4 w-4"
                        checked={mesajSecimler.includes(a.anahtar)}
                        onChange={(e) =>
                          setMesajSecimler((s) =>
                            e.target.checked
                              ? [...s, a.anahtar]
                              : s.filter((x) => x !== a.anahtar),
                          )
                        }
                      />
                      <span className="truncate">
                        {a.ad} — {a.eposta}
                      </span>
                    </label>
                  ))}
              </div>
            </div>
            <Input
              type="email"
              inputMode="email"
              placeholder="İsterseniz elle e-posta ekleyin (isteğe bağlı)"
              className="h-9"
              value={mesajEposta}
              onChange={(e) => setMesajEposta(e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Konu</Label>
            <Input
              className="h-9"
              placeholder="Konu"
              value={mesajKonu}
              onChange={(e) => setMesajKonu(e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Mesaj</Label>
            <Textarea
              rows={10}
              placeholder="Mesajınızı buraya yazın..."
              value={mesajMetin}
              onChange={(e) => setMesajMetin(e.target.value)}
            />
          </div>

          <Button
            className="w-full"
            disabled={gonderiliyor === "mesaj"}
            onClick={() => void mesajGonderCoklu()}
          >
            <Send className="mr-2 h-4 w-4" />
            {gonderiliyor === "mesaj"
              ? "Gönderiliyor..."
              : `Mesajı gönder${mesajSecimler.length + (mesajEposta.trim() ? 1 : 0) > 0 ? ` (${mesajSecimler.length + (mesajEposta.trim() ? 1 : 0)} alıcı)` : ""}`}
          </Button>
        </div>
      )}

    </div>
  );
}
