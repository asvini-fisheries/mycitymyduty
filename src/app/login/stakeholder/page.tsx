"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { setSelectedCorporationId } from "@/lib/corporations";
import { isSupabaseConfigured } from "@/lib/supabase/client";

export default function StakeholderLoginPage() {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!isSupabaseConfigured()) {
      setError("Supabase is not configured. Add credentials to .env.local.");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/auth/stakeholder-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, otp }),
      });

      const data = (await res.json()) as {
        ok?: boolean;
        error?: string;
        corporationId?: string;
      };

      if (!res.ok || !data.ok) {
        setError(data.error ?? "Login failed.");
        setLoading(false);
        return;
      }

      if (data.corporationId) {
        setSelectedCorporationId(data.corporationId);
      }

      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Connection failed. Please try again.");
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
          Sign in with your registered mobile number to access assigned project
          and activity screens.
        </p>
      </div>

      <div className="flex flex-1 items-center justify-center bg-civic-50 px-6">
        <div className="w-full max-w-md rounded-2xl border border-civic-100 bg-white p-8 shadow-lg">
          <h2 className="text-xl font-semibold text-civic-900">Stakeholder sign in</h2>
          <p className="mt-1 text-sm text-civic-600">
            Use your registered mobile number. Dev OTP: <strong>123456</strong>
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
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
              {loading ? "Signing in..." : "Verify & Sign In"}
            </Button>
          </form>

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
