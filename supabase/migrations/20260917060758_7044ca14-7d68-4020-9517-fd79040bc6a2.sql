CREATE TABLE public.api_tokens (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  token_prefix text NOT NULL,
  token_hash text NOT NULL UNIQUE,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_used_at timestamptz,
  expires_at timestamptz,
  revoked_at timestamptz
);

CREATE INDEX api_tokens_user_id_idx ON public.api_tokens (user_id);
CREATE INDEX api_tokens_token_hash_idx ON public.api_tokens (token_hash);

GRANT SELECT ON public.api_tokens TO authenticated;
GRANT ALL ON public.api_tokens TO service_role;

ALTER TABLE public.api_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own API tokens"
  ON public.api_tokens FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can read all API tokens"
  ON public.api_tokens FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));