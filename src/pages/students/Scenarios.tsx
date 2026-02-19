import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useSimulation } from "@/contexts/SimulationContext";
import {
  Store,
  FileText,
  ShoppingCart,
  Heart,
  User,
  ArrowRight,
  ArrowLeft,
  Star,
  Clock,
  Target,
} from "lucide-react";
import { cn } from "@/lib/utils";

const scenarios = [
  {
    id: "local-business",
    icon: Store,
    title: "Local Business",
    description: "Optimize a local service business website to rank in local search results and Google Maps.",
    difficulty: "beginner",
    duration: "30 min",
    objectives: ["Local SEO fundamentals", "Google Business Profile", "Local keywords"],
    color: "from-emerald-500 to-teal-500",
  },
  {
    id: "blog",
    icon: FileText,
    title: "Blog / Media Site",
    description: "Build an authority blog that ranks for informational queries and wins AI answer boxes.",
    difficulty: "intermediate",
    duration: "45 min",
    objectives: ["Content SEO", "Featured snippets", "E-E-A-T signals"],
    color: "from-blue-500 to-cyan-500",
  },
  {
    id: "ecommerce",
    icon: ShoppingCart,
    title: "E-commerce Store",
    description: "Optimize product pages for transactional keywords and rich shopping results.",
    difficulty: "advanced",
    duration: "60 min",
    objectives: ["Product schema", "Category optimization", "Conversion SEO"],
    color: "from-orange-500 to-amber-500",
  },
  {
    id: "ngo",
    icon: Heart,
    title: "NGO / Education",
    description: "Create an informative site that builds trust and ranks for mission-critical queries.",
    difficulty: "intermediate",
    duration: "40 min",
    objectives: ["Trust signals", "Accessibility", "Informational intent"],
    color: "from-pink-500 to-rose-500",
  },
  {
    id: "personal-brand",
    icon: User,
    title: "Personal Brand",
    description: "Build a portfolio site that ranks for your name and showcases expertise.",
    difficulty: "beginner",
    duration: "25 min",
    objectives: ["Personal branding", "Knowledge panels", "Author authority"],
    color: "from-violet-500 to-purple-500",
  },
];

const difficultyColors = {
  beginner: "bg-success/10 text-success border-success/20",
  intermediate: "bg-warning/10 text-warning border-warning/20",
  advanced: "bg-destructive/10 text-destructive border-destructive/20",
};

export default function Scenarios() {
  const [selectedScenario, setSelectedScenario] = useState<string | null>(null);
  const navigate = useNavigate();
  const { setScenario } = useSimulation();

  const handleStart = () => {
    if (selectedScenario) {
      setScenario(selectedScenario);
      navigate("/students/dashboard");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-6">
          <Button
            variant="ghost"
            onClick={() => navigate("/")}
            className="mb-4 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Welcome
          </Button>
          <h1 className="text-3xl font-display font-bold text-foreground">
            Choose Your Scenario
          </h1>
          <p className="text-muted-foreground mt-2">
            Select a website type to begin your SEO & AEO training simulation.
          </p>
        </div>
      </header>

      {/* Scenarios Grid */}
      <main className="container mx-auto px-4 py-8">
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {scenarios.map((scenario) => (
            <ScenarioCard
              key={scenario.id}
              scenario={scenario}
              selected={selectedScenario === scenario.id}
              onClick={() => setSelectedScenario(scenario.id)}
            />
          ))}
        </div>

        {/* Selected Scenario Details */}
        {selectedScenario && (
          <div className="animate-slide-up">
            <Card className="p-6 bg-card border-primary/20">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-display font-bold text-xl text-foreground mb-2">
                    Ready to start?
                  </h3>
                  <p className="text-muted-foreground">
                    You'll learn SEO & AEO concepts through hands-on practice with your{" "}
                    {scenarios.find((s) => s.id === selectedScenario)?.title.toLowerCase()} website.
                  </p>
                </div>
                <Button
                  size="lg"
                  onClick={handleStart}
                  className="gradient-accent text-accent-foreground shadow-glow-accent hover:scale-105 transition-transform"
                >
                  Begin Training
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </div>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}

interface ScenarioCardProps {
  scenario: (typeof scenarios)[0];
  selected: boolean;
  onClick: () => void;
}

function ScenarioCard({ scenario, selected, onClick }: ScenarioCardProps) {
  return (
    <Card
      onClick={onClick}
      className={cn(
        "p-6 cursor-pointer transition-all duration-300 border-2 hover:shadow-lg group",
        selected
          ? "border-primary shadow-glow-primary"
          : "border-transparent hover:border-primary/30"
      )}
    >
      {/* Icon */}
      <div
        className={cn(
          "w-14 h-14 rounded-xl flex items-center justify-center mb-4 bg-gradient-to-br",
          scenario.color
        )}
      >
        <scenario.icon className="w-7 h-7 text-primary-foreground" />
      </div>

      {/* Title & Description */}
      <h3 className="font-display font-bold text-xl text-foreground mb-2">
        {scenario.title}
      </h3>
      <p className="text-sm text-muted-foreground mb-4">{scenario.description}</p>

      {/* Meta */}
      <div className="flex items-center gap-2 mb-4">
        <Badge
          variant="outline"
          className={cn("capitalize", difficultyColors[scenario.difficulty])}
        >
          {scenario.difficulty}
        </Badge>
        <Badge variant="outline" className="bg-muted/50">
          <Clock className="w-3 h-3 mr-1" />
          {scenario.duration}
        </Badge>
      </div>

      {/* Objectives */}
      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Learning Objectives
        </p>
        <div className="flex flex-wrap gap-2">
          {scenario.objectives.map((obj, i) => (
            <span
              key={i}
              className="text-xs px-2 py-1 rounded-md bg-secondary text-secondary-foreground"
            >
              {obj}
            </span>
          ))}
        </div>
      </div>

      {/* Selection Indicator */}
      {selected && (
        <div className="absolute top-4 right-4">
          <div className="w-6 h-6 rounded-full gradient-seo flex items-center justify-center">
            <Star className="w-3 h-3 text-primary-foreground fill-current" />
          </div>
        </div>
      )}
    </Card>
  );
}
