import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Settings as SettingsIcon,
  User,
  Bell,
  Palette,
  Sliders,
  Save,
  RotateCcw
} from "lucide-react";
import { useState } from "react";

export default function Settings() {
  const [notifications, setNotifications] = useState({
    lessonReminders: true,
    progressUpdates: true,
    newFeatures: false,
    tips: true,
  });

  const [simulation, setSimulation] = useState({
    difficulty: "intermediate",
    feedbackLevel: "detailed",
    autoSave: true,
    showHints: true,
  });

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Settings</h1>
            <p className="text-muted-foreground mt-1">
              Customize your learning experience
            </p>
          </div>
          <Button>
            <Save className="w-4 h-4 mr-2" />
            Save Changes
          </Button>
        </div>

        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList>
            <TabsTrigger value="profile" className="flex items-center gap-2">
              <User className="w-4 h-4" />
              Profile
            </TabsTrigger>
            <TabsTrigger value="notifications" className="flex items-center gap-2">
              <Bell className="w-4 h-4" />
              Notifications
            </TabsTrigger>
            <TabsTrigger value="simulation" className="flex items-center gap-2">
              <Sliders className="w-4 h-4" />
              Simulation
            </TabsTrigger>
            <TabsTrigger value="appearance" className="flex items-center gap-2">
              <Palette className="w-4 h-4" />
              Appearance
            </TabsTrigger>
          </TabsList>

          {/* Profile Tab */}
          <TabsContent value="profile">
            <Card>
              <CardHeader>
                <CardTitle>Profile Information</CardTitle>
                <CardDescription>Update your account details</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center gap-6">
                  <div className="w-20 h-20 rounded-full gradient-seo flex items-center justify-center">
                    <User className="w-10 h-10 text-primary-foreground" />
                  </div>
                  <div>
                    <Button variant="outline" size="sm">Change Avatar</Button>
                    <p className="text-sm text-muted-foreground mt-1">JPG, PNG or GIF. Max 2MB.</p>
                  </div>
                </div>

                <Separator />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name</Label>
                    <Input id="firstName" placeholder="John" defaultValue="John" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input id="lastName" placeholder="Doe" defaultValue="Doe" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" type="email" placeholder="john@example.com" defaultValue="john@example.com" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="role">Role</Label>
                    <Select defaultValue="student">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="student">Student</SelectItem>
                        <SelectItem value="instructor">Instructor</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label htmlFor="bio">Bio</Label>
                  <textarea 
                    id="bio"
                    className="w-full min-h-[100px] p-3 bg-muted/30 rounded-lg border border-border resize-none text-sm"
                    placeholder="Tell us about yourself..."
                    defaultValue="Learning SEO and AEO to improve my digital marketing skills."
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Notifications Tab */}
          <TabsContent value="notifications">
            <Card>
              <CardHeader>
                <CardTitle>Notification Preferences</CardTitle>
                <CardDescription>Choose what updates you want to receive</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-foreground">Lesson Reminders</p>
                    <p className="text-sm text-muted-foreground">Get reminded to continue your learning</p>
                  </div>
                  <Switch 
                    checked={notifications.lessonReminders}
                    onCheckedChange={(checked) => setNotifications(prev => ({ ...prev, lessonReminders: checked }))}
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-foreground">Progress Updates</p>
                    <p className="text-sm text-muted-foreground">Weekly summary of your learning progress</p>
                  </div>
                  <Switch 
                    checked={notifications.progressUpdates}
                    onCheckedChange={(checked) => setNotifications(prev => ({ ...prev, progressUpdates: checked }))}
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-foreground">New Features</p>
                    <p className="text-sm text-muted-foreground">Be notified about new simulation features</p>
                  </div>
                  <Switch 
                    checked={notifications.newFeatures}
                    onCheckedChange={(checked) => setNotifications(prev => ({ ...prev, newFeatures: checked }))}
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-foreground">Learning Tips</p>
                    <p className="text-sm text-muted-foreground">Occasional tips to improve your SEO skills</p>
                  </div>
                  <Switch 
                    checked={notifications.tips}
                    onCheckedChange={(checked) => setNotifications(prev => ({ ...prev, tips: checked }))}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Simulation Tab */}
          <TabsContent value="simulation">
            <Card>
              <CardHeader>
                <CardTitle>Simulation Settings</CardTitle>
                <CardDescription>Configure how the training simulation behaves</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label>Difficulty Level</Label>
                    <Select 
                      value={simulation.difficulty}
                      onValueChange={(value) => setSimulation(prev => ({ ...prev, difficulty: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="beginner">Beginner - More guidance</SelectItem>
                        <SelectItem value="intermediate">Intermediate - Balanced</SelectItem>
                        <SelectItem value="advanced">Advanced - Minimal hints</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-sm text-muted-foreground">Affects hint frequency and feedback detail</p>
                  </div>

                  <div className="space-y-2">
                    <Label>Feedback Level</Label>
                    <Select 
                      value={simulation.feedbackLevel}
                      onValueChange={(value) => setSimulation(prev => ({ ...prev, feedbackLevel: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="minimal">Minimal - Score only</SelectItem>
                        <SelectItem value="standard">Standard - Key insights</SelectItem>
                        <SelectItem value="detailed">Detailed - Full analysis</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-sm text-muted-foreground">How much feedback you receive after actions</p>
                  </div>
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-foreground">Auto-Save Progress</p>
                    <p className="text-sm text-muted-foreground">Automatically save your simulation state</p>
                  </div>
                  <Switch 
                    checked={simulation.autoSave}
                    onCheckedChange={(checked) => setSimulation(prev => ({ ...prev, autoSave: checked }))}
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-foreground">Show Hints</p>
                    <p className="text-sm text-muted-foreground">Display contextual hints during simulation</p>
                  </div>
                  <Switch 
                    checked={simulation.showHints}
                    onCheckedChange={(checked) => setSimulation(prev => ({ ...prev, showHints: checked }))}
                  />
                </div>

                <Separator />

                <div className="pt-4">
                  <Button variant="outline" className="text-destructive border-destructive/30 hover:bg-destructive/10">
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Reset All Progress
                  </Button>
                  <p className="text-sm text-muted-foreground mt-2">
                    This will reset all your simulation progress and scores. This action cannot be undone.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Appearance Tab */}
          <TabsContent value="appearance">
            <Card>
              <CardHeader>
                <CardTitle>Appearance Settings</CardTitle>
                <CardDescription>Customize the look and feel of the application</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <Label>Theme</Label>
                  <div className="grid grid-cols-3 gap-4">
                    <button className="p-4 border-2 border-primary rounded-lg bg-card text-center">
                      <div className="w-full h-12 rounded bg-gradient-to-b from-background to-muted mb-2" />
                      <span className="text-sm font-medium">Light</span>
                    </button>
                    <button className="p-4 border-2 border-border rounded-lg bg-card text-center hover:border-primary/50 transition-colors">
                      <div className="w-full h-12 rounded bg-gradient-to-b from-zinc-900 to-zinc-800 mb-2" />
                      <span className="text-sm font-medium">Dark</span>
                    </button>
                    <button className="p-4 border-2 border-border rounded-lg bg-card text-center hover:border-primary/50 transition-colors">
                      <div className="w-full h-12 rounded bg-gradient-to-r from-background to-zinc-900 mb-2" />
                      <span className="text-sm font-medium">System</span>
                    </button>
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <Label>Accent Color</Label>
                  <div className="flex gap-3">
                    <button className="w-10 h-10 rounded-full bg-[hsl(175,80%,35%)] ring-2 ring-offset-2 ring-primary" title="Teal" />
                    <button className="w-10 h-10 rounded-full bg-[hsl(220,80%,50%)] hover:ring-2 hover:ring-offset-2 hover:ring-blue-500 transition-all" title="Blue" />
                    <button className="w-10 h-10 rounded-full bg-[hsl(280,80%,50%)] hover:ring-2 hover:ring-offset-2 hover:ring-purple-500 transition-all" title="Purple" />
                    <button className="w-10 h-10 rounded-full bg-[hsl(340,80%,50%)] hover:ring-2 hover:ring-offset-2 hover:ring-pink-500 transition-all" title="Pink" />
                    <button className="w-10 h-10 rounded-full bg-[hsl(30,80%,50%)] hover:ring-2 hover:ring-offset-2 hover:ring-orange-500 transition-all" title="Orange" />
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <Label>Font Size</Label>
                  <Select defaultValue="medium">
                    <SelectTrigger className="w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="small">Small</SelectItem>
                      <SelectItem value="medium">Medium (Default)</SelectItem>
                      <SelectItem value="large">Large</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
