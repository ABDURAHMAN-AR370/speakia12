import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Plus, Trash2, GripVertical, Loader2, CheckCircle } from "lucide-react";
import type { Json } from "@/integrations/supabase/types";

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

interface QuizBuilderProps {
  quiz?: Quiz | null;
  onClose: () => void;
  onSuccess: () => void;
}

const QUESTION_TYPES = [
  { value: "mcq", label: "Multiple Choice" },
  { value: "true_false", label: "True / False" },
  { value: "short_answer", label: "Short Answer" },
];

export default function QuizBuilder({ quiz, onClose, onSuccess }: QuizBuilderProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [quizName, setQuizName] = useState(quiz?.name || "");
  const [quizDescription, setQuizDescription] = useState(quiz?.description || "");
  const [pointsPerQuestion, setPointsPerQuestion] = useState(quiz?.points_per_question || 1);
  const [questions, setQuestions] = useState<QuizQuestion[]>(
    quiz?.questions || []
  );

  const addQuestion = () => {
    setQuestions([
      ...questions,
      {
        id: crypto.randomUUID(),
        type: "mcq",
        question: "",
        options: ["", "", "", ""],
        correctAnswer: "",
        points: pointsPerQuestion,
      },
    ]);
  };

  const updateQuestion = (id: string, updates: Partial<QuizQuestion>) => {
    setQuestions(questions.map((q) => (q.id === id ? { ...q, ...updates } : q)));
  };

  const removeQuestion = (id: string) => {
    setQuestions(questions.filter((q) => q.id !== id));
  };

  const updateOption = (questionId: string, optionIndex: number, value: string) => {
    setQuestions(
      questions.map((q) => {
        if (q.id === questionId && q.options) {
          const newOptions = [...q.options];
          newOptions[optionIndex] = value;
          return { ...q, options: newOptions };
        }
        return q;
      })
    );
  };

  const handleSave = async () => {
    if (!quizName.trim()) {
      toast({ title: "Quiz name is required", variant: "destructive" });
      return;
    }

    if (questions.length === 0) {
      toast({ title: "Add at least one question", variant: "destructive" });
      return;
    }

    const invalidQuestions = questions.filter((q) => !q.question.trim());
    if (invalidQuestions.length > 0) {
      toast({ title: "All questions must have text", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      const quizData = {
        name: quizName,
        description: quizDescription || null,
        questions: questions as unknown as Json,
        points_per_question: pointsPerQuestion,
        created_by: user?.id,
      };

      if (quiz?.id) {
        const { error } = await supabase
          .from("quizzes")
          .update(quizData)
          .eq("id", quiz.id);
        if (error) throw error;
        toast({ title: "Quiz updated" });
      } else {
        const { error } = await supabase.from("quizzes").insert(quizData);
        if (error) throw error;
        toast({ title: "Quiz created" });
      }

      onSuccess();
    } catch (error) {
      console.error("Save error:", error);
      toast({ title: "Failed to save quiz", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{quiz ? "Edit Quiz" : "Create Quiz"}</DialogTitle>
          <DialogDescription>
            Create a quiz with auto-marking for course materials
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Quiz Name</Label>
              <Input
                placeholder="e.g., Day 5 Vocabulary Test"
                value={quizName}
                onChange={(e) => setQuizName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Points Per Question</Label>
              <Input
                type="number"
                min="1"
                value={pointsPerQuestion}
                onChange={(e) => setPointsPerQuestion(parseInt(e.target.value) || 1)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Description (Optional)</Label>
            <Textarea
              placeholder="Brief description of the quiz"
              value={quizDescription}
              onChange={(e) => setQuizDescription(e.target.value)}
              rows={2}
            />
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Questions</Label>
              <Button variant="outline" size="sm" onClick={addQuestion}>
                <Plus className="h-4 w-4 mr-1" />
                Add Question
              </Button>
            </div>

            {questions.length === 0 ? (
              <div className="text-center py-8 border-2 border-dashed rounded-lg">
                <p className="text-muted-foreground">No questions added yet</p>
                <Button variant="link" size="sm" onClick={addQuestion} className="mt-2">
                  Add your first question
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {questions.map((question, index) => (
                  <div
                    key={question.id}
                    className="p-4 border rounded-lg bg-muted/30 space-y-4"
                  >
                    <div className="flex items-start gap-3">
                      <GripVertical className="h-5 w-5 text-muted-foreground mt-2 cursor-move" />
                      <Badge variant="secondary" className="mt-1.5">
                        Q{index + 1}
                      </Badge>
                      <div className="flex-1 space-y-3">
                        <div className="grid grid-cols-3 gap-3">
                          <div className="col-span-2 space-y-1">
                            <Label className="text-xs">Question</Label>
                            <Textarea
                              placeholder="Enter your question"
                              value={question.question}
                              onChange={(e) =>
                                updateQuestion(question.id, { question: e.target.value })
                              }
                              rows={2}
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Type</Label>
                            <Select
                              value={question.type}
                              onValueChange={(v: "mcq" | "true_false" | "short_answer") => {
                                const updates: Partial<QuizQuestion> = { type: v };
                                if (v === "true_false") {
                                  updates.options = ["True", "False"];
                                  updates.correctAnswer = "";
                                } else if (v === "mcq") {
                                  updates.options = ["", "", "", ""];
                                  updates.correctAnswer = "";
                                } else {
                                  updates.options = undefined;
                                  updates.correctAnswer = "";
                                }
                                updateQuestion(question.id, updates);
                              }}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {QUESTION_TYPES.map((type) => (
                                  <SelectItem key={type.value} value={type.value}>
                                    {type.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        {question.type === "mcq" && question.options && (
                          <div className="space-y-2">
                            <Label className="text-xs">Options (click to mark correct)</Label>
                            <div className="grid grid-cols-2 gap-2">
                              {question.options.map((option, optIdx) => (
                                <div key={optIdx} className="flex items-center gap-2">
                                  <Button
                                    type="button"
                                    variant={question.correctAnswer === option && option ? "default" : "outline"}
                                    size="icon"
                                    className="h-8 w-8 shrink-0"
                                    onClick={() => {
                                      if (option) {
                                        updateQuestion(question.id, { correctAnswer: option });
                                      }
                                    }}
                                  >
                                    <CheckCircle className="h-4 w-4" />
                                  </Button>
                                  <Input
                                    placeholder={`Option ${optIdx + 1}`}
                                    value={option}
                                    onChange={(e) =>
                                      updateOption(question.id, optIdx, e.target.value)
                                    }
                                  />
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {question.type === "true_false" && (
                          <div className="space-y-2">
                            <Label className="text-xs">Correct Answer</Label>
                            <div className="flex gap-2">
                              {["True", "False"].map((opt) => (
                                <Button
                                  key={opt}
                                  type="button"
                                  variant={question.correctAnswer === opt ? "default" : "outline"}
                                  size="sm"
                                  onClick={() => updateQuestion(question.id, { correctAnswer: opt })}
                                >
                                  {opt}
                                </Button>
                              ))}
                            </div>
                          </div>
                        )}

                        {question.type === "short_answer" && (
                          <div className="space-y-2">
                            <Label className="text-xs">
                              Expected Answer (for auto-marking, leave empty for manual)
                            </Label>
                            <Input
                              placeholder="Expected answer (optional)"
                              value={question.correctAnswer as string}
                              onChange={(e) =>
                                updateQuestion(question.id, { correctAnswer: e.target.value })
                              }
                            />
                          </div>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeQuestion(question.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Saving...
              </>
            ) : quiz ? (
              "Update Quiz"
            ) : (
              "Create Quiz"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
