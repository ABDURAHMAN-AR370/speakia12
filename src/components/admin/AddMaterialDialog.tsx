import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Loader2 } from "lucide-react";

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

interface Form {
  id: string;
  name: string;
}

interface AddMaterialDialogProps {
  defaultDay?: number;
  editingMaterial: Material | null;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AddMaterialDialog({
  defaultDay,
  editingMaterial,
  onClose,
  onSuccess,
}: AddMaterialDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [forms, setForms] = useState<Form[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    day_number: editingMaterial?.day_number?.toString() || defaultDay?.toString() || "1",
    work_type: editingMaterial?.work_type || "",
    details: editingMaterial?.details || "",
    material_type: editingMaterial?.material_type || "link",
    material_url: editingMaterial?.material_url || "",
    form_id: editingMaterial?.form_id || "none",
    order_index: editingMaterial?.order_index?.toString() || "0",
  });

  useEffect(() => {
    fetchForms();
  }, []);

  const fetchForms = async () => {
    const { data } = await supabase
      .from("custom_forms")
      .select("id, name")
      .order("name");
    setForms(data || []);
  };

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `materials/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("course-materials")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("course-materials")
        .getPublicUrl(filePath);

      handleChange("material_url", urlData.publicUrl);
      toast({ title: "File uploaded successfully" });
    } catch (error) {
      console.error("Upload error:", error);
      toast({
        title: "Upload failed",
        description: "Please try again",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.work_type.trim()) {
      toast({
        title: "Work type is required",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const materialData = {
        day_number: parseInt(formData.day_number),
        work_type: formData.work_type,
        details: formData.details || null,
        material_type: formData.material_type,
        material_url: formData.material_url || null,
        form_id: formData.form_id === "none" ? null : formData.form_id,
        order_index: parseInt(formData.order_index),
        created_by: user?.id,
      };

      if (editingMaterial) {
        const { error } = await supabase
          .from("course_materials")
          .update(materialData)
          .eq("id", editingMaterial.id);
        if (error) throw error;
        toast({ title: "Material updated" });
      } else {
        const { error } = await supabase
          .from("course_materials")
          .insert(materialData);
        if (error) throw error;
        toast({ title: "Material added" });
      }

      onSuccess();
    } catch (error) {
      console.error("Save error:", error);
      toast({
        title: "Failed to save material",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {editingMaterial ? "Edit Material" : "Add Material"}
          </DialogTitle>
          <DialogDescription>
            {editingMaterial
              ? "Update the material details"
              : "Add new learning material to a course day"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Day</Label>
              <Select
                value={formData.day_number}
                onValueChange={(v) => handleChange("day_number", v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 30 }, (_, i) => (
                    <SelectItem key={i + 1} value={(i + 1).toString()}>
                      Day {i + 1}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Order</Label>
              <Input
                type="number"
                min="0"
                value={formData.order_index}
                onChange={(e) => handleChange("order_index", e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Work Type / Title</Label>
            <Input
              placeholder="e.g., Vocabulary Practice"
              value={formData.work_type}
              onChange={(e) => handleChange("work_type", e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Details / Description</Label>
            <Textarea
              placeholder="Describe the material..."
              value={formData.details}
              onChange={(e) => handleChange("details", e.target.value)}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label>Material Type</Label>
            <Select
              value={formData.material_type}
              onValueChange={(v) => handleChange("material_type", v)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="image">Image</SelectItem>
                <SelectItem value="video">Video</SelectItem>
                <SelectItem value="audio">Audio</SelectItem>
                <SelectItem value="link">Link</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>
              {formData.material_type === "link" ? "URL" : "Upload or URL"}
            </Label>
            {formData.material_type !== "link" && (
              <div className="mb-2">
                <Input
                  type="file"
                  accept={
                    formData.material_type === "image"
                      ? "image/*"
                      : formData.material_type === "video"
                      ? "video/*"
                      : formData.material_type === "audio"
                      ? "audio/*"
                      : "*"
                  }
                  onChange={handleFileUpload}
                  disabled={uploading}
                />
                {uploading && (
                  <p className="text-sm text-muted-foreground mt-1">
                    Uploading...
                  </p>
                )}
              </div>
            )}
            <Input
              placeholder="https://..."
              value={formData.material_url}
              onChange={(e) => handleChange("material_url", e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Completion Form (Optional)</Label>
            <Select
              value={formData.form_id}
              onValueChange={(v) => handleChange("form_id", v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="No form required" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No form required</SelectItem>
                {forms.map((form) => (
                  <SelectItem key={form.id} value={form.id}>
                    {form.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading || uploading}>
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Saving...
              </>
            ) : editingMaterial ? (
              "Update Material"
            ) : (
              "Add Material"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
