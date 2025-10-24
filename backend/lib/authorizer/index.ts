import { APIGatewayTokenAuthorizerEvent, APIGatewayAuthorizerResult } from 'aws-lambda';
import * as jwt from 'jsonwebtoken';

export const handler = async (
  event: APIGatewayTokenAuthorizerEvent
): Promise<APIGatewayAuthorizerResult> => {
  try {
    const token = event.authorizationToken;
    
    if (!token) {
      throw new Error('No authorization token provided');
    }

    // Remove 'Bearer ' prefix if present
    const jwtToken = token.startsWith('Bearer ') ? token.slice(7) : token;

    // Get Supabase JWT secret from environment
    const supabaseJwtSecret = process.env.SUPABASE_JWT_SECRET;
    if (!supabaseJwtSecret) {
      throw new Error('SUPABASE_JWT_SECRET not configured');
    }

    // Verify and decode the JWT token
    const decoded = jwt.verify(jwtToken, supabaseJwtSecret, {
      algorithms: ['HS256']
    }) as jwt.JwtPayload;

    // Extract user information
    const userId = decoded.sub;
    const email = decoded.email;

    if (!userId) {
      throw new Error('Invalid token: no user ID found');
    }

    // Generate IAM policy allowing access to the API
    const policy: APIGatewayAuthorizerResult = {
      principalId: userId,
      policyDocument: {
        Version: '2012-10-17',
        Statement: [
          {
            Action: 'execute-api:Invoke',
            Effect: 'Allow',
            Resource: event.methodArn
          }
        ]
      },
      context: {
        userId: userId,
        email: email || '',
        token: jwtToken
      }
    };

    return policy;

  } catch (error) {
    console.error('Authorization error:', error);
    
    // Return deny policy
    return {
      principalId: 'user',
      policyDocument: {
        Version: '2012-10-17',
        Statement: [
          {
            Action: 'execute-api:Invoke',
            Effect: 'Deny',
            Resource: event.methodArn
          }
        ]
      }
    };
  }
};
