import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface HeroSlide {
  id: string;
  media_type: "image" | "video";
  media_url: string;
  title: string | null;
  subtitle: string | null;
  display_duration: number;
  order_index: number;
}

export default function HeroCarousel() {
  const [slides, setSlides] = useState<HeroSlide[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    fetchSlides();
  }, []);

  const fetchSlides = async () => {
    const { data } = await supabase
      .from("hero_slides")
      .select("*")
      .eq("is_active", true)
      .order("order_index");
    
    if (data && data.length > 0) {
      setSlides(data as HeroSlide[]);
    }
  };

  const goToNext = useCallback(() => {
    if (slides.length <= 1) return;
    setCurrentIndex((prev) => (prev + 1) % slides.length);
  }, [slides.length]);

  const goToPrev = useCallback(() => {
    if (slides.length <= 1) return;
    setCurrentIndex((prev) => (prev - 1 + slides.length) % slides.length);
  }, [slides.length]);

  // Handle auto-advance for images
  useEffect(() => {
    if (slides.length === 0) return;
    
    const currentSlide = slides[currentIndex];
    
    if (currentSlide?.media_type === "image") {
      timerRef.current = setTimeout(() => {
        goToNext();
      }, currentSlide.display_duration * 1000);
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [currentIndex, slides, goToNext]);

  // Handle video end
  const handleVideoEnd = () => {
    setIsVideoPlaying(false);
    goToNext();
  };

  // Reset video when slide changes
  useEffect(() => {
    if (slides[currentIndex]?.media_type === "video" && videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.play();
      setIsVideoPlaying(true);
    }
  }, [currentIndex, slides]);

  if (slides.length === 0) {
    return (
      <div className="relative h-[70vh] bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
        <div className="text-center space-y-4 px-4">
          <h1 className="text-4xl md:text-6xl font-bold text-foreground">
            Welcome to Qurba
          </h1>
        </div>
      </div>
    );
  }

  const currentSlide = slides[currentIndex];

  return (
    <div className="relative h-[70vh] overflow-hidden">
      {/* Media Display */}
      <div className="absolute inset-0">
        {currentSlide.media_type === "video" ? (
          <video
            ref={videoRef}
            src={currentSlide.media_url}
            className="w-full h-full object-cover"
            muted
            playsInline
            onEnded={handleVideoEnd}
          />
        ) : (
          <img
            src={currentSlide.media_url}
            alt={currentSlide.title || "Hero slide"}
            className="w-full h-full object-cover transition-opacity duration-500"
          />
        )}
        
        {/* Overlay */}
        <div className="absolute inset-0 bg-black/40" />
      </div>

      {/* Content */}
      <div className="relative h-full flex items-center justify-center text-center px-4">
        <div className="space-y-4 max-w-3xl animate-fade-in">
          {currentSlide.title && (
            <h1 className="text-4xl md:text-6xl font-bold text-white drop-shadow-lg">
              {currentSlide.title}
            </h1>
          )}
          {currentSlide.subtitle && (
            <p className="text-xl md:text-2xl text-white/90 drop-shadow-md">
              {currentSlide.subtitle}
            </p>
          )}
        </div>
      </div>

      {/* Navigation Arrows */}
      {slides.length > 1 && (
        <>
          <Button
            variant="ghost"
            size="icon"
            className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/20 hover:bg-black/40 text-white h-12 w-12 rounded-full"
            onClick={goToPrev}
          >
            <ChevronLeft className="h-6 w-6" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/20 hover:bg-black/40 text-white h-12 w-12 rounded-full"
            onClick={goToNext}
          >
            <ChevronRight className="h-6 w-6" />
          </Button>
        </>
      )}

      {/* Dots Indicator */}
      {slides.length > 1 && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2">
          {slides.map((_, index) => (
            <button
              key={index}
              className={cn(
                "w-3 h-3 rounded-full transition-all",
                index === currentIndex
                  ? "bg-white scale-110"
                  : "bg-white/50 hover:bg-white/70"
              )}
              onClick={() => setCurrentIndex(index)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
