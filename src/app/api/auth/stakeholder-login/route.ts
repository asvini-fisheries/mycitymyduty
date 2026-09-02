import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  findAllStakeholdersByPhone,
  findStakeholderByPhone,
  provisionStakeholderUser,
  STAKEHOLDER_DEV_OTP,
} from "@/lib/stakeholder-auth";
import { createAdminClient, hasAdminClientConfig } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      phone?: string;
      otp?: string;
      stakeholderId?: string;
    };
    const phone = body.phone?.trim() ?? "";
    const otp = body.otp?.trim() ?? "";
    const stakeholderId = body.stakeholderId?.trim() || null;

    if (!phone) {
      return NextResponse.json({ error: "Mobile number is required." }, { status: 400 });
    }

    if (otp !== STAKEHOLDER_DEV_OTP) {
      return NextResponse.json({ error: "Invalid OTP." }, { status: 401 });
    }

    if (!hasAdminClientConfig()) {
      return NextResponse.json(
        {
          error:
            "Stakeholder login is not configured. Add SUPABASE_SERVICE_ROLE_KEY to .env.local.",
        },
        { status: 503 }
      );
    }

    const admin = createAdminClient();
    const options = await findAllStakeholdersByPhone(admin, phone);

    if (options.length === 0) {
      return NextResponse.json(
        {
          error:
            "Mobile number not registered. Ask your corporation admin to add you as a stakeholder member.",
        },
        { status: 404 }
      );
    }

    if (options.length > 1 && !stakeholderId) {
      return NextResponse.json({
        requiresSelection: true,
        options: options.map((option) => ({
          stakeholderId: option.stakeholderId,
          stakeholderName: option.stakeholderName,
          memberName: option.memberName,
          corporationId: option.corporationId,
        })),
      });
    }

    const match = await findStakeholderByPhone(admin, phone, stakeholderId ?? options[0]?.stakeholderId);

    if (!match) {
      return NextResponse.json(
        { error: "Selected stakeholder could not be verified for this mobile number." },
        { status: 400 }
      );
    }

    if (!match.corporationId) {
      return NextResponse.json(
        { error: "Stakeholder is not linked to a corporation." },
        { status: 400 }
      );
    }

    const { email, password } = await provisionStakeholderUser(match);
    const cookieStore = await cookies();

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          },
        },
      }
    );

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      return NextResponse.json(
        { error: signInError.message || "Could not start session." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      corporationId: match.corporationId,
      stakeholderId: match.stakeholderId,
      stakeholderName: match.stakeholderName,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Stakeholder login failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
