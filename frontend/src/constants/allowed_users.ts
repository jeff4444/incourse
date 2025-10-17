/**
 * Allowed users list for selective onboarding
 * Only users in this list can sign up for the application during the limited rollout period
 */

/**
 * List of emails approved for early access during selective onboarding
 * Add new user emails here as they are approved
 */
export const ALLOWED_USER_EMAILS = [
  "jeff.allo@bison.howard.edu",
  "emmanuel.mokua@bison.howard.edu"
];

/**
 * Check if an email is in the allowed users list
 */
export function isAllowedUser(email: string): boolean {
  return ALLOWED_USER_EMAILS.includes(email.toLowerCase());
}
