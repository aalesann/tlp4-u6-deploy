import { S3Client } from "@aws-sdk/client-s3";
import { SQSClient } from "@aws-sdk/client-sqs";
import { SSMClient } from "@aws-sdk/client-ssm";
import { SecretsManagerClient } from "@aws-sdk/client-secrets-manager";
import { config } from "./config.js";

const common = {
  endpoint: config.aws.endpoint,
  region: config.aws.region,
  credentials: config.aws.credentials,
};

// forcePathStyle: http://localhost:4566/<bucket>/<key> instead of <bucket>.localhost.
export const s3 = new S3Client({ ...common, forcePathStyle: true });
export const sqs = new SQSClient(common);
export const ssm = new SSMClient(common);
export const secrets = new SecretsManagerClient(common);
