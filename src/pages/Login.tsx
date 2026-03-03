import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { signIn, getUserRole } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, BookOpen, Eye, EyeOff, MessageCircle } from "lucide-react";

const ADMIN_WHATSAPP = "917593879279";

export default function Login() {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const [resetMode, setResetMode] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [resettingPassword, setResettingPassword] = useState(false);
  const [resolvedEmail, setResolvedEmail] = useState<string | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  const resolveEmail = async (input: string): Promise<string | null> => {
    if (input.includes("@")) return input.toLowerCase();
    const cleaned = input.replace(/\s+/g, "").replace(/^\+/, "");
    // Try generated email format first via whitelist (publicly accessible)
    const generatedEmail = `${cleaned}@qurba.app`;
    const { data } = await supabase.from("whitelist").select("email").eq("email", generatedEmail).maybeSingle();
    if (data) return data.email;
    // Try matching phone_number in whitelist
    const { data: data2 } = await supabase.from("whitelist").select("email").eq("phone_number", cleaned).maybeSingle();
    return data2?.email || null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setShowForgot(false);

    const email = await resolveEmail(identifier);
    if (!email) {
      toast({ title: "Account not found", description: "No account found with this User ID.", variant: "destructive" });
      setLoading(false);
      return;
    }

    // Check if password reset is enabled
    const { data: whitelistData } = await supabase.from("whitelist").select("password_reset_enabled").eq("email", email).maybeSingle();
    if (whitelistData?.password_reset_enabled) {
      setResolvedEmail(email);
      setResetMode(true);
      setLoading(false);
      return;
    }

    const result = await signIn(email, password);
    if (result.success) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const role = await getUserRole(user.id);
        toast({ title: "Welcome back!" });
        navigate(role === "admin" ? "/admin" : "/dashboard");
      } else {
        navigate("/dashboard");
      }
    } else {
      setShowForgot(true);
      toast({ title: "Login failed", description: result.error || "Please check your credentials.", variant: "destructive" });
    }
    setLoading(false);
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmNewPassword) {
      toast({ title: "Passwords don't match", variant: "destructive" });
      return;
    }
    if (!newPassword.trim()) {
      toast({ title: "Password cannot be empty", variant: "destructive" });
      return;
    }

    setResettingPassword(true);
    // Use the already resolved email instead of re-resolving
    const email = resolvedEmail || await resolveEmail(identifier);
    if (!email) {
      toast({ title: "Account not found", variant: "destructive" });
      setResettingPassword(false);
      return;
    }

    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/reset-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ email, new_password: newPassword }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to reset password");

      // Now sign in with new password
      const result = await signIn(email, newPassword);
      if (result.success) {
        toast({ title: "Password updated and logged in!" });
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const role = await getUserRole(user.id);
          navigate(role === "admin" ? "/admin" : "/dashboard");
        } else {
          navigate("/dashboard");
        }
      } else {
        toast({ title: "Password updated. Please sign in with your new password." });
        setResetMode(false);
      }
    } catch (error: unknown) {
      toast({ title: "Password reset failed", description: (error as Error).message, variant: "destructive" });
    } finally {
      setResettingPassword(false);
    }
  };

  const handleForgotPassword = () => {
    window.open(
      `https://wa.me/${ADMIN_WHATSAPP}?text=${encodeURIComponent(`Hi, I forgot my Qurba website password. My number: ${identifier}. Please reset my password.`)}`,
      "_blank"
    );
  };

  if (resetMode) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="w-full max-w-md animate-fade-in">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
              <BookOpen className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-3xl font-bold text-foreground">QURBA</h1>
            <p className="text-muted-foreground mt-2">Set your new password</p>
          </div>
          <Card className="border-border shadow-lg">
            <CardHeader>
              <CardTitle className="text-2xl text-center">New Password</CardTitle>
              <CardDescription className="text-center">Admin has enabled password reset for your account</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleResetPassword} className="space-y-4">
                <div className="space-y-2">
                  <Label>New Password</Label>
                  <div className="relative">
                    <Input type={showNewPassword ? "text" : "password"} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required className="pr-10" />
                    <Button type="button" variant="ghost" size="icon" className="absolute right-0 top-0 h-full px-3 hover:bg-transparent" onClick={() => setShowNewPassword(!showNewPassword)}>
                      {showNewPassword ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Confirm New Password</Label>
                  <Input type="password" value={confirmNewPassword} onChange={(e) => setConfirmNewPassword(e.target.value)} required />
                </div>
                <Button type="submit" className="w-full" disabled={resettingPassword}>
                  {resettingPassword ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Setting password...</> : "Set Password & Login"}
                </Button>
                <Button type="button" variant="outline" className="w-full" onClick={() => setResetMode(false)}>Back to Login</Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md animate-fade-in">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
            <BookOpen className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold text-foreground">QURBA</h1>
          <p className="text-muted-foreground mt-2">Quran course</p>
        </div>

        <Card className="border-border shadow-lg">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl text-center">Sign In</CardTitle>
            <CardDescription className="text-center">Enter your User ID & password</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="identifier">User ID</Label>
                <Input id="identifier" type="tel" value={identifier} onChange={(e) => setIdentifier(e.target.value)} required disabled={loading} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input id="password" type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} required disabled={loading} className="pr-10" />
                  <Button type="button" variant="ghost" size="icon" className="absolute right-0 top-0 h-full px-3 hover:bg-transparent" onClick={() => setShowPassword(!showPassword)} disabled={loading}>
                    {showPassword ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
                  </Button>
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Signing in...</> : "Sign In"}
              </Button>
            </form>

            {showForgot && (
              <div className="mt-4 p-3 rounded-lg bg-muted text-center space-y-2">
                <p className="text-sm text-muted-foreground">Forgot your password?</p>
                <Button variant="outline" size="sm" onClick={handleForgotPassword} className="gap-2">
                  <MessageCircle className="h-4 w-4" />Contact Admin on WhatsApp
                </Button>
              </div>
            )}

            <div className="mt-6 text-center text-sm">
              <span className="text-muted-foreground">Don't have an account? </span>
              <Link to="/signup" className="text-primary hover:underline font-medium">Sign Up</Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
