import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { useTotalDays } from "@/hooks/useTotalDays";
import { Check, Lock, Play, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";

interface DayProgress {
  dayNumber: number;
  totalMaterials: number;
  completedMaterials: number;
  isUnlocked: boolean;
  isCompleted: boolean;
  isCurrent: boolean;
}

export default function UserDashboard() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const { totalDays } = useTotalDays();
  const [dayProgress, setDayProgress] = useState<DayProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [referralCode, setReferralCode] = useState("");
  const [copied, setCopied] = useState(false);
  const [quizScore, setQuizScore] = useState({ total: 0, max: 0 });

  useEffect(() => {
    if (user) {
      fetchProgress();
      fetchQuizScores();
      if (profile?.referral_code) setReferralCode(profile.referral_code);
    }
  }, [user, totalDays, profile]);

  const fetchProgress = async () => {
    try {
      const { data: materials } = await supabase
        .from("course_materials")
        .select("id, day_number")
        .order("day_number")
        .order("order_index");

      const { data: progress } = await supabase
        .from("user_progress")
        .select("material_id")
        .eq("user_id", user?.id);

      const completedIds = new Set(progress?.map((p) => p.material_id) || []);

      const dayMaterials: Record<number, string[]> = {};
      materials?.forEach((m) => {
        if (!dayMaterials[m.day_number]) dayMaterials[m.day_number] = [];
        dayMaterials[m.day_number].push(m.id);
      });

      const days: DayProgress[] = [];
      let foundCurrentDay = false;

      for (let i = 1; i <= totalDays; i++) {
        const materialIds = dayMaterials[i] || [];
        const completed = materialIds.filter((id) => completedIds.has(id)).length;
        const total = materialIds.length;
        const isCompleted = total > 0 && completed === total;
        const previousDayCompleted = i === 1 || days[i - 2]?.isCompleted;
        const isUnlocked = previousDayCompleted;
        const isCurrent = isUnlocked && !isCompleted && !foundCurrentDay;
        if (isCurrent) foundCurrentDay = true;
        days.push({ dayNumber: i, totalMaterials: total, completedMaterials: completed, isUnlocked, isCompleted, isCurrent });
      }

      setDayProgress(days);
    } catch (error) {
      console.error("Error fetching progress:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchQuizScores = async () => {
    try {
      const { data } = await supabase
        .from("quiz_submissions")
        .select("score, max_score")
        .eq("user_id", user?.id);

      if (data) {
        const total = data.reduce((sum, s) => sum + s.score, 0);
        const max = data.reduce((sum, s) => sum + s.max_score, 0);
        setQuizScore({ total, max });
      }
    } catch (error) {
      console.error("Error fetching quiz scores:", error);
    }
  };

  const generateReferralCode = async () => {
    if (!user) return;
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    const { error } = await supabase.from("profiles").update({ referral_code: code }).eq("user_id", user.id);
    if (!error) setReferralCode(code);
  };

  const copyReferralLink = () => {
    const link = `${window.location.origin}/apply?ref=${referralCode}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const scorePercent = quizScore.max > 0 ? Math.round((quizScore.total / quizScore.max) * 100) : 0;

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            Welcome, {profile?.full_name?.split(" ")[0] || "Student"}!
          </h1>
          <p className="text-muted-foreground mt-1">Your {totalDays}-day English speaking journey</p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Days Completed</CardDescription>
              <CardTitle className="text-3xl">
                {dayProgress.filter((d) => d.isCompleted).length}/{totalDays}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Current Day</CardDescription>
              <CardTitle className="text-3xl">
                Day {dayProgress.find((d) => d.isCurrent)?.dayNumber || 1}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-1">
                <Trophy className="h-4 w-4" />Quiz Score
              </CardDescription>
              <CardTitle className="text-3xl">{scorePercent}%</CardTitle>
              <CardDescription>{quizScore.total} / {quizScore.max} marks</CardDescription>
            </CardHeader>
          </Card>
        </div>

        {/* Referral Section */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Refer a Friend</CardTitle>
            <CardDescription>Share your referral link and invite friends</CardDescription>
          </CardHeader>
          <CardContent>
            {referralCode ? (
              <div className="flex items-center gap-2 flex-wrap">
                <code className="bg-muted px-3 py-1 rounded text-sm flex-1 min-w-0 truncate">
                  {window.location.origin}/apply?ref={referralCode}
                </code>
                <button
                  onClick={copyReferralLink}
                  className="px-3 py-1 rounded bg-primary text-primary-foreground text-sm hover:bg-primary/90"
                >
                  {copied ? "Copied!" : "Copy"}
                </button>
              </div>
            ) : (
              <button
                onClick={generateReferralCode}
                className="px-4 py-2 rounded bg-primary text-primary-foreground text-sm hover:bg-primary/90"
              >
                Generate Referral Link
              </button>
            )}
          </CardContent>
        </Card>

        {/* Day Cards Grid */}
        <div>
          <h2 className="text-xl font-semibold mb-4">Course Days</h2>
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {dayProgress.map((day) => (
              <Card
                key={day.dayNumber}
                onClick={() => day.isUnlocked && navigate(`/day/${day.dayNumber}`)}
                className={cn(
                  "relative transition-all duration-200 cursor-pointer",
                  day.isUnlocked ? "hover:shadow-lg hover:scale-[1.02]" : "opacity-60 cursor-not-allowed",
                  day.isCurrent && "ring-2 ring-primary",
                  day.isCompleted && "bg-success/5 border-success/30"
                )}
              >
                <CardHeader className="pb-2 p-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">Day {day.dayNumber}</CardTitle>
                    {day.isCompleted ? (
                      <div className="h-5 w-5 rounded-full bg-success flex items-center justify-center shrink-0">
                        <Check className="h-3 w-3 text-success-foreground" />
                      </div>
                    ) : day.isCurrent ? (
                      <div className="h-5 w-5 rounded-full bg-primary flex items-center justify-center shrink-0">
                        <Play className="h-3 w-3 text-primary-foreground fill-current" />
                      </div>
                    ) : !day.isUnlocked ? (
                      <div className="h-5 w-5 rounded-full bg-muted flex items-center justify-center shrink-0">
                        <Lock className="h-3 w-3 text-muted-foreground" />
                      </div>
                    ) : null}
                  </div>
                </CardHeader>
                <CardContent className="p-3 pt-0">
                  {day.totalMaterials > 0 ? (
                    <div className="space-y-1">
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary transition-all"
                          style={{ width: `${(day.completedMaterials / day.totalMaterials) * 100}%` }}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {day.completedMaterials}/{day.totalMaterials}
                      </p>
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">No materials</p>
                  )}
                  {day.isCurrent && (
                    <Badge className="mt-1 text-xs" variant="default">Current</Badge>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
