DROP TRIGGER IF EXISTS trg_app_settings_updated ON public.app_settings;

CREATE OR REPLACE FUNCTION public.set_app_settings_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER trg_app_settings_updated
  BEFORE UPDATE ON public.app_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_app_settings_updated_at();