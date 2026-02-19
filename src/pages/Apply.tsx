import { useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, BookOpen, Upload, CheckCircle } from "lucide-react";

export default function Apply() {
  const [searchParams] = useSearchParams();
  const referralCode = searchParams.get("ref") || "";

  const [formData, setFormData] = useState({
    fullName: "",
    place: "",
    gender: "",
    age: "",
    whatsappNumber: "",
  });
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null);
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const { toast } = useToast();

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setScreenshotFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setScreenshotPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.fullName || !formData.place || !formData.gender || !formData.age || !formData.whatsappNumber) {
      toast({ title: "Please fill all required fields", variant: "destructive" });
      return;
    }

    const age = parseInt(formData.age);
    if (isNaN(age) || age < 5 || age > 100) {
      toast({ title: "Please enter a valid age", variant: "destructive" });
      return;
    }

    setLoading(true);

    try {
      let screenshotUrl: string | null = null;

      if (screenshotFile) {
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${screenshotFile.name.split(".").pop()}`;
        const { error: uploadError } = await supabase.storage
          .from("course-materials")
          .upload(`applications/${fileName}`, screenshotFile);

        if (!uploadError) {
          const { data: urlData } = supabase.storage
            .from("course-materials")
            .getPublicUrl(`applications/${fileName}`);
          screenshotUrl = urlData.publicUrl;
        }
      }

      const { error } = await supabase.from("applications").insert({
        full_name: formData.fullName,
        place: formData.place,
        gender: formData.gender,
        age,
        whatsapp_number: formData.whatsappNumber.replace(/\s+/g, ""),
        screenshot_url: screenshotUrl,
        referred_by_code: referralCode || null,
      });

      if (error) throw error;

      setSubmitted(true);
    } catch (error) {
      console.error("Error submitting application:", error);
      toast({ title: "Submission failed", description: "Please try again.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="w-full max-w-md text-center animate-fade-in">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-100 mb-6">
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">Application Submitted!</h1>
          <p className="text-muted-foreground mb-6">
            Thank you for your interest! We will contact you on WhatsApp soon after verifying your payment.
          </p>
          <Link to="/" className="text-primary hover:underline">Back to Home</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 py-8">
      <div className="w-full max-w-md animate-fade-in">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
            <BookOpen className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold text-foreground">SPEAKAI</h1>
          <p className="text-muted-foreground mt-2">AI-Powered English Speaking Course</p>
          {referralCode && (
            <p className="text-sm text-primary mt-1">You were referred by a friend 🎉</p>
          )}
        </div>

        <Card className="border-border shadow-lg rounded-2xl">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl text-center">Apply Now</CardTitle>
            <CardDescription className="text-center">
              Fill in your details to apply for the course
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name <span className="text-destructive">*</span></Label>
                <Input
                  id="fullName"
                  type="text"
                  value={formData.fullName}
                  onChange={(e) => handleChange("fullName", e.target.value)}
                  required
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="place">Place <span className="text-destructive">*</span></Label>
                <Input
                  id="place"
                  type="text"
                  value={formData.place}
                  onChange={(e) => handleChange("place", e.target.value)}
                  required
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="gender">Gender <span className="text-destructive">*</span></Label>
                <Select value={formData.gender} onValueChange={(v) => handleChange("gender", v)} disabled={loading}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="age">Age <span className="text-destructive">*</span></Label>
                <Input
                  id="age"
                  type="number"
                  min="5"
                  max="100"
                  value={formData.age}
                  onChange={(e) => handleChange("age", e.target.value)}
                  required
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="whatsapp">WhatsApp Number <span className="text-destructive">*</span></Label>
                <Input
                  id="whatsapp"
                  type="tel"
                  value={formData.whatsappNumber}
                  onChange={(e) => handleChange("whatsappNumber", e.target.value)}
                  required
                  disabled={loading}
                />
              </div>

              {/* Payment instruction */}
              <div className="rounded-xl bg-primary/5 border border-primary/20 p-4 text-sm space-y-1">
                <p className="font-semibold text-foreground">Payment Instructions:</p>
                <p className="text-muted-foreground">
                  9061387917 ഈ നമ്പറിൽ ഫീ (199 only) അടച്ച് സ്ക്രീൻഷോട്ട് താഴെ നൽകുക
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="screenshot">Payment Screenshot (Optional)</Label>
                <label
                  htmlFor="screenshot"
                  className="flex flex-col items-center gap-2 p-4 border-2 border-dashed rounded-xl cursor-pointer hover:bg-muted/50 transition-colors"
                >
                  {screenshotPreview ? (
                    <img src={screenshotPreview} alt="Screenshot preview" className="max-h-40 rounded-lg object-contain" />
                  ) : (
                    <>
                      <Upload className="h-8 w-8 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Click to upload screenshot</span>
                    </>
                  )}
                  <Input
                    id="screenshot"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleFileChange}
                    disabled={loading}
                  />
                </label>
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" />Submitting...</>) : "Submit Application"}
              </Button>
            </form>

            <div className="mt-6 text-center text-sm">
              <span className="text-muted-foreground">Already have an account? </span>
              <Link to="/login" className="text-primary hover:underline font-medium">Sign In</Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
