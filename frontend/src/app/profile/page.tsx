"use client";

import { useState, useEffect, useRef } from "react";
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
import { validateCanvasToken } from "@/lib/utils/validateCanvasToken";
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
  
  // Course sync tracking
  const [courseProgress, setCourseProgress] = useState<{
    current: number;
    total: number;
    courseName?: string;
  }>({ current: 0, total: 0 });
  
  // Ref for auto-scrolling sync progress
  const syncProgressRef = useRef<HTMLDivElement>(null);

  // Profile data
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [schoolName, setSchoolName] = useState("");

  // Token input for resyncing
  const [resyncApiKey, setResyncApiKey] = useState("");
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);

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
    }
  }, [user]);

  // Auto-scroll sync progress to bottom when new items are added
  useEffect(() => {
    if (syncProgressRef.current && syncProgress.length > 0) {
      // Small delay to ensure the new item is rendered
      setTimeout(() => {
        syncProgressRef.current?.scrollTo({
          top: syncProgressRef.current.scrollHeight,
          behavior: 'smooth'
        });
      }, 100);
    }
  }, [syncProgress]);


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

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setUploadedFile(file);
      // Read the file content to extract the token
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        // Extract token from the file content
        const tokenMatch = content.match(/Token: (.+)/);
        if (tokenMatch) {
          setResyncApiKey(tokenMatch[1]);
        }
      };
      reader.readAsText(file);
    }
  };

  const handleResyncEnrollments = async () => {
    // Validate token input
    if (!resyncApiKey.trim()) {
      setMessage({ type: "error", text: "Please enter your Canvas API token or upload the token file" });
      return;
    }

    setIsSyncing(true);
    setSyncProgress([]);
    setCourseProgress({ current: 0, total: 0 });
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

      // Validate token first
      const isValid = await validateCanvasToken(resyncApiKey, `${schoolConfig.api_url}/api/v1`);
      if (!isValid) {
        throw new Error("Invalid Canvas API token");
      }

      // Use streaming API endpoint with token
      const response = await fetch('/api/user/enrollments/resync/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          apiKey: resyncApiKey,
          apiBaseUrl: `${schoolConfig.api_url}/api/v1`
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(error || 'Failed to resync enrollments');
      }

      // Handle streaming response
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      
      if (!reader) {
        throw new Error('No response body');
      }

      let buffer = '';
      let finalResults: any = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.trim() || !line.startsWith('data: ')) continue;
          
          try {
            const jsonStr = line.replace('data: ', '');
            const event = JSON.parse(jsonStr);

            if (event.type === 'progress') {
              updateSyncProgress(event.stage, event.status, event.detail);
              
              // Extract course progress from stage text
              const courseMatch = event.stage.match(/Syncing course (\d+)\/(\d+): (.+)/);
              if (courseMatch) {
                setCourseProgress({
                  current: parseInt(courseMatch[1]),
                  total: parseInt(courseMatch[2]),
                  courseName: courseMatch[3]
                });
              }
              
              // Extract total courses from "Fetching courses from Canvas" stage
              const fetchMatch = event.stage.match(/Fetching courses from Canvas/);
              if (fetchMatch && event.detail) {
                const totalMatch = event.detail.match(/(\d+) courses found/);
                if (totalMatch) {
                  setCourseProgress(prev => ({
                    ...prev,
                    total: parseInt(totalMatch[1])
                  }));
                }
              }
            } else if (event.type === 'done') {
              finalResults = event.data;
              console.log('Resync completed successfully:', finalResults);
              
              const summaryParts = [];
              if (finalResults.enrollmentsCreated > 0) summaryParts.push(`${finalResults.enrollmentsCreated} new`);
              if (finalResults.enrollmentsKept > 0) summaryParts.push(`${finalResults.enrollmentsKept} kept`);
              if (finalResults.enrollmentsDeleted > 0) summaryParts.push(`${finalResults.enrollmentsDeleted} removed`);
              
              setMessage({
                type: "success",
                text: `Successfully resynced! Enrollments: ${summaryParts.join(', ')}`
              });
            } else if (event.type === 'error') {
              throw new Error(event.detail || 'Resync failed');
            }
          } catch (parseError) {
            console.error('Error parsing SSE event:', line, parseError);
          }
        }
      }

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
                    <CardTitle>Resync Courses</CardTitle>
                    <CardDescription>
                      Provide your Canvas API token to resync your courses and materials
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">

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
                        <Label htmlFor="resync-api-token">Canvas API Token</Label>
                        <Input
                          id="resync-api-token"
                          type="password"
                          placeholder="Enter your Canvas API token"
                          value={resyncApiKey}
                          onChange={(e) => setResyncApiKey(e.target.value)}
                        />
                        <p className="text-sm text-muted-foreground">
                          You can find your API token in Canvas under Account &gt; Settings
                          &gt; Approved Integrations
                        </p>
                      </div>

                      <div className="grid gap-2">
                        <Label htmlFor="token-file-upload">Or Upload Token File</Label>
                        <div className="flex items-center gap-2">
                          <Input
                            id="token-file-upload"
                            type="file"
                            accept=".txt"
                            onChange={handleFileUpload}
                            className="flex-1"
                          />
                          {uploadedFile && (
                            <div className="flex items-center gap-2 text-sm text-green-600">
                              <CheckCircle2 className="h-4 w-4" />
                              {uploadedFile.name}
                            </div>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Upload the incourse-canvas-token.txt file you downloaded during onboarding
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start space-x-2 p-4 bg-gray-50 rounded-lg">
                      <Lock className="h-5 w-5 text-gray-400 mt-0.5" />
                      <div className="space-y-1">
                        <p className="text-sm font-medium">Privacy & Security</p>
                        <p className="text-sm text-muted-foreground">
                          Your API token is not stored in our database. We only use it temporarily
                          to sync your courses and then discard it.
                        </p>
                      </div>
                    </div>

                    <div className="pt-4 border-t">
                      <Button
                        onClick={handleResyncEnrollments}
                        disabled={isSyncing || !resyncApiKey.trim()}
                        className="bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600"
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
                        
                        {/* Course Progress Counter */}
                        {courseProgress.total > 0 && (
                          <div className="mt-4 p-3 bg-gradient-to-r from-orange-50 to-pink-50 border border-orange-200 rounded-lg">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-medium text-gray-700">Course Progress</span>
                              <span className="text-sm text-gray-600">
                                {courseProgress.current} of {courseProgress.total}
                              </span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <motion.div
                                className="bg-gradient-to-r from-orange-500 to-pink-500 h-2 rounded-full"
                                initial={{ width: 0 }}
                                animate={{ width: `${(courseProgress.current / courseProgress.total) * 100}%` }}
                                transition={{ duration: 0.5 }}
                              />
                            </div>
                            {courseProgress.courseName && (
                              <p className="text-xs text-gray-600 mt-2 truncate">
                                Currently syncing: {courseProgress.courseName}
                              </p>
                            )}
                          </div>
                        )}
                      </CardHeader>
                      <CardContent>
                        <div ref={syncProgressRef} className="space-y-3 max-h-80 overflow-y-auto">
                          {syncProgress.map((progress, index) => (
                            <motion.div
                              key={`${progress.stage}-${index}`}
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: index * 0.1 }}
                              className={`flex items-start gap-3 p-3 rounded-lg transition-all duration-200 ${
                                progress.status === 'loading' 
                                  ? 'bg-orange-50 border border-orange-200' 
                                  : progress.status === 'complete'
                                  ? 'bg-green-50 border border-green-200'
                                  : progress.status === 'error'
                                  ? 'bg-red-50 border border-red-200'
                                  : 'bg-gray-50 border border-gray-200'
                              }`}
                            >
                              <div className="mt-0.5">
                                {progress.status === 'loading' && (
                                  <Loader2 className="h-5 w-5 text-orange-500 animate-spin" />
                                )}
                                {progress.status === 'complete' && (
                                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                                )}
                                {progress.status === 'error' && (
                                  <div className="h-5 w-5 rounded-full bg-red-500 flex items-center justify-center text-white text-xs font-bold">
                                    !
                                  </div>
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
                                {progress.status === 'loading' && (
                                  <div className="mt-2 w-full bg-gray-200 rounded-full h-1">
                                    <motion.div
                                      className="bg-orange-500 h-1 rounded-full"
                                      initial={{ width: 0 }}
                                      animate={{ width: "100%" }}
                                      transition={{ duration: 2, repeat: Infinity, repeatType: "reverse" }}
                                    />
                                  </div>
                                )}
                              </div>
                            </motion.div>
                          ))}
                        </div>
                        
                        {/* Completion Message */}
                        {syncProgress.length > 0 && syncProgress[syncProgress.length - 1].status === 'complete' && (
                          <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="mt-6"
                          >
                            <div className="bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-lg p-4">
                              <div className="flex items-center gap-2 mb-2">
                                <CheckCircle2 className="h-5 w-5 text-green-500" />
                                <p className="font-medium text-green-800">Resync Complete!</p>
                              </div>
                              <p className="text-sm text-green-700">
                                Your courses and materials have been successfully synced.
                              </p>
                            </div>
                          </motion.div>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>
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
