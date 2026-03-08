import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Pencil, Save, CheckCircle, XCircle, Plus, Minus, Eye } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

interface StudentProfile {
  id: string;
  user_id: string;
  email: string;
  full_name: string;
  gender: string;
  place: string;
  whatsapp_number: string;
  batch_number: number;
  created_at: string;
  referred_by: string | null;
  signup_source: string | null;
}

interface QuizQuestion {
  id: string;
  type: "mcq" | "true_false" | "short_answer";
  question: string;
  options?: string[];
  correctAnswer: string | string[];
  points: number;
}

interface QuizSubmission {
  id: string;
  quiz_id: string;
  material_id: string;
  score: number;
  max_score: number;
  submitted_at: string;
  answers: Record<string, string>;
  quiz_name?: string;
  day_number?: number;
  material_exists?: boolean;
  questions?: QuizQuestion[];
  points_per_question?: number;
}

interface DayStatus {
  day_number: number;
  total_materials: number;
  completed_materials: number;
  completed: boolean;
}

export default function StudentDetail() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [dayStatuses, setDayStatuses] = useState<DayStatus[]>([]);
  const [quizSubmissions, setQuizSubmissions] = useState<QuizSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState({ full_name: "", place: "", batch_number: "1" });
  const [graceDialog, setGraceDialog] = useState<QuizSubmission | null>(null);
  const [graceMarks, setGraceMarks] = useState("0");
  const [viewQuiz, setViewQuiz] = useState<QuizSubmission | null>(null);

  useEffect(() => {
    if (userId) fetchStudentData();
  }, [userId]);

  const fetchStudentData = async () => {
    setLoading(true);
    try {
      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", userId!)
        .maybeSingle();
      if (profileData) {
        setProfile(profileData as StudentProfile);
        setEditData({
          full_name: profileData.full_name,
          place: profileData.place,
          batch_number: profileData.batch_number.toString(),
        });
      }

      const [materialsRes, progressRes] = await Promise.all([
        supabase.from("course_materials").select("id, day_number"),
        supabase.from("user_progress").select("material_id, completed_at").eq("user_id", userId!),
      ]);

      const materials = materialsRes.data || [];
      const progress = progressRes.data || [];
      const completedIds = new Set(progress.map(p => p.material_id));
      const existingMaterialIds = new Set(materials.map(m => m.id));

      const dayMap = new Map<number, { total: number; completed: number }>();
      materials.forEach(m => {
        if (!dayMap.has(m.day_number)) dayMap.set(m.day_number, { total: 0, completed: 0 });
        const d = dayMap.get(m.day_number)!;
        d.total++;
        if (completedIds.has(m.id)) d.completed++;
      });
      const statuses: DayStatus[] = [];
      dayMap.forEach((v, k) => statuses.push({ day_number: k, total_materials: v.total, completed_materials: v.completed, completed: v.completed >= v.total && v.total > 0 }));
      statuses.sort((a, b) => a.day_number - b.day_number);
      setDayStatuses(statuses);

      const { data: submissions } = await supabase
        .from("quiz_submissions")
        .select("id, quiz_id, material_id, score, max_score, submitted_at, answers")
        .eq("user_id", userId!);

      if (submissions && submissions.length > 0) {
        const quizIds = [...new Set(submissions.map(s => s.quiz_id))];
        const { data: quizzes } = await supabase.from("quizzes").select("id, name, questions, points_per_question").in("id", quizIds);
        const materialIds = [...new Set(submissions.map(s => s.material_id))];
        const { data: mats } = await supabase.from("course_materials").select("id, day_number").in("id", materialIds);

        const quizMap = new Map(quizzes?.map(q => [q.id, q]) || []);
        const matDayMap = new Map(mats?.map(m => [m.id, m.day_number]) || []);

        setQuizSubmissions(submissions.map(s => {
          const quiz = quizMap.get(s.quiz_id);
          const questions = quiz?.questions ? (typeof quiz.questions === "string" ? JSON.parse(quiz.questions) : quiz.questions) : [];
          const ans = typeof s.answers === "string" ? JSON.parse(s.answers) : s.answers;
          return {
            ...s,
            answers: ans as Record<string, string>,
            quiz_name: quiz?.name || "Unknown Quiz",
            day_number: matDayMap.get(s.material_id),
            material_exists: existingMaterialIds.has(s.material_id),
            questions: questions as QuizQuestion[],
            points_per_question: quiz?.points_per_question || 1,
          };
        }));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!profile) return;
    try {
      const { error } = await supabase.from("profiles").update({
        full_name: editData.full_name,
        place: editData.place,
        batch_number: parseInt(editData.batch_number),
      }).eq("id", profile.id);
      if (error) throw error;
      toast({ title: "Profile updated" });
      setEditing(false);
      fetchStudentData();
    } catch {
      toast({ title: "Failed to update", variant: "destructive" });
    }
  };

  const handleAddGraceMark = async () => {
    if (!graceDialog) return;
    const grace = parseInt(graceMarks) || 0;
    const newScore = graceDialog.score + grace;
    try {
      const { error } = await supabase.from("quiz_submissions").update({ score: newScore }).eq("id", graceDialog.id);
      if (error) throw error;
      toast({ title: `Grace mark added. New score: ${newScore}/${graceDialog.max_score}` });
      setGraceDialog(null);
      setGraceMarks("0");
      fetchStudentData();
    } catch {
      toast({ title: "Failed to update score", variant: "destructive" });
    }
  };

  const handleEditScore = async (submissionId: string, newScore: number) => {
    try {
      const { error } = await supabase.from("quiz_submissions").update({ score: newScore }).eq("id", submissionId);
      if (error) throw error;
      toast({ title: "Score updated" });
      fetchStudentData();
    } catch {
      toast({ title: "Failed to update", variant: "destructive" });
    }
  };

  if (loading) return <DashboardLayout><div className="text-center py-12">Loading...</div></DashboardLayout>;
  if (!profile) return <DashboardLayout><div className="text-center py-12">Student not found</div></DashboardLayout>;

  const activeSubmissions = quizSubmissions.filter(s => s.material_exists);
  const totalScore = activeSubmissions.reduce((s, q) => s + q.score, 0);
  const totalMax = activeSubmissions.reduce((s, q) => s + q.max_score, 0);
  const completedDays = dayStatuses.filter(d => d.completed).length;

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Back
        </Button>

        {/* Profile Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>{profile.full_name}</CardTitle>
                <CardDescription>Batch {profile.batch_number} • Joined {new Date(profile.created_at).toLocaleDateString()}</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={() => setEditing(!editing)}>
                <Pencil className="h-4 w-4 mr-1" /> {editing ? "Cancel" : "Edit"}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {editing ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Full Name</Label>
                    <Input value={editData.full_name} onChange={e => setEditData(p => ({ ...p, full_name: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>Place</Label>
                    <Input value={editData.place} onChange={e => setEditData(p => ({ ...p, place: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>Batch</Label>
                    <Select value={editData.batch_number} onValueChange={v => setEditData(p => ({ ...p, batch_number: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 20 }, (_, i) => (
                          <SelectItem key={i + 1} value={(i + 1).toString()}>Batch {i + 1}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Button onClick={handleSaveProfile}><Save className="h-4 w-4 mr-1" /> Save Changes</Button>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                <div><span className="text-muted-foreground">Email:</span><p className="font-medium">{profile.email}</p></div>
                <div><span className="text-muted-foreground">WhatsApp:</span><p className="font-medium">{profile.whatsapp_number || "-"}</p></div>
                <div><span className="text-muted-foreground">Gender:</span><p className="font-medium capitalize">{profile.gender && profile.gender !== "not_specified" ? profile.gender : "-"}</p></div>
                <div><span className="text-muted-foreground">Place:</span><p className="font-medium">{profile.place || "-"}</p></div>
                <div><span className="text-muted-foreground">Source:</span><p className="font-medium">{profile.signup_source || "-"}</p></div>
                <div><span className="text-muted-foreground">Referred By:</span><p className="font-medium">{profile.referred_by || "-"}</p></div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Card><CardContent className="pt-6 text-center"><p className="text-2xl font-bold">{completedDays}</p><p className="text-xs text-muted-foreground">Days Completed</p></CardContent></Card>
          <Card><CardContent className="pt-6 text-center"><p className="text-2xl font-bold">{dayStatuses.length}</p><p className="text-xs text-muted-foreground">Total Days</p></CardContent></Card>
          <Card><CardContent className="pt-6 text-center"><p className="text-2xl font-bold">{activeSubmissions.length}</p><p className="text-xs text-muted-foreground">Quizzes Taken</p></CardContent></Card>
          <Card><CardContent className="pt-6 text-center"><p className="text-2xl font-bold">{totalMax > 0 ? `${totalScore}/${totalMax}` : "-"}</p><p className="text-xs text-muted-foreground">Total Quiz Score</p></CardContent></Card>
        </div>

        {/* Day-wise Attendance */}
        <Card>
          <CardHeader><CardTitle>Class Attendance</CardTitle></CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {dayStatuses.map(d => (
                <Badge key={d.day_number} variant={d.completed ? "default" : "outline"} className="text-xs">
                  D{d.day_number} {d.completed ? <CheckCircle className="h-3 w-3 ml-1" /> : <XCircle className="h-3 w-3 ml-1 opacity-50" />}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Quiz Results */}
        <Card>
          <CardHeader>
            <CardTitle>Quiz Results</CardTitle>
            <CardDescription>Click the eye icon to view responses. Use + to add grace marks.</CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            {activeSubmissions.length === 0 ? (
              <p className="text-center py-4 text-muted-foreground">No quiz submissions</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Quiz</TableHead>
                    <TableHead>Day</TableHead>
                    <TableHead>Score</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activeSubmissions.map(sub => (
                    <TableRow key={sub.id}>
                      <TableCell className="font-medium">{sub.quiz_name}</TableCell>
                      <TableCell>Day {sub.day_number || "-"}</TableCell>
                      <TableCell>
                        <Badge variant={sub.score >= sub.max_score ? "default" : "secondary"}>
                          {sub.score}/{sub.max_score}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{new Date(sub.submitted_at).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => setViewQuiz(sub)} title="View responses">
                            <Eye className="h-3 w-3" />
                          </Button>
                          <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => { setGraceDialog(sub); setGraceMarks("1"); }}>
                            <Plus className="h-3 w-3" />
                          </Button>
                          <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => sub.score > 0 && handleEditScore(sub.id, sub.score - 1)}>
                            <Minus className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Grace Mark Dialog */}
        <Dialog open={!!graceDialog} onOpenChange={() => setGraceDialog(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Grace Marks</DialogTitle>
              <DialogDescription>
                Current score: {graceDialog?.score}/{graceDialog?.max_score} for {graceDialog?.quiz_name}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Grace Marks to Add</Label>
                <Input type="number" min="0" value={graceMarks} onChange={e => setGraceMarks(e.target.value)} />
              </div>
              <p className="text-sm text-muted-foreground">
                New score will be: {(graceDialog?.score || 0) + (parseInt(graceMarks) || 0)}/{graceDialog?.max_score}
              </p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setGraceDialog(null)}>Cancel</Button>
              <Button onClick={handleAddGraceMark}>Add Grace Marks</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* View Quiz Responses Dialog */}
        <Dialog open={!!viewQuiz} onOpenChange={() => setViewQuiz(null)}>
          <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{viewQuiz?.quiz_name} — Responses</DialogTitle>
              <DialogDescription>
                Score: {viewQuiz?.score}/{viewQuiz?.max_score} • Day {viewQuiz?.day_number || "-"}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              {viewQuiz?.questions?.map((q, idx) => {
                const userAnswer = viewQuiz.answers?.[q.id] || "";
                const correct = Array.isArray(q.correctAnswer)
                  ? q.correctAnswer.map(a => a.toLowerCase())
                  : [q.correctAnswer.toLowerCase()];
                const isCorrect = correct.includes(userAnswer.trim().toLowerCase());

                return (
                  <div key={q.id} className="p-3 border rounded-lg space-y-2">
                    <div className="flex items-start justify-between">
                      <p className="font-medium text-sm">{idx + 1}. {q.question}</p>
                      <Badge variant="outline" className="text-xs shrink-0 ml-2">
                        {q.points || viewQuiz.points_per_question || 1} pts
                      </Badge>
                    </div>

                    {q.type === "mcq" && q.options && (
                      <RadioGroup value={userAnswer} disabled>
                        {q.options.map(opt => (
                          <div key={opt} className="flex items-center space-x-2">
                            <RadioGroupItem value={opt} id={`view-${q.id}-${opt}`} />
                            <Label htmlFor={`view-${q.id}-${opt}`} className={
                              opt.toLowerCase() === (Array.isArray(q.correctAnswer) ? q.correctAnswer[0] : q.correctAnswer).toLowerCase()
                                ? "text-green-600 font-medium"
                                : opt === userAnswer && !isCorrect ? "text-destructive" : ""
                            }>
                              {opt}
                              {opt.toLowerCase() === (Array.isArray(q.correctAnswer) ? q.correctAnswer[0] : q.correctAnswer).toLowerCase() && " ✓"}
                            </Label>
                          </div>
                        ))}
                      </RadioGroup>
                    )}

                    {q.type === "true_false" && (
                      <RadioGroup value={userAnswer} disabled>
                        {["True", "False"].map(opt => (
                          <div key={opt} className="flex items-center space-x-2">
                            <RadioGroupItem value={opt} id={`view-${q.id}-${opt}`} />
                            <Label htmlFor={`view-${q.id}-${opt}`} className={
                              opt.toLowerCase() === (Array.isArray(q.correctAnswer) ? q.correctAnswer[0] : q.correctAnswer).toLowerCase()
                                ? "text-green-600 font-medium"
                                : opt === userAnswer && !isCorrect ? "text-destructive" : ""
                            }>
                              {opt}
                              {opt.toLowerCase() === (Array.isArray(q.correctAnswer) ? q.correctAnswer[0] : q.correctAnswer).toLowerCase() && " ✓"}
                            </Label>
                          </div>
                        ))}
                      </RadioGroup>
                    )}

                    {q.type === "short_answer" && (
                      <div className="space-y-1">
                        <p className="text-sm"><span className="text-muted-foreground">Student's answer:</span> <span className={isCorrect ? "text-green-600" : "text-destructive"}>{userAnswer || "(no answer)"}</span></p>
                        <p className="text-sm"><span className="text-muted-foreground">Correct answer:</span> <span className="text-green-600">{Array.isArray(q.correctAnswer) ? q.correctAnswer.join(", ") : q.correctAnswer}</span></p>
                      </div>
                    )}

                    <div className="flex items-center gap-1 text-xs">
                      {isCorrect ? (
                        <><CheckCircle className="h-3.5 w-3.5 text-green-600" /><span className="text-green-600">Correct</span></>
                      ) : (
                        <><XCircle className="h-3.5 w-3.5 text-destructive" /><span className="text-destructive">Incorrect</span></>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            <DialogFooter>
              <Button onClick={() => setViewQuiz(null)}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
