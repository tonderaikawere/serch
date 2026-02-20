import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  FileText,
  Zap,
  ArrowRight,
  Search,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

export default function Dashboard() {
  const { profile } = useAuth();
  const lessonProgress = 0;

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-8">
        {/* Header */}
        <header className="mb-8 animate-slide-up">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-2">
            <h1 className="text-3xl font-display font-bold text-foreground">
              Home
            </h1>
            <Badge className="bg-primary/10 text-primary border-primary/20">Hub: {profile?.hub ?? "—"}</Badge>
          </div>
          <p className="text-muted-foreground">
            Welcome back{profile?.displayName ? `, ${profile.displayName}` : ""}.
          </p>
        </header>

        {/* Score Cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Quick snapshot */}
          <Card className="p-6 gradient-card border-0 shadow-lg animate-slide-up">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Projects</p>
                <p className="text-2xl font-display font-bold text-foreground">0</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center">
                <FileText className="w-6 h-6 text-secondary-foreground" />
              </div>
            </div>
            <div className="text-sm text-muted-foreground">Create your first project to see progress here.</div>
          </Card>

          {/* Learning */}
          <Card className="p-6 gradient-card border-0 shadow-lg animate-slide-up" style={{ animationDelay: "0.1s" }}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Learning Progress</p>
                <p className="text-2xl font-display font-bold text-foreground">{lessonProgress}%</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center">
                <Zap className="w-6 h-6 text-secondary-foreground" />
              </div>
            </div>
            <div className="text-sm text-muted-foreground">Start a module to begin tracking progress.</div>
          </Card>

          {/* Keywords */}
          <Card className="p-6 gradient-card border-0 shadow-lg animate-slide-up" style={{ animationDelay: "0.2s" }}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Tracked Keywords</p>
                <p className="text-2xl font-display font-bold text-foreground">0</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center">
                <Search className="w-6 h-6 text-secondary-foreground" />
              </div>
            </div>
            <div className="text-sm text-muted-foreground">Add keywords to start tracking rankings.</div>
          </Card>

          {/* Activity */}
          <Card className="p-6 gradient-card border-0 shadow-lg animate-slide-up" style={{ animationDelay: "0.3s" }}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Streak</p>
                <p className="text-2xl font-display font-bold text-foreground">0 days</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center">
                <Zap className="w-6 h-6 text-secondary-foreground" />
              </div>
            </div>
            <div className="text-sm text-muted-foreground">Your activity history will appear here.</div>
          </Card>
        </div>

        {/* Learning Progress Bar */}
        <Card className="p-6 mb-8 animate-slide-up" style={{ animationDelay: "0.35s" }}>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-3">
            <div className="flex items-center gap-3 min-w-0">
              <Zap className="w-5 h-5 text-primary" />
              <div>
                <h3 className="font-semibold text-foreground">Learning Progress</h3>
                <p className="text-sm text-muted-foreground">Start learning modules to track completion</p>
              </div>
            </div>
            <Link to="/students/courses">
              <Button variant="outline" size="sm" className="w-full sm:w-auto">
                Continue Learning
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </div>
          <Progress value={lessonProgress} className="h-2" />
        </Card>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Projects */}
          <Card className="lg:col-span-2 p-6 animate-slide-up" style={{ animationDelay: "0.4s" }}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-display font-bold text-xl text-foreground">Your Projects</h2>
              <Link to="/students/page-builder">
                <Button variant="outline" size="sm">
                  <FileText className="w-4 h-4 mr-2" />
                  New Project
                </Button>
              </Link>
            </div>
            <div className="text-sm text-muted-foreground">No projects yet.</div>
          </Card>

          {/* Next steps */}
          <div className="space-y-6">
            <Card className="p-6 animate-slide-up" style={{ animationDelay: "0.5s" }}>
              <h2 className="font-display font-bold text-xl text-foreground mb-4">Next Steps</h2>
              <div className="space-y-3 text-sm text-muted-foreground">
                <div>Pick a learning module.</div>
                <div>Create a project in Workspace.</div>
                <div>Add tracked keywords for your project.</div>
              </div>
            </Card>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid md:grid-cols-3 gap-4 mt-8 animate-slide-up" style={{ animationDelay: "0.7s" }}>
          <Link to="/students/page-builder">
            <Card className="p-4 hover:shadow-lg transition-all cursor-pointer group border-2 border-transparent hover:border-primary/20">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl gradient-seo flex items-center justify-center group-hover:scale-110 transition-transform">
                  <FileText className="w-6 h-6 text-primary-foreground" />
                </div>
                <div>
                  <p className="font-display font-semibold text-foreground">Workspace</p>
                  <p className="text-sm text-muted-foreground">Create and manage projects</p>
                </div>
              </div>
            </Card>
          </Link>
          <Link to="/students/keywords">
            <Card className="p-4 hover:shadow-lg transition-all cursor-pointer group border-2 border-transparent hover:border-primary/20">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Search className="w-6 h-6 text-primary-foreground" />
                </div>
                <div>
                  <p className="font-display font-semibold text-foreground">Keyword Lab</p>
                  <p className="text-sm text-muted-foreground">Research keywords</p>
                </div>
              </div>
            </Card>
          </Link>
          <Link to="/students/search-sim">
            <Card className="p-4 hover:shadow-lg transition-all cursor-pointer group border-2 border-transparent hover:border-primary/20">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Search className="w-6 h-6 text-primary-foreground" />
                </div>
                <div>
                  <p className="font-display font-semibold text-foreground">Technical</p>
                  <p className="text-sm text-muted-foreground">Audit and performance checks</p>
                </div>
              </div>
            </Card>
          </Link>
        </div>
      </div>
    </DashboardLayout>
  );
}
