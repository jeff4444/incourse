# Frontend Component Development Rules

## Overview

This document outlines the coding standards, patterns, and best practices for developing frontend components in the InCourse application. These rules ensure consistency, maintainability, and adherence to shadcn/ui patterns.

## Table of Contents

1. [Component Structure](#component-structure)
2. [shadcn/ui Integration](#shadcnui-integration)
3. [Styling Guidelines](#styling-guidelines)
4. [TypeScript Standards](#typescript-standards)
5. [File Organization](#file-organization)
6. [Naming Conventions](#naming-conventions)
7. [Accessibility Requirements](#accessibility-requirements)
8. [Performance Guidelines](#performance-guidelines)
9. [Testing Standards](#testing-standards)
10. [Common Patterns](#common-patterns)

## Component Structure

### Basic Component Template

```tsx
"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ComponentNameProps {
  // Props with clear types
  title: string;
  description?: string;
  className?: string;
  children?: React.ReactNode;
  // Event handlers
  onClick?: () => void;
  onClose?: () => void;
}

export function ComponentName({
  title,
  description,
  className,
  children,
  onClick,
  onClose,
}: ComponentNameProps) {
  return (
    <Card className={cn("default-styles", className)}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <p className="text-muted-foreground">{description}</p>}
      </CardHeader>
      <CardContent>
        {children}
        <Button onClick={onClick}>Action</Button>
      </CardContent>
    </Card>
  );
}
```

### Component Rules

1. **Always use "use client"** for interactive components
2. **Export as named function** with PascalCase
3. **Define clear interfaces** for all props
4. **Use optional props** with `?` when appropriate
5. **Include className prop** for styling flexibility
6. **Use forwardRef** for components that need ref forwarding

## shadcn/ui Integration

### Required Imports

```tsx
// Always import these utilities
import { cn } from "@/lib/utils";

// Import shadcn/ui components as needed
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
```

### Component Usage Rules

1. **Use shadcn/ui components** as the foundation for all UI elements
2. **Extend with className** rather than creating custom components
3. **Compose complex components** from simple shadcn/ui primitives
4. **Preserve shadcn/ui patterns** and don't override core functionality

### Available shadcn/ui Components

```tsx
// Layout & Structure
Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter
Separator
ScrollArea, ScrollBar

// Navigation
Button (with variants: default, destructive, outline, secondary, ghost, link)
Tabs, TabsList, TabsTrigger, TabsContent
Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle, SheetDescription

// Forms
Input, Textarea, Label
Select, SelectContent, SelectItem, SelectTrigger, SelectValue
Checkbox, RadioGroup, RadioGroupItem
Slider
Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage

// Feedback
Badge, Skeleton
Toast, Toaster, ToastAction, ToastClose, ToastDescription, ToastTitle, ToastViewport
Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger
Alert, AlertDescription, AlertTitle

// Data Display
Avatar, AvatarFallback, AvatarImage
Progress
Table, TableBody, TableCell, TableHead, TableHeader, TableRow

// Overlays
DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger
Popover, PopoverContent, PopoverTrigger
Tooltip, TooltipContent, TooltipProvider, TooltipTrigger
```

## Styling Guidelines

### Tailwind CSS v4 Rules

1. **Use CSS variables** for theming: `bg-background`, `text-foreground`, `border-border`
2. **Leverage design tokens**: `rounded-lg`, `shadow-sm`, `p-4`, `gap-2`
3. **Use semantic colors**: `text-muted-foreground`, `bg-muted`, `text-destructive`
4. **Apply responsive design**: `md:grid-cols-2`, `lg:px-6`, `sm:hidden`

### Class Naming Pattern

```tsx
// Base styles + variants + responsive + state + custom
className={cn(
  "base-styles", // Always applied
  "variant-styles", // Conditional based on props
  "responsive-styles", // Breakpoint-specific
  "state-styles", // Hover, focus, active
  "custom-styles", // Component-specific
  className // User-provided overrides
)}
```

### Dark Mode Support

```tsx
// Always use semantic color tokens
className = "bg-background text-foreground border-border";

// For custom colors, provide both light and dark variants
className = "bg-blue-50 text-blue-900 dark:bg-blue-950 dark:text-blue-100";
```

### Animation Guidelines

```tsx
// Use Tailwind's built-in animations
className = "animate-pulse animate-spin animate-bounce";

// For custom animations, define in globals.css
className = "animate-fade-in animate-slide-up";
```

## TypeScript Standards

### Interface Definitions

```tsx
// Use descriptive, specific interfaces
interface UserProfileProps {
  user: {
    id: string;
    name: string;
    email: string;
    avatar?: string;
  };
  onEdit?: (userId: string) => void;
  onDelete?: (userId: string) => void;
  className?: string;
}

// Use union types for variants
type ButtonVariant =
  | "default"
  | "destructive"
  | "outline"
  | "secondary"
  | "ghost"
  | "link";
type ButtonSize = "default" | "sm" | "lg" | "icon";

// Use generic types when appropriate
interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  onRowClick?: (row: T) => void;
}
```

### Type Safety Rules

1. **Define explicit types** for all props
2. **Use optional chaining** for potentially undefined values
3. **Provide default values** for optional props
4. **Use type guards** for runtime type checking
5. **Avoid `any` type** - use `unknown` or specific types

## File Organization

### Directory Structure

```
src/
├── components/
│   ├── ui/                 # shadcn/ui components
│   ├── layout/            # Layout components (header, footer, sidebar)
│   ├── forms/             # Form-specific components
│   ├── data-display/      # Tables, lists, cards
│   ├── feedback/          # Alerts, toasts, modals
│   └── [feature]/         # Feature-specific components
├── lib/
│   ├── utils.ts           # Utility functions
│   ├── hooks/             # Custom React hooks
│   └── providers/         # Context providers
└── types/
    └── index.ts           # Type definitions
```

### File Naming

- **Components**: `kebab-case.tsx` (e.g., `user-profile.tsx`)
- **Hooks**: `use-kebab-case.ts` (e.g., `use-user-data.ts`)
- **Types**: `kebab-case.ts` (e.g., `user-types.ts`)
- **Utils**: `kebab-case.ts` (e.g., `format-date.ts`)

## Naming Conventions

### Component Names

```tsx
// ✅ Good
export function UserProfileCard() {}
export function CourseAssignmentList() {}
export function NoteEditorToolbar() {}

// ❌ Bad
export function userProfileCard() {}
export function CourseAssignmentListComponent() {}
export function Card() {} // Too generic
```

### Props and Variables

```tsx
// ✅ Good
const isUserLoggedIn = true;
const courseAssignments = [];
const onUserUpdate = () => {};

// ❌ Bad
const userLoggedIn = true; // Missing is prefix for boolean
const course_assignments = []; // Use camelCase
const on_user_update = () => {}; // Use camelCase
```

### CSS Classes

```tsx
// ✅ Good
className = "flex items-center gap-2 p-4 rounded-lg border";
className = "text-lg font-semibold text-foreground";

// ❌ Bad
className = "flex items-center gap-2 p-4 rounded-lg border"; // Inconsistent spacing
className = "text-lg font-semibold text-foreground"; // Missing responsive design
```

## Accessibility Requirements

### ARIA Attributes

```tsx
// Always include proper ARIA attributes
<Button
  aria-label="Close dialog"
  aria-expanded={isOpen}
  aria-controls="dialog-content"
>
  <X className="h-4 w-4" />
</Button>

// Use semantic HTML elements
<main>
  <section aria-labelledby="course-heading">
    <h2 id="course-heading">Course Information</h2>
  </section>
</main>
```

### Keyboard Navigation

```tsx
// Ensure keyboard accessibility
<Button
  onKeyDown={(e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onClick?.();
    }
  }}
>
  Action
</Button>
```

### Screen Reader Support

```tsx
// Provide screen reader text
<Button>
  <Trash2 className="h-4 w-4" />
  <span className="sr-only">Delete item</span>
</Button>

// Use proper heading hierarchy
<h1>Page Title</h1>
  <h2>Section Title</h2>
    <h3>Subsection Title</h3>
```

## Performance Guidelines

### React Optimization

```tsx
// Use React.memo for expensive components
export const ExpensiveComponent = React.memo(function ExpensiveComponent({
  data,
  onUpdate,
}: ExpensiveComponentProps) {
  // Component logic
});

// Use useMemo for expensive calculations
const expensiveValue = useMemo(() => {
  return data.reduce((acc, item) => acc + item.value, 0);
}, [data]);

// Use useCallback for event handlers
const handleClick = useCallback(() => {
  onUpdate?.(id);
}, [id, onUpdate]);
```

### Bundle Size

```tsx
// Import only what you need
import { Button } from "@/components/ui/button"; // ✅ Good
import * as UI from "@/components/ui"; // ❌ Bad

// Use dynamic imports for large components
const HeavyComponent = lazy(() => import("./heavy-component"));
```

## Testing Standards

### Component Testing

```tsx
// Test component rendering and interactions
import { render, screen, fireEvent } from "@testing-library/react";
import { ComponentName } from "./component-name";

describe("ComponentName", () => {
  it("renders with required props", () => {
    render(<ComponentName title="Test Title" />);
    expect(screen.getByText("Test Title")).toBeInTheDocument();
  });

  it("calls onClick when button is clicked", () => {
    const handleClick = jest.fn();
    render(<ComponentName title="Test" onClick={handleClick} />);

    fireEvent.click(screen.getByRole("button"));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});
```

## Common Patterns

### Loading States

```tsx
// Use Skeleton components for loading states
export function CourseCard({ course, isLoading }: CourseCardProps) {
  if (isLoading) {
    return (
      <Card>
        <CardContent>
          <Skeleton className="h-4 w-3/4 mb-2" />
          <Skeleton className="h-4 w-1/2" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent>
        <h3>{course.name}</h3>
        <p>{course.description}</p>
      </CardContent>
    </Card>
  );
}
```

### Error States

```tsx
// Provide clear error states
export function DataList({ data, error, isLoading }: DataListProps) {
  if (error) {
    return (
      <Card>
        <CardContent>
          <div className="text-center py-8">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <p className="text-destructive">Failed to load data</p>
            <Button variant="outline" onClick={onRetry}>
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // ... rest of component
}
```

### Empty States

```tsx
// Provide helpful empty states
export function AssignmentList({ assignments }: AssignmentListProps) {
  if (assignments.length === 0) {
    return (
      <Card>
        <CardContent>
          <div className="text-center py-8">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No assignments found</p>
            <Button>Create Assignment</Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // ... rest of component
}
```

### Form Patterns

```tsx
// Use proper form patterns with validation
export function UserForm({ onSubmit, defaultValues }: UserFormProps) {
  const form = useForm<UserFormData>({
    resolver: zodResolver(userFormSchema),
    defaultValues,
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? "Saving..." : "Save"}
        </Button>
      </form>
    </Form>
  );
}
```

## Code Review Checklist

### Before Submitting

- [ ] Component follows the basic template structure
- [ ] All props are properly typed
- [ ] Uses shadcn/ui components where appropriate
- [ ] Includes proper accessibility attributes
- [ ] Handles loading, error, and empty states
- [ ] Uses semantic HTML elements
- [ ] Follows naming conventions
- [ ] Includes proper TypeScript types
- [ ] Uses `cn()` utility for className composition
- [ ] Supports dark mode with semantic color tokens
- [ ] Includes proper keyboard navigation
- [ ] Has appropriate ARIA labels and descriptions
- [ ] Follows performance best practices
- [ ] Includes proper error boundaries
- [ ] Uses proper React patterns (memo, callback, etc.)

### Code Quality

- [ ] No console.log statements
- [ ] No unused imports
- [ ] No TypeScript errors
- [ ] No ESLint warnings
- [ ] Proper error handling
- [ ] Clean, readable code
- [ ] Appropriate comments for complex logic
- [ ] Consistent formatting

## Resources

- [shadcn/ui Documentation](https://ui.shadcn.com/)
- [Tailwind CSS v4 Documentation](https://tailwindcss.com/docs)
- [React TypeScript Cheatsheet](https://react-typescript-cheatsheet.netlify.app/)
- [Accessibility Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [Next.js Documentation](https://nextjs.org/docs)

---

**Remember**: These rules ensure consistency, maintainability, and a great user experience. When in doubt, refer to existing components in the codebase for patterns and examples.
