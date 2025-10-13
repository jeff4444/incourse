export interface SchoolConfig {
  acceptable_domains: string[];
  api_url: string;
}

export const SUPPORTED_SCHOOLS: Record<string, SchoolConfig> = {
  "Howard University": {
    acceptable_domains: ["howard.edu", "bison.howard.edu"],
    api_url: "https://canvas.howard.edu"
  }
};

// Helper function to get school from email domain
export function getSchoolFromEmail(email: string): string | null {
  const domain = email.split('@')[1]?.toLowerCase();
  if (!domain) return null;

  for (const [schoolName, config] of Object.entries(SUPPORTED_SCHOOLS)) {
    if (config.acceptable_domains.some(acceptableDomain => 
      domain === acceptableDomain.toLowerCase()
    )) {
      return schoolName;
    }
  }
  
  return null;
}

// Helper function to validate email against a specific school
export function validateEmailForSchool(email: string, schoolName: string): boolean {
  const school = SUPPORTED_SCHOOLS[schoolName];
  if (!school) return false;

  const domain = email.split('@')[1]?.toLowerCase();
  if (!domain) return false;

  return school.acceptable_domains.some(acceptableDomain => 
    domain === acceptableDomain.toLowerCase()
  );
}

