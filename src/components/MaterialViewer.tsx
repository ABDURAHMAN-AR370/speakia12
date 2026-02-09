import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, Check } from "lucide-react";

interface Material {
  id: string;
  work_type: string;
  details: string | null;
  material_type: string;
  material_url: string | null;
  form_id: string | null;
  quiz_id?: string | null;
}

interface MaterialViewerProps {
  material: Material;
  isCompleted: boolean;
  onClose: () => void;
  onComplete: () => void;
}

export default function MaterialViewer({ material, isCompleted, onClose, onComplete }: MaterialViewerProps) {
  // For form/quiz types without a media URL, show a prompt
  const isFormOrQuiz = material.material_type === "form" || material.material_type === "quiz";

  const renderContent = () => {
    if (isFormOrQuiz && !material.material_url) {
      return (
        <div className="py-8 text-center">
          <p className="text-muted-foreground">
            {material.material_type === "quiz" ? "Click below to take the quiz." : "Click below to fill the form."}
          </p>
        </div>
      );
    }

    switch (material.material_type) {
      case "image":
        return material.material_url ? (
          <img src={material.material_url} alt={material.work_type} className="w-full max-h-[400px] object-contain rounded-lg" />
        ) : (
          <p className="text-muted-foreground text-center py-8">No image available</p>
        );
      case "video":
        return material.material_url ? (
          <video src={material.material_url} controls className="w-full max-h-[400px] rounded-lg" />
        ) : (
          <p className="text-muted-foreground text-center py-8">No video available</p>
        );
      case "audio":
        return material.material_url ? (
          <div className="py-8"><audio src={material.material_url} controls className="w-full" /></div>
        ) : (
          <p className="text-muted-foreground text-center py-8">No audio available</p>
        );
      case "link":
        return material.material_url ? (
          <div className="py-8 text-center">
            <a href={material.material_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-primary hover:underline">
              <ExternalLink className="h-4 w-4" />Open Link
            </a>
          </div>
        ) : (
          <p className="text-muted-foreground text-center py-8">No link available</p>
        );
      default:
        return <p className="text-muted-foreground text-center py-8">Content not available</p>;
    }
  };

  const getButtonLabel = () => {
    if (material.quiz_id || material.material_type === "quiz") return "Start Quiz";
    if (material.form_id || material.material_type === "form") return "Continue to Form";
    return <><Check className="h-4 w-4 mr-2" />Mark as Complete</>;
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {material.work_type}
            <Badge variant="secondary">{material.material_type}</Badge>
          </DialogTitle>
        </DialogHeader>
        <div className="py-4">
          {renderContent()}
          {material.details && <p className="mt-4 text-sm text-muted-foreground">{material.details}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Close</Button>
          {!isCompleted && (
            <Button onClick={onComplete}>{getButtonLabel()}</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
