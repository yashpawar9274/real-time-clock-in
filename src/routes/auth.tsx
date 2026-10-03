import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Capacitor } from "@capacitor/core";
import { useState } from "react";
import { Building2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const nativeAuthCallback = "com.omvaluehomes.attendance://auth-callback";

const getAuthRedirectUrl = () => {
  if (Capacitor.isNativePlatform()) {
    return nativeAuthCallback;
  }

  return window.location.origin;
};

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Staff Sign In | OM Value Homes" },
      {
        name: "description",
        content: "Sign in or create your OM Value Homes staff attendance account.",
      },
      { property: "og:title", content: "Staff Sign In | OM Value Homes" },
      {
        property: "og:description",
        content: "Secure staff access for attendance and salary records.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup" | "forgot">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  async function finishUser(userId: string, fullName?: string) {
    const employeeCode = `OVH-${userId.replaceAll("-", "").slice(0, 8).toUpperCase()}`;
    await supabase
      .from("profiles")
      .upsert(
        {
          id: userId,
          full_name: fullName || email.split("@")[0] || "Staff member",
          employee_code: employeeCode,
        },
        { onConflict: "id", ignoreDuplicates: true },
      );
    await supabase
      .from("user_roles")
      .upsert(
        { user_id: userId, role: "staff" },
        { onConflict: "user_id,role", ignoreDuplicates: true },
      );
  }
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage("");
    if (mode === "forgot") {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: getAuthRedirectUrl(),
      });
      setMessage(error?.message || "Check your email for the password reset link.");
      setBusy(false);
      return;
    }
    if (mode === "signup") {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: getAuthRedirectUrl(), data: { full_name: name } },
      });
      if (error) setMessage(error.message);
      else if (!data.session) setMessage("Check your email to confirm your account, then sign in.");
      else if (data.user) {
        await finishUser(data.user.id, name);
        await navigate({ to: "/dashboard" });
      }
      setBusy(false);
      return;
    }
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setMessage(error.message);
    else if (data.user) {
      await finishUser(data.user.id, data.user.user_metadata["full_name"] as string | undefined);
      await navigate({ to: "/dashboard" });
    }
    setBusy(false);
  }
  async function google() {
    setBusy(true);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: getAuthRedirectUrl(),
    });
    if (result.error) {
      setMessage(result.error.message);
      setBusy(false);
      return;
    }
    if (!result.redirected) await navigate({ to: "/dashboard" });
  }
  return (
    <main className="grid min-h-screen lg:grid-cols-[.85fr_1.15fr]">
      <section className="hidden bg-primary p-12 text-primary-foreground lg:flex lg:flex-col lg:justify-between">
        <div className="flex items-center gap-3">
          <Building2 />
          <span className="font-extrabold">OM VALUE HOMES</span>
        </div>
        <div>
          <p className="text-sm font-bold uppercase opacity-70">Workforce desk</p>
          <h1 className="mt-4 text-5xl font-extrabold leading-tight">
            Your day starts
            <br />
            with one tap.
          </h1>
        </div>
        <p className="text-sm opacity-70">Real-time attendance · Clear monthly salary records</p>
      </section>
      <section className="grid place-items-center px-5 py-10">
        <div className="w-full max-w-md">
          <div className="mb-9 flex items-center gap-3 lg:hidden">
            <Building2 className="text-primary" />
            <span className="font-extrabold">OM VALUE HOMES</span>
          </div>
          <h2 className="text-3xl font-extrabold">
            {mode === "signup"
              ? "Create staff account"
              : mode === "forgot"
                ? "Reset password"
                : "Welcome back"}
          </h2>
          <p className="mt-2 text-muted-foreground">
            {mode === "signup"
              ? "Join your team's attendance desk."
              : mode === "forgot"
                ? "We'll email you a secure recovery link."
                : "Sign in to record today's attendance."}
          </p>
          <form onSubmit={submit} className="mt-8 space-y-5">
            {mode === "signup" && (
              <div>
                <Label htmlFor="name">Full name</Label>
                <Input
                  id="name"
                  className="mt-2"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
            )}
            <div>
              <Label htmlFor="email">Work email</Label>
              <Input
                id="email"
                className="mt-2"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            {mode !== "forgot" && (
              <div>
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  className="mt-2"
                  type="password"
                  minLength={8}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            )}
            {message && <p className="rounded-md bg-muted p-3 text-sm">{message}</p>}
            <Button className="h-11 w-full" disabled={busy}>
              {busy
                ? "Please wait…"
                : mode === "signup"
                  ? "Create account"
                  : mode === "forgot"
                    ? "Send recovery link"
                    : "Sign in"}
            </Button>
          </form>
          {mode !== "forgot" && (
            <>
              <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground">
                <span className="h-px flex-1 bg-border" />
                OR
                <span className="h-px flex-1 bg-border" />
              </div>
              <Button
                type="button"
                variant="outline"
                className="h-11 w-full"
                onClick={google}
                disabled={busy}
              >
                Continue with Google
              </Button>
            </>
          )}
          <div className="mt-7 flex flex-wrap gap-4 text-sm">
            <Button
              variant="link"
              className="h-auto p-0"
              onClick={() => {
                setMode(mode === "signup" ? "signin" : "signup");
                setMessage("");
              }}
            >
              {mode === "signup"
                ? "Already have an account? Sign in"
                : "New staff member? Create account"}
            </Button>
            {mode === "signin" && (
              <Button
                variant="link"
                className="h-auto p-0"
                onClick={() => {
                  setMode("forgot");
                  setMessage("");
                }}
              >
                Forgot password?
              </Button>
            )}
            {mode === "forgot" && (
              <Button variant="link" className="h-auto p-0" onClick={() => setMode("signin")}>
                Back to sign in
              </Button>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
