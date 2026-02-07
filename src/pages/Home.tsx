import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import HeroCarousel from "@/components/HeroCarousel";
import { BookOpen, Users, Award, CheckCircle } from "lucide-react";

export default function Home() {
  const features = [
    {
      icon: BookOpen,
      title: "Structured Learning",
      description: "30-day comprehensive course with daily materials, videos, and exercises",
    },
    {
      icon: Users,
      title: "Expert Guidance",
      description: "Learn from experienced instructors with proven teaching methods",
    },
    {
      icon: Award,
      title: "Track Progress",
      description: "Monitor your learning journey with quizzes and progress tracking",
    },
    {
      icon: CheckCircle,
      title: "Practical Skills",
      description: "Focus on real-world English speaking and communication skills",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-primary" />
            <span className="text-xl font-bold">SPEAKAI</span>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/login">
              <Button variant="ghost">Sign In</Button>
            </Link>
            <Link to="/signup">
              <Button>Get Started</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-16">
        <HeroCarousel />
      </section>

      {/* Features Section */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Why Choose SPEAKAI?</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Our AI-powered English course is designed to help you master fluent
              speaking skills through structured daily lessons and interactive content.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <Card key={index} className="border-none shadow-lg">
                <CardContent className="pt-6 text-center">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-4">
                    <feature.icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="font-semibold mb-2">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground">
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to Start Learning?</h2>
          <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
            Join thousands of learners who have improved their English speaking
            skills with our comprehensive course.
          </p>
          <div className="flex gap-4 justify-center">
            <Link to="/signup">
              <Button size="lg">
                Start Your Journey
              </Button>
            </Link>
            <Link to="/login">
              <Button size="lg" variant="outline">
                Sign In
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="container mx-auto px-4 text-center text-muted-foreground">
          <div className="flex items-center justify-center gap-2 mb-4">
            <BookOpen className="h-5 w-5" />
            <span className="font-semibold">SPEAKAI</span>
          </div>
          <p className="text-sm">
            © {new Date().getFullYear()} SPEAKAI. AI-Powered English Speaking Course.
          </p>
        </div>
      </footer>
    </div>
  );
}
