/**
 * Downloads the Canvas API token as a text file
 * @param apiKey - The Canvas API token to download
 * @param apiBaseUrl - The Canvas API base URL
 * @param schoolName - The school name for context
 */
export function downloadTokenFile(apiKey: string, apiBaseUrl: string, schoolName: string): void {
  const fileContent = `# InCourse Canvas API Token
# 
# This file contains your Canvas API token for ${schoolName}.
# Keep this file safe and secure - you'll need it to resync your courses.
#
# IMPORTANT: Do not share this file with anyone or commit it to version control.
# This token provides access to your Canvas account.
#
# To resync your courses in InCourse:
# 1. Go to your Profile page
# 2. Use this token in the "Resync Enrollments" section
# 3. Either paste the token manually or upload this file
#
# Token: ${apiKey}
# Canvas URL: ${apiBaseUrl}
# Generated: ${new Date().toISOString()}
`;

  const blob = new Blob([fileContent], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = 'incourse-canvas-token.txt';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  URL.revokeObjectURL(url);
}
