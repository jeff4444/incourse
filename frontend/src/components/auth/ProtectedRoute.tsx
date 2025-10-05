"use client";

import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push("/sign-in");
    } else if (!loading && user) {
      // Check if user has completed onboarding
      const passedOnboarding = user.user_metadata?.passed_onboarding;
      
      // Only redirect to onboarding if they haven't completed it and we're not already on onboarding
      if (passedOnboarding === false && !window.location.pathname.includes('/onboarding')) {
        router.push("/onboarding");
      }
    }
  }, [user, loading, router]);

  if (loading) {
    return <div>Loading...</div>; // Or a spinner component
  }

  if (user) {
    return <>{children}</>;
  }

  return null;
};

export default ProtectedRoute;
