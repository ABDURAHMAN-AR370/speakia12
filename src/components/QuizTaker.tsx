import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle, XCircle } from "lucide-react";

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

interface QuizTakerProps {
  quiz: Quiz;
  materialTitle: string;
  onClose: () => void;
  onSubmit: (answers: Record<string, string>, score: number, maxScore: number) => void;
}

export default function QuizTaker({ quiz, materialTitle, onClose, onSubmit }: QuizTakerProps) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [results, setResults] = useState<{ score: number; maxScore: number; details: Record<string, boolean> }>({ score: 0, maxScore: 0, details: {} });

  const handleChange = (questionId: string, value: string) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }));
  };

  // Auto-save: grade and submit in one step
  const handleCheckAndSubmit = async () => {
    setLoading(true);

    let score = 0;
    const maxScore = quiz.questions.reduce((sum, q) => sum + (q.points || quiz.points_per_question), 0);
    const details: Record<string, boolean> = {};

    quiz.questions.forEach(q => {
      const userAnswer = (answers[q.id] || "").trim().toLowerCase();
      const correct = Array.isArray(q.correctAnswer)
        ? q.correctAnswer.map(a => a.toLowerCase())
        : [q.correctAnswer.toLowerCase()];
      const isCorrect = correct.includes(userAnswer);
      details[q.id] = isCorrect;
      if (isCorrect) score += q.points || quiz.points_per_question;
    });

    const finalResults = { score, maxScore, details };
    setResults(finalResults);
    setShowResults(true);

    // Immediately save
    await onSubmit(answers, score, maxScore);
    setLoading(false);
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto rounded-2xl mx-2">
        <DialogHeader>
          <DialogTitle>{quiz.name}</DialogTitle>
          {quiz.description && <p className="text-sm text-muted-foreground">{quiz.description}</p>}
          <p className="text-xs text-muted-foreground">For: {materialTitle}</p>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {quiz.questions.map((q, idx) => (
            <div key={q.id} className="space-y-2 p-4 border rounded-xl">
              <div className="flex items-start justify-between">
                <Label className="font-medium">
                  {idx + 1}. {q.question}
                </Label>
                <Badge variant="outline" className="text-xs shrink-0 ml-2">
                  {q.points || quiz.points_per_question} pts
                </Badge>
              </div>
              {showResults && (
                <div className="flex items-center gap-1 text-sm">
                  {results.details[q.id] ? (
                    <><CheckCircle className="h-4 w-4 text-green-500" /><span className="text-green-500">Correct</span></>
                  ) : (
                    <><XCircle className="h-4 w-4 text-destructive" /><span className="text-destructive">Incorrect — Answer: {Array.isArray(q.correctAnswer) ? q.correctAnswer.join(", ") : q.correctAnswer}</span></>
                  )}
                </div>
              )}

              {q.type === "mcq" && (
                <RadioGroup value={answers[q.id] || ""} onValueChange={(v) => handleChange(q.id, v)} disabled={showResults}>
                  {q.options?.map(opt => (
                    <div key={opt} className="flex items-center space-x-2">
                      <RadioGroupItem value={opt} id={`${q.id}-${opt}`} />
                      <Label htmlFor={`${q.id}-${opt}`}>{opt}</Label>
                    </div>
                  ))}
                </RadioGroup>
              )}

              {q.type === "true_false" && (
                <RadioGroup value={answers[q.id] || ""} onValueChange={(v) => handleChange(q.id, v)} disabled={showResults}>
                  {["True", "False"].map(opt => (
                    <div key={opt} className="flex items-center space-x-2">
                      <RadioGroupItem value={opt} id={`${q.id}-${opt}`} />
                      <Label htmlFor={`${q.id}-${opt}`}>{opt}</Label>
                    </div>
                  ))}
                </RadioGroup>
              )}

              {q.type === "short_answer" && (
                <Input
                  value={(answers[q.id] as string) || ""}
                  onChange={(e) => handleChange(q.id, e.target.value)}
                  placeholder="Type your answer"
                  disabled={showResults}
                />
              )}
            </div>
          ))}
        </div>

        {showResults && (
          <div className="p-4 rounded-xl bg-muted text-center">
            <p className="text-lg font-bold">Score: {results.score} / {results.maxScore}</p>
            <p className="text-sm text-muted-foreground">
              {results.maxScore > 0 ? Math.round((results.score / results.maxScore) * 100) : 0}%
            </p>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            {showResults ? "Close" : "Cancel"}
          </Button>
          {!showResults && (
            <Button onClick={handleCheckAndSubmit} disabled={loading}>
              {loading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Submitting...</> : "Submit Quiz"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
