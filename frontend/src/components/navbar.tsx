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
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
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
  User,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { createClient } from "@/lib/utils/supabase/client";

export function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading } = useAuth();
  const supabase = createClient();
  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/sign-in");
  };

  const isActive = (path: string) => pathname === path;

  return (
    <header className="sticky top-0 z-50 w-screen bg-background/95 border-b backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4 md:px-6">
      <div className="max-w-screen-2xl mx-auto flex h-16 items-center justify-between">
        <div className="flex items-center gap-2 md:gap-4">
          <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle menu</span>
              </Button>
            </SheetTrigger>
          </Sheet>
          <Link href="/dashboard" className="flex items-center">
            <Image
              src="/incourse_logo.png"
              alt="InCourse Logo"
              width={32}
              height={32}
              className="h-8 w-8"
            />
            <span className="text-2xl font-bold hidden md:inline-block -ml-1">
              InCourse
            </span>
          </Link>
          <nav className="hidden md:flex items-center gap-1">
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
          <Button variant="ghost" size="icon" className="hidden md:flex">
            <Search className="h-5 w-5" />
            <span className="sr-only">Search</span>
          </Button>
          <Button variant="ghost" size="icon">
            <Bell className="h-5 w-5" />
            <span className="sr-only">Notifications</span>
          </Button>
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
      <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
        <SheetContent side="left" className="w-64">
          <nav className="grid gap-2 mt-6">
            <Button
              variant={isActive("/dashboard") ? "secondary" : "ghost"}
              className="justify-start"
              asChild
            >
              <Link href="/dashboard" onClick={() => setIsMenuOpen(false)}>
                <Home className="h-4 w-4 mr-2" />
                Dashboard
              </Link>
            </Button>
            <Button
              variant={pathname.startsWith("/course") ? "secondary" : "ghost"}
              className="justify-start"
              asChild
            >
              <Link href="/courses" onClick={() => setIsMenuOpen(false)}>
                <BookOpen className="h-4 w-4 mr-2" />
                Courses
              </Link>
            </Button>
            <Button
              variant={isActive("/calendar") ? "secondary" : "ghost"}
              className="justify-start"
              asChild
            >
              <Link href="/calendar" onClick={() => setIsMenuOpen(false)}>
                <Calendar className="h-4 w-4 mr-2" />
                Calendar
              </Link>
            </Button>
            <Button
              variant={isActive("/profile") ? "secondary" : "ghost"}
              className="justify-start"
              asChild
            >
              <Link href="/profile" onClick={() => setIsMenuOpen(false)}>
                <User className="h-4 w-4 mr-2" />
                Profile
              </Link>
            </Button>
          </nav>
        </SheetContent>
      </Sheet>
    </header>
  );
}
