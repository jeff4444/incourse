import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as iam from 'aws-cdk-lib/aws-iam';
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
        AWS_LAMBDA_EXEC_WRAPPER: '/opt/bootstrap',
        PORT: '8080',
        AWS_LWA_INVOKE_MODE: 'RESPONSE_STREAM',
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
      },
    });
  
    const funcUrl = dockerFunc.addFunctionUrl({
      authType: lambda.FunctionUrlAuthType.NONE,
      cors: {
        allowedOrigins: ['*'],
        allowedMethods: [lambda.HttpMethod.ALL],
        allowedHeaders: ['*'],
      },
      invokeMode: lambda.InvokeMode.RESPONSE_STREAM, // Enable streaming
    });

    new cdk.CfnOutput(this, 'FuncUrlValue', {
      value: funcUrl.url,
    });
  }
}
