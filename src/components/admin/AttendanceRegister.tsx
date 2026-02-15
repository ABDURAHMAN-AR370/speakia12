import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useTotalDays } from "@/hooks/useTotalDays";

interface UserProfile {
  id: string;
  user_id: string;
  email: string;
  full_name: string;
  batch_number: number;
}

interface CompletionData {
  user_id: string;
  day_number: number;
  completed_at: string;
}

interface AttendanceRegisterProps {
  batchNumber: number;
  students: UserProfile[];
  completions: CompletionData[];
  onBack: () => void;
}

export default function AttendanceRegister({ batchNumber, students, completions, onBack }: AttendanceRegisterProps) {
  const { totalDays } = useTotalDays();
  const days = Array.from({ length: totalDays }, (_, i) => i + 1);

  const getCompletionDate = (userId: string, dayNumber: number) => {
    return completions.find((c) => c.user_id === userId && c.day_number === dayNumber)?.completed_at;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <Button variant="ghost" size="sm" onClick={onBack} className="mb-2">
              <ArrowLeft className="h-4 w-4 mr-1" />Back to Batches
            </Button>
            <CardTitle>Batch {batchNumber} - Attendance Register</CardTitle>
            <CardDescription>{students.length} students • Track daily course completion</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {students.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">No students in this batch</div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="sticky left-0 bg-background z-10 min-w-[150px]">Student</TableHead>
                  {days.map((day) => (
                    <TableHead key={day} className="text-center min-w-[60px]">D{day}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {students.map((student) => (
                  <TableRow key={student.id}>
                    <TableCell className="sticky left-0 bg-background font-medium">{student.full_name}</TableCell>
                    {days.map((day) => {
                      const completedAt = getCompletionDate(student.user_id, day);
                      return (
                        <TableCell key={day} className="text-center p-1">
                          {completedAt ? (
                            <Badge variant="default" className="text-[10px] px-1 py-0.5" title={new Date(completedAt).toLocaleDateString()}>✓</Badge>
                          ) : (
                            <span className="text-muted-foreground text-xs">-</span>
                          )}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
