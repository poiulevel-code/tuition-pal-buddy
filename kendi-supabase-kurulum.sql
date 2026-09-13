CREATE TABLE public.talebeler (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  isim text NOT NULL DEFAULT 'Talebe',
  grup text,
  sinif text,
  telefon text,
  dogum text,
  notlar text,
  foto_url text,
  kiraat boolean NOT NULL DEFAULT false,
  yon text NOT NULL DEFAULT 'alttan',
  sayfa integer NOT NULL DEFAULT 1,
  hedef_haftalik integer NOT NULL DEFAULT 5,
  fikih_konu integer NOT NULL DEFAULT 1,
  hadis_no integer NOT NULL DEFAULT 1,
  sira integer NOT NULL DEFAULT 0,
  aidat_sadece boolean NOT NULL DEFAULT false,
  aidat_haric boolean NOT NULL DEFAULT false,
  kiraat_gunler jsonb NOT NULL DEFAULT '{}'::jsonb,
  fikih_gunler jsonb NOT NULL DEFAULT '{}'::jsonb,
  hadis_gunler jsonb NOT NULL DEFAULT '{}'::jsonb,
  gecmis jsonb NOT NULL DEFAULT '[]'::jsonb,
  aidat jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.talebeler TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.talebeler TO authenticated;
GRANT ALL ON public.talebeler TO service_role;

ALTER TABLE public.talebeler ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Panel talebeleri okuyabilir" ON public.talebeler FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Panel talebe ekleyebilir" ON public.talebeler FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Panel talebe guncelleyebilir" ON public.talebeler FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Panel talebe silebilir" ON public.talebeler FOR DELETE TO anon, authenticated USING (true);

CREATE INDEX talebeler_grup_idx ON public.talebeler (grup);
CREATE INDEX talebeler_isim_idx ON public.talebeler (isim);
CREATE INDEX talebeler_sira_idx ON public.talebeler (sira);
CREATE INDEX talebeler_aidat_sadece_idx ON public.talebeler (aidat_sadece) WHERE aidat_sadece;
CREATE INDEX talebeler_aidat_haric_idx ON public.talebeler (aidat_haric) WHERE aidat_haric;

CREATE TABLE public.ayarlar (
  id text NOT NULL PRIMARY KEY,
  aidat_tutar numeric NOT NULL DEFAULT 0,
  grup_liste jsonb NOT NULL DEFAULT '[]'::jsonb,
  hoca_mailler jsonb NOT NULL DEFAULT '{}'::jsonb,
  ekstra_hocalar jsonb NOT NULL DEFAULT '[]'::jsonb,
  aidat_mail_gonderim jsonb NOT NULL DEFAULT '{}'::jsonb,
  gonderen_eposta text NOT NULL DEFAULT '',
  gonderen_ad text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ayarlar TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ayarlar TO authenticated;
GRANT ALL ON public.ayarlar TO service_role;

ALTER TABLE public.ayarlar ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Panel ayarlari okuyabilir" ON public.ayarlar FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Panel ayar ekleyebilir" ON public.ayarlar FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Panel ayar guncelleyebilir" ON public.ayarlar FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

INSERT INTO public.ayarlar (id) VALUES ('genel') ON CONFLICT (id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER talebeler_updated_at BEFORE UPDATE ON public.talebeler
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER ayarlar_updated_at BEFORE UPDATE ON public.ayarlar
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.talebeler REPLICA IDENTITY FULL;
ALTER TABLE public.ayarlar REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.talebeler;
ALTER PUBLICATION supabase_realtime ADD TABLE public.ayarlar;