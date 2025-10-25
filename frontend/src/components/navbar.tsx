"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Bell,
  BookOpen,
  Calendar,
  ChevronDown,
  Home,
  LogOut,
  Menu,
  Search,
  Settings,
  Sparkles,
  User,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { createClient } from "@/lib/utils/supabase/client";
import { useNudges } from "@/lib/hooks/useNudges";
import { NudgeCard } from "@/components/nudge-card";

export function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading } = useAuth();
  const supabase = createClient();
  const { nudges, dismissNudge } = useNudges();
  
  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/sign-in");
  };

  const isActive = (path: string) => pathname === path;
  
  // Get active nudges count
  const activeNudges = nudges.filter(n => n.status === 'active');
  const nudgeCount = activeNudges.length;

  return (
    <header className="sticky top-0 z-50 w-screen bg-background/95 border-b backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4 md:px-6">
      <div className="max-w-screen-2xl mx-auto flex h-16 items-center justify-between">
        <div className="flex items-center gap-2 md:gap-4">
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            <Menu className="h-5 w-5" />
            <span className="sr-only">Toggle menu</span>
          </Button>
          <Link href="/dashboard" className="flex items-center gap-2">
            <Image 
              src="/incourse_logo.png" 
              alt="InCourse Logo" 
              width={24} 
              height={24} 
              className="h-10 w-10"
            />
            <span className="text-xl font-bold hidden md:inline-block bg-gradient-to-rtext-transparent">
              InCourse
            </span>
          </Link>
          <nav className="hidden md:flex items-center gap-1 pl-8">
            <Button
              variant={isActive("/dashboard") ? "secondary" : "ghost"}
              size="sm"
              asChild
            >
              <Link href="/dashboard">
                <Home className="h-4 w-4 mr-2" />
                Home
              </Link>
            </Button>
            <Button
              variant={pathname.startsWith("/course") ? "secondary" : "ghost"}
              size="sm"
              asChild
            >
              <Link href="/courses">
                <BookOpen className="h-4 w-4 mr-2" />
                Courses
              </Link>
            </Button>
            <Button
              variant={isActive("/calendar") ? "secondary" : "ghost"}
              size="sm"
              asChild
            >
              <Link href="/calendar">
                <Calendar className="h-4 w-4 mr-2" />
                Calendar
              </Link>
            </Button>
          </nav>
        </div>

        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="h-5 w-5" />
                {nudgeCount > 0 && (
                  <span className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center rounded-full bg-red-500 text-white text-xs font-semibold">
                    {nudgeCount}
                  </span>
                )}
                <span className="sr-only">Notifications</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-96 max-h-[500px]">
              <div className="p-3 border-b">
                <h3 className="font-semibold text-sm">Notifications</h3>
                {nudgeCount > 0 && (
                  <p className="text-xs text-muted-foreground">{nudgeCount} active nudges</p>
                )}
              </div>
              <div className="max-h-[400px] overflow-y-auto">
                {activeNudges.length > 0 ? (
                  <div>
                    {activeNudges.map((nudge) => (
                      <div key={nudge.id} className="p-2">
                        <NudgeCard 
                          nudge={nudge} 
                          onDismiss={dismissNudge}
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center p-8 text-center">
                    <Bell className="h-12 w-12 text-muted-foreground/50 mb-3" />
                    <p className="text-sm text-muted-foreground">No active nudges</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Your personalized nudges will appear here
                    </p>
                  </div>
                )}
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
          {loading ? (
            <div className="h-8 w-24 bg-gray-200 rounded animate-pulse"></div>
          ) : user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-1">
                  <User className="h-5 w-5" />
                  <span className="hidden md:inline-block">
                    {user.email?.split("@")[0]}
                  </span>
                  <ChevronDown className="h-4 w-4 hidden md:block" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/profile">
                    <User className="h-4 w-4 mr-2" />
                    Profile & Settings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleSignOut}
                  className="cursor-pointer"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button asChild variant="ghost">
              <Link href="/sign-in">Sign In</Link>
            </Button>
          )}
        </div>
      </div>

      {/* Mobile menu */}
      {isMenuOpen && (
        <div className="md:hidden border-t p-4">
          <nav className="grid gap-2">
            <Button
              variant={isActive("/dashboard") ? "secondary" : "ghost"}
              className="justify-start"
              asChild
            >
              <Link href="/dashboard">
                <Home className="h-4 w-4 mr-2" />
                Dashboard
              </Link>
            </Button>
            <Button
              variant={pathname.startsWith("/course") ? "secondary" : "ghost"}
              className="justify-start"
              asChild
            >
              <Link href="/courses">
                <BookOpen className="h-4 w-4 mr-2" />
                Courses
              </Link>
            </Button>
            <Button
              variant={isActive("/calendar") ? "secondary" : "ghost"}
              className="justify-start"
              asChild
            >
              <Link href="/calendar">
                <Calendar className="h-4 w-4 mr-2" />
                Calendar
              </Link>
            </Button>
            <Button
              variant={isActive("/profile") ? "secondary" : "ghost"}
              className="justify-start"
              asChild
            >
              <Link href="/profile">
                <User className="h-4 w-4 mr-2" />
                Profile
              </Link>
            </Button>
          </nav>
        </div>
      )}
    </header>
  );
}
