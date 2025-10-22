"use client";
import { CourseList } from "./course-list";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import { SidebarLayout } from "@/components/layout/sidebar-layout";

function CoursesPage() {
  return (
    <SidebarLayout breadcrumbs={[{ label: "Courses" }]}>
      <main className="container mx-auto py-6 px-4 md:px-6">
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
