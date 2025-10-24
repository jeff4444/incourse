"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";

import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

export function TeamSwitcher({
  teams,
}: {
  teams: {
    name: string;
  }[];
}) {
  const [activeTeam] = React.useState(teams[0]);

  if (!activeTeam) {
    return null;
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton
          asChild
          size="default"
          className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground -ml-2 mt-3"
        >
          <Link href="/dashboard" className="flex items-center gap-0.5">
            <Image
              src="/incourse_logo.png"
              alt="InCourse Logo"
              width={32}
              height={32}
              className="h-8 w-8 -mr-2.5"
            />
            <span className="text-lg font-semibold text-[#016396]">{activeTeam.name}</span>
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
