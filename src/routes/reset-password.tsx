import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { KeyRound } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Reset Password | OM Value Homes" },
      {
        name: "description",
        content: "Choose a new password for your OM Value Homes attendance account.",
      },
      { property: "og:title", content: "Reset Password | OM Value Homes" },
      { property: "og:description", content: "Secure account recovery for OM Value Homes staff." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ResetPassword,
});

function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const isRecovery =
    typeof window !== "undefined" && window.location.hash.includes("type=recovery");
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage("");
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) return setMessage(error.message);
    await navigate({ to: "/dashboard" });
  }
  return (
    <main className="grid min-h-screen place-items-center px-5">
      <div className="w-full max-w-md border-t-4 border-primary bg-card p-7 shadow-sm">
        <KeyRound className="mb-6 text-primary" />
        <h1 className="text-2xl font-extrabold">Set a new password</h1>
        {!isRecovery ? (
          <p className="mt-3 text-sm text-destructive">
            Open the recovery link from your email first.
          </p>
        ) : (
          <form onSubmit={submit} className="mt-7 space-y-5">
            <div>
              <Label htmlFor="password">New password</Label>
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
            {message && <p className="text-sm text-destructive">{message}</p>}
            <Button className="w-full" disabled={busy}>
              {busy ? "Saving…" : "Save password"}
            </Button>
          </form>
        )}
        <Button asChild variant="link" className="mt-4 px-0">
          <Link to="/auth">Back to sign in</Link>
        </Button>
      </div>
    </main>
  );
}
