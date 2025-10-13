/**
 * Super user emails that can bypass email domain validation
 * (can use any email domain like gmail.com instead of school email)
 * but still require email confirmation and must select a school during signup
 */
export const SUPER_USER_EMAILS = [
  // Add super user emails here
  // Example: "admin@incourseai.com"
  "allojeff444@gmail.com"
];

/**
 * Check if an email belongs to a super user
 */
export function isSuperUser(email: string): boolean {
  return SUPER_USER_EMAILS.includes(email.toLowerCase());
}

