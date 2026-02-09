import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, Edit, CheckCircle, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { Json } from "@/integrations/supabase/types";

interface FormField {
  id: string;
  type: string;
  label: string;
  required: boolean;
  options?: string[];
}

interface QuizQuestion {
  id: string;
  type: "mcq" | "true_false" | "short_answer";
  question: string;
  options?: string[];
  correctAnswer: string | string[];
  points: number;
}

interface ResponseViewerProps {
  type: "form" | "quiz";
  title: string;
  // Form props
  formFields?: FormField[];
  formResponses?: Record<string, unknown>;
  formSubmissionId?: string;
  // Quiz props
  quizQuestions?: QuizQuestion[];
  quizAnswers?: Record<string, string>;
  quizScore?: number;
  quizMaxScore?: number;
  pointsPerQuestion?: number;
  onClose: () => void;
  onUpdated?: () => void;
}

export default function ResponseViewer({
  type, title, formFields, formResponses, formSubmissionId,
  quizQuestions, quizAnswers, quizScore, quizMaxScore, pointsPerQuestion,
  onClose, onUpdated,
}: ResponseViewerProps) {
  const { toast } = useToast();
  const [editing, setEditing] = useState(false);
  const [responses, setResponses] = useState<Record<string, unknown>>(formResponses || {});
  const [saving, setSaving] = useState(false);

  const handleChange = (fieldId: string, value: unknown) => {
    setResponses(prev => ({ ...prev, [fieldId]: value }));
  };

  const handleCheckboxChange = (fieldId: string, option: string, checked: boolean) => {
    const current = (responses[fieldId] as string[]) || [];
    handleChange(fieldId, checked ? [...current, option] : current.filter(o => o !== option));
  };

  const handleSave = async () => {
    if (!formSubmissionId) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("form_submissions")
        .update({ responses: responses as Json })
        .eq("id", formSubmissionId);
      if (error) throw error;
      toast({ title: "Response updated" });
      setEditing(false);
      onUpdated?.();
    } catch {
      toast({ title: "Failed to update", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const renderFormField = (field: FormField) => {
    const value = responses[field.id];
    const disabled = !editing;

    switch (field.type) {
      case "short_text":
        return <Input value={(value as string) || ""} onChange={e => handleChange(field.id, e.target.value)} disabled={disabled} />;
      case "long_text":
        return <Textarea value={(value as string) || ""} onChange={e => handleChange(field.id, e.target.value)} disabled={disabled} rows={3} />;
      case "multiple_choice":
        return (
          <RadioGroup value={(value as string) || ""} onValueChange={v => handleChange(field.id, v)} disabled={disabled}>
            {field.options?.map(opt => (
              <div key={opt} className="flex items-center space-x-2">
                <RadioGroupItem value={opt} id={`${field.id}-${opt}`} />
                <Label htmlFor={`${field.id}-${opt}`}>{opt}</Label>
              </div>
            ))}
          </RadioGroup>
        );
      case "checkboxes":
        return (
          <div className="space-y-2">
            {field.options?.map(opt => (
              <div key={opt} className="flex items-center space-x-2">
                <Checkbox
                  id={`${field.id}-${opt}`}
                  checked={((value as string[]) || []).includes(opt)}
                  onCheckedChange={checked => handleCheckboxChange(field.id, opt, checked as boolean)}
                  disabled={disabled}
                />
                <Label htmlFor={`${field.id}-${opt}`}>{opt}</Label>
              </div>
            ))}
          </div>
        );
      case "dropdown":
        return (
          <Select value={(value as string) || ""} onValueChange={v => handleChange(field.id, v)} disabled={disabled}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {field.options?.map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
            </SelectContent>
          </Select>
        );
      case "rating":
        return (
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map(r => (
              <Button key={r} type="button" variant={value === r ? "default" : "outline"} size="sm"
                onClick={() => editing && handleChange(field.id, r)} disabled={disabled}>
                {r}
              </Button>
            ))}
          </div>
        );
      default:
        return <Input value={(value as string) || ""} disabled={disabled} onChange={e => handleChange(field.id, e.target.value)} />;
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Your {type === "form" ? "Form" : "Quiz"} Response
            <Badge variant="secondary">{title}</Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {type === "form" && formFields?.map(field => (
            <div key={field.id} className="space-y-2">
              <Label>{field.label}{field.required && <span className="text-destructive ml-1">*</span>}</Label>
              {renderFormField(field)}
            </div>
          ))}

          {type === "quiz" && quizQuestions?.map((q, idx) => {
            const userAnswer = quizAnswers?.[q.id] || "";
            const correct = Array.isArray(q.correctAnswer)
              ? q.correctAnswer.map(a => a.toLowerCase())
              : [q.correctAnswer.toLowerCase()];
            const isCorrect = correct.includes(userAnswer.toLowerCase());

            return (
              <div key={q.id} className="space-y-2 p-3 border rounded-lg">
                <div className="flex items-start justify-between">
                  <Label className="font-medium">{idx + 1}. {q.question}</Label>
                  {isCorrect ? (
                    <CheckCircle className="h-4 w-4 text-green-600 shrink-0" />
                  ) : (
                    <XCircle className="h-4 w-4 text-destructive shrink-0" />
                  )}
                </div>
                <p className="text-sm">Your answer: <span className="font-medium">{userAnswer || "(no answer)"}</span></p>
                {!isCorrect && (
                  <p className="text-sm text-green-600">Correct: {Array.isArray(q.correctAnswer) ? q.correctAnswer.join(", ") : q.correctAnswer}</p>
                )}
              </div>
            );
          })}

          {type === "quiz" && quizScore !== undefined && (
            <div className="p-4 rounded-lg bg-muted text-center">
              <p className="text-lg font-bold">Score: {quizScore} / {quizMaxScore}</p>
              <p className="text-sm text-muted-foreground">{quizMaxScore ? Math.round((quizScore / quizMaxScore) * 100) : 0}%</p>
            </div>
          )}
        </div>

        <DialogFooter>
          {type === "form" && !editing && (
            <Button variant="outline" onClick={() => setEditing(true)}>
              <Edit className="h-4 w-4 mr-2" />Edit Response
            </Button>
          )}
          {editing && (
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving...</> : "Save Changes"}
            </Button>
          )}
          <Button variant={editing ? "outline" : "default"} onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
