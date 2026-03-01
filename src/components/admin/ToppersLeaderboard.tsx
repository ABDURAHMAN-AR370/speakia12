import { useRef, useState, useEffect } from "react";
import { Download, Trophy, Medal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface TopperData {
  user_id: string;
  full_name: string;
  total_score: number;
  max_possible: number;
  percentage: number;
  quizzes_taken: number;
}

interface ToppersLeaderboardProps {
  batchNumber: number;
  toppers: TopperData[];
}

export default function ToppersLeaderboard({ batchNumber, toppers: allToppers }: ToppersLeaderboardProps) {
  const { toast } = useToast();
  const leaderboardRef = useRef<HTMLDivElement>(null);
  const [filter, setFilter] = useState("all");
  const [dayToppers, setDayToppers] = useState<TopperData[]>([]);
  const [availableDays, setAvailableDays] = useState<number[]>([]);
  const [loadingDays, setLoadingDays] = useState(false);

  useEffect(() => {
    fetchAvailableDays();
  }, []);

  useEffect(() => {
    if (filter !== "all") {
      fetchDayToppers(parseInt(filter));
    }
  }, [filter]);

  const fetchAvailableDays = async () => {
    const { data } = await supabase.from("course_materials").select("day_number").eq("material_type", "quiz").not("quiz_id", "is", null);
    const days = [...new Set(data?.map(d => d.day_number) || [])].sort((a, b) => a - b);
    setAvailableDays(days);
  };

  const fetchDayToppers = async (dayNumber: number) => {
    setLoadingDays(true);
    try {
      // Get quiz materials for this day
      const { data: materials } = await supabase.from("course_materials").select("id, quiz_id").eq("day_number", dayNumber).not("quiz_id", "is", null);
      if (!materials || materials.length === 0) { setDayToppers([]); setLoadingDays(false); return; }

      const materialIds = materials.map(m => m.id);
      const { data: submissions } = await supabase.from("quiz_submissions").select("user_id, score, max_score, material_id").in("material_id", materialIds);

      const userScores = new Map<string, { total: number; max: number; count: number }>();
      submissions?.forEach(sub => {
        if (!userScores.has(sub.user_id)) userScores.set(sub.user_id, { total: 0, max: 0, count: 0 });
        const s = userScores.get(sub.user_id)!;
        s.total += sub.score; s.max += sub.max_score; s.count++;
      });

      const userIds = [...userScores.keys()];
      const { data: profiles } = await supabase.from("profiles").select("user_id, full_name, batch_number").in("user_id", userIds).eq("batch_number", batchNumber);

      const list: TopperData[] = [];
      userScores.forEach((scores, userId) => {
        const profile = profiles?.find(p => p.user_id === userId);
        if (profile && scores.max > 0) {
          list.push({ user_id: userId, full_name: profile.full_name, total_score: scores.total, max_possible: scores.max, percentage: (scores.total / scores.max) * 100, quizzes_taken: scores.count });
        }
      });
      list.sort((a, b) => b.total_score - a.total_score);
      setDayToppers(list);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingDays(false);
    }
  };

  const toppers = filter === "all" ? allToppers : dayToppers;

  const downloadAsImage = async () => {
    if (!leaderboardRef.current) return;
    try {
      const html2canvas = (await import("html2canvas")).default;
      const canvas = await html2canvas(leaderboardRef.current, { backgroundColor: "#ffffff", scale: 2 });
      const link = document.createElement("a");
      link.download = `batch-${batchNumber}-toppers.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
      toast({ title: "Image downloaded successfully" });
    } catch (error) {
      console.error("Error generating image:", error);
      toast({ title: "Failed to download image", variant: "destructive" });
    }
  };

  const getRankIcon = (index: number) => {
    if (index === 0) return <Trophy className="h-5 w-5 text-accent" />;
    if (index === 1) return <Medal className="h-5 w-5 text-muted-foreground" />;
    if (index === 2) return <Medal className="h-5 w-5 text-primary/70" />;
    return null;
  };

  const getRankBadge = (index: number) => {
    if (index === 0) return "bg-accent/20 text-accent-foreground border-accent/50";
    if (index === 1) return "bg-muted text-muted-foreground border-border";
    if (index === 2) return "bg-primary/10 text-primary border-primary/30";
    return "bg-muted text-muted-foreground";
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-primary" />
              Batch {batchNumber} Toppers
            </CardTitle>
            <CardDescription>Based on total quiz scores</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Quizzes</SelectItem>
                {availableDays.map(d => (
                  <SelectItem key={d} value={d.toString()}>Day {d}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={downloadAsImage}>
              <Download className="h-4 w-4 mr-2" />
              PNG
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div ref={leaderboardRef} className="p-4 bg-background rounded-lg">
          <div className="text-center mb-6">
            <h2 className="text-xl font-bold text-foreground">Qurba - Batch {batchNumber}</h2>
            <p className="text-sm text-muted-foreground">
              {filter === "all" ? "Top Performers - All Quizzes" : `Top Performers - Day ${filter}`}
            </p>
          </div>
          
          {loadingDays ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : toppers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No quiz submissions yet</div>
          ) : (
            <div className="space-y-3">
              {toppers.map((topper, index) => (
                <div key={topper.user_id} className={`flex items-center gap-4 p-4 rounded-lg border ${getRankBadge(index)}`}>
                  <div className="flex items-center gap-2 min-w-[60px]">
                    {getRankIcon(index)}
                    <span className="font-bold text-lg">#{index + 1}</span>
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold">{topper.full_name}</p>
                    <p className="text-sm opacity-80">{topper.quizzes_taken} quiz{topper.quizzes_taken !== 1 ? 'zes' : ''}</p>
                  </div>
                  <div className="text-right">
                    <Badge variant="secondary" className="text-lg font-bold">
                      {topper.total_score}/{topper.max_possible}
                    </Badge>
                    <p className="text-sm opacity-80 mt-1">{topper.percentage.toFixed(1)}%</p>
                  </div>
                </div>
              ))}
            </div>
          )}
          
          <div className="text-center mt-6 text-xs text-muted-foreground">
            Generated on {new Date().toLocaleDateString()}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
