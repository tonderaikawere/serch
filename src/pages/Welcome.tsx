import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { 
  GraduationCap, 
  Users, 
  Search, 
  Bot, 
  ArrowRight,
  Sparkles,
  TrendingUp,
  Target
} from "lucide-react";
import { cn } from "@/lib/utils";

type Role = "student" | "instructor" | null;

export default function Welcome() {
  const [selectedRole, setSelectedRole] = useState<Role>(null);
  const navigate = useNavigate();

  const handleStart = () => {
    if (selectedRole === "student") {
      navigate("/students/scenarios");
    } else if (selectedRole === "instructor") {
      navigate("/instructors");
    }
  };

  return (
    <div className="min-h-screen gradient-hero relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-20 left-10 w-72 h-72 bg-primary/10 rounded-full blur-3xl animate-pulse-slow" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-accent/10 rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: "2s" }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-3xl" />
      </div>

      {/* Content */}
      <div className="relative z-10 container mx-auto px-4 py-12 min-h-screen flex flex-col">
        {/* Header */}
        <header className="text-center mb-12 animate-slide-up">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/20 text-primary-foreground mb-6">
            <Sparkles className="w-4 h-4" />
            <span className="text-sm font-medium">Interactive Learning Platform</span>
          </div>
          <h1 className="text-5xl md:text-6xl font-display font-bold text-primary-foreground mb-4">
            SEO & AEO
            <span className="block text-gradient-seo">Training Simulator</span>
          </h1>
          <p className="text-lg text-primary-foreground/70 max-w-2xl mx-auto">
            Master search engine and answer engine optimization through hands-on practice
            in a controlled learning environment.
          </p>
        </header>

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-6 mb-12 animate-slide-up" style={{ animationDelay: "0.2s" }}>
          {[
            { icon: Search, title: "SEO Mastery", desc: "Learn ranking factors, keywords, and technical optimization" },
            { icon: Bot, title: "AEO Training", desc: "Understand how AI engines extract and surface answers" },
            { icon: TrendingUp, title: "Real-time Feedback", desc: "See cause and effect of your optimization decisions" },
          ].map((feature, i) => (
            <div key={i} className="flex items-start gap-4 p-4 rounded-xl bg-foreground/5 backdrop-blur-sm">
              <div className="p-2 rounded-lg gradient-seo">
                <feature.icon className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <h3 className="font-display font-semibold text-primary-foreground">{feature.title}</h3>
                <p className="text-sm text-primary-foreground/60">{feature.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Role Selection */}
        <div className="flex-1 flex flex-col items-center justify-center animate-slide-up" style={{ animationDelay: "0.4s" }}>
          <h2 className="text-2xl font-display font-bold text-primary-foreground mb-8">
            Select Your Role
          </h2>
          
          <div className="grid md:grid-cols-2 gap-6 w-full max-w-2xl mb-8">
            <RoleCard
              icon={GraduationCap}
              title="Student"
              description="Build and optimize simulated websites. Learn SEO & AEO through interactive practice."
              selected={selectedRole === "student"}
              onClick={() => setSelectedRole("student")}
            />
            <RoleCard
              icon={Users}
              title="Instructor"
              description="Assign scenarios, track progress, and review student decisions and outcomes."
              selected={selectedRole === "instructor"}
              onClick={() => setSelectedRole("instructor")}
            />
          </div>

          <Button
            size="lg"
            onClick={handleStart}
            disabled={!selectedRole}
            className={cn(
              "px-8 py-6 text-lg font-display font-semibold rounded-xl transition-all duration-300",
              selectedRole 
                ? "gradient-accent text-accent-foreground shadow-glow-accent hover:scale-105" 
                : "bg-muted text-muted-foreground cursor-not-allowed"
            )}
          >
            Start Simulation
            <ArrowRight className="ml-2 w-5 h-5" />
          </Button>
        </div>

        {/* Footer */}
        <footer className="text-center text-primary-foreground/40 text-sm mt-8">
          Built for classrooms, bootcamps, and self-learning
        </footer>
      </div>
    </div>
  );
}

interface RoleCardProps {
  icon: React.ElementType;
  title: string;
  description: string;
  selected: boolean;
  onClick: () => void;
}

function RoleCard({ icon: Icon, title, description, selected, onClick }: RoleCardProps) {
  return (
    <Card
      onClick={onClick}
      className={cn(
        "p-6 cursor-pointer transition-all duration-300 border-2",
        "bg-card/10 backdrop-blur-md hover:bg-card/20",
        selected 
          ? "border-primary shadow-glow-primary scale-105" 
          : "border-transparent hover:border-primary/30"
      )}
    >
      <div className={cn(
        "w-14 h-14 rounded-xl flex items-center justify-center mb-4 transition-all duration-300",
        selected ? "gradient-seo" : "bg-primary/20"
      )}>
        <Icon className={cn(
          "w-7 h-7 transition-colors",
          selected ? "text-primary-foreground" : "text-primary-foreground/70"
        )} />
      </div>
      <h3 className="font-display font-bold text-xl text-primary-foreground mb-2">{title}</h3>
      <p className="text-sm text-primary-foreground/60">{description}</p>
    </Card>
  );
}
