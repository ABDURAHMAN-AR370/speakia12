import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, FileText, Image, Video, Link as LinkIcon, Headphones, Edit, Trash2, HelpCircle, ClipboardList } from "lucide-react";
import { cn } from "@/lib/utils";
import AddMaterialDialog from "@/components/admin/AddMaterialDialog";
import { useToast } from "@/hooks/use-toast";

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
}

interface DayData {
  dayNumber: number;
  materials: Material[];
}

export default function AdminDays() {
  const { toast } = useToast();
  const [days, setDays] = useState<DayData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null);

  useEffect(() => {
    fetchMaterials();
  }, []);

  const fetchMaterials = async () => {
    try {
      const { data, error } = await supabase
        .from("course_materials")
        .select("*")
        .order("day_number")
        .order("order_index");

      if (error) throw error;

      // Group materials by day
      const dayMap = new Map<number, Material[]>();
      for (let i = 1; i <= 30; i++) {
        dayMap.set(i, []);
      }
      data?.forEach((material) => {
        dayMap.get(material.day_number)?.push(material);
      });

      const daysData: DayData[] = [];
      dayMap.forEach((materials, dayNumber) => {
        daysData.push({ dayNumber, materials });
      });

      setDays(daysData);
    } catch (error) {
      console.error("Error fetching materials:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteMaterial = async (materialId: string) => {
    try {
      const { error } = await supabase
        .from("course_materials")
        .delete()
        .eq("id", materialId);

      if (error) throw error;

      toast({ title: "Material deleted" });
      fetchMaterials();
    } catch (error) {
      toast({
        title: "Failed to delete material",
        variant: "destructive",
      });
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
      case "form":
        return ClipboardList;
      case "quiz":
        return HelpCircle;
      default:
        return FileText;
    }
  };

  const selectedDayData = days.find((d) => d.dayNumber === selectedDay);

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Days & Materials</h1>
            <p className="text-muted-foreground mt-1">
              Manage course content for each day
            </p>
          </div>
          <Button onClick={() => {
            setEditingMaterial(null);
            setShowAddDialog(true);
          }}>
            <Plus className="h-4 w-4 mr-2" />
            Add Material
          </Button>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Days Grid */}
          <Card>
            <CardHeader>
              <CardTitle>Course Days</CardTitle>
              <CardDescription>Click a day to view its materials</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-5 gap-2">
                {days.map((day) => (
                  <Button
                    key={day.dayNumber}
                    variant={selectedDay === day.dayNumber ? "default" : "outline"}
                    className={cn(
                      "h-16 flex flex-col gap-1",
                      day.materials.length > 0 && selectedDay !== day.dayNumber && "border-primary/50"
                    )}
                    onClick={() => setSelectedDay(day.dayNumber)}
                  >
                    <span className="text-sm font-medium">Day {day.dayNumber}</span>
                    <Badge variant="secondary" className="text-xs">
                      {day.materials.length}
                    </Badge>
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Materials List */}
          <Card>
            <CardHeader>
              <CardTitle>
                {selectedDay ? `Day ${selectedDay} Materials` : "Select a Day"}
              </CardTitle>
              <CardDescription>
                {selectedDay
                  ? `${selectedDayData?.materials.length || 0} materials`
                  : "Click a day to view its materials"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!selectedDay ? (
                <div className="text-center py-8 text-muted-foreground">
                  Select a day from the grid to view its materials
                </div>
              ) : selectedDayData?.materials.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground mb-4">No materials for this day</p>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setEditingMaterial(null);
                      setShowAddDialog(true);
                    }}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Material
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {selectedDayData?.materials.map((material, index) => {
                    const Icon = getMaterialIcon(material.material_type);
                    return (
                      <div
                        key={material.id}
                        className="flex items-center gap-3 p-3 rounded-lg border bg-card"
                      >
                        <div className="flex items-center justify-center w-8 h-8 rounded bg-primary/10 text-primary text-sm font-medium">
                          {index + 1}
                        </div>
                        <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                          <Icon className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{material.work_type}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="secondary" className="text-xs">
                              {material.material_type}
                            </Badge>
                            {material.quiz_id && (
                              <Badge variant="outline" className="text-xs">
                                Quiz
                              </Badge>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setEditingMaterial(material);
                              setShowAddDialog(true);
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteMaterial(material.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Add/Edit Material Dialog */}
        {showAddDialog && (
          <AddMaterialDialog
            defaultDay={selectedDay || undefined}
            editingMaterial={editingMaterial}
            onClose={() => {
              setShowAddDialog(false);
              setEditingMaterial(null);
            }}
            onSuccess={() => {
              setShowAddDialog(false);
              setEditingMaterial(null);
              fetchMaterials();
            }}
          />
        )}
      </div>
    </DashboardLayout>
  );
}
