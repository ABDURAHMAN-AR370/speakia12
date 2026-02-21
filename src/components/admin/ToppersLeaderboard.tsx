import { useRef } from "react";
import { Download, Trophy, Medal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

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

export default function ToppersLeaderboard({ batchNumber, toppers }: ToppersLeaderboardProps) {
  const { toast } = useToast();
  const leaderboardRef = useRef<HTMLDivElement>(null);

  const downloadAsImage = async () => {
    if (!leaderboardRef.current) return;

    try {
      const html2canvas = (await import("html2canvas")).default;
      const canvas = await html2canvas(leaderboardRef.current, {
        backgroundColor: "#ffffff",
        scale: 2,
      });
      
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
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-primary" />
              Batch {batchNumber} Toppers
            </CardTitle>
            <CardDescription>
              Based on quiz scores
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={downloadAsImage}>
            <Download className="h-4 w-4 mr-2" />
            Download PNG
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div ref={leaderboardRef} className="p-4 bg-background rounded-lg">
          <div className="text-center mb-6">
            <h2 className="text-xl font-bold text-foreground">Qurba - Batch {batchNumber}</h2>
            <p className="text-sm text-muted-foreground">Top Performers Leaderboard</p>
          </div>
          
          {toppers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No quiz submissions yet
            </div>
          ) : (
            <div className="space-y-3">
              {toppers.map((topper, index) => (
                <div
                  key={topper.user_id}
                  className={`flex items-center gap-4 p-4 rounded-lg border ${getRankBadge(index)}`}
                >
                  <div className="flex items-center gap-2 min-w-[60px]">
                    {getRankIcon(index)}
                    <span className="font-bold text-lg">#{index + 1}</span>
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold">{topper.full_name}</p>
                    <p className="text-sm opacity-80">
                      {topper.quizzes_taken} quiz{topper.quizzes_taken !== 1 ? 'zes' : ''} completed
                    </p>
                  </div>
                  <div className="text-right">
                    <Badge variant="secondary" className="text-lg font-bold">
                      {topper.percentage.toFixed(1)}%
                    </Badge>
                    <p className="text-sm opacity-80 mt-1">
                      {topper.total_score}/{topper.max_possible} pts
                    </p>
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
