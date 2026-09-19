/**
 * Platform feature switches stored in public.app_settings.
 * Reads are allowed for any signed-in account; writes require the admin role
 * (enforced by row-level security, not by the UI).
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";

export const SNOOZE_SETTING_KEY = "snooze_enabled";

/** When enabled, lifecycle status is calculated from ESU instead of the EOL date. */
export const LIFECYCLE_ESU_SETTING_KEY = "lifecycle_basis_esu";

/** Every attribute that belongs to the snooze feature. */
export const SNOOZE_FIELD_NAMES = new Set([
  "snoozed",
  "snooze_exclusion",
  "snooze_exclusion_start_date",
  "snooze_exclusion_end_date",
  "snooze_exclusion_reason",
]);

export function useSnoozeEnabled() {
  const query = useQuery({
    queryKey: ["app-settings", SNOOZE_SETTING_KEY],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("app_settings")
        .select("enabled")
        .eq("key", SNOOZE_SETTING_KEY)
        .maybeSingle();
      if (error) throw new Error(error.message);
      return data?.enabled ?? true;
    },
    staleTime: 60_000,
  });
  // Default to enabled while loading or when the row cannot be read.
  return { enabled: query.data ?? true, isLoading: query.isLoading };
}

export function useSetSnoozeEnabled() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (enabled: boolean) => {
      const { data: session } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("app_settings")
        .upsert(
          { key: SNOOZE_SETTING_KEY, enabled, updated_by: session.user?.id ?? null },
          { onConflict: "key" },
        );
      if (error) throw new Error(error.message);
      return enabled;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["app-settings"] });
    },
  });
}
