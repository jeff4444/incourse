"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, BookOpen, Calendar, Sparkles } from "lucide-react";

import { NavMain } from "@/components/nav-main";
import { NavUser } from "@/components/nav-user";
import { TeamSwitcher } from "@/components/team-switcher";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar";
import { useAuth } from "@/hooks/useAuth";

// Navigation items for the sidebar
const navItems = [
  {
    title: "Home",
    url: "/dashboard",
    icon: Home,
    isActive: false,
  },
  {
    title: "Courses",
    url: "/courses",
    icon: BookOpen,
    isActive: false,
  },
  {
    title: "Calendar",
    url: "/calendar",
    icon: Calendar,
    isActive: false,
  },
];

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname();
  const { user } = useAuth();

  // Update active state based on current pathname
  const itemsWithActiveState = navItems.map((item) => ({
    ...item,
    isActive:
      pathname === item.url ||
      (item.url !== "/dashboard" && pathname.startsWith(item.url)),
  }));

  // Get user data for the sidebar
  const userData = {
    name:
      user?.user_metadata?.full_name?.split(" ")[0] ||
      user?.email?.split("@")[0] ||
      "User",
    email: user?.email || "user@example.com",
    avatar: user?.user_metadata?.avatar_url || "/avatars/default.jpg",
  };

  // Team data for the app name section
  const teamData = [
    {
      name: "InCourse",
      logo: Sparkles,
      plan: "Learning Platform",
    },
  ];

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <TeamSwitcher teams={teamData} />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={itemsWithActiveState} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={userData} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
