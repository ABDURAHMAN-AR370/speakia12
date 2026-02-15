import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Plus, Trash2, Edit, Image, Video, GripVertical, Loader2 } from "lucide-react";

interface HeroSlide {
  id: string;
  media_type: "image" | "video";
  media_url: string;
  title: string | null;
  subtitle: string | null;
  display_duration: number;
  order_index: number;
  is_active: boolean;
}

export default function HeroManager() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [slides, setSlides] = useState<HeroSlide[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingSlide, setEditingSlide] = useState<HeroSlide | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    media_type: "image" as "image" | "video",
    media_url: "",
    title: "",
    subtitle: "",
    display_duration: 5,
    is_active: true,
  });

  useEffect(() => { fetchSlides(); }, []);

  const fetchSlides = async () => {
    try {
      const { data, error } = await supabase.from("hero_slides").select("*").order("order_index");
      if (error) throw error;
      setSlides((data || []) as HeroSlide[]);
    } catch (error) {
      console.error("Error fetching slides:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (slide?: HeroSlide) => {
    if (slide) {
      setEditingSlide(slide);
      setFormData({ media_type: slide.media_type, media_url: slide.media_url, title: slide.title || "", subtitle: slide.subtitle || "", display_duration: slide.display_duration, is_active: slide.is_active });
    } else {
      setEditingSlide(null);
      setFormData({ media_type: "image", media_url: "", title: "", subtitle: "", display_duration: 5, is_active: true });
    }
    setShowDialog(true);
  };

  const handleCloseDialog = () => { setShowDialog(false); setEditingSlide(null); };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from("hero-media").upload(`slides/${fileName}`, file);
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from("hero-media").getPublicUrl(`slides/${fileName}`);
      setFormData((prev) => ({ ...prev, media_url: urlData.publicUrl }));
      toast({ title: "File uploaded successfully" });
    } catch {
      toast({ title: "Upload failed", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!formData.media_url.trim()) { toast({ title: "Please upload or provide media URL", variant: "destructive" }); return; }
    setSaving(true);
    try {
      const slideData = { media_type: formData.media_type, media_url: formData.media_url, title: formData.title || null, subtitle: formData.subtitle || null, display_duration: formData.display_duration, is_active: formData.is_active, created_by: user?.id, order_index: editingSlide?.order_index ?? slides.length };
      if (editingSlide) {
        const { error } = await supabase.from("hero_slides").update(slideData).eq("id", editingSlide.id);
        if (error) throw error;
        toast({ title: "Slide updated" });
      } else {
        const { error } = await supabase.from("hero_slides").insert(slideData);
        if (error) throw error;
        toast({ title: "Slide added" });
      }
      handleCloseDialog();
      fetchSlides();
    } catch {
      toast({ title: "Failed to save slide", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from("hero_slides").delete().eq("id", id);
      if (error) throw error;
      toast({ title: "Slide deleted" });
      fetchSlides();
    } catch {
      toast({ title: "Failed to delete slide", variant: "destructive" });
    }
  };

  const handleToggleActive = async (id: string, isActive: boolean) => {
    try {
      const { error } = await supabase.from("hero_slides").update({ is_active: isActive }).eq("id", id);
      if (error) throw error;
      fetchSlides();
    } catch {
      toast({ title: "Failed to update slide", variant: "destructive" });
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Image className="h-5 w-5" />Hero Slides
        </CardTitle>
        <Button onClick={() => handleOpenDialog()}>
          <Plus className="h-4 w-4 mr-2" />Add Slide
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-8">Loading...</div>
        ) : slides.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground"><p>No hero slides yet. Add your first slide!</p></div>
        ) : (
          <div className="space-y-4">
            {slides.map((slide) => (
              <div key={slide.id} className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4 border rounded-lg bg-muted/30">
                <GripVertical className="h-5 w-5 text-muted-foreground cursor-move hidden sm:block" />
                <div className="w-16 h-12 sm:w-24 sm:h-16 rounded overflow-hidden flex-shrink-0 bg-muted">
                  {slide.media_type === "video" ? (
                    <video src={slide.media_url} className="w-full h-full object-cover" muted />
                  ) : (
                    <img src={slide.media_url} alt={slide.title || "Slide"} className="w-full h-full object-cover" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    {slide.media_type === "video" ? <Video className="h-4 w-4 text-muted-foreground shrink-0" /> : <Image className="h-4 w-4 text-muted-foreground shrink-0" />}
                    <span className="font-medium truncate">{slide.title || "Untitled"}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {slide.media_type === "video" ? "Until video ends" : `${slide.display_duration}s`}
                  </p>
                </div>
                <div className="flex items-center gap-1 sm:gap-2 shrink-0">
                  <Switch checked={slide.is_active} onCheckedChange={(checked) => handleToggleActive(slide.id, checked)} />
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleOpenDialog(slide)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDelete(slide.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <Dialog open={showDialog} onOpenChange={handleCloseDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingSlide ? "Edit Slide" : "Add Hero Slide"}</DialogTitle>
            <DialogDescription>Add images or videos to your homepage hero carousel</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Media Type</Label>
              <Select value={formData.media_type} onValueChange={(v: "image" | "video") => setFormData((prev) => ({ ...prev, media_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="image">Image</SelectItem>
                  <SelectItem value="video">Video</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Upload {formData.media_type === "video" ? "Video" : "Image"}</Label>
              <Input type="file" accept={formData.media_type === "video" ? "video/*" : "image/*"} onChange={handleFileUpload} disabled={uploading} />
              {uploading && <p className="text-sm text-muted-foreground">Uploading...</p>}
            </div>
            <div className="space-y-2">
              <Label>Or Enter URL</Label>
              <Input placeholder="https://..." value={formData.media_url} onChange={(e) => setFormData((prev) => ({ ...prev, media_url: e.target.value }))} />
            </div>
            {formData.media_url && (
              <div className="rounded overflow-hidden bg-muted h-32">
                {formData.media_type === "video" ? (
                  <video src={formData.media_url} className="w-full h-full object-cover" muted controls />
                ) : (
                  <img src={formData.media_url} alt="Preview" className="w-full h-full object-cover" />
                )}
              </div>
            )}
            <div className="space-y-2">
              <Label>Title (Optional)</Label>
              <Input placeholder="Welcome to SPEAKAI" value={formData.title} onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Subtitle (Optional)</Label>
              <Input placeholder="Master English with AI" value={formData.subtitle} onChange={(e) => setFormData((prev) => ({ ...prev, subtitle: e.target.value }))} />
            </div>
            {formData.media_type === "image" && (
              <div className="space-y-2">
                <Label>Display Duration: {formData.display_duration}s</Label>
                <Slider value={[formData.display_duration]} onValueChange={([v]) => setFormData((prev) => ({ ...prev, display_duration: v }))} min={2} max={15} step={1} />
              </div>
            )}
            {formData.media_type === "video" && (
              <p className="text-sm text-muted-foreground">Videos will play until they end, then move to the next slide</p>
            )}
            <div className="flex items-center justify-between">
              <Label>Active</Label>
              <Switch checked={formData.is_active} onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, is_active: checked }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving || uploading}>
              {saving ? (<><Loader2 className="h-4 w-4 animate-spin mr-2" />Saving...</>) : editingSlide ? "Update Slide" : "Add Slide"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
