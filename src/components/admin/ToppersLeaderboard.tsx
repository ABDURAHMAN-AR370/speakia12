import { useRef, useState, useEffect } from "react";
import { Download, Trophy, Medal, Award } from "lucide-react";
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
  const downloadRef = useRef<HTMLDivElement>(null);
  const [filter, setFilter] = useState("all");
  const [dayToppers, setDayToppers] = useState<TopperData[]>([]);
  const [availableDays, setAvailableDays] = useState<number[]>([]);
  const [loadingDays, setLoadingDays] = useState(false);

  useEffect(() => { fetchAvailableDays(); }, []);
  useEffect(() => { if (filter !== "all") fetchDayToppers(parseInt(filter)); }, [filter]);

  const fetchAvailableDays = async () => {
    const { data } = await supabase.from("course_materials").select("day_number").eq("material_type", "quiz").not("quiz_id", "is", null);
    const days = [...new Set(data?.map(d => d.day_number) || [])].sort((a, b) => a - b);
    setAvailableDays(days);
  };

  const fetchDayToppers = async (dayNumber: number) => {
    setLoadingDays(true);
    try {
      const { data: materials } = await supabase.from("course_materials").select("id, quiz_id").eq("day_number", dayNumber).not("quiz_id", "is", null);
      if (!materials || materials.length === 0) { setDayToppers([]); return; }

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
    if (!downloadRef.current) return;
    try {
      const html2canvas = (await import("html2canvas")).default;
      const canvas = await html2canvas(downloadRef.current, { backgroundColor: "#ffffff", scale: 2, width: 600, height: 800 });
      const link = document.createElement("a");
      link.download = `batch-${batchNumber}-toppers.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
      toast({ title: "Image downloaded" });
    } catch {
      toast({ title: "Failed to download", variant: "destructive" });
    }
  };

  const getRankIcon = (index: number) => {
    if (index === 0) return <Trophy className="h-6 w-6 text-yellow-500" />;
    if (index === 1) return <Medal className="h-6 w-6 text-gray-400" />;
    if (index === 2) return <Award className="h-6 w-6 text-amber-700" />;
    return null;
  };

  const getRankBg = (index: number) => {
    if (index === 0) return "bg-gradient-to-r from-yellow-50 to-amber-50 border-yellow-200 dark:from-yellow-950/20 dark:to-amber-950/20 dark:border-yellow-800";
    if (index === 1) return "bg-gradient-to-r from-gray-50 to-slate-50 border-gray-200 dark:from-gray-950/20 dark:to-slate-950/20 dark:border-gray-700";
    if (index === 2) return "bg-gradient-to-r from-orange-50 to-amber-50 border-orange-200 dark:from-orange-950/20 dark:to-amber-950/20 dark:border-orange-800";
    return "bg-card border-border";
  };

  const top5 = toppers.slice(0, 5);

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2"><Trophy className="h-5 w-5 text-primary" /> Batch {batchNumber} Toppers</CardTitle>
            <CardDescription>Ranked by highest total marks</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Quizzes</SelectItem>
                {availableDays.map(d => <SelectItem key={d} value={d.toString()}>Day {d}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={downloadAsImage}><Download className="h-4 w-4 mr-1" />PNG</Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Visible leaderboard */}
        <div ref={leaderboardRef}>
          {loadingDays ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : toppers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No quiz submissions yet</div>
          ) : (
            <div className="space-y-3">
              {toppers.map((topper, index) => (
                <div key={topper.user_id} className={`flex items-center gap-4 p-4 rounded-xl border-2 transition-all ${getRankBg(index)}`}>
                  <div className="flex items-center justify-center w-10 h-10 rounded-full bg-background border-2 border-border font-bold text-lg shrink-0">
                    {getRankIcon(index) || <span className="text-sm">#{index + 1}</span>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold truncate">{topper.full_name}</p>
                    <p className="text-xs text-muted-foreground">{topper.quizzes_taken} quiz{topper.quizzes_taken !== 1 ? "zes" : ""} • {topper.percentage.toFixed(0)}%</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xl font-bold">{topper.total_score}</p>
                    <p className="text-xs text-muted-foreground">/ {topper.max_possible}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Hidden download-only template (fixed 600x800) */}
        <div style={{ position: "absolute", left: "-9999px", top: 0 }}>
          <div ref={downloadRef} style={{ width: 600, height: 800, padding: 40, background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)", fontFamily: "system-ui, sans-serif", color: "#fff", display: "flex", flexDirection: "column" }}>
            <div style={{ textAlign: "center", marginBottom: 30 }}>
              <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 4 }}>🏆 QURBA - Batch {batchNumber}</h1>
              <p style={{ fontSize: 16, opacity: 0.9 }}>{filter === "all" ? "Top Performers - All Quizzes" : `Top Performers - Day ${filter}`}</p>
            </div>
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 16 }}>
              {top5.map((topper, index) => (
                <div key={topper.user_id} style={{ display: "flex", alignItems: "center", gap: 16, padding: "16px 20px", borderRadius: 12, background: index === 0 ? "rgba(255,215,0,0.25)" : index === 1 ? "rgba(192,192,192,0.2)" : index === 2 ? "rgba(205,127,50,0.2)" : "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)" }}>
                  <div style={{ width: 44, height: 44, borderRadius: "50%", background: "rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, fontWeight: 800 }}>
                    {index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : `#${index + 1}`}
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 18, fontWeight: 700 }}>{topper.full_name}</p>
                    <p style={{ fontSize: 13, opacity: 0.8 }}>{topper.quizzes_taken} quizzes</p>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <p style={{ fontSize: 24, fontWeight: 800 }}>{topper.total_score}/{topper.max_possible}</p>
                    <p style={{ fontSize: 13, opacity: 0.8 }}>{topper.percentage.toFixed(0)}%</p>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ textAlign: "center", marginTop: 20, fontSize: 12, opacity: 0.7 }}>
              Generated on {new Date().toLocaleDateString()} • qurba.lovable.app
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
