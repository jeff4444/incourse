import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

export class BackendStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);
    
    // Create IAM role for Lambda with Bedrock permissions
    const lambdaRole = new iam.Role(this, 'LambdaExecutionRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole'),
      ],
      inlinePolicies: {
        BedrockAccess: new iam.PolicyDocument({
          statements: [
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: [
                'bedrock:InvokeModel',
                'bedrock:InvokeModelWithResponseStream',
                'bedrock:Converse',
                'bedrock:ConverseStream',
                'bedrock:GetFoundationModel',
                'bedrock:ListFoundationModels',
                'bedrock:GetInferenceProfile',
                'bedrock:ListInferenceProfiles',
              ],
              resources: [
                'arn:aws:bedrock:*::foundation-model/*',
                'arn:aws:bedrock:*:*:inference-profile/*',
                'arn:aws:bedrock:*:*:provisioned-model-throughput/*',
              ],
            }),
          ],
        }),
      },
    });

    const dockerFunc = new lambda.DockerImageFunction(this, 'DockerFunc', {
      code: lambda.DockerImageCode.fromImageAsset("./image"),
      architecture: lambda.Architecture.ARM_64,
      memorySize: 1024,
      timeout: cdk.Duration.seconds(300),
      role: lambdaRole,
      environment: {
        // Add your Bedrock model ARN here - you'll need to set this
        AWS_MODEL_ARN: process.env.AWS_MODEL_ARN || '',
        // Lambda Web Adapter configuration
        PORT: '8000',
        AWS_LWA_INVOKE_MODE: 'response_stream',
        AWS_LAMBDA_EXEC_WRAPPER: '/opt/bootstrap',
        DEBUG: 'false',
        GEMINI_API_KEY: process.env.GEMINI_API_KEY || '',
        CLAUDE_API_KEY: process.env.CLAUDE_API_KEY || '',
        OPENAI_API_KEY: process.env.OPENAI_API_KEY || '',
        PINECONE_API_KEY: process.env.PINECONE_API_KEY || '',
        NEXT_PUBLIC_ENCRYPTION_KEY: process.env.NEXT_PUBLIC_ENCRYPTION_KEY || '',
        NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL || '',
        NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
        NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
        SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
        SUPABASE_JWT_SECRET: process.env.SUPABASE_JWT_SECRET || '',
      },
    });

    // Create Lambda authorizer for JWT validation
    const authorizerFunc = new lambda.Function(this, 'AuthorizerFunc', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('./lib/authorizer'),
      environment: {
        SUPABASE_JWT_SECRET: process.env.SUPABASE_JWT_SECRET || '',
      },
    });

    // Create API Gateway
    const api = new apigateway.RestApi(this, 'InCourseApi', {
      restApiName: 'InCourse API',
      description: 'API for InCourse AI agents',
      defaultCorsPreflightOptions: {
        allowOrigins: ['https://incourse-three.vercel.app'],
        allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowHeaders: ['Content-Type', 'Authorization'],
        allowCredentials: true,
      },
    });

    // Create Lambda authorizer
    const authorizer = new apigateway.TokenAuthorizer(this, 'JwtAuthorizer', {
      handler: authorizerFunc,
      identitySource: 'method.request.header.Authorization',
      authorizerName: 'JwtAuthorizer',
    });

    // Create Lambda integration
    const lambdaIntegration = new apigateway.LambdaIntegration(dockerFunc, {
      requestTemplates: { 'application/json': '{ "statusCode": "200" }' },
    });

    // Add API routes with authentication
    const chatResource = api.root.addResource('chat');
    chatResource.addMethod('POST', lambdaIntegration, {
      authorizer: authorizer,
    });

    const chatStreamResource = chatResource.addResource('stream');
    chatStreamResource.addMethod('POST', lambdaIntegration, {
      authorizer: authorizer,
    });

    const generateFlashcardsResource = api.root.addResource('generate-flashcards');
    generateFlashcardsResource.addMethod('POST', lambdaIntegration, {
      authorizer: authorizer,
    });

    const generateQuizResource = api.root.addResource('generate-quiz');
    generateQuizResource.addMethod('POST', lambdaIntegration, {
      authorizer: authorizer,
    });

    const generateNudgesResource = api.root.addResource('generate-nudges');
    generateNudgesResource.addMethod('POST', lambdaIntegration, {
      authorizer: authorizer,
    });

    const takeActionResource = api.root.addResource('take-action');
    takeActionResource.addMethod('POST', lambdaIntegration, {
      authorizer: authorizer,
    });

    const gradeAssignmentResource = api.root.addResource('grade-assignment');
    gradeAssignmentResource.addMethod('POST', lambdaIntegration, {
      authorizer: authorizer,
    });

    const agentsResource = api.root.addResource('agents');
    const notesResource = agentsResource.addResource('notes');
    const addChatMessageResource = notesResource.addResource('add-chat-message');
    addChatMessageResource.addMethod('POST', lambdaIntegration, {
      authorizer: authorizer,
    });

    const convertOfficeResource = api.root.addResource('convert-office-to-pdf');
    convertOfficeResource.addMethod('POST', lambdaIntegration, {
      authorizer: authorizer,
    });

    // Health endpoint without authentication
    const healthResource = api.root.addResource('health');
    healthResource.addMethod('GET', lambdaIntegration);

    // Create usage plan for rate limiting
    const usagePlan = api.addUsagePlan('UsagePlan', {
      name: 'InCourse Usage Plan',
      throttle: {
        rateLimit: 100, // requests per second
        burstLimit: 200, // burst capacity
      },
      quota: {
        limit: 10000, // requests per day
        period: apigateway.Period.DAY,
      },
    });

    // Associate usage plan with the API stage
    usagePlan.addApiStage({
      stage: api.deploymentStage,
    });

    // Output the API Gateway URL
    new cdk.CfnOutput(this, 'ApiGatewayUrl', {
      value: api.url,
      description: 'API Gateway URL for the InCourse backend',
    });
  }
}
