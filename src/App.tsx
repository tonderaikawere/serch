import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { SimulationProvider } from "@/contexts/SimulationContext";
import Welcome from "./pages/Welcome";
import Scenarios from "./pages/students/Scenarios";
import Dashboard from "./pages/students/Dashboard";
import PageBuilder from "./pages/students/PageBuilder";
import KeywordLab from "./pages/students/KeywordLab";
import SearchSimulation from "./pages/students/SearchSimulation";
import InstructorDashboard from "./pages/instructors/InstructorDashboard";
import InstructorStudents from "./pages/instructors/Students";
import InstructorAssessments from "./pages/instructors/Assessments";
import InstructorCourses from "./pages/instructors/Courses";
import InstructorAnalytics from "./pages/instructors/Analytics";
import InstructorChats from "./pages/instructors/Chats";
import InstructorStudentDetails from "./pages/instructors/StudentDetails";
import InstructorCourseEditor from "./pages/instructors/CourseEditor";
import InstructorLeaderboard from "./pages/instructors/Leaderboard";
import AEOLab from "./pages/students/AEOLab";
import SchemaBuilder from "./pages/students/SchemaBuilder";
import TechnicalSEO from "./pages/students/TechnicalSEO";
import MetadataEditor from "./pages/students/MetadataEditor";
import Performance from "./pages/students/Performance";
import StudentCourses from "./pages/students/Courses";
import StudentCourseDetails from "./pages/students/CourseDetails";
import StudentCoursePlayer from "./pages/students/CoursePlayer";
import StudentFinalExam from "./pages/students/FinalExam";
import StudentAssessments from "./pages/students/Assessments";
import Settings from "./pages/admin/Settings";
import Certification from "./pages/admin/Certification";
import NotFound from "./pages/NotFound";
import AdminDashboard from "./pages/admin/Dashboard";
import AdminUsers from "./pages/admin/Users";
import AdminCourses from "./pages/admin/Courses";
import AdminInstructors from "./pages/admin/Instructors";
import AdminReports from "./pages/admin/Reports";
import StudentProfile from "./pages/students/Profile";
import StudentSettings from "./pages/students/Settings";
import StudentChats from "./pages/students/Chats";
import InstructorProfile from "./pages/instructors/Profile";
import InstructorModuleQuestions from "./pages/instructors/ModuleQuestions";
import InstructorFinalQuestions from "./pages/instructors/FinalQuestions";
import { AuthProvider } from "@/contexts/AuthContext";
import { RequireAuth, RequireRole } from "@/components/auth/RequireAuth";
import Landing from "@/pages/guest/Landing";
import Login from "@/pages/guest/Login";
import Signup from "@/pages/guest/Signup";
import Site from "@/pages/guest/Site";
import Onboarding from "@/pages/guest/Onboarding";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <SimulationProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter
            future={{
              v7_startTransition: true,
              v7_relativeSplatPath: true,
            }}
          >
            <Routes>
              {/* Guest */}
              <Route path="/" element={<Landing />} />
              <Route path="/site" element={<Site />} />
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route
                path="/onboarding"
                element={
                  <RequireAuth>
                    <Onboarding />
                  </RequireAuth>
                }
              />

              {/* Students */}
              <Route
                path="/students"
                element={
                  <RequireAuth>
                    <RequireRole allow={["student", "admin"]}>
                      <Navigate to="/students/dashboard" replace />
                    </RequireRole>
                  </RequireAuth>
                }
              />
              <Route
                path="/students/scenarios"
                element={
                  <RequireAuth>
                    <RequireRole allow={["student", "admin"]}>
                      <Scenarios />
                    </RequireRole>
                  </RequireAuth>
                }
              />
              <Route
                path="/students/dashboard"
                element={
                  <RequireAuth>
                    <RequireRole allow={["student", "admin"]}>
                      <Dashboard />
                    </RequireRole>
                  </RequireAuth>
                }
              />
              <Route
                path="/students/courses"
                element={
                  <RequireAuth>
                    <RequireRole allow={["student", "admin"]}>
                      <StudentCourses />
                    </RequireRole>
                  </RequireAuth>
                }
              />
              <Route
                path="/students/courses/:courseId"
                element={
                  <RequireAuth>
                    <RequireRole allow={["student", "admin"]}>
                      <StudentCourseDetails />
                    </RequireRole>
                  </RequireAuth>
                }
              />
              <Route
                path="/students/courses/:courseId/player"
                element={
                  <RequireAuth>
                    <RequireRole allow={["student", "admin"]}>
                      <StudentCoursePlayer />
                    </RequireRole>
                  </RequireAuth>
                }
              />
              <Route
                path="/students/courses/:courseId/final"
                element={
                  <RequireAuth>
                    <RequireRole allow={["student", "admin"]}>
                      <StudentFinalExam />
                    </RequireRole>
                  </RequireAuth>
                }
              />
              <Route
                path="/students/page-builder"
                element={
                  <RequireAuth>
                    <RequireRole allow={["student", "admin"]}>
                      <PageBuilder />
                    </RequireRole>
                  </RequireAuth>
                }
              />
              <Route
                path="/students/keywords"
                element={
                  <RequireAuth>
                    <RequireRole allow={["student", "admin"]}>
                      <KeywordLab />
                    </RequireRole>
                  </RequireAuth>
                }
              />
              <Route
                path="/students/search-sim"
                element={
                  <RequireAuth>
                    <RequireRole allow={["student", "admin"]}>
                      <SearchSimulation />
                    </RequireRole>
                  </RequireAuth>
                }
              />
              <Route
                path="/students/aeo-lab"
                element={
                  <RequireAuth>
                    <RequireRole allow={["student", "admin"]}>
                      <AEOLab />
                    </RequireRole>
                  </RequireAuth>
                }
              />
              <Route
                path="/students/schema"
                element={
                  <RequireAuth>
                    <RequireRole allow={["student", "admin"]}>
                      <SchemaBuilder />
                    </RequireRole>
                  </RequireAuth>
                }
              />
              <Route
                path="/students/technical"
                element={
                  <RequireAuth>
                    <RequireRole allow={["student", "admin"]}>
                      <TechnicalSEO />
                    </RequireRole>
                  </RequireAuth>
                }
              />
              <Route
                path="/students/metadata"
                element={
                  <RequireAuth>
                    <RequireRole allow={["student", "admin"]}>
                      <MetadataEditor />
                    </RequireRole>
                  </RequireAuth>
                }
              />
              <Route
                path="/students/performance"
                element={
                  <RequireAuth>
                    <RequireRole allow={["student", "admin"]}>
                      <Performance />
                    </RequireRole>
                  </RequireAuth>
                }
              />
              <Route
                path="/students/assessments"
                element={
                  <RequireAuth>
                    <RequireRole allow={["student", "admin"]}>
                      <StudentAssessments />
                    </RequireRole>
                  </RequireAuth>
                }
              />
              <Route
                path="/students/chats"
                element={
                  <RequireAuth>
                    <RequireRole allow={["student", "admin"]}>
                      <StudentChats />
                    </RequireRole>
                  </RequireAuth>
                }
              />
              <Route
                path="/students/profile"
                element={
                  <RequireAuth>
                    <RequireRole allow={["student", "admin"]}>
                      <StudentProfile />
                    </RequireRole>
                  </RequireAuth>
                }
              />
              <Route
                path="/students/settings"
                element={
                  <RequireAuth>
                    <RequireRole allow={["student", "admin"]}>
                      <StudentSettings />
                    </RequireRole>
                  </RequireAuth>
                }
              />

              {/* Instructors */}
              <Route
                path="/instructors"
                element={
                  <RequireAuth>
                    <RequireRole allow={["instructor", "admin"]}>
                      <Navigate to="/instructors/dashboard" replace />
                    </RequireRole>
                  </RequireAuth>
                }
              />
              <Route
                path="/instructors/dashboard"
                element={
                  <RequireAuth>
                    <RequireRole allow={["instructor", "admin"]}>
                      <InstructorDashboard />
                    </RequireRole>
                  </RequireAuth>
                }
              />
              <Route
                path="/instructors/students"
                element={
                  <RequireAuth>
                    <RequireRole allow={["instructor", "admin"]}>
                      <InstructorStudents />
                    </RequireRole>
                  </RequireAuth>
                }
              />
              <Route
                path="/instructors/leaderboard"
                element={
                  <RequireAuth>
                    <RequireRole allow={["instructor", "admin"]}>
                      <InstructorLeaderboard />
                    </RequireRole>
                  </RequireAuth>
                }
              />
              <Route
                path="/instructors/students/:studentId"
                element={
                  <RequireAuth>
                    <RequireRole allow={["instructor", "admin"]}>
                      <InstructorStudentDetails />
                    </RequireRole>
                  </RequireAuth>
                }
              />
              <Route
                path="/instructors/assessments"
                element={
                  <RequireAuth>
                    <RequireRole allow={["instructor", "admin"]}>
                      <InstructorAssessments />
                    </RequireRole>
                  </RequireAuth>
                }
              />
              <Route
                path="/instructors/courses"
                element={
                  <RequireAuth>
                    <RequireRole allow={["instructor", "admin"]}>
                      <InstructorCourses />
                    </RequireRole>
                  </RequireAuth>
                }
              />
              <Route
                path="/instructors/courses/:courseId"
                element={
                  <RequireAuth>
                    <RequireRole allow={["instructor", "admin"]}>
                      <InstructorCourseEditor />
                    </RequireRole>
                  </RequireAuth>
                }
              />
              <Route
                path="/instructors/courses/:courseId/modules/:moduleId/questions"
                element={
                  <RequireAuth>
                    <RequireRole allow={["instructor", "admin"]}>
                      <InstructorModuleQuestions />
                    </RequireRole>
                  </RequireAuth>
                }
              />
              <Route
                path="/instructors/courses/:courseId/final/questions"
                element={
                  <RequireAuth>
                    <RequireRole allow={["instructor", "admin"]}>
                      <InstructorFinalQuestions />
                    </RequireRole>
                  </RequireAuth>
                }
              />
              <Route
                path="/instructors/analytics"
                element={
                  <RequireAuth>
                    <RequireRole allow={["instructor", "admin"]}>
                      <InstructorAnalytics />
                    </RequireRole>
                  </RequireAuth>
                }
              />
              <Route
                path="/instructors/chats"
                element={
                  <RequireAuth>
                    <RequireRole allow={["instructor", "admin"]}>
                      <InstructorChats />
                    </RequireRole>
                  </RequireAuth>
                }
              />
              <Route
                path="/instructors/profile"
                element={
                  <RequireAuth>
                    <RequireRole allow={["instructor", "admin"]}>
                      <InstructorProfile />
                    </RequireRole>
                  </RequireAuth>
                }
              />

              {/* Admin */}
              <Route
                path="/admin"
                element={
                  <RequireAuth>
                    <RequireRole allow={["admin"]}>
                      <AdminDashboard />
                    </RequireRole>
                  </RequireAuth>
                }
              />
              <Route
                path="/admin/dashboard"
                element={
                  <RequireAuth>
                    <RequireRole allow={["admin"]}>
                      <AdminDashboard />
                    </RequireRole>
                  </RequireAuth>
                }
              />
              <Route
                path="/admin/settings"
                element={
                  <RequireAuth>
                    <RequireRole allow={["admin"]}>
                      <Settings />
                    </RequireRole>
                  </RequireAuth>
                }
              />
              <Route
                path="/admin/users"
                element={
                  <RequireAuth>
                    <RequireRole allow={["admin"]}>
                      <AdminUsers />
                    </RequireRole>
                  </RequireAuth>
                }
              />
              <Route
                path="/admin/courses"
                element={
                  <RequireAuth>
                    <RequireRole allow={["admin"]}>
                      <AdminCourses />
                    </RequireRole>
                  </RequireAuth>
                }
              />
              <Route
                path="/admin/instructors"
                element={
                  <RequireAuth>
                    <RequireRole allow={["admin"]}>
                      <AdminInstructors />
                    </RequireRole>
                  </RequireAuth>
                }
              />
              <Route
                path="/admin/reports"
                element={
                  <RequireAuth>
                    <RequireRole allow={["admin"]}>
                      <AdminReports />
                    </RequireRole>
                  </RequireAuth>
                }
              />
              <Route
                path="/admin/certification"
                element={
                  <RequireAuth>
                    <RequireRole allow={["admin"]}>
                      <Certification />
                    </RequireRole>
                  </RequireAuth>
                }
              />

              {/* Legacy redirects */}
              <Route path="/welcome" element={<Welcome />} />
              <Route path="/scenarios" element={<Navigate to="/students/scenarios" replace />} />
              <Route path="/dashboard" element={<Navigate to="/students/dashboard" replace />} />
              <Route path="/page-builder" element={<Navigate to="/students/page-builder" replace />} />
              <Route path="/keywords" element={<Navigate to="/students/keywords" replace />} />
              <Route path="/search-sim" element={<Navigate to="/students/search-sim" replace />} />
              <Route path="/aeo-lab" element={<Navigate to="/students/aeo-lab" replace />} />
              <Route path="/schema" element={<Navigate to="/students/schema" replace />} />
              <Route path="/technical" element={<Navigate to="/students/technical" replace />} />
              <Route path="/metadata" element={<Navigate to="/students/metadata" replace />} />
              <Route path="/performance" element={<Navigate to="/students/performance" replace />} />
              <Route path="/learning" element={<Navigate to="/students/courses" replace />} />
              <Route path="/instructor" element={<Navigate to="/instructors" replace />} />
              <Route path="/settings" element={<Navigate to="/admin/settings" replace />} />
              <Route path="/certification" element={<Navigate to="/admin/certification" replace />} />

              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </SimulationProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
