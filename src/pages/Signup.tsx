import { useState } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { signUp } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, BookOpen } from "lucide-react";

const SIGNUP_SOURCES = [
  "Instagram",
  "WhatsApp",
  "Friends",
  "Family Members",
  "YouTube",
  "Google Search",
  "Other",
];

export default function Signup() {
  const [searchParams] = useSearchParams();
  const referralCode = searchParams.get("ref") || "";

  const [formData, setFormData] = useState({
    whatsappInput: "",
    password: "",
    confirmPassword: "",
    fullName: "",
    signupSource: "",
  });

  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      toast({
        title: "Passwords don't match",
        description: "Please make sure your passwords match.",
        variant: "destructive",
      });
      return;
    }

    if (formData.password.length < 6) {
      toast({
        title: "Password too short",
        description: "Password must be at least 6 characters long.",
        variant: "destructive",
      });
      return;
    }

    if (!formData.whatsappInput.match(/^[0-9]{10}$/)) {
      toast({
        title: "Invalid WhatsApp number",
        description: "Please enter a valid 10-digit number.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    // Convert WhatsApp number to internal email
    const generatedEmail = `${formData.whatsappInput}@speakai.app`;

    const result = await signUp(
      generatedEmail,
      formData.password,
      formData.fullName,
      "", // gender removed
      "", // place removed
      formData.whatsappInput,
      referralCode,
      formData.signupSource
    );

    if (result.success) {
      toast({
        title: "Registration successful!",
        description: "You are now logged in.",
      });

      const { error } = await supabase.auth.signInWithPassword({
        email: generatedEmail.toLowerCase(),
        password: formData.password,
      });

      if (!error) {
        navigate("/dashboard");
      } else {
        navigate("/login");
      }
    } else {
      toast({
        title: "Registration failed",
        description: result.error || "Please try again later.",
        variant: "destructive",
      });
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 py-8">
      <div className="w-full max-w-md animate-fade-in">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
            <BookOpen className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold text-foreground">SPEAKAI</h1>
          <p className="text-muted-foreground mt-2">
            AI-Powered English Speaking Course
          </p>
          {referralCode && (
            <p className="text-sm text-primary mt-1">
              Referred by a friend 🎉
            </p>
          )}
        </div>

        <Card className="border-border shadow-lg">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl text-center">
              Create Account
            </CardTitle>
            <CardDescription className="text-center">
              Fill in your details to join the course
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">

              {/* WhatsApp Number */}
              <div className="space-y-2">
                <Label htmlFor="whatsappInput">WhatsApp Number</Label>
                <Input
                  id="whatsappInput"
                  type="tel"
                  placeholder="8089346495"
                  value={formData.whatsappInput}
                  onChange={(e) =>
                    handleChange("whatsappInput", e.target.value)
                  }
                  required
                  disabled={loading}
                />
              </div>

              {/* Full Name */}
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name</Label>
                <Input
                  id="fullName"
                  type="text"
                  placeholder="John Doe"
                  value={formData.fullName}
                  onChange={(e) =>
                    handleChange("fullName", e.target.value)
                  }
                  required
                  disabled={loading}
                />
              </div>

              {/* Signup Source Dropdown */}
              <div className="space-y-2">
                <Label>How did you hear about us?</Label>
                <Select
                  value={formData.signupSource}
                  onValueChange={(value) =>
                    handleChange("signupSource", value)
                  }
                  disabled={loading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select an option" />
                  </SelectTrigger>
                  <SelectContent>
                    {SIGNUP_SOURCES.map((source) => (
                      <SelectItem key={source} value={source}>
                        {source}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Password */}
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={(e) =>
                    handleChange("password", e.target.value)
                  }
                  required
                  disabled={loading}
                />
              </div>

              {/* Confirm Password */}
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">
                  Confirm Password
                </Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="••••••••"
                  value={formData.confirmPassword}
                  onChange={(e) =>
                    handleChange("confirmPassword", e.target.value)
                  }
                  required
                  disabled={loading}
                />
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating account...
                  </>
                ) : (
                  "Create Account"
                )}
              </Button>
            </form>

            <div className="mt-6 text-center text-sm">
              <span className="text-muted-foreground">
                Already have an account?{" "}
              </span>
              <Link
                to="/login"
                className="text-primary hover:underline font-medium"
              >
                Sign In
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
