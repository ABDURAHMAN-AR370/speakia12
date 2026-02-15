import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { ArrowLeft, Check, Lock, FileText, Image, Video, Link as LinkIcon, Headphones, HelpCircle, ClipboardList } from "lucide-react";
import { cn } from "@/lib/utils";
import MaterialViewer from "@/components/MaterialViewer";
import FormSubmissionDialog from "@/components/FormSubmissionDialog";
import QuizTaker from "@/components/QuizTaker";
import ResponseViewer from "@/components/ResponseViewer";
import type { Json } from "@/integrations/supabase/types";

interface Material {
  id: string;
  day_number: number;
  work_type: string;
  details: string | null;
  material_type: string;
  material_url: string | null;
  form_id: string | null;
  quiz_id: string | null;
  order_index: number;
  min_completion_time?: number;
}

interface FormField {
  id: string;
  type: string;
  label: string;
  required: boolean;
  options?: string[];
}

interface CustomForm {
  id: string;
  name: string;
  fields: FormField[];
}

interface QuizQuestion {
  id: string;
  type: "mcq" | "true_false" | "short_answer";
  question: string;
  options?: string[];
  correctAnswer: string | string[];
  points: number;
}

interface Quiz {
  id: string;
  name: string;
  description: string | null;
  questions: QuizQuestion[];
  points_per_question: number;
}

