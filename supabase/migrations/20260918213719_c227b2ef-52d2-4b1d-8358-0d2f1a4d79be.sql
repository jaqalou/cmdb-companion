CREATE TABLE IF NOT EXISTS public.app_settings (
  key text PRIMARY KEY,
  enabled boolean NOT NULL DEFAULT true,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.app_settings TO authenticated;
GRANT ALL ON public.app_settings TO service_role;

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Signed-in users read settings"
  ON public.app_settings FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins manage settings"
  ON public.app_settings FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_app_settings_updated
  BEFORE UPDATE ON public.app_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_sys_updated_on();

INSERT INTO public.app_settings (key, enabled) VALUES ('snooze_enabled', true)
  ON CONFLICT (key) DO NOTHING;