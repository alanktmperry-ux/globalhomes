import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

async function hasAdminRole(userId: string) {
  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId);

  if (error) throw error;

  return (data ?? []).some((row) => row.role === "admin");
}

export default function AdminLoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<"login" | "forgot">("login");
  const [resetEmail, setResetEmail] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const normalised = email.trim().toLowerCase();
      const { data, error } = await supabase.auth.signInWithPassword({
        email: normalised,
        password,
      });
      if (error) throw error;
      if (!data.user) throw new Error("Login failed");

      const isAdminUser = await hasAdminRole(data.user.id);

      if (!isAdminUser) {
        await supabase.auth.signOut();
        toast.error("You are not authorised to access this area");
        return;
      }

      toast.success("Welcome back");
      navigate("/admin");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Login failed";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(
        resetEmail.trim().toLowerCase(),
        { redirectTo: window.location.origin + "/admin/login" }
      );
      if (error) throw error;
      toast.success("Check your email for a password reset link");
      setMode("login");
      setResetEmail("");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Could not send reset email";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
            <ShieldCheck className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-2xl">Admin Login</CardTitle>
        </CardHeader>
        <CardContent>
          {mode === "login" ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Username</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="username"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Log in"}
              </Button>
              <div className="text-center">
                <button
                  type="button"
                  onClick={() => {
                    setResetEmail(email);
                    setMode("forgot");
                  }}
                  className="text-sm text-primary hover:underline"
                >
                  Forgot password?
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleReset} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="reset-email">Email address</Label>
                <Input
                  id="reset-email"
                  type="email"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send reset link"}
              </Button>
              <div className="text-center">
                <button
                  type="button"
                  onClick={() => setMode("login")}
                  className="text-sm text-muted-foreground hover:underline"
                >
                  Back to login
                </button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
