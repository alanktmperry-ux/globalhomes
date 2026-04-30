import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, XCircle, MailMinus } from "lucide-react";

type State =
  | { kind: "loading" }
  | { kind: "invalid"; reason: string }
  | { kind: "ready"; email: string }
  | { kind: "already"; email: string }
  | { kind: "submitting"; email: string }
  | { kind: "done"; email: string }
  | { kind: "error"; reason: string };

export default function UnsubscribePage() {
  const [params] = useSearchParams();
  const email = (params.get("email") || "").trim().toLowerCase();
  const token = params.get("token") || "";
  const [state, setState] = useState<State>({ kind: "loading" });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!email || !token) {
        setState({ kind: "invalid", reason: "Missing email or token in link." });
        return;
      }
      try {
        const url = `https://ngrkbohpmkzjonaofgbb.supabase.co/functions/v1/unsubscribe-email?email=${encodeURIComponent(email)}&token=${encodeURIComponent(token)}`;
        const res = await fetch(url);
        const json = await res.json();
        if (cancelled) return;
        if (!res.ok || !json.valid) {
          setState({ kind: "invalid", reason: json.error || "Invalid or expired link." });
          return;
        }
        setState(
          json.alreadyUnsubscribed
            ? { kind: "already", email: json.email }
            : { kind: "ready", email: json.email },
        );
      } catch {
        if (!cancelled) setState({ kind: "error", reason: "Network error. Please try again." });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [email, token]);

  const confirm = async () => {
    if (state.kind !== "ready") return;
    setState({ kind: "submitting", email: state.email });
    try {
      const { data, error } = await supabase.functions.invoke("unsubscribe-email", {
        body: { email: state.email, token },
      });
      if (error || !data?.success) {
        setState({ kind: "error", reason: error?.message || "Could not unsubscribe." });
        return;
      }
      setState({ kind: "done", email: state.email });
    } catch (e: any) {
      setState({ kind: "error", reason: e?.message || "Network error." });
    }
  };

  return (
    <>
      <Helmet>
        <title>Unsubscribe · ListHQ</title>
        <meta name="robots" content="noindex,nofollow" />
      </Helmet>
      <div className="min-h-[70vh] flex items-center justify-center px-4 py-16">
        <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-sm p-8 text-center">
          {state.kind === "loading" && (
            <>
              <Loader2 className="w-8 h-8 mx-auto text-slate-400 animate-spin" />
              <p className="mt-4 text-sm text-slate-600">Checking your link…</p>
            </>
          )}

          {state.kind === "invalid" && (
            <>
              <XCircle className="w-10 h-10 mx-auto text-red-500" />
              <h1 className="mt-4 text-xl font-semibold text-slate-900">Link not valid</h1>
              <p className="mt-2 text-sm text-slate-600">{state.reason}</p>
              <Link to="/" className="inline-block mt-6 text-sm text-blue-600 hover:underline">
                Return to ListHQ
              </Link>
            </>
          )}

          {state.kind === "ready" && (
            <>
              <MailMinus className="w-10 h-10 mx-auto text-slate-700" />
              <h1 className="mt-4 text-xl font-semibold text-slate-900">Unsubscribe from ListHQ</h1>
              <p className="mt-2 text-sm text-slate-600">
                You're about to unsubscribe <strong className="text-slate-900">{state.email}</strong> from non-essential emails.
              </p>
              <p className="mt-2 text-xs text-slate-500">
                You'll still receive essential account emails (login, password reset, billing).
              </p>
              <Button onClick={confirm} className="mt-6 w-full">
                Confirm unsubscribe
              </Button>
              <Link to="/" className="inline-block mt-4 text-xs text-slate-500 hover:underline">
                Cancel
              </Link>
            </>
          )}

          {state.kind === "submitting" && (
            <>
              <Loader2 className="w-8 h-8 mx-auto text-slate-400 animate-spin" />
              <p className="mt-4 text-sm text-slate-600">Updating your preferences…</p>
            </>
          )}

          {(state.kind === "done" || state.kind === "already") && (
            <>
              <CheckCircle2 className="w-10 h-10 mx-auto text-green-600" />
              <h1 className="mt-4 text-xl font-semibold text-slate-900">
                {state.kind === "done" ? "You've been unsubscribed" : "Already unsubscribed"}
              </h1>
              <p className="mt-2 text-sm text-slate-600">
                <strong className="text-slate-900">{state.email}</strong> will no longer receive non-essential emails from ListHQ.
              </p>
              <p className="mt-2 text-xs text-slate-500">
                You'll still receive essential account emails (login, password reset, billing).
              </p>
              <Link to="/" className="inline-block mt-6 text-sm text-blue-600 hover:underline">
                Return to ListHQ
              </Link>
            </>
          )}

          {state.kind === "error" && (
            <>
              <XCircle className="w-10 h-10 mx-auto text-red-500" />
              <h1 className="mt-4 text-xl font-semibold text-slate-900">Something went wrong</h1>
              <p className="mt-2 text-sm text-slate-600">{state.reason}</p>
              <Link to="/" className="inline-block mt-6 text-sm text-blue-600 hover:underline">
                Return to ListHQ
              </Link>
            </>
          )}
        </div>
      </div>
    </>
  );
}
