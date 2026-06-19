"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { formatAuthError } from "@/lib/auth";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import {
  bootstrapFirstCorporation,
  DEFAULT_BOOTSTRAP_CORPORATION,
  fetchActiveCorporations,
  getSelectedCorporationId,
  persistCorporationSelection,
  setSelectedCorporationId,
} from "@/lib/corporations";
import { formatErrorMessage } from "@/lib/errors";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

type CorporationOption = {
  id: string;
  name: string;
  code: string | null;
  logo_url: string | null;
};

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [corporationId, setCorporationId] = useState("");
  const [bootstrapName, setBootstrapName] = useState<string>(
    DEFAULT_BOOTSTRAP_CORPORATION.name
  );
  const [bootstrapCode, setBootstrapCode] = useState<string>(
    DEFAULT_BOOTSTRAP_CORPORATION.code
  );
  const [corporations, setCorporations] = useState<CorporationOption[]>([]);
  const [corpsLoading, setCorpsLoading] = useState(true);
  const [corpsError, setCorpsError] = useState<string | null>(null);
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const supabaseConfigured = isSupabaseConfigured();
  const showBootstrapCorp =
    isSignUp && !corpsLoading && corporations.length === 0;
  const showCorpSelect = !showBootstrapCorp;

  useEffect(() => {
    async function loadCorporations() {
      if (!supabaseConfigured) {
        setCorpsLoading(false);
        return;
      }

      const supabase = createClient();
      const { corporations: corps, error: fetchError } =
        await fetchActiveCorporations(supabase);

      setCorporations(corps);
      setCorpsError(fetchError);

      const saved = getSelectedCorporationId();
      if (saved && corps.some((c) => c.id === saved)) {
        setCorporationId(saved);
      } else if (corps.length > 0) {
        setCorporationId(corps[0].id);
      }

      setCorpsLoading(false);
    }

    loadCorporations();
  }, [supabaseConfigured]);

  const corporationOptions = corporations.map((c) => ({
    value: c.id,
    label: c.code ? `${c.name} (${c.code})` : c.name,
  }));

  async function resolveCorporationId(
    supabase: ReturnType<typeof createClient>
  ): Promise<{ id: string | null; error: string | null }> {
    if (corporationId) {
      return { id: corporationId, error: null };
    }

    if (!isSignUp || !showBootstrapCorp) {
      return { id: null, error: null };
    }

    const { id, error: bootstrapError } = await bootstrapFirstCorporation(
      supabase,
      bootstrapName,
      bootstrapCode
    );

    if (id) {
      setCorporationId(id);
      setCorporations([
        {
          id,
          name: bootstrapName.trim(),
          code: bootstrapCode.trim() || null,
          logo_url: null,
        },
      ]);
      return { id, error: null };
    }

    if (
      bootstrapError &&
      /already exists/i.test(bootstrapError)
    ) {
      const { corporations: corps, error: refetchError } =
        await fetchActiveCorporations(supabase);
      if (!refetchError && corps.length > 0) {
        const corp = corps[0];
        setCorporationId(corp.id);
        setCorporations(corps);
        setCorpsError(null);
        return { id: corp.id, error: null };
      }
      return {
        id: null,
        error:
          "A corporation already exists but could not be loaded. Run migration 008_login_corporation_access.sql, then refresh and sign in.",
      };
    }

    return {
      id: null,
      error:
        bootstrapError ??
        "Could not create the first corporation. Run migration 008_login_corporation_access.sql.",
    };
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    if (!supabaseConfigured) {
      setError("Supabase is not configured. Add credentials to .env.local");
      setLoading(false);
      return;
    }

    const supabase = createClient();
    const { id: resolvedCorpId, error: corpResolveError } =
      await resolveCorporationId(supabase);

    if (!resolvedCorpId) {
      setError(
        formatErrorMessage(
          corpResolveError,
          isSignUp
            ? "Enter corporation details or select an existing corporation."
            : "Please select a corporation."
        )
      );
      setLoading(false);
      return;
    }

    if (isSignUp) {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName, role: "admin" },
        },
      });
      if (signUpError) {
        const msg = formatAuthError(signUpError, "Could not create account.");
        const lower = msg.toLowerCase();
        if (lower.includes("rate limit")) {
          setError(
            "Too many signup attempts. Please wait a few minutes and try again."
          );
        } else if (lower.includes("already registered")) {
          setIsSignUp(false);
          setError(null);
          setMessage("Account exists — sign in below with the same email and password.");
        } else {
          setError(msg);
        }
      } else if (!data.user) {
        setError("Could not create account. Please try again.");
      } else if (data.session) {
        const { error: persistError } = await persistCorporationSelection(
          supabase,
          resolvedCorpId
        );
        if (persistError) {
          setError(persistError);
        } else {
          router.push("/dashboard");
          router.refresh();
        }
      } else {
        setSelectedCorporationId(resolvedCorpId);
        setMessage(
          "Account created. Sign in with your email and password to continue."
        );
        setIsSignUp(false);
      }
    } else {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (signInError) {
        const msg = formatAuthError(signInError, "Could not sign in.");
        const lower = msg.toLowerCase();
        if (lower.includes("email not confirmed")) {
          setError(
            `${msg} Your account exists but email is not confirmed yet. Wait a minute and try again, or contact an administrator.`
          );
        } else if (lower.includes("invalid login credentials")) {
          setError(
            "Invalid email or password. Use Sign in (not Create account) with the same email and password from your earlier signup attempt."
          );
        } else if (lower.includes("rate limit")) {
          setError(
            "Too many attempts. Please wait a few minutes and try again."
          );
        } else {
          setError(msg);
        }
      } else {
        const { data: profile } = await supabase
          .from("user_master")
          .select("corporation_id")
          .eq("email", email)
          .maybeSingle();

        const corpToPersist =
          profile?.corporation_id && corporations.some((c) => c.id === profile.corporation_id)
            ? profile.corporation_id
            : resolvedCorpId;

        const { error: persistError } = await persistCorporationSelection(
          supabase,
          corpToPersist
        );
        if (persistError) {
          setError(persistError);
        } else {
          router.push("/dashboard");
          router.refresh();
        }
      }
    }

    setLoading(false);
  }

  const submitDisabled =
    loading ||
    corpsLoading ||
    (!isSignUp &&
      supabaseConfigured &&
      corporations.length === 0 &&
      !corporationId) ||
    (showBootstrapCorp && !bootstrapName.trim());

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
        <h1 className="text-4xl font-bold tracking-wide text-amber-400 [text-shadow:0_0_24px_rgba(251,191,36,0.45),0_2px_8px_rgba(0,0,0,0.5)]">
          My City My Duty
        </h1>
      </div>

      <div className="flex flex-1 items-center justify-center bg-civic-50 px-6">
        <div className="w-full max-w-md rounded-2xl border border-civic-100 bg-white p-8 shadow-lg">
          <div className="mb-6 flex flex-col items-center text-center lg:hidden">
            <Image
              src="/mycitymyduty-logo.png"
              alt="MyCityMyDuty"
              width={1200}
              height={800}
              priority
              className="mb-3 h-auto w-[200px] max-w-full rounded-lg"
            />
            <h1 className="text-3xl font-bold tracking-wide text-amber-500 [text-shadow:0_1px_2px_rgba(0,0,0,0.15)]">
              My City My Duty
            </h1>
          </div>

          <h2 className="text-xl font-semibold text-civic-900">
            {isSignUp ? "Create account" : "Sign in"}
          </h2>
          <p className="mt-1 text-sm text-civic-600">
            {isSignUp
              ? "Register as an admin user"
              : "Access the civic operations dashboard"}
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            {isSignUp && (
              <Input
                label="Full Name"
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            )}

            <Input
              label="Email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <Input
              label="Password"
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />

            {showCorpSelect && (
              <div className="space-y-1">
                <label
                  htmlFor="corporation_id"
                  className="block text-sm font-medium text-civic-800"
                >
                  Corporation
                  {!isSignUp || corporations.length > 0 ? (
                    <span className="text-red-500"> *</span>
                  ) : null}
                </label>
                <select
                  id="corporation_id"
                  name="corporation_id"
                  required={!isSignUp || corporations.length > 0}
                  disabled={!supabaseConfigured || corpsLoading}
                  value={corporationId}
                  onChange={(e) => setCorporationId(e.target.value)}
                  className="w-full rounded-lg border border-civic-200 px-3 py-2 text-sm text-civic-900 bg-white focus:border-civic-500 focus:outline-none focus:ring-2 focus:ring-civic-200"
                >
                  <option value="">Select...</option>
                  {corporationOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {showBootstrapCorp && (
              <div className="space-y-4 rounded-lg border border-civic-100 bg-civic-50/60 p-4">
                <p className="text-sm text-civic-700">
                  No corporation exists yet. Create the first one to finish admin
                  setup.
                </p>
                <Input
                  label="Corporation Name"
                  type="text"
                  required
                  value={bootstrapName}
                  onChange={(e) => setBootstrapName(e.target.value)}
                />
                <Input
                  label="Corporation Code"
                  type="text"
                  value={bootstrapCode}
                  onChange={(e) => setBootstrapCode(e.target.value)}
                  placeholder="e.g. TCC-001"
                />
              </div>
            )}

            {corpsError && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                Could not load corporations: {corpsError}.{" "}
                {isSignUp
                  ? "You can still create the first corporation below."
                  : "Try again or contact an administrator."}
              </p>
            )}

            {supabaseConfigured &&
              !corpsLoading &&
              !corpsError &&
              corporations.length === 0 &&
              !isSignUp && (
                <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
                  No corporations available yet. Use{" "}
                  <strong>Create admin account</strong> below to set up the first
                  corporation.
                </p>
              )}

            {error && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
            )}
            {message && (
              <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">
                {message}
              </p>
            )}

            <Button type="submit" className="w-full" disabled={submitDisabled}>
              {loading ? "Please wait..." : isSignUp ? "Create Account" : "Sign In"}
            </Button>
          </form>

          <p className="mt-4 text-center text-sm text-civic-600">
            {isSignUp ? "Already have an account?" : "First time setup?"}{" "}
            <button
              type="button"
              onClick={() => {
                setIsSignUp(!isSignUp);
                setError(null);
                setMessage(null);
              }}
              className="font-medium text-civic-700 hover:underline"
            >
              {isSignUp ? "Sign in" : "Create admin account"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
