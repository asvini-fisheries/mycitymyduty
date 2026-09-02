import { clearSelectedCorporationId } from "@/lib/corporations";
import { createClient } from "@/lib/supabase/client";

export async function signOutAndRedirect(isStakeholder: boolean) {
  const supabase = createClient();
  await supabase.auth.signOut();
  clearSelectedCorporationId();
  window.location.href = isStakeholder ? "/login/stakeholder" : "/login";
}
