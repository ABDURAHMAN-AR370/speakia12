import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { getUserRole } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, BookOpen, Eye, EyeOff, MessageCircle } from "lucide-react";

const ADMIN_WHATSAPP = "917593879279";

export default function Login() {
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const [resetMode, setResetMode] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [resettingPassword, setResettingPassword] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  // Normalize phone number and look up the dummy email
  const resolveEmail = async (input: string): Promise<string | null> => {
    const cleaned = input.replace(/\s+/g, "").replace(/^\+/, "");

    // Try different formats
    const formats = [cleaned, `+${cleaned}`, input];
    for (const fmt of formats) {
      const { data } = await supabase
        .from("profiles")
        .select("email")
        .eq("whatsapp_number", fmt)
        .maybeSingle();
      if (data?.email) return data.email;
    }
    return null;
  };

  const checkResetEnabled = async (email: string): Promise<boolean> => {
    // Check by email or phone in whitelist
    const { data } = await supabase
      .from("whitelist")
      .select("password_reset_enabled")
      .eq("email", email)
      .maybeSingle();
    return data?.password_reset_enabled === true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone.trim()) return;
    setLoading(true);
    setShowForgot(false);

    const email = await resolveEmail(phone);
    if (!email) {
      toast({
        title: "Account not found",
        description: "No account found with this WhatsApp number.",
        variant: "destructive",
      });
      setShowForgot(true);
      setLoading(false);
      return;
    }

    // Check if password reset is enabled
    const resetEnabled = await checkResetEnabled(email);
    if (resetEnabled) {
      setResetMode(true);
      setLoading(false);
      return;
    }

    // Check if blocked
    const { data: profileData } = await supabase
      .from("profiles")
      .select("is_blocked")
      .eq("email", email)
      .maybeSingle();

    if (profileData?.is_blocked) {
      toast({
        title: "Account blocked",
        description: "Your account has been blocked. Please contact admin.",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (!error) {
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
      toast({
        title: "Login failed",
        description: "Incorrect password. Please try again.",
        variant: "destructive",
      });
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
    try {
      const { data, error } = await supabase.functions.invoke("reset-user-password", {
        body: { phone_number: phone, new_password: newPassword },
      });

      if (error || data?.error) {
        toast({
          title: "Reset failed",
          description: data?.error || "Please try again or contact admin.",
          variant: "destructive",
        });
        setResettingPassword(false);
        return;
      }

      // Now sign in with the new password
      const email = await resolveEmail(phone);
      if (email) {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password: newPassword });
        if (!signInError) {
          toast({ title: "Password changed! You are now logged in." });
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            const role = await getUserRole(user.id);
            navigate(role === "admin" ? "/admin" : "/dashboard");
          } else {
            navigate("/dashboard");
          }
        } else {
          toast({ title: "Password set. Please sign in now." });
          setResetMode(false);
        }
      }
    } catch {
      toast({ title: "Something went wrong. Please try again.", variant: "destructive" });
    }
    setResettingPassword(false);
  };

  const handleForgotPassword = () => {
    window.open(
      `https://wa.me/${ADMIN_WHATSAPP}?text=${encodeURIComponent(`Hi, I forgot my SPEAKAI password. My WhatsApp number: ${phone}. Please reset my password.`)}`,
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
            <h1 className="text-3xl font-bold text-foreground">SPEAKAI</h1>
            <p className="text-muted-foreground mt-2">Set your new password</p>
          </div>
          <Card className="border-border shadow-lg rounded-2xl">
            <CardHeader>
              <CardTitle className="text-2xl text-center">Set New Password</CardTitle>
              <CardDescription className="text-center">
                Admin has enabled password reset for your account
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleResetPassword} className="space-y-4">
                <div className="space-y-2">
                  <Label>New Password</Label>
                  <div className="relative">
                    <Input
                      type={showNewPassword ? "text" : "password"}
                      placeholder="Enter new password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                      className="pr-10"
                    />
                    <Button type="button" variant="ghost" size="icon" className="absolute right-0 top-0 h-full px-3 hover:bg-transparent" onClick={() => setShowNewPassword(!showNewPassword)}>
                      {showNewPassword ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Confirm New Password</Label>
                  <div className="relative">
                    <Input
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="Confirm new password"
                      value={confirmNewPassword}
                      onChange={(e) => setConfirmNewPassword(e.target.value)}
                      required
                      className="pr-10"
                    />
                    <Button type="button" variant="ghost" size="icon" className="absolute right-0 top-0 h-full px-3 hover:bg-transparent" onClick={() => setShowConfirmPassword(!showConfirmPassword)}>
                      {showConfirmPassword ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
                    </Button>
                  </div>
                </div>
                <Button type="submit" className="w-full" disabled={resettingPassword}>
                  {resettingPassword ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Setting password...</> : "Set Password & Sign In"}
                </Button>
                <Button type="button" variant="outline" className="w-full" onClick={() => setResetMode(false)}>
                  Back to Sign In
                </Button>
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
          <h1 className="text-3xl font-bold text-foreground">SPEAKAI</h1>
          <p className="text-muted-foreground mt-2">AI-Powered English Speaking Course</p>
        </div>

        <Card className="border-border shadow-lg rounded-2xl">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl text-center">Sign In</CardTitle>
            <CardDescription className="text-center">
              Enter your WhatsApp number to sign in
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="phone">WhatsApp Number</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="91XXXXXXXXXX"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={loading}
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={loading}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
                  </Button>
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Signing in...</> : "Sign In"}
              </Button>
            </form>

            {showForgot && (
              <div className="mt-4 p-3 rounded-xl bg-muted text-center space-y-2">
                <p className="text-sm text-muted-foreground">Forgot your password?</p>
                <Button variant="outline" size="sm" onClick={handleForgotPassword} className="gap-2">
                  <MessageCircle className="h-4 w-4" />
                  Contact Admin on WhatsApp
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
