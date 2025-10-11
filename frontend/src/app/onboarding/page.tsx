"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@/lib/utils/supabase/client";
import { encryptApiKey } from "@/lib/utils/encryption";
import { Button } from "@/components/ui/button";
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
} from "lucide-react";

const supabase = createClient();

export default function OnboardingPage() {
  const [step, setStep] = useState(1);
  const [direction, setDirection] = useState(0); // -1 for back, 1 for forward
  const totalSteps = 2;
  const [canvasUrl, setCanvasUrl] = useState("");
  const [urlError, setUrlError] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [apiKeyError, setApiKeyError] = useState("");

  // Canvas URL validation and formatting
  const validateAndFormatCanvasUrl = (url: string): { isValid: boolean; formattedUrl: string; error: string } => {
    if (!url.trim()) {
      return { isValid: false, formattedUrl: "", error: "Canvas URL is required" };
    }

    let formattedUrl = url.trim();
    
    // Add https:// if not present
    if (!formattedUrl.startsWith("http://") && !formattedUrl.startsWith("https://")) {
      formattedUrl = "https://" + formattedUrl;
    }

    // Validate the format: https://canvas.{university}.edu
    const canvasUrlRegex = /^https:\/\/canvas\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.edu(\/.*)?$/;
    
    if (!canvasUrlRegex.test(formattedUrl)) {
      return { 
        isValid: false, 
        formattedUrl: "", 
        error: "Please enter a valid Canvas URL in the format: https://canvas.university.edu" 
      };
    }

    return { isValid: true, formattedUrl, error: "" };
  };

  const handleUrlChange = (value: string) => {
    setCanvasUrl(value);
    setUrlError(""); // Clear error when user types
  };

  const handleApiKeyChange = (value: string) => {
    setApiKey(value);
    setApiKeyError(""); // Clear error when user types
  };

  // Store Canvas credentials to database
  const storeCanvasCredentials = async (url: string, key: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error("User not authenticated");
      }

      const encryptedApiKey = encryptApiKey(key);

      const { error } = await supabase
        .from('user_api_keys')
        .upsert({
          user_id: user.id,
          lms_provider: 'canvas',
          encrypted_api_key: encryptedApiKey,
          api_base_url: url,
          is_active: true
        });

      if (error) {
        throw error;
      }

      return { success: true };
    } catch (error) {
      console.error('Error storing Canvas credentials:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error occurred' };
    }
  };

  // Fetch and sync courses to database
  const syncCoursesToDatabase = async (apiBaseUrl: string, apiKey: string) => {
    try {
      console.log('Syncing courses to database...');
      
      // Get session for authentication
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error("No active session");
      }

      // Send API credentials to server - it will fetch courses and sync them
      const response = await fetch('/api/courses/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ 
          apiKey,
          apiBaseUrl: `${apiBaseUrl}/api/v1`
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to sync courses');
      }

      const result = await response.json();
      console.log('Courses synced successfully:', result);
      return { success: true };
    } catch (error) {
      console.error('Error syncing courses:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error occurred' };
    }
  };

  const nextStep = async () => {
    // Validate Canvas URL and API key on step 1
    if (step === 1) {
      const validation = validateAndFormatCanvasUrl(canvasUrl);
      if (!validation.isValid) {
        setUrlError(validation.error);
        return; // Don't proceed to next step if validation fails
      }

      // Validate API key
      if (!apiKey.trim()) {
        setApiKeyError("API key is required");
        return;
      }

      // Update the URL with the formatted version
      setCanvasUrl(validation.formattedUrl);

      // Store credentials to database
      const storeResult = await storeCanvasCredentials(validation.formattedUrl, apiKey);
      if (!storeResult.success) {
        setApiKeyError(`Failed to save credentials: ${storeResult.error}`);
        return;
      }

      // Sync courses to database after storing credentials
      // Use the API key and URL that were just entered
      const syncResult = await syncCoursesToDatabase(validation.formattedUrl, apiKey);
      if (!syncResult.success) {
        // Log the error but don't block onboarding
        console.error('Failed to sync courses during onboarding:', syncResult.error);
        // Continue with onboarding even if course sync fails
      }
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
                              <Label htmlFor="canvas-url">Canvas URL</Label>
                              <Input
                                id="canvas-url"
                                placeholder="https://canvas.university.edu"
                                value={canvasUrl}
                                onChange={(e) => handleUrlChange(e.target.value)}
                                className={urlError ? "border-red-500 focus:border-red-500" : ""}
                              />
                              {urlError && (
                                <p className="text-sm text-red-500 mt-1">{urlError}</p>
                              )}
                            </div>
                            <div className="grid gap-2">
                              <Label htmlFor="api-token">API Token</Label>
                              <Input 
                                id="api-token" 
                                type="password"
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
                    disabled={step === 1}
                    className="hover:bg-gray-100"
                  >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back
                  </Button>
                  <Button
                    onClick={nextStep}
                    className="bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600"
                  >
                    {step === totalSteps ? "Finish" : "Continue"}
                    <ArrowRight className="ml-2 h-4 w-4" />
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
