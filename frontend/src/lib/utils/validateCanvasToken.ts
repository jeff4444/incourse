/**
 * Validates a Canvas API token by making a test API call
 * @param apiKey - The Canvas API token to validate
 * @param apiBaseUrl - The Canvas API base URL
 * @returns Promise<boolean> - True if token is valid, false otherwise
 */
export async function validateCanvasToken(apiKey: string, apiBaseUrl: string): Promise<boolean> {
  try {
    // Make a simple API call to get courses to validate the token
    const response = await fetch(`${apiBaseUrl}/courses`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    return response.ok;
  } catch (error) {
    console.error('Error validating Canvas token:', error);
    return false;
  }
}
