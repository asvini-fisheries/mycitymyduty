import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";

export const STAKEHOLDER_DEV_OTP = "123456";

export function normalizePhoneDigits(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length >= 10) {
    return digits.slice(-10);
  }
  return digits;
}

export function phonesMatch(stored: string | null | undefined, input: string): boolean {
  if (!stored) return false;
  return normalizePhoneDigits(stored) === normalizePhoneDigits(input);
}

export function stakeholderAuthEmail(phoneDigits: string): string {
  return `sh.${phoneDigits}@stakeholder.mycitymyduty.local`;
}

export function stakeholderAuthPassword(phoneDigits: string): string {
  const secret =
    process.env.STAKEHOLDER_AUTH_SECRET ?? "mcm-dev-stakeholder-secret";
  return `MCM_${secret}_${phoneDigits}`;
}

export interface StakeholderLoginMatch {
  stakeholderId: string;
  stakeholderName: string;
  corporationId: string | null;
  categoryId: string;
  memberName: string;
  phoneDigits: string;
}

type StakeholderRow = {
  id: string;
  name: string;
  phone: string | null;
  corporation_id: string | null;
  stakeholder_category_id: string;
  is_active: boolean;
};

type MemberRow = {
  id: string;
  name: string;
  phone: string | null;
  is_active: boolean;
  stakeholders: StakeholderRow | StakeholderRow[] | null;
};

export async function findStakeholderByPhone(
  supabase: SupabaseClient,
  phone: string
): Promise<StakeholderLoginMatch | null> {
  const phoneDigits = normalizePhoneDigits(phone);
  if (phoneDigits.length < 10) return null;

  const { data: members } = await supabase
    .from("stakeholder_members")
    .select(
      "id, name, phone, is_active, stakeholders(id, name, phone, corporation_id, stakeholder_category_id, is_active)"
    )
    .eq("is_active", true);

  for (const member of (members as MemberRow[] | null) ?? []) {
    if (!phonesMatch(member.phone, phoneDigits)) continue;
    const stakeholder = Array.isArray(member.stakeholders)
      ? member.stakeholders[0]
      : member.stakeholders;
    if (!stakeholder?.is_active) continue;
    return {
      stakeholderId: stakeholder.id,
      stakeholderName: stakeholder.name,
      corporationId: stakeholder.corporation_id,
      categoryId: stakeholder.stakeholder_category_id,
      memberName: member.name,
      phoneDigits,
    };
  }

  const { data: stakeholders } = await supabase
    .from("stakeholders")
    .select(
      "id, name, phone, corporation_id, stakeholder_category_id, is_active, contact_person"
    )
    .eq("is_active", true);

  for (const stakeholder of (stakeholders as (StakeholderRow & {
    contact_person: string | null;
  })[] | null) ?? []) {
    if (!phonesMatch(stakeholder.phone, phoneDigits)) continue;
    return {
      stakeholderId: stakeholder.id,
      stakeholderName: stakeholder.name,
      corporationId: stakeholder.corporation_id,
      categoryId: stakeholder.stakeholder_category_id,
      memberName: stakeholder.contact_person ?? stakeholder.name,
      phoneDigits,
    };
  }

  return null;
}

export async function provisionStakeholderUser(
  match: StakeholderLoginMatch
): Promise<{ email: string; password: string; userId: string }> {
  const admin = createAdminClient();
  const email = stakeholderAuthEmail(match.phoneDigits);
  const password = stakeholderAuthPassword(match.phoneDigits);

  const { data: existingProfile } = await admin
    .from("user_master")
    .select("id")
    .or(`phone.eq.${match.phoneDigits},email.eq.${email}`)
    .maybeSingle();

  let userId: string;

  if (existingProfile?.id) {
    userId = existingProfile.id;
    const { error: updateError } = await admin.auth.admin.updateUserById(userId, {
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: match.memberName,
        role: "stakeholder",
        phone: match.phoneDigits,
        stakeholder_id: match.stakeholderId,
      },
    });
    if (updateError) {
      throw new Error(updateError.message);
    }
  } else {
    const { data: created, error: createError } =
      await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          full_name: match.memberName,
          role: "stakeholder",
          phone: match.phoneDigits,
          stakeholder_id: match.stakeholderId,
        },
      });

    if (createError || !created.user) {
      throw new Error(createError?.message ?? "Could not create stakeholder account.");
    }
    userId = created.user.id;
  }

  const { error: profileError } = await admin.from("user_master").upsert(
    {
      id: userId,
      email,
      full_name: match.memberName,
      phone: match.phoneDigits,
      role: "stakeholder",
      stakeholder_id: match.stakeholderId,
      corporation_id: match.corporationId,
      is_active: true,
    },
    { onConflict: "id" }
  );

  if (profileError) {
    throw new Error(profileError.message);
  }

  return { email, password, userId };
}
