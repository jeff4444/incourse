import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as iam from 'aws-cdk-lib/aws-iam';

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
        AWS_MODEL_ARN: 'arn:aws:bedrock:us-east-1:412385203988:inference-profile/us.anthropic.claude-sonnet-4-5-20250929-v1:0',
        // Lambda Web Adapter configuration
        AWS_LAMBDA_EXEC_WRAPPER: '/opt/bootstrap',
        PORT: '8080',
        // Add other environment variables as needed
        // Note: AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY are not needed when using IAM roles
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
