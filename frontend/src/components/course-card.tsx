import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Calendar, TrendingUp } from "lucide-react";
import { Course } from "@/lib/types/course";

function calculateSemesterProgress(semester: string | null, year: string | null): number {
  if (!semester || !year) return 0;
  
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1; // JavaScript months are 0-based
  
  // If the course is from a different year, return 100 for past semesters or 0 for future semesters
  if (parseInt(year) !== currentYear) {
    if (semester === 'Spring' && parseInt(year) < currentYear) return 100;
    if (semester === 'Fall' && parseInt(year) < currentYear) return 100;
    return 0;
  }

  if (semester === 'Spring') {
    // Spring semester: January (1) to May (5)
    if (currentMonth < 1) return 0;
    if (currentMonth > 5) return 100;
    return ((currentMonth - 1) / 4) * 100;
  } else if (semester === 'Fall') {
    // Fall semester: August (8) to December (12)
    if (currentMonth < 8) return 0;
    if (currentMonth > 12) return 100;
    return ((currentMonth - 8) / 4) * 100;
  }
  
  return 0;
}

export function CourseCard({ course }: { course: Course }) {
  const progress = calculateSemesterProgress(course.semester, course.year);
  
  return (
    <Link href={{
      pathname: `/courses/${course.id}`,
    }}>
      <Card className="h-full overflow-hidden transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/10 hover:-translate-y-1 group cursor-pointer">
        <CardContent className="h-full flex flex-col">
          {/* Header with icon and term */}
          <div className="flex items-start justify-between mb-6">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl blur-sm opacity-50 group-hover:opacity-100 transition-opacity"></div>
              <div className="relative bg-gradient-to-br from-blue-500 to-blue-600 text-white p-3 rounded-xl">
                <BookOpen className="h-6 w-6" />
              </div>
            </div>
            <Badge 
              variant="secondary" 
              className="bg-gradient-to-r from-gray-100 to-gray-200 text-gray-700 border-0 shadow-sm"
            >
              <Calendar className="h-3 w-3 mr-1" />
              {course.year} {course.semester}
            </Badge>
          </div>

          {/* Course information */}
          <div className="flex-1 space-y-3">
            <h3 className="font-bold text-xl text-gray-900 line-clamp-2 leading-tight group-hover:text-blue-600 transition-colors">
              {course.name}
            </h3>
            {course.code && (
              <p className="text-sm font-medium text-blue-600 bg-blue-50 px-3 py-1 rounded-full inline-block">
                {course.code}
              </p>
            )}
          </div>

          {/* Progress section */}
          <div className="mt-6 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600 font-medium">Semester Progress</span>
              <span className="text-gray-900 font-semibold">{Math.round(progress)}%</span>
            </div>
            <div className="relative">
              <Progress 
                value={progress} 
                className="h-2 bg-gray-200"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full opacity-0 group-hover:opacity-20 transition-opacity"></div>
            </div>
            <div className="flex items-center text-xs text-gray-500">
              <TrendingUp className="h-3 w-3 mr-1" />
              <span>On track for completion</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
