"use client";

import { useState } from "react";
import { CourseCard } from "@/components/course-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { BookOpen, Search, ChevronDown } from "lucide-react";
import { useCourses } from "@/lib/hooks/useCourses";

export function CourseList() {
  const { data: courses = [], isLoading: loading, error } = useCourses();
  const [searchTerm, setSearchTerm] = useState("");
  // Calculate current semester and year for default filter
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();
  const currentSemester = currentMonth >= 7 ? "Fall" : "Spring";
  const currentSemesterYear = `${currentSemester} ${currentYear}`;

  const [selectedSemester, setSelectedSemester] = useState(currentSemesterYear);

  // Generate semester options for the last 6 semesters
  const semesterOptions = [];
  let year = currentYear;
  let semester = currentSemester;

  for (let i = 0; i < 6; i++) {
    semesterOptions.push(`${semester} ${year}`);
    if (semester === "Fall") {
      semester = "Spring";
    } else {
      semester = "Fall";
      year--;
    }
  }
  semesterOptions.push("All Courses");

  const filteredCourses = courses.filter((course) => {
    const matchesSearchTerm =
      course.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      course.code.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesSemester =
      selectedSemester === "All Courses" ||
      (course.semester &&
        course.year &&
        `${course.semester} ${course.year}` === selectedSemester);

    return matchesSearchTerm && matchesSemester;
  });

  if (error) {
    return (
      <div className="text-center py-12">
        <BookOpen className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-foreground mb-2">
          Failed to load courses
        </h2>
        <p className="text-muted-foreground">
          There was an error loading your courses. Please try again later.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-3xl font-bold">Your Courses</h1>
      </div>

      <div className="mb-6 flex gap-4">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search courses..."
            className="pl-9 h-10 shadow-sm! focus:shadow-sm! active:shadow-sm! hover:shadow-sm!"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              className="w-[200px] justify-between h-10 shadow-sm! focus:shadow-sm! active:shadow-sm! hover:shadow-sm!"
            >
              {selectedSemester}
              <ChevronDown className="h-4 w-4 opacity-50" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-[200px] bg-[#fbfcf8]">
            {semesterOptions.map((semester) => (
              <DropdownMenuItem
                key={semester}
                onClick={() => setSelectedSemester(semester)}
                className="cursor-pointer"
              >
                {semester}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="rounded-xl h-64" />
          ))}
        </div>
      ) : filteredCourses.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {filteredCourses.map((course) => (
            <CourseCard key={course.id} course={course} />
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <BookOpen className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-foreground mb-2">
            No courses found
          </h2>
          <p className="text-muted-foreground">
            {searchTerm || selectedSemester !== "All Courses"
              ? "Try adjusting your search or filter."
              : "Get started by adding your first course."}
          </p>
        </div>
      )}
    </div>
  );
}
