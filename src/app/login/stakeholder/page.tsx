"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { setSelectedCorporationId } from "@/lib/corporations";
import { isSupabaseConfigured } from "@/lib/supabase/client";

type StakeholderOption = {
  stakeholderId: string;
  stakeholderName: string;
  memberName: string;
  corporationId: string | null;
};

export default function StakeholderLoginPage() {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<"credentials" | "select">("credentials");
  const [options, setOptions] = useState<StakeholderOption[]>([]);
  const [selectedStakeholderId, setSelectedStakeholderId] = useState("");

  async function completeLogin(stakeholderId?: string) {
    const res = await fetch("/api/auth/stakeholder-login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        phone,
        otp,
        stakeholderId,
      }),
    });

    const contentType = res.headers.get("content-type") ?? "";
    if (!contentType.includes("application/json")) {
      throw new Error(
        "Login service unavailable. Restart the app and ensure SUPABASE_SERVICE_ROLE_KEY is set in .env.local."
      );
    }

    const data = (await res.json()) as {
      ok?: boolean;
      error?: string;
      requiresSelection?: boolean;
      options?: StakeholderOption[];
      corporationId?: string;
    };

    if (data.requiresSelection && data.options?.length) {
      setOptions(data.options);
      setSelectedStakeholderId(data.options[0].stakeholderId);
      setStep("select");
      return;
    }

    if (!res.ok || !data.ok) {
      throw new Error(data.error ?? "Login failed.");
    }

    if (data.corporationId) {
      setSelectedCorporationId(data.corporationId);
    }

    router.push("/dashboard");
    router.refresh();
  }

  async function handleCredentialsSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!isSupabaseConfigured()) {
      setError("Supabase is not configured. Add credentials to .env.local.");
      setLoading(false);
      return;
    }

    try {
      await completeLogin();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Connection failed. Please try again.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  async function handleStakeholderSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await completeLogin(selectedStakeholderId);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Connection failed. Please try again.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen">
      <div className="hidden w-1/2 flex-col justify-center bg-civic-900 px-12 text-white lg:flex">
        <Image
          src="/mycitymyduty-logo.png"
          alt="MyCityMyDuty"
          width={1200}
          height={800}
          priority
          className="mb-8 h-auto w-[360px] max-w-full rounded-xl bg-white/95 p-3 shadow-lg"
        />
        <h1 className="text-4xl font-bold tracking-wide text-amber-400">
          Stakeholder Portal
        </h1>
        <p className="mt-3 max-w-md text-civic-200">
          Sign in with your registered mobile number to access assigned projects
          and requirements.
        </p>
      </div>

      <div className="flex flex-1 items-center justify-center bg-civic-50 px-6">
        <div className="w-full max-w-md rounded-2xl border border-civic-100 bg-white p-8 shadow-lg">
          <h2 className="text-xl font-semibold text-civic-900">Stakeholder sign in</h2>
          <p className="mt-1 text-sm text-civic-600">
            {step === "credentials" ? (
              <>
                Use your registered mobile number. Dev OTP: <strong>123456</strong>
              </>
            ) : (
              "Your mobile is linked to more than one stakeholder. Choose one to continue."
            )}
          </p>

          {step === "credentials" ? (
            <form onSubmit={handleCredentialsSubmit} className="mt-6 space-y-4">
              <Input
                label="Mobile Number"
                type="tel"
                required
                placeholder="e.g. 9876543210"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
              <Input
                label="OTP"
                type="text"
                required
                inputMode="numeric"
                maxLength={6}
                placeholder="123456"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
              />

              {error && (
                <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                  {error}
                </p>
              )}

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Verifying..." : "Verify & Continue"}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleStakeholderSubmit} className="mt-6 space-y-4">
              <fieldset className="space-y-2">
                <legend className="text-sm font-medium text-civic-800">
                  Select Stakeholder
                </legend>
                {options.map((option) => (
                  <label
                    key={option.stakeholderId}
                    className="flex cursor-pointer items-start gap-3 rounded-lg border border-civic-200 px-3 py-3 hover:bg-civic-50"
                  >
                    <input
                      type="radio"
                      name="stakeholder"
                      value={option.stakeholderId}
                      checked={selectedStakeholderId === option.stakeholderId}
                      onChange={() => setSelectedStakeholderId(option.stakeholderId)}
                      className="mt-1"
                    />
                    <span>
                      <span className="block font-medium text-civic-900">
                        {option.stakeholderName}
                      </span>
                      <span className="block text-sm text-civic-600">
                        Member: {option.memberName}
                      </span>
                    </span>
                  </label>
                ))}
              </fieldset>

              {error && (
                <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                  {error}
                </p>
              )}

              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="secondary"
                  className="flex-1"
                  onClick={() => {
                    setStep("credentials");
                    setError(null);
                  }}
                >
                  Back
                </Button>
                <Button type="submit" className="flex-1" disabled={loading || !selectedStakeholderId}>
                  {loading ? "Signing in..." : "Sign In"}
                </Button>
              </div>
            </form>
          )}

          <p className="mt-4 text-center text-sm text-civic-600">
            Corporation admin?{" "}
            <Link href="/login" className="font-medium text-civic-700 hover:underline">
              Admin sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
