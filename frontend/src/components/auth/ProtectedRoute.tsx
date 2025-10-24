"use client";

import { useAuth } from "@/hooks/useAuth";
import { useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !user) {
      router.push("/sign-in");
    } else if (!loading && user) {
      // Check if user has completed onboarding
      const passedOnboarding = user.user_metadata?.passed_onboarding;
      
      // If user hasn't completed onboarding and is not on onboarding page, redirect to onboarding
      if (passedOnboarding !== true && pathname !== '/onboarding') {
        router.push("/onboarding");
      }
      // If user has completed onboarding and is on onboarding page, redirect to dashboard
      else if (passedOnboarding === true && pathname === '/onboarding') {
        router.push("/dashboard");
      }
    }
  }, [user, loading, router, pathname]);

  if (loading) {
    return <div>Loading...</div>; // Or a spinner component
  }

  if (user) {
    return <>{children}</>;
  }

  return null;
};

export default ProtectedRoute;
