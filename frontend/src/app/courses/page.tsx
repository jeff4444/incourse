"use client";
import { CourseList } from "./course-list";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import { SidebarLayout } from "@/components/layout/sidebar-layout";
import { Separator } from "@/components/ui/separator";

function CoursesPage() {
  return (
    <SidebarLayout breadcrumbs={[{ label: "Courses" }]}>
      <Separator orientation="horizontal" className="w-full mb-1 -mt-2 bg-gray-200" />
      <main className="container mx-auto py-2 px-4 md:px-6">
        <CourseList />
      </main>
    </SidebarLayout>
  );
}

export default function WrappedCoursesPage() {
  return (
    <ProtectedRoute>
      <CoursesPage />
    </ProtectedRoute>
  );
}
