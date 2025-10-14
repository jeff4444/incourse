"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Navbar } from "@/components/navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from "@/hooks/useAuth";
import { createClient } from "@/lib/utils/supabase/client";
import { SUPPORTED_SCHOOLS } from "@/constants/supported_schools";
import {
  User,
  Key,
  Bell,
  BookOpen,
  Loader2,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Lock,
  Mail,
  Calendar,
  School,
} from "lucide-react";
import ProtectedRoute from "@/components/auth/ProtectedRoute";

const supabase = createClient();

function ProfilePage() {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [syncProgress, setSyncProgress] = useState<{
    stage: string;
    status: 'pending' | 'loading' | 'complete' | 'error';
    detail?: string;
  }[]>([]);

  // Profile data
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [schoolName, setSchoolName] = useState("");

  // LMS Token data
  const [newApiKey, setNewApiKey] = useState("");
  const [hasExistingToken, setHasExistingToken] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  // Learning preferences
  const [learningMode, setLearningMode] = useState("balanced");
  const [notificationPrefs, setNotificationPrefs] = useState({
    nudgeReview: true,
    nudgeQuiz: true,
    syncCalendar: true,
  });

  useEffect(() => {
    if (user) {
      setFullName(user.user_metadata?.full_name || "");
      setEmail(user.email || "");
      setSchoolName(user.user_metadata?.school_name || "");
      fetchLMSTokenStatus();
    }
  }, [user]);

  const fetchLMSTokenStatus = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch('/api/user/lms-token', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.apiKeys && data.apiKeys.length > 0) {
          setHasExistingToken(true);
          setLastUpdated(data.apiKeys[0].updated_at);
        }
      }
    } catch (error) {
      console.error('Error fetching LMS token status:', error);
    }
  };

  const updateSyncProgress = (stage: string, status: 'pending' | 'loading' | 'complete' | 'error', detail?: string) => {
    setSyncProgress(prev => {
      const existingIndex = prev.findIndex(p => p.stage === stage);
      if (existingIndex >= 0) {
        const updated = [...prev];
        updated[existingIndex] = { stage, status, detail };
        return updated;
      }
      return [...prev, { stage, status, detail }];
    });
  };

  const handleUpdateLMSToken = async () => {
    if (!newApiKey.trim()) {
      setMessage({ type: "error", text: "Please enter a valid API token" });
      return;
    }

    setIsLoading(true);
    setMessage(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error("No active session");
      }

      // Get the Canvas URL from the school configuration
      const schoolConfig = SUPPORTED_SCHOOLS[schoolName];
      if (!schoolConfig) {
        throw new Error("School not supported");
      }

      // Update LMS token
      const response = await fetch('/api/user/lms-token', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          apiKey: newApiKey,
          apiBaseUrl: `${schoolConfig.api_url}/api/v1`,
          lmsProvider: 'canvas',
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update LMS token');
      }

      setMessage({ type: "success", text: "LMS token updated successfully! Starting resync..." });
      setNewApiKey("");
      setHasExistingToken(true);

      // Start resync process
      await handleResyncEnrollments();
    } catch (error) {
      console.error('Error updating LMS token:', error);
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : 'Failed to update LMS token'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResyncEnrollments = async () => {
    setIsSyncing(true);
    setSyncProgress([]);
    setMessage(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error("No active session");
      }

      updateSyncProgress('Deleting old enrollments', 'loading');
      
      const response = await fetch('/api/user/enrollments/resync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to resync enrollments');
      }

      const result = await response.json();
      const { results } = result;

      updateSyncProgress('Deleting old enrollments', 'complete', `${results.enrollmentsDeleted} enrollments deleted`);
      updateSyncProgress('Fetching courses', 'complete', `${results.coursesCreated} courses synced`);
      
      if (results.modulesCreated > 0) {
        updateSyncProgress('Syncing modules', 'complete', `${results.modulesCreated} modules synced`);
      }
      
      if (results.moduleItemsCreated > 0) {
        updateSyncProgress('Syncing module items', 'complete', `${results.moduleItemsCreated} items synced`);
      }

      updateSyncProgress('Completing sync', 'complete');
      
      setMessage({
        type: "success",
        text: `Successfully resynced! ${results.enrollmentsCreated} enrollments created.`
      });

      // Wait a moment to show completion state
      await new Promise(resolve => setTimeout(resolve, 2000));
    } catch (error) {
      console.error('Error resyncing enrollments:', error);
      const currentStage = syncProgress[syncProgress.length - 1]?.stage || 'Syncing';
      updateSyncProgress(currentStage, 'error', error instanceof Error ? error.message : 'Unknown error');
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : 'Failed to resync enrollments'
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleUpdateProfile = async () => {
    setIsLoading(true);
    setMessage(null);

    try {
      const { error } = await supabase.auth.updateUser({
        data: {
          full_name: fullName,
        }
      });

      if (error) throw error;

      setMessage({ type: "success", text: "Profile updated successfully!" });
    } catch (error) {
      console.error('Error updating profile:', error);
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : 'Failed to update profile'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-pink-50">
      <Navbar />
      <main className="container mx-auto py-6 px-4 md:px-6">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <h1 className="text-3xl font-bold tracking-tight text-foreground mb-2">
              Profile & Settings
            </h1>
            <p className="text-muted-foreground">
              Manage your account settings and preferences
            </p>
          </motion.div>

          {message && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`mb-6 p-4 rounded-lg flex items-center gap-3 ${
                message.type === "success"
                  ? "bg-green-50 text-green-800 border border-green-200"
                  : "bg-red-50 text-red-800 border border-red-200"
              }`}
            >
              {message.type === "success" ? (
                <CheckCircle2 className="h-5 w-5 flex-shrink-0" />
              ) : (
                <AlertCircle className="h-5 w-5 flex-shrink-0" />
              )}
              <p className="text-sm font-medium">{message.text}</p>
            </motion.div>
          )}

          <Tabs defaultValue="profile" className="space-y-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="profile">
                <User className="h-4 w-4 mr-2" />
                Profile
              </TabsTrigger>
              <TabsTrigger value="lms">
                <Key className="h-4 w-4 mr-2" />
                LMS Settings
              </TabsTrigger>
              <TabsTrigger value="preferences">
                <Bell className="h-4 w-4 mr-2" />
                Preferences
              </TabsTrigger>
            </TabsList>

            {/* Profile Tab */}
            <TabsContent value="profile">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.1 }}
              >
                <Card>
                  <CardHeader>
                    <CardTitle>Personal Information</CardTitle>
                    <CardDescription>
                      Update your personal details and account information
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid gap-4">
                      <div className="grid gap-2">
                        <Label htmlFor="full-name">Full Name</Label>
                        <div className="relative">
                          <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="full-name"
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            className="pl-9"
                          />
                        </div>
                      </div>

                      <div className="grid gap-2">
                        <Label htmlFor="email">Email</Label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="email"
                            value={email}
                            disabled
                            className="pl-9 bg-muted"
                          />
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Email cannot be changed
                        </p>
                      </div>

                      <div className="grid gap-2">
                        <Label htmlFor="school">School</Label>
                        <div className="relative">
                          <School className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="school"
                            value={schoolName}
                            disabled
                            className="pl-9 bg-muted"
                          />
                        </div>
                        <p className="text-xs text-muted-foreground">
                          School cannot be changed
                        </p>
                      </div>
                    </div>

                    <div className="pt-4 border-t">
                      <Button
                        onClick={handleUpdateProfile}
                        disabled={isLoading}
                        className="bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600"
                      >
                        {isLoading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          "Save Changes"
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </TabsContent>

            {/* LMS Settings Tab */}
            <TabsContent value="lms">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.1 }}
                className="space-y-6"
              >
                <Card>
                  <CardHeader>
                    <CardTitle>Canvas LMS Token</CardTitle>
                    <CardDescription>
                      Update your Canvas API token to sync your courses and materials
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {hasExistingToken && (
                      <div className="p-4 bg-muted rounded-lg">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <CheckCircle2 className="h-5 w-5 text-green-600" />
                            <div>
                              <p className="font-medium text-sm">Token Active</p>
                              {lastUpdated && (
                                <p className="text-xs text-muted-foreground">
                                  Last updated: {new Date(lastUpdated).toLocaleDateString()}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="grid gap-4">
                      <div className="grid gap-2">
                        <Label htmlFor="school-info">Your School</Label>
                        <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                          <p className="font-medium text-gray-900">
                            {schoolName || "Loading..."}
                          </p>
                          {schoolName && SUPPORTED_SCHOOLS[schoolName] && (
                            <p className="text-sm text-gray-600 mt-1">
                              Canvas URL: {SUPPORTED_SCHOOLS[schoolName].api_url}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="grid gap-2">
                        <Label htmlFor="new-api-token">
                          {hasExistingToken ? "Update Canvas API Token" : "Canvas API Token"}
                        </Label>
                        <Input
                          id="new-api-token"
                          type="password"
                          placeholder="Enter your Canvas API token"
                          value={newApiKey}
                          onChange={(e) => setNewApiKey(e.target.value)}
                        />
                        <p className="text-sm text-muted-foreground">
                          You can find your API token in Canvas under Account &gt; Settings
                          &gt; Approved Integrations
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start space-x-2 p-4 bg-gray-50 rounded-lg">
                      <Lock className="h-5 w-5 text-gray-400 mt-0.5" />
                      <div className="space-y-1">
                        <p className="text-sm font-medium">Privacy & Security</p>
                        <p className="text-sm text-muted-foreground">
                          Your API token is encrypted and stored securely. Updating your
                          token will automatically resync your enrollments.
                        </p>
                      </div>
                    </div>

                    <div className="pt-4 border-t">
                      <Button
                        onClick={handleUpdateLMSToken}
                        disabled={isLoading || isSyncing || !newApiKey.trim()}
                        className="bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600"
                      >
                        {isLoading || isSyncing ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            {isSyncing ? "Syncing..." : "Updating..."}
                          </>
                        ) : (
                          <>
                            <RefreshCw className="mr-2 h-4 w-4" />
                            Update Token & Resync
                          </>
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Sync Progress */}
                {isSyncing && syncProgress.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Loader2 className="h-5 w-5 animate-spin text-orange-500" />
                          Syncing Progress
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {syncProgress.map((progress, index) => (
                            <motion.div
                              key={progress.stage}
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: index * 0.1 }}
                              className="flex items-start gap-3 p-3 rounded-lg bg-gray-50"
                            >
                              <div className="mt-0.5">
                                {progress.status === 'loading' && (
                                  <Loader2 className="h-5 w-5 text-orange-500 animate-spin" />
                                )}
                                {progress.status === 'complete' && (
                                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                                )}
                                {progress.status === 'error' && (
                                  <AlertCircle className="h-5 w-5 text-red-500" />
                                )}
                                {progress.status === 'pending' && (
                                  <div className="h-5 w-5 rounded-full bg-gray-300" />
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className={`font-medium ${
                                  progress.status === 'error' ? 'text-red-600' : 'text-gray-900'
                                }`}>
                                  {progress.stage}
                                </p>
                                {progress.detail && (
                                  <p className={`text-sm mt-0.5 ${
                                    progress.status === 'error' ? 'text-red-500' : 'text-gray-500'
                                  }`}>
                                    {progress.detail}
                                  </p>
                                )}
                              </div>
                            </motion.div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                )}

                {/* Manual Resync Option */}
                {hasExistingToken && !isSyncing && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Manual Resync</CardTitle>
                      <CardDescription>
                        Resync your enrollments without updating your token
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground mb-4">
                        This will delete all your current enrollments and fetch fresh data
                        from Canvas, including courses, modules, and module items.
                      </p>
                      <Button
                        onClick={handleResyncEnrollments}
                        disabled={isSyncing}
                        variant="outline"
                      >
                        {isSyncing ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Syncing...
                          </>
                        ) : (
                          <>
                            <RefreshCw className="mr-2 h-4 w-4" />
                            Resync Enrollments
                          </>
                        )}
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </motion.div>
            </TabsContent>

            {/* Preferences Tab */}
            <TabsContent value="preferences">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.1 }}
                className="space-y-6"
              >
                <Card>
                  <CardHeader>
                    <CardTitle>Learning Preferences</CardTitle>
                    <CardDescription>
                      Customize how you want to learn with InCourse
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-3">
                      <Label>Preferred learning mode</Label>
                      <RadioGroup value={learningMode} onValueChange={setLearningMode}>
                        {[
                          {
                            id: "quiz",
                            title: "Quiz-focused",
                            description: "Emphasize quizzes and active recall for better retention",
                          },
                          {
                            id: "flashcard",
                            title: "Flashcard-focused",
                            description: "Focus on spaced repetition with flashcards",
                          },
                          {
                            id: "balanced",
                            title: "Balanced",
                            description: "Mix of summaries, quizzes, and flashcards",
                          },
                        ].map((mode) => (
                          <div
                            key={mode.id}
                            className="flex items-start space-x-3 p-4 rounded-lg border hover:bg-gray-50 transition-colors"
                          >
                            <RadioGroupItem value={mode.id} id={mode.id} />
                            <div className="grid gap-1.5">
                              <Label htmlFor={mode.id} className="font-medium">
                                {mode.title}
                              </Label>
                              <p className="text-sm text-muted-foreground">
                                {mode.description}
                              </p>
                            </div>
                          </div>
                        ))}
                      </RadioGroup>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Notification Preferences</CardTitle>
                    <CardDescription>
                      Choose what notifications you want to receive
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {[
                        {
                          id: "nudgeReview",
                          label: "Nudge me to review material",
                          description: "Get reminders when it's time to review course content",
                        },
                        {
                          id: "nudgeQuiz",
                          label: "Remind me to take quizzes",
                          description: "Receive notifications about upcoming quizzes",
                        },
                        {
                          id: "syncCalendar",
                          label: "Sync with my calendar",
                          description: "Automatically add course events to your calendar",
                        },
                      ].map((pref) => (
                        <div
                          key={pref.id}
                          className="flex items-start space-x-3 p-4 rounded-lg border"
                        >
                          <Checkbox
                            id={pref.id}
                            checked={notificationPrefs[pref.id as keyof typeof notificationPrefs]}
                            onCheckedChange={(checked) =>
                              setNotificationPrefs((prev) => ({
                                ...prev,
                                [pref.id]: checked,
                              }))
                            }
                          />
                          <div className="grid gap-1.5">
                            <Label htmlFor={pref.id} className="font-medium">
                              {pref.label}
                            </Label>
                            <p className="text-sm text-muted-foreground">
                              {pref.description}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="pt-6 border-t mt-6">
                      <Button
                        onClick={() => setMessage({ type: "success", text: "Preferences saved!" })}
                        className="bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600"
                      >
                        Save Preferences
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
}

export default function WrappedProfilePage() {
  return (
    <ProtectedRoute>
      <ProfilePage />
    </ProtectedRoute>
  );
}
