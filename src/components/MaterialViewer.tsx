import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, Check, Maximize2, X } from "lucide-react";

interface Material {
  id: string;
  work_type: string;
  details: string | null;
  material_type: string;
  material_url: string | null;
  form_id: string | null;
  quiz_id?: string | null;
  min_completion_time?: number;
}

interface MaterialViewerProps {
  material: Material;
  isCompleted: boolean;
  onClose: () => void;
  onComplete: () => void;
}

export default function MaterialViewer({ material, isCompleted, onClose, onComplete }: MaterialViewerProps) {
  const isFormOrQuiz = material.material_type === "form" || material.material_type === "quiz" || !!material.form_id || !!material.quiz_id;
  const minTime = material.min_completion_time || 0;
  const [timeLeft, setTimeLeft] = useState(minTime);
  const [canComplete, setCanComplete] = useState(minTime === 0);
  const [isFullscreen, setIsFullscreen] = useState(
    (material.material_type === "video" || material.material_type === "image") && !!material.material_url
  );

  useEffect(() => {
    if (minTime <= 0 || isCompleted) { setCanComplete(true); return; }
    setTimeLeft(minTime);
    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) { setCanComplete(true); clearInterval(interval); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [minTime, isCompleted]);

  const renderContent = () => {
    if (isFormOrQuiz && !material.material_url) {
      return (
        <div className="py-8 text-center">
          <p className="text-muted-foreground">
            {material.quiz_id || material.material_type === "quiz" ? "Click below to take the quiz." : "Click below to fill the form."}
          </p>
        </div>
      );
    }

    switch (material.material_type) {
      case "image":
        return material.material_url ? (
          <img src={material.material_url} alt={material.work_type} className="w-full object-contain rounded-xl" style={{ maxHeight: isFullscreen ? "80vh" : "400px" }} />
        ) : (
          <p className="text-muted-foreground text-center py-8">No image available</p>
        );
      case "video":
        return material.material_url ? (
          <video src={material.material_url} controls className="w-full rounded-xl" style={{ maxHeight: isFullscreen ? "80vh" : "400px" }} autoPlay={isFullscreen} />
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
      case "form":
      case "quiz":
        return (
          <div className="py-8 text-center">
            <p className="text-muted-foreground">
              {material.material_type === "quiz" ? "Click below to take the quiz." : "Click below to fill the form."}
            </p>
          </div>
        );
      default:
        return <p className="text-muted-foreground text-center py-8">Content not available</p>;
    }
  };

  const getButtonLabel = () => {
    if (!canComplete && !isCompleted) return `Wait ${timeLeft}s`;
    if (material.quiz_id || material.material_type === "quiz") return "Start Quiz";
    if (material.form_id || material.material_type === "form") return "Continue to Form";
    return <><Check className="h-4 w-4 mr-2" />Mark as Complete</>;
  };

  // Fullscreen view for video/image
  if (isFullscreen && (material.material_type === "video" || material.material_type === "image")) {
    return (
      <div className="fixed inset-0 z-50 bg-background flex flex-col">
        <div className="flex items-center justify-between p-4 border-b bg-card">
          <h2 className="font-semibold truncate flex-1">{material.work_type}</h2>
          <div className="flex gap-2">
            <Button variant="ghost" size="icon" onClick={() => setIsFullscreen(false)}>
              <Maximize2 className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center px-4">
          {material.material_type === "video" ? (
            <video src={material.material_url!} controls autoPlay className="max-w-full max-h-full rounded-lg" />
          ) : (
            <img src={material.material_url!} alt={material.work_type} className="max-w-full max-h-full object-contain rounded-lg" />
          )}
        </div>
        <div className="p-4 flex justify-end gap-2">
          {material.details && <p className="text-sm text-muted-foreground flex-1">{material.details}</p>}
          {!isCompleted && (
            <Button onClick={onComplete} disabled={!canComplete} variant="default">
              {getButtonLabel()}
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto rounded-2xl mx-2">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 flex-wrap">
            {material.work_type}
            <Badge variant="secondary">{material.material_type}</Badge>
            {(material.material_type === "video" || material.material_type === "image") && material.material_url && (
              <Button variant="ghost" size="sm" className="ml-auto gap-1" onClick={() => setIsFullscreen(true)}>
                <Maximize2 className="h-4 w-4" />Fullscreen
              </Button>
            )}
          </DialogTitle>
        </DialogHeader>
        <div className="py-4">
          {renderContent()}
          {material.details && <p className="mt-4 text-sm text-muted-foreground">{material.details}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Close</Button>
          {!isCompleted && (
            <Button onClick={onComplete} disabled={!canComplete}>
              {getButtonLabel()}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
