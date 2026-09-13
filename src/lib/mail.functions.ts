import { createServerFn } from "@tanstack/react-start";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/google_mail/gmail/v1";

export type SerbestMailGirdi = {
  eposta: string;
  konu: string;
  metin: string;
  gonderen?: string;
  gonderenAd?: string;
};

function gecerliEposta(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

const b64 = (s: string) =>
  btoa(
    Array.from(new TextEncoder().encode(s), (b) => String.fromCharCode(b)).join(
      "",
    ),
  );

const header = (v: string) =>
  /^[\x00-\x7F]*$/.test(v) ? v : `=?UTF-8?B?${b64(v)}?=`;

function rawMail(to: string, subject: string, body: string, from?: string) {
  const gonderen = (from ?? "").trim();
  const mesaj = [
    ...(gonderen ? [`From: ${gonderen}`] : []),
    `To: ${to}`,
    `Subject: ${header(subject)}`,
    "MIME-Version: 1.0",
    'Content-Type: text/plain; charset="UTF-8"',
    "",
    body,
  ].join("\r\n");
  return b64(mesaj).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export const serbestMailGonder = createServerFn({ method: "POST" })
  .inputValidator((input: SerbestMailGirdi) => {
    const eposta = String(input?.eposta ?? "").trim();
    const konu = String(input?.konu ?? "")
      .replace(/[\r\n]+/g, " ")
      .slice(0, 200)
      .trim();
    const metin = String(input?.metin ?? "").slice(0, 20000);
    const gonderenHam = String(input?.gonderen ?? "").trim();
    const gonderenAd = String(input?.gonderenAd ?? "")
      .replace(/[\r\n]+/g, " ")
      .slice(0, 80)
      .trim();
    const gonderen =
      gonderenHam && gecerliEposta(gonderenHam)
        ? gonderenAd
          ? `${header(gonderenAd)} <${gonderenHam}>`
          : gonderenHam
        : "";
    if (!gecerliEposta(eposta)) {
      throw new Error("Geçerli bir e-posta adresi gerekli.");
    }
    if (!konu) throw new Error("Konu boş olamaz.");
    if (!metin.trim()) throw new Error("Mesaj boş olamaz.");
    return { eposta, konu, metin, gonderen };
  })
  .handler(async ({ data }) => {
    const lovableKey = process.env["LOVABLE_API_KEY"];
    const gmailKey = process.env["GOOGLE_MAIL_API_KEY"];
    if (!lovableKey || !gmailKey) {
      return {
        ok: false as const,
        baglantiYok: true as const,
        hata: "Mail servisi bağlı değil. Gönderim yapılamadı.",
      };
    }

    try {
      const res = await fetch(`${GATEWAY_URL}/users/me/messages/send`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${lovableKey}`,
          "X-Connection-Api-Key": gmailKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          raw: rawMail(data.eposta, data.konu, data.metin, data.gonderen),
        }),
      });

      if (!res.ok) {
        const hata = await res.text();
        console.error(`Gmail gönderim hatası [${res.status}]: ${hata}`);
        return {
          ok: false as const,
          baglantiYok: false as const,
          hata: `E-posta gönderilemedi [${res.status}].`,
        };
      }

      return { ok: true as const, baglantiYok: false as const, hata: "" };
    } catch (e) {
      console.error("Gmail gönderim hatası", e);
      return {
        ok: false as const,
        baglantiYok: false as const,
        hata: "E-posta servisine ulaşılamadı.",
      };
    }
  });
