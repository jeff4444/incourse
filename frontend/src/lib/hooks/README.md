# React Query Hooks for Data Caching

This directory contains custom React Query hooks that provide intelligent data caching for the InCourse application.

## Overview

We use [TanStack Query (React Query)](https://tanstack.com/query/latest) to implement sophisticated caching strategies that:

- **Eliminate unnecessary API calls** when navigating between pages
- **Cache data intelligently** with appropriate stale times and garbage collection
- **Provide optimistic updates** for better user experience
- **Handle loading and error states** consistently across the app

## Available Hooks

### Course-related Hooks

#### `useCourses()`
Fetches all courses with caching. Data is cached for 5 minutes and kept in memory for 10 minutes.

```typescript
const { data: courses, isLoading, error } = useCourses();
```

#### `useCourse(courseId: string)`
Fetches a specific course by ID with caching.

```typescript
const { data: course, isLoading, error } = useCourse(courseId);
```

#### `useModules(courseId: string)`
Fetches modules for a specific course with caching.

```typescript
const { data: modules, isLoading, error } = useModules(courseId);
```

#### `usePage(courseId: string, pageUrl: string)`
Fetches a specific page for a course with caching.

```typescript
const { data: page, isLoading, error } = usePage(courseId, pageUrl);
```

### Mutation Hooks

#### `useUpdateCourse()`
Updates course data and automatically invalidates related cache entries.

```typescript
const updateCourse = useUpdateCourse();
updateCourse.mutate({ courseId, data: updatedData });
```

#### `useDeleteCourse()`
Deletes a course and removes it from cache.

```typescript
const deleteCourse = useDeleteCourse();
deleteCourse.mutate(courseId);
```

## Cache Strategy

### Stale Time: 5 minutes
Data is considered fresh for 5 minutes, meaning no refetch will occur during this time.

### Garbage Collection Time: 10 minutes
Unused data is kept in memory for 10 minutes after the last component stops using it.

### Query Keys
We use a hierarchical query key structure for efficient cache management:

```typescript
courseKeys = {
  all: ['courses'],
  lists: () => ['courses', 'list'],
  list: (filters) => ['courses', 'list', { filters }],
  details: () => ['courses', 'detail'],
  detail: (id) => ['courses', 'detail', id],
  modules: (id) => ['courses', 'detail', id, 'modules'],
  pages: (courseId, pageUrl) => ['courses', 'detail', courseId, 'pages', pageUrl]
}
```

## Benefits

1. **Faster Navigation**: When users navigate back to a previously visited page, data loads instantly from cache
2. **Reduced API Calls**: Eliminates redundant network requests
3. **Better UX**: Consistent loading states and error handling
4. **Offline Support**: Cached data remains available when offline
5. **Optimistic Updates**: UI updates immediately while mutations are in progress

## Usage Example

```typescript
// In a component
import { useCourses, useCourse } from "@/lib/hooks/useCourses";

function CourseList() {
  const { data: courses, isLoading, error } = useCourses();
  
  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorMessage />;
  
  return (
    <div>
      {courses.map(course => (
        <CourseCard key={course.id} course={course} />
      ))}
    </div>
  );
}

function CourseDetail({ courseId }: { courseId: string }) {
  const { data: course, isLoading } = useCourse(courseId);
  
  // This will use cached data if available, or fetch if needed
  // No loading state if data is already cached
}
```

## Development Tools

React Query DevTools are included in development mode. You can:
- Inspect the current cache state
- Manually invalidate queries
- View query status and timing
- Debug cache behavior

Access them via the floating devtools panel in development mode.
