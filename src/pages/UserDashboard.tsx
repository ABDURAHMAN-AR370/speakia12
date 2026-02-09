import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { Check, Lock, Play } from "lucide-react";
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
  const [dayProgress, setDayProgress] = useState<DayProgress[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchProgress();
    }
  }, [user]);

  const fetchProgress = async () => {
    try {
      // Fetch all materials grouped by day
      const { data: materials, error: materialsError } = await supabase
        .from("course_materials")
        .select("id, day_number")
        .order("day_number")
        .order("order_index");

      if (materialsError) throw materialsError;

      // Fetch user's completed materials
      const { data: progress, error: progressError } = await supabase
        .from("user_progress")
        .select("material_id")
        .eq("user_id", user?.id);

      if (progressError) throw progressError;

      const completedIds = new Set(progress?.map((p) => p.material_id) || []);

      // Group materials by day
      const dayMaterials: Record<number, string[]> = {};
      materials?.forEach((m) => {
        if (!dayMaterials[m.day_number]) {
          dayMaterials[m.day_number] = [];
        }
        dayMaterials[m.day_number].push(m.id);
      });

      // Calculate progress for each day
      const days: DayProgress[] = [];
      let foundCurrentDay = false;

      for (let i = 1; i <= 30; i++) {
        const materialIds = dayMaterials[i] || [];
        const completed = materialIds.filter((id) => completedIds.has(id)).length;
        const total = materialIds.length;
        const isCompleted = total > 0 && completed === total;

        // Day is unlocked if:
        // 1. It's day 1, OR
        // 2. Previous day is completed
        const previousDayCompleted = i === 1 || days[i - 2]?.isCompleted;
        const isUnlocked = previousDayCompleted;

        // Current day is the first unlocked day that's not completed
        const isCurrent = isUnlocked && !isCompleted && !foundCurrentDay;
        if (isCurrent) foundCurrentDay = true;

        days.push({
          dayNumber: i,
          totalMaterials: total,
          completedMaterials: completed,
          isUnlocked,
          isCompleted,
          isCurrent,
        });
      }

      setDayProgress(days);
    } catch (error) {
      console.error("Error fetching progress:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDayClick = (day: DayProgress) => {
    if (day.isUnlocked) {
      navigate(`/day/${day.dayNumber}`);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            Welcome, {profile?.full_name?.split(" ")[0] || "Student"}!
          </h1>
          <p className="text-muted-foreground mt-1">
            Your 30-day English speaking journey
          </p>
        </div>

        {/* Progress Summary */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Days Completed</CardDescription>
              <CardTitle className="text-3xl">
                {dayProgress.filter((d) => d.isCompleted).length}/30
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
              <CardDescription>Overall Progress</CardDescription>
              <CardTitle className="text-3xl">
                {Math.round(
                  (dayProgress.filter((d) => d.isCompleted).length / 30) * 100
                )}%
              </CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Day Cards Grid */}
        <div>
          <h2 className="text-xl font-semibold mb-4">Course Days</h2>
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {dayProgress.map((day) => (
              <Card
                key={day.dayNumber}
                onClick={() => handleDayClick(day)}
                className={cn(
                  "relative transition-all duration-200 cursor-pointer",
                  day.isUnlocked
                    ? "hover:shadow-lg hover:scale-[1.02]"
                    : "opacity-60 cursor-not-allowed",
                  day.isCurrent && "ring-2 ring-primary",
                  day.isCompleted && "bg-success/5 border-success/30"
                )}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">Day {day.dayNumber}</CardTitle>
                    {day.isCompleted ? (
                      <div className="h-6 w-6 rounded-full bg-success flex items-center justify-center">
                        <Check className="h-4 w-4 text-success-foreground" />
                      </div>
                    ) : day.isCurrent ? (
                      <div className="h-6 w-6 rounded-full bg-primary flex items-center justify-center">
                        <Play className="h-3 w-3 text-primary-foreground fill-current" />
                      </div>
                    ) : !day.isUnlocked ? (
                      <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center">
                        <Lock className="h-3 w-3 text-muted-foreground" />
                      </div>
                    ) : null}
                  </div>
                </CardHeader>
                <CardContent>
                  {day.totalMaterials > 0 ? (
                    <div className="space-y-2">
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary transition-all"
                          style={{
                            width: `${(day.completedMaterials / day.totalMaterials) * 100}%`,
                          }}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {day.completedMaterials}/{day.totalMaterials} materials
                      </p>
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">No materials yet</p>
                  )}
                  {day.isCurrent && (
                    <Badge className="mt-2" variant="default">
                      Current
                    </Badge>
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