export default function DayDetail() {
  const { dayNumber } = useParams<{ dayNumber: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [materials, setMaterials] = useState<Material[]>([]);
  const [completedMaterials, setCompletedMaterials] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [selectedMaterial, setSelectedMaterial] = useState<Material | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [showQuiz, setShowQuiz] = useState(false);
  const [showResponse, setShowResponse] = useState(false);
  const [currentForm, setCurrentForm] = useState<CustomForm | null>(null);
  const [currentQuiz, setCurrentQuiz] = useState<Quiz | null>(null);
  const [viewFormResponses, setViewFormResponses] = useState<Record<string, unknown> | null>(null);
  const [viewFormSubmissionId, setViewFormSubmissionId] = useState<string | null>(null);
  const [viewQuizAnswers, setViewQuizAnswers] = useState<Record<string, string> | null>(null);
  const [viewQuizScore, setViewQuizScore] = useState<{ score: number; maxScore: number } | null>(null);

  const day = parseInt(dayNumber || "1");

  useEffect(() => {
    if (user) fetchDayData();
  }, [user, day]);

  const fetchDayData = async () => {
    try {
      const { data: materialsData, error: materialsError } = await supabase
        .from("course_materials")
        .select("*")
        .eq("day_number", day)
        .order("order_index");

      if (materialsError) throw materialsError;

      const materialIds = materialsData?.map((m) => m.id) || [];
      const { data: progressData, error: progressError } = await supabase
        .from("user_progress")
        .select("material_id")
        .eq("user_id", user?.id)
        .in("material_id", materialIds);

      if (progressError) throw progressError;

      setMaterials(materialsData || []);
      setCompletedMaterials(new Set(progressData?.map((p) => p.material_id) || []));
    } catch (error) {
      console.error("Error fetching day data:", error);
    } finally {
      setLoading(false);
    }
  };

  const isMaterialUnlocked = (index: number): boolean => {
    if (index === 0) return true;
    return completedMaterials.has(materials[index - 1].id);
  };

  const handleMaterialClick = async (material: Material, index: number) => {
    if (!isMaterialUnlocked(index)) return;

    const isCompleted = completedMaterials.has(material.id);

    if (isCompleted) {
      setSelectedMaterial(material);
      if (material.form_id) {
        const [formRes, subRes] = await Promise.all([
          supabase.from("custom_forms").select("*").eq("id", material.form_id).single(),
          supabase.from("form_submissions").select("*").eq("material_id", material.id).eq("user_id", user?.id).single(),
        ]);
        if (formRes.data) {
          const fields = typeof formRes.data.fields === "string" ? JSON.parse(formRes.data.fields) : formRes.data.fields;
          setCurrentForm({ ...formRes.data, fields } as CustomForm);
        }
        if (subRes.data) {
          const resp = typeof subRes.data.responses === "string" ? JSON.parse(subRes.data.responses) : subRes.data.responses;
          setViewFormResponses(resp as Record<string, unknown>);
          setViewFormSubmissionId(subRes.data.id);
        }
        setShowResponse(true);
      } else if (material.quiz_id) {
        const [quizRes, subRes] = await Promise.all([
          supabase.from("quizzes").select("*").eq("id", material.quiz_id).single(),
          supabase.from("quiz_submissions").select("*").eq("material_id", material.id).eq("user_id", user?.id).single(),
        ]);
        if (quizRes.data) {
          const questions = typeof quizRes.data.questions === "string" ? JSON.parse(quizRes.data.questions) : quizRes.data.questions;
          setCurrentQuiz({ ...quizRes.data, questions } as Quiz);
        }
        if (subRes.data) {
          const ans = typeof subRes.data.answers === "string" ? JSON.parse(subRes.data.answers) : subRes.data.answers;
          setViewQuizAnswers(ans as Record<string, string>);
          setViewQuizScore({ score: subRes.data.score, maxScore: subRes.data.max_score });
        }
        setShowResponse(true);
      } else {
        setSelectedMaterial(material);
      }
      return;
    }

    setSelectedMaterial(material);

    if (material.form_id) {
      const { data: formData } = await supabase.from("custom_forms").select("*").eq("id", material.form_id).single();
      if (formData) {
        const fields = typeof formData.fields === "string" ? JSON.parse(formData.fields) : formData.fields;
        setCurrentForm({ ...formData, fields } as CustomForm);
      }
    }

    if (material.quiz_id) {
      const { data: quizData } = await supabase.from("quizzes").select("*").eq("id", material.quiz_id).single();
      if (quizData) {
        const questions = typeof quizData.questions === "string" ? JSON.parse(quizData.questions) : quizData.questions;
        setCurrentQuiz({ ...quizData, questions } as Quiz);
      }
    }
  };

  const handleFormSubmit = async (responses: Record<string, unknown>) => {
    if (!selectedMaterial || !user) return;
    try {
      if (selectedMaterial.form_id) {
        await supabase.from("form_submissions").insert([{
          user_id: user.id,
          material_id: selectedMaterial.id,
          form_id: selectedMaterial.form_id,
          responses: responses as Json,
        }]);
      }
      await supabase.from("user_progress").insert({ user_id: user.id, material_id: selectedMaterial.id });
      setCompletedMaterials(prev => new Set([...prev, selectedMaterial.id]));
      closeAllDialogs();
    } catch (error) {
      console.error("Error submitting:", error);
    }
  };

  const handleQuizSubmit = async (answers: Record<string, string>, score: number, maxScore: number) => {
    if (!selectedMaterial || !user || !selectedMaterial.quiz_id) return;
    try {
      await supabase.from("quiz_submissions").insert({
        user_id: user.id,
        material_id: selectedMaterial.id,
        quiz_id: selectedMaterial.quiz_id,
        answers: answers as unknown as Json,
        score,
        max_score: maxScore,
      });
      await supabase.from("user_progress").insert({ user_id: user.id, material_id: selectedMaterial.id });
      setCompletedMaterials(prev => new Set([...prev, selectedMaterial.id]));
      closeAllDialogs();
    } catch (error) {
      console.error("Error submitting quiz:", error);
    }
  };

  const closeAllDialogs = () => {
    setSelectedMaterial(null);
    setShowForm(false);
    setShowQuiz(false);
    setShowResponse(false);
    setCurrentForm(null);
    setCurrentQuiz(null);
    setViewFormResponses(null);
    setViewFormSubmissionId(null);
    setViewQuizAnswers(null);
    setViewQuizScore(null);
  };

  const getMaterialIcon = (type: string) => {
    switch (type) {
      case "image": return Image;
      case "video": return Video;
      case "link": return LinkIcon;
      case "audio": return Headphones;
      case "form": return ClipboardList;
      case "quiz": return HelpCircle;
      default: return FileText;
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in max-w-full overflow-hidden">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Day {day}</h1>
            <p className="text-muted-foreground">
              {materials.length} materials • {completedMaterials.size} completed
            </p>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">Loading...</div>
        ) : materials.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">No materials available for this day yet.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {materials.map((material, index) => {
              const isUnlocked = isMaterialUnlocked(index);
              const isCompleted = completedMaterials.has(material.id);
              const Icon = getMaterialIcon(material.material_type);

              return (
                <Card
                  key={material.id}
                  onClick={() => handleMaterialClick(material, index)}
                  className={cn(
                    "transition-all duration-200",
                    isUnlocked ? "cursor-pointer hover:shadow-md" : "opacity-60 cursor-not-allowed",
                    isCompleted && "bg-success/5 border-success/30"
                  )}
                >
                  <CardHeader className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className={cn("h-10 w-10 rounded-lg flex items-center justify-center shrink-0", isCompleted ? "bg-success/20" : "bg-primary/10")}>
                          <Icon className={cn("h-5 w-5", isCompleted ? "text-success" : "text-primary")} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <CardTitle className="text-base sm:text-lg truncate">{material.work_type}</CardTitle>
                          <CardDescription className="flex items-center gap-2 mt-1 flex-wrap">
                            <Badge variant="secondary" className="text-xs">{material.material_type}</Badge>
                            {material.form_id && <Badge variant="outline" className="text-xs"><FileText className="h-3 w-3 mr-1" />Form</Badge>}
                            {material.quiz_id && <Badge variant="outline" className="text-xs"><HelpCircle className="h-3 w-3 mr-1" />Quiz</Badge>}
                          </CardDescription>
                        </div>
                      </div>
                      <div className="shrink-0">
                        {isCompleted ? (
                          <div className="h-8 w-8 rounded-full bg-success flex items-center justify-center">
                            <Check className="h-4 w-4 text-success-foreground" />
                          </div>
                        ) : !isUnlocked ? (
                          <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                            <Lock className="h-4 w-4 text-muted-foreground" />
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </CardHeader>
                  {material.details && (
                    <CardContent className="pt-0 px-4 pb-4">
                      <p className="text-sm text-muted-foreground line-clamp-2">{material.details}</p>
                    </CardContent>
                  )}
                </Card>
              );
            })}
          </div>
        )}

        {/* Material Viewer Dialog */}
        {selectedMaterial && !showForm && !showQuiz && !showResponse && (
          <MaterialViewer
            material={selectedMaterial}
            isCompleted={completedMaterials.has(selectedMaterial.id)}
            onClose={closeAllDialogs}
            onComplete={() => {
              if (selectedMaterial.form_id && currentForm) {
                setShowForm(true);
              } else if (selectedMaterial.quiz_id && currentQuiz) {
                setShowQuiz(true);
              } else {
                handleFormSubmit({});
              }
            }}
          />
        )}

        {showForm && currentForm && selectedMaterial && (
          <FormSubmissionDialog
            form={currentForm}
            materialTitle={selectedMaterial.work_type}
            onClose={closeAllDialogs}
            onSubmit={handleFormSubmit}
          />
        )}

        {showQuiz && currentQuiz && selectedMaterial && (
          <QuizTaker
            quiz={currentQuiz}
            materialTitle={selectedMaterial.work_type}
            onClose={closeAllDialogs}
            onSubmit={handleQuizSubmit}
          />
        )}

        {showResponse && selectedMaterial && (
          <>
            {currentForm && viewFormResponses && (
              <ResponseViewer
                type="form"
                title={currentForm.name}
                formFields={currentForm.fields}
                formResponses={viewFormResponses}
                formSubmissionId={viewFormSubmissionId || undefined}
                onClose={closeAllDialogs}
                onUpdated={fetchDayData}
              />
            )}
            {currentQuiz && viewQuizAnswers && viewQuizScore && (
              <ResponseViewer
                type="quiz"
                title={currentQuiz.name}
                quizQuestions={currentQuiz.questions}
                quizAnswers={viewQuizAnswers}
                quizScore={viewQuizScore.score}
                quizMaxScore={viewQuizScore.maxScore}
                pointsPerQuestion={currentQuiz.points_per_question}
                onClose={closeAllDialogs}
              />
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
