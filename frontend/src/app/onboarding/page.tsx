"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@/lib/utils/supabase/client";
import { encryptApiKey } from "@/lib/utils/encryption";
import { Button } from "@/components/ui/button";
import { SUPPORTED_SCHOOLS } from "@/constants/supported_schools";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Sparkles,
  Lock,
  Loader2,
} from "lucide-react";

const supabase = createClient();

export default function OnboardingPage() {
  const [step, setStep] = useState(1);
  const [direction, setDirection] = useState(0); // -1 for back, 1 for forward
  const totalSteps = 2;
  const [schoolName, setSchoolName] = useState<string>("");
  const [apiKey, setApiKey] = useState("");
  const [apiKeyError, setApiKeyError] = useState("");
  
  // Syncing state
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStage, setSyncStage] = useState<string>("");
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

  // Fetch user's school on mount
  useEffect(() => {
    const fetchUserSchool = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.user_metadata?.school_name) {
        setSchoolName(user.user_metadata.school_name);
      }
    };
    fetchUserSchool();
  }, []);

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

  const handleApiKeyChange = (value: string) => {
    setApiKey(value);
    setApiKeyError(""); // Clear error when user types
  };

  // Update sync progress helper
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

  // Store Canvas credentials to database
  const storeCanvasCredentials = async (key: string) => {
    try {
      updateSyncProgress('Saving credentials', 'loading');
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error("User not authenticated");
      }

      // Get the Canvas URL from the school configuration
      const schoolConfig = SUPPORTED_SCHOOLS[schoolName];
      if (!schoolConfig) {
        throw new Error("School not supported");
      }

      const encryptedApiKey = encryptApiKey(key);

      const { error } = await supabase
        .from('user_api_keys')
        .upsert({
          user_id: user.id,
          lms_provider: 'canvas',
          encrypted_api_key: encryptedApiKey,
          api_base_url: schoolConfig.api_url,
          is_active: true
        });

      if (error) {
        throw error;
      }

      updateSyncProgress('Saving credentials', 'complete');
      return { success: true };
    } catch (error) {
      console.error('Error storing Canvas credentials:', error);
      updateSyncProgress('Saving credentials', 'error', error instanceof Error ? error.message : 'Unknown error');
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error occurred' };
    }
  };

  // Fetch and sync courses to database with streaming
  const syncCoursesToDatabase = async (apiKey: string) => {
    try {
      console.log('Starting streaming sync...');
      
      // Get session for authentication
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error("No active session");
      }

      // Get the Canvas URL from the school configuration
      const schoolConfig = SUPPORTED_SCHOOLS[schoolName];
      if (!schoolConfig) {
        throw new Error("School not supported");
      }

      // Use streaming API endpoint
      const response = await fetch('/api/courses/sync/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ 
          apiKey,
          apiBaseUrl: `${schoolConfig.api_url}/api/v1`
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(error || 'Failed to sync courses');
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
              
              // Extract total courses from "Fetching courses" stage
              const fetchMatch = event.stage.match(/Fetching courses/);
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
              console.log('Sync completed successfully:', finalResults);
            } else if (event.type === 'error') {
              throw new Error(event.detail || 'Sync failed');
            }
          } catch (parseError) {
            console.error('Error parsing SSE event:', line, parseError);
          }
        }
      }

      return { success: true, results: finalResults };
    } catch (error) {
      console.error('Error syncing courses:', error);
      const currentStage = syncProgress[syncProgress.length - 1]?.stage || 'Syncing courses';
      updateSyncProgress(currentStage, 'error', error instanceof Error ? error.message : 'Unknown error');
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error occurred' };
    }
  };

  const nextStep = async () => {
    // Validate API key on step 1
    if (step === 1) {
      // Validate school is set
      if (!schoolName) {
        setApiKeyError("School information not found. Please sign up again.");
        return;
      }

      // Validate API key
      if (!apiKey.trim()) {
        setApiKeyError("API key is required");
        return;
      }

      // Start syncing process
      setIsSyncing(true);
      setSyncProgress([]);
      setCourseProgress({ current: 0, total: 0 });

      // Store credentials to database
      const storeResult = await storeCanvasCredentials(apiKey);
      if (!storeResult.success) {
        setApiKeyError(`Failed to save credentials: ${storeResult.error}`);
        setIsSyncing(false);
        return;
      }

      // Sync courses to database after storing credentials
      const syncResult = await syncCoursesToDatabase(apiKey);
      if (!syncResult.success) {
        // Log the error but don't block onboarding
        console.error('Failed to sync courses during onboarding:', syncResult.error);
        // Continue with onboarding even if course sync fails
      }
      
      // Wait a moment to show completion state
      await new Promise(resolve => setTimeout(resolve, 1000));
      setIsSyncing(false);
    }

    setDirection(1);
    if (step < totalSteps) {
      setStep(step + 1);
    } else {
      // Complete onboarding and update user metadata
      try {
        const { error } = await supabase.auth.updateUser({
          data: { passed_onboarding: true }
        });
        
        if (error) {
          console.error('Error updating user metadata:', error);
        }
        
        // Navigate to dashboard when completed
        window.location.href = "/dashboard";
      } catch (error) {
        console.error('Error completing onboarding:', error);
        // Still navigate to dashboard even if metadata update fails
        window.location.href = "/dashboard";
      }
    }
  };

  const prevStep = () => {
    setDirection(-1);
    if (step > 1) {
      setStep(step - 1);
    }
  };

  // Animation variants for step transitions
  const slideVariants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 1000 : -1000,
      opacity: 0,
    }),
    center: {
      zIndex: 1,
      x: 0,
      opacity: 1,
    },
    exit: (direction: number) => ({
      zIndex: 0,
      x: direction < 0 ? 1000 : -1000,
      opacity: 0,
    }),
  };

  // Animation variants for step content
  const contentVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.4,
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-gradient-to-br from-orange-50 to-pink-50">
      {/* Syncing Modal Overlay */}
      <AnimatePresence>
        {isSyncing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-6"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl shadow-2xl p-8 max-w-lg w-full"
            >
              <div className="flex flex-col items-center mb-6">
                <div className="relative">
                  <Loader2 className="h-12 w-12 text-orange-500 animate-spin" />
                  <Sparkles className="h-6 w-6 text-pink-500 absolute -top-1 -right-1" />
                </div>
                <h2 className="text-2xl font-bold mt-4 bg-gradient-to-r from-orange-600 to-pink-600 bg-clip-text text-transparent">
                  Setting up your account
                </h2>
                <p className="text-gray-600 text-center mt-2">
                  Please wait while we sync your courses and materials
                </p>
                
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
              </div>

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

              {syncProgress.length > 0 && syncProgress[syncProgress.length - 1].status === 'complete' && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-6"
                >
                  <div className="bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                      <p className="font-medium text-green-800">Sync Complete!</p>
                    </div>
                    <p className="text-sm text-green-700">
                      Your courses and materials have been successfully synced.
                    </p>
                  </div>
                  <div className="mt-4 text-center">
                    <p className="text-sm text-gray-600">
                      Preparing your workspace...
                    </p>
                  </div>
                </motion.div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="w-full max-w-3xl">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 mb-8"
        >
          <Sparkles className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold bg-gradient-to-r from-orange-600 to-pink-600 bg-clip-text text-transparent">
            InCourse
          </h1>
        </motion.div>

        {/* Progress Tracker */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex justify-between mb-2">
            {Array.from({ length: totalSteps }).map((_, index) => (
              <div key={index} className="flex flex-col items-center">
                <motion.div
                  initial={{ scale: 0.8 }}
                  animate={{ scale: 1 }}
                  className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    step > index + 1
                      ? "bg-gradient-to-r from-orange-500 to-pink-500 text-white"
                      : step === index + 1
                      ? "bg-gradient-to-r from-orange-500 to-pink-500 text-white"
                      : "bg-gray-100 text-gray-400"
                  }`}
                >
                  {step > index + 1 ? (
                    <CheckCircle2 className="h-5 w-5" />
                  ) : (
                    index + 1
                  )}
                </motion.div>
                <span
                  className={`text-sm mt-2 ${
                    step >= index + 1 ? "text-gray-900" : "text-gray-400"
                  }`}
                >
                  {index === 0
                    ? "Connect LMS"
                    : "Learning Preferences"}
                </span>
              </div>
            ))}
          </div>
          <div className="w-full bg-gray-100 rounded-full h-2 mb-4">
            <motion.div
              className="h-full bg-gradient-to-r from-orange-500 to-pink-500 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${((step - 1) / (totalSteps - 1)) * 100}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
        </motion.div>

        <div className="relative">
          <AnimatePresence initial={false} custom={direction} mode="wait">
            <motion.div
              key={step}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{
                x: { type: "spring", stiffness: 300, damping: 30 },
                opacity: { duration: 0.2 },
              }}
              className="w-full"
            >
              <Card className="w-full shadow-lg border-none">
                <AnimatePresence mode="wait">
                  {step === 1 && (
                    <motion.div
                      key="step1"
                      variants={contentVariants}
                      initial="hidden"
                      animate="visible"
                    >
                      <CardHeader>
                        <motion.div variants={itemVariants}>
                          <CardTitle className="text-2xl font-bold">
                            Connect your learning platform
                          </CardTitle>
                          <CardDescription>
                            InCourse integrates with your LMS to access your
                            course materials
                          </CardDescription>
                        </motion.div>
                      </CardHeader>
                      <CardContent className="space-y-6">
                        <motion.div variants={itemVariants}>
                          <div className="grid gap-4">
                            <div className="grid gap-2">
                              <Label>Your School</Label>
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
                              <Label htmlFor="api-token">Canvas API Token</Label>
                              <Input 
                                id="api-token" 
                                type="password"
                                placeholder="Enter your Canvas API token"
                                value={apiKey}
                                onChange={(e) => handleApiKeyChange(e.target.value)}
                                className={apiKeyError ? "border-red-500 focus:border-red-500" : ""}
                              />
                              {apiKeyError && (
                                <p className="text-sm text-red-500 mt-1">{apiKeyError}</p>
                              )}
                              <p className="text-sm text-muted-foreground">
                                You can find your API token in Canvas under
                                Account &gt; Settings &gt; Approved
                                Integrations
                              </p>
                            </div>
                          </div>
                        </motion.div>
                        <motion.div variants={itemVariants}>
                          <div className="flex items-start space-x-2 p-4 bg-gray-50 rounded-lg">
                            <Lock className="h-5 w-5 text-gray-400 mt-0.5" />
                            <div className="space-y-1">
                              <p className="text-sm font-medium">
                                Privacy & Security
                              </p>
                              <p className="text-sm text-muted-foreground">
                                We only access the course materials you
                                explicitly share. Your data is encrypted and
                                never shared with third parties.
                              </p>
                            </div>
                          </div>
                        </motion.div>
                      </CardContent>
                    </motion.div>
                  )}


                  {step === 2 && (
                    <motion.div
                      key="step2"
                      variants={contentVariants}
                      initial="hidden"
                      animate="visible"
                    >
                      <CardHeader>
                        <motion.div variants={itemVariants}>
                          <CardTitle className="text-2xl font-bold">
                            Learning preferences
                          </CardTitle>
                          <CardDescription>
                            Customize how you want to learn with InCourse
                          </CardDescription>
                        </motion.div>
                      </CardHeader>
                      <CardContent className="space-y-6">
                        <motion.div
                          variants={itemVariants}
                          className="space-y-3"
                        >
                          <Label>Preferred learning mode</Label>
                          <RadioGroup defaultValue="balanced">
                            {[
                              {
                                id: "quiz",
                                title: "Quiz-focused",
                                description:
                                  "Emphasize quizzes and active recall for better retention",
                              },
                              {
                                id: "flashcard",
                                title: "Flashcard-focused",
                                description:
                                  "Focus on spaced repetition with flashcards",
                              },
                              {
                                id: "balanced",
                                title: "Balanced",
                                description:
                                  "Mix of summaries, quizzes, and flashcards",
                              },
                            ].map((mode) => (
                              <motion.div
                                key={mode.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                whileHover={{ scale: 1.02 }}
                                className="flex items-start space-x-3 p-4 rounded-lg border hover:bg-gray-50 transition-colors"
                              >
                                <RadioGroupItem value={mode.id} id={mode.id} />
                                <div className="grid gap-1.5">
                                  <Label
                                    htmlFor={mode.id}
                                    className="font-medium"
                                  >
                                    {mode.title}
                                  </Label>
                                  <p className="text-sm text-muted-foreground">
                                    {mode.description}
                                  </p>
                                </div>
                              </motion.div>
                            ))}
                          </RadioGroup>
                        </motion.div>
                        <motion.div
                          variants={itemVariants}
                          className="space-y-3"
                        >
                          <Label>Notification preferences</Label>
                          <div className="space-y-2">
                            {[
                              {
                                id: "nudge-review",
                                label: "Nudge me to review material",
                              },
                              {
                                id: "nudge-quiz",
                                label: "Remind me to take quizzes",
                              },
                              {
                                id: "sync-calendar",
                                label: "Sync with my calendar",
                              },
                            ].map((pref) => (
                              <motion.div
                                key={pref.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="flex items-center space-x-2"
                              >
                                <Checkbox id={pref.id} defaultChecked />
                                <Label htmlFor={pref.id}>{pref.label}</Label>
                              </motion.div>
                            ))}
                          </div>
                        </motion.div>
                      </CardContent>
                    </motion.div>
                  )}
                </AnimatePresence>

                <CardFooter className="flex justify-between">
                  <Button
                    variant="outline"
                    onClick={prevStep}
                    disabled={step === 1 || isSyncing}
                    className="hover:bg-gray-100"
                  >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back
                  </Button>
                  <Button
                    onClick={nextStep}
                    disabled={isSyncing}
                    className="bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600"
                  >
                    {isSyncing ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Syncing...
                      </>
                    ) : (
                      <>
                        {step === totalSteps ? "Finish" : "Continue"}
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </>
                    )}
                  </Button>
                </CardFooter>
              </Card>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
