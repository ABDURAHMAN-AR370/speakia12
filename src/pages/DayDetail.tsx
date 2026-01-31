import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { ArrowLeft, Check, Lock, FileText, Image, Video, Link as LinkIcon, Headphones } from "lucide-react";
import { cn } from "@/lib/utils";
import MaterialViewer from "@/components/MaterialViewer";
import FormSubmissionDialog from "@/components/FormSubmissionDialog";
import type { Json } from "@/integrations/supabase/types";

interface Material {
  id: string;
  day_number: number;
  work_type: string;
  details: string | null;
  material_type: string;
  material_url: string | null;
  form_id: string | null;
  order_index: number;
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

export default function DayDetail() {
  const { dayNumber } = useParams<{ dayNumber: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [materials, setMaterials] = useState<Material[]>([]);
  const [completedMaterials, setCompletedMaterials] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [selectedMaterial, setSelectedMaterial] = useState<Material | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [currentForm, setCurrentForm] = useState<CustomForm | null>(null);

  const day = parseInt(dayNumber || "1");

  useEffect(() => {
    if (user) {
      fetchDayData();
    }
  }, [user, day]);

  const fetchDayData = async () => {
    try {
      // Fetch materials for this day
      const { data: materialsData, error: materialsError } = await supabase
        .from("course_materials")
        .select("*")
        .eq("day_number", day)
        .order("order_index");

      if (materialsError) throw materialsError;

      // Fetch user's progress for this day's materials
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
    // Previous material must be completed
    const previousMaterial = materials[index - 1];
    return completedMaterials.has(previousMaterial.id);
  };

  const handleMaterialClick = async (material: Material, index: number) => {
    if (!isMaterialUnlocked(index)) return;

    setSelectedMaterial(material);

    // If material has a form, fetch it
    if (material.form_id) {
      const { data: formData } = await supabase
        .from("custom_forms")
        .select("*")
        .eq("id", material.form_id)
        .single();

      if (formData) {
        // Parse fields if it's a string
        const fields = typeof formData.fields === 'string' 
          ? JSON.parse(formData.fields) 
          : formData.fields;
        setCurrentForm({ ...formData, fields } as CustomForm);
      }
    }
  };

  const handleFormSubmit = async (responses: Record<string, unknown>) => {
    if (!selectedMaterial || !user) return;

    try {
      // Save form submission
      if (selectedMaterial.form_id) {
        await supabase.from("form_submissions").insert([{
          user_id: user.id,
          material_id: selectedMaterial.id,
          form_id: selectedMaterial.form_id,
          responses: responses as Json,
        }]);
      }

      // Mark material as completed
      await supabase.from("user_progress").insert({
        user_id: user.id,
        material_id: selectedMaterial.id,
      });

      // Update local state
      setCompletedMaterials((prev) => new Set([...prev, selectedMaterial.id]));
      setShowForm(false);
      setSelectedMaterial(null);
      setCurrentForm(null);
    } catch (error) {
      console.error("Error submitting:", error);
    }
  };

  const getMaterialIcon = (type: string) => {
    switch (type) {
      case "image":
        return Image;
      case "video":
        return Video;
      case "link":
        return LinkIcon;
      case "audio":
        return Headphones;
      default:
        return FileText;
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
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
              <p className="text-muted-foreground">
                No materials available for this day yet.
              </p>
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
                    isUnlocked
                      ? "cursor-pointer hover:shadow-md"
                      : "opacity-60 cursor-not-allowed",
                    isCompleted && "bg-success/5 border-success/30"
                  )}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className={cn(
                            "h-10 w-10 rounded-lg flex items-center justify-center",
                            isCompleted ? "bg-success/20" : "bg-primary/10"
                          )}
                        >
                          <Icon
                            className={cn(
                              "h-5 w-5",
                              isCompleted ? "text-success" : "text-primary"
                            )}
                          />
                        </div>
                        <div>
                          <CardTitle className="text-lg">{material.work_type}</CardTitle>
                          <CardDescription className="flex items-center gap-2 mt-1">
                            <Badge variant="secondary" className="text-xs">
                              {material.material_type}
                            </Badge>
                            {material.form_id && (
                              <Badge variant="outline" className="text-xs">
                                <FileText className="h-3 w-3 mr-1" />
                                Form required
                              </Badge>
                            )}
                          </CardDescription>
                        </div>
                      </div>
                      <div>
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
                    <CardContent>
                      <p className="text-sm text-muted-foreground">{material.details}</p>
                    </CardContent>
                  )}
                </Card>
              );
            })}
          </div>
        )}

        {/* Material Viewer Dialog */}
        {selectedMaterial && !showForm && (
          <MaterialViewer
            material={selectedMaterial}
            isCompleted={completedMaterials.has(selectedMaterial.id)}
            onClose={() => {
              setSelectedMaterial(null);
              setCurrentForm(null);
            }}
            onComplete={() => {
              if (selectedMaterial.form_id && currentForm) {
                setShowForm(true);
              } else {
                handleFormSubmit({});
              }
            }}
          />
        )}

        {/* Form Submission Dialog */}
        {showForm && currentForm && selectedMaterial && (
          <FormSubmissionDialog
            form={currentForm}
            materialTitle={selectedMaterial.work_type}
            onClose={() => {
              setShowForm(false);
              setSelectedMaterial(null);
              setCurrentForm(null);
            }}
            onSubmit={handleFormSubmit}
          />
        )}
      </div>
    </DashboardLayout>
  );
}
