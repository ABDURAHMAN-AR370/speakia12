import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { Plus, Trash2, Edit, GripVertical, Loader2, FileText, HelpCircle } from "lucide-react";
import type { Json } from "@/integrations/supabase/types";
import QuizBuilder from "@/components/admin/QuizBuilder";

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
  description: string | null;
  fields: FormField[];
  created_at: string;
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
  created_at: string;
}

const FIELD_TYPES = [
  { value: "short_text", label: "Short Text" },
  { value: "long_text", label: "Long Text / Paragraph" },
  { value: "multiple_choice", label: "Multiple Choice" },
  { value: "checkboxes", label: "Checkboxes" },
  { value: "dropdown", label: "Dropdown" },
  { value: "rating", label: "Rating Scale" },
  { value: "file_upload", label: "File Upload" },
];

export default function AdminForms() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [forms, setForms] = useState<CustomForm[]>([]);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFormDialog, setShowFormDialog] = useState(false);
  const [showQuizDialog, setShowQuizDialog] = useState(false);
  const [editingForm, setEditingForm] = useState<CustomForm | null>(null);
  const [editingQuiz, setEditingQuiz] = useState<Quiz | null>(null);
  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [fields, setFields] = useState<FormField[]>([]);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("forms");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [formsResult, quizzesResult] = await Promise.all([
        supabase.from("custom_forms").select("*").order("created_at", { ascending: false }),
        supabase.from("quizzes").select("*").order("created_at", { ascending: false }),
      ]);

      // Parse fields for each form
      const parsedForms = (formsResult.data || []).map((form) => ({
        ...form,
        fields: typeof form.fields === "string" ? JSON.parse(form.fields) : form.fields,
      })) as CustomForm[];

      const parsedQuizzes = (quizzesResult.data || []).map((quiz) => ({
        ...quiz,
        questions: typeof quiz.questions === "string" ? JSON.parse(quiz.questions) : quiz.questions,
      })) as Quiz[];

      setForms(parsedForms);
      setQuizzes(parsedQuizzes);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenFormDialog = (form?: CustomForm) => {
    if (form) {
      setEditingForm(form);
      setFormName(form.name);
      setFormDescription(form.description || "");
      setFields(form.fields);
    } else {
      setEditingForm(null);
      setFormName("");
      setFormDescription("");
      setFields([]);
    }
    setShowFormDialog(true);
  };

  const handleCloseFormDialog = () => {
    setShowFormDialog(false);
    setEditingForm(null);
    setFormName("");
    setFormDescription("");
    setFields([]);
  };

  const handleOpenQuizDialog = (quiz?: Quiz) => {
    setEditingQuiz(quiz || null);
    setShowQuizDialog(true);
  };

  const handleCloseQuizDialog = () => {
    setShowQuizDialog(false);
    setEditingQuiz(null);
  };

  const addField = () => {
    setFields([
      ...fields,
      {
        id: crypto.randomUUID(),
        type: "short_text",
        label: "",
        required: false,
        options: [],
      },
    ]);
  };

  const updateField = (id: string, updates: Partial<FormField>) => {
    setFields(fields.map((f) => (f.id === id ? { ...f, ...updates } : f)));
  };

  const removeField = (id: string) => {
    setFields(fields.filter((f) => f.id !== id));
  };

  const handleSaveForm = async () => {
    if (!formName.trim()) {
      toast({ title: "Form name is required", variant: "destructive" });
      return;
    }

    if (fields.length === 0) {
      toast({ title: "Add at least one field", variant: "destructive" });
      return;
    }

    const invalidFields = fields.filter((f) => !f.label.trim());
    if (invalidFields.length > 0) {
      toast({ title: "All fields must have labels", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      const formData = {
        name: formName,
        description: formDescription || null,
        fields: fields as unknown as Json,
        created_by: user?.id,
      };

      if (editingForm) {
        const { error } = await supabase
          .from("custom_forms")
          .update(formData)
          .eq("id", editingForm.id);
        if (error) throw error;
        toast({ title: "Form updated" });
      } else {
        const { error } = await supabase.from("custom_forms").insert(formData);
        if (error) throw error;
        toast({ title: "Form created" });
      }

      handleCloseFormDialog();
      fetchData();
    } catch (error) {
      console.error("Save error:", error);
      toast({ title: "Failed to save form", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteForm = async (id: string) => {
    try {
      const { error } = await supabase.from("custom_forms").delete().eq("id", id);
      if (error) throw error;
      toast({ title: "Form deleted" });
      fetchData();
    } catch (error) {
      toast({ title: "Failed to delete form", variant: "destructive" });
    }
  };

  const handleDeleteQuiz = async (id: string) => {
    try {
      const { error } = await supabase.from("quizzes").delete().eq("id", id);
      if (error) throw error;
      toast({ title: "Quiz deleted" });
      fetchData();
    } catch (error) {
      toast({ title: "Failed to delete quiz", variant: "destructive" });
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Forms & Quizzes</h1>
            <p className="text-muted-foreground mt-1">
              Create custom forms and quizzes for course materials
            </p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="forms" className="gap-2">
              <FileText className="h-4 w-4" />
              Forms
            </TabsTrigger>
            <TabsTrigger value="quizzes" className="gap-2">
              <HelpCircle className="h-4 w-4" />
              Quizzes
            </TabsTrigger>
          </TabsList>

          <TabsContent value="forms" className="space-y-4">
            <div className="flex justify-end">
              <Button onClick={() => handleOpenFormDialog()}>
                <Plus className="h-4 w-4 mr-2" />
                Create Form
              </Button>
            </div>

            {loading ? (
              <div className="text-center py-12">Loading...</div>
            ) : forms.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-muted-foreground mb-4">No forms created yet</p>
                  <Button onClick={() => handleOpenFormDialog()}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Your First Form
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {forms.map((form) => (
                  <Card key={form.id}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-lg">{form.name}</CardTitle>
                          {form.description && (
                            <CardDescription className="mt-1">
                              {form.description}
                            </CardDescription>
                          )}
                        </div>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenFormDialog(form)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteForm(form.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="secondary">{form.fields.length} fields</Badge>
                        {form.fields.slice(0, 3).map((field) => (
                          <Badge key={field.id} variant="outline" className="text-xs">
                            {field.label || "Unnamed"}
                          </Badge>
                        ))}
                        {form.fields.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{form.fields.length - 3} more
                          </Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="quizzes" className="space-y-4">
            <div className="flex justify-end">
              <Button onClick={() => handleOpenQuizDialog()}>
                <Plus className="h-4 w-4 mr-2" />
                Create Quiz
              </Button>
            </div>

            {loading ? (
              <div className="text-center py-12">Loading...</div>
            ) : quizzes.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-muted-foreground mb-4">No quizzes created yet</p>
                  <Button onClick={() => handleOpenQuizDialog()}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Your First Quiz
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {quizzes.map((quiz) => (
                  <Card key={quiz.id}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-lg">{quiz.name}</CardTitle>
                          {quiz.description && (
                            <CardDescription className="mt-1">
                              {quiz.description}
                            </CardDescription>
                          )}
                        </div>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenQuizDialog(quiz)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteQuiz(quiz.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="secondary">{quiz.questions.length} questions</Badge>
                        <Badge variant="outline">{quiz.points_per_question} pts each</Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Form Builder Dialog */}
        <Dialog open={showFormDialog} onOpenChange={handleCloseFormDialog}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingForm ? "Edit Form" : "Create Form"}
              </DialogTitle>
              <DialogDescription>
                Design a custom form for material completion
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6 py-4">
              <div className="space-y-2">
                <Label>Form Name</Label>
                <Input
                  placeholder="e.g., Daily Reflection"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Description (Optional)</Label>
                <Input
                  placeholder="Brief description of the form"
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                />
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Form Fields</Label>
                  <Button variant="outline" size="sm" onClick={addField}>
                    <Plus className="h-4 w-4 mr-1" />
                    Add Field
                  </Button>
                </div>

                {fields.length === 0 ? (
                  <div className="text-center py-8 border-2 border-dashed rounded-lg">
                    <p className="text-muted-foreground">No fields added yet</p>
                    <Button
                      variant="link"
                      size="sm"
                      onClick={addField}
                      className="mt-2"
                    >
                      Add your first field
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {fields.map((field) => (
                      <div
                        key={field.id}
                        className="flex items-start gap-3 p-4 border rounded-lg bg-muted/30"
                      >
                        <GripVertical className="h-5 w-5 text-muted-foreground mt-2 cursor-move" />
                        <div className="flex-1 space-y-3">
                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <Label className="text-xs">Field Label</Label>
                              <Input
                                placeholder="Question text"
                                value={field.label}
                                onChange={(e) =>
                                  updateField(field.id, { label: e.target.value })
                                }
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">Field Type</Label>
                              <Select
                                value={field.type}
                                onValueChange={(v) =>
                                  updateField(field.id, { type: v })
                                }
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {FIELD_TYPES.map((type) => (
                                    <SelectItem key={type.value} value={type.value}>
                                      {type.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>

                          {["multiple_choice", "checkboxes", "dropdown"].includes(
                            field.type
                          ) && (
                            <div className="space-y-1">
                              <Label className="text-xs">
                                Options (comma-separated)
                              </Label>
                              <Input
                                placeholder="Option 1, Option 2, Option 3"
                                value={field.options?.join(", ") || ""}
                                onChange={(e) =>
                                  updateField(field.id, {
                                    options: e.target.value
                                      .split(",")
                                      .map((o) => o.trim())
                                      .filter(Boolean),
                                  })
                                }
                              />
                            </div>
                          )}

                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              id={`required-${field.id}`}
                              checked={field.required}
                              onChange={(e) =>
                                updateField(field.id, { required: e.target.checked })
                              }
                              className="rounded"
                            />
                            <Label
                              htmlFor={`required-${field.id}`}
                              className="text-sm text-muted-foreground"
                            >
                              Required field
                            </Label>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeField(field.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={handleCloseFormDialog}>
                Cancel
              </Button>
              <Button onClick={handleSaveForm} disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Saving...
                  </>
                ) : editingForm ? (
                  "Update Form"
                ) : (
                  "Create Form"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Quiz Builder Dialog */}
        {showQuizDialog && (
          <QuizBuilder
            quiz={editingQuiz}
            onClose={handleCloseQuizDialog}
            onSuccess={() => {
              handleCloseQuizDialog();
              fetchData();
            }}
          />
        )}
      </div>
    </DashboardLayout>
  );
}
