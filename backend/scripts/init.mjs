// Creates the AWS resources the app needs inside Floci. Safe to run twice.
// Cross-platform replacement for the old bash script. Run with: npm run init
import { CreateBucketCommand, HeadBucketCommand } from "@aws-sdk/client-s3";
import { CreateQueueCommand } from "@aws-sdk/client-sqs";
import { PutParameterCommand } from "@aws-sdk/client-ssm";
import {
  CreateSecretCommand,
  DescribeSecretCommand,
  PutSecretValueCommand,
} from "@aws-sdk/client-secrets-manager";
import { config } from "../src/config.js";
import { s3, sqs, ssm, secrets } from "../src/aws.js";

const SECRET_VALUE = JSON.stringify({ apiKey: "super-secret-key", apiUser: "student" });

async function step(label, action) {
  console.log(`==> ${label}`);
  await action();
}

try {
  await step(`Bucket de S3: ${config.bucket}`, async () => {
    try {
      await s3.send(new HeadBucketCommand({ Bucket: config.bucket }));
    } catch {
      await s3.send(new CreateBucketCommand({ Bucket: config.bucket }));
    }
  });

  await step(`Cola de SQS: ${config.queueName}`, () =>
    sqs.send(new CreateQueueCommand({ QueueName: config.queueName })),
  );

  await step(`Parámetro de SSM: ${config.greetingParam}`, () =>
    ssm.send(
      new PutParameterCommand({
        Name: config.greetingParam,
        Value: "Hola desde Parameter Store",
        Type: "String",
        Overwrite: true,
      }),
    ),
  );

  await step(`Secreto de Secrets Manager: ${config.secretName}`, async () => {
    let exists = true;
    try {
      await secrets.send(new DescribeSecretCommand({ SecretId: config.secretName }));
    } catch {
      exists = false;
    }
    if (exists) {
      await secrets.send(new PutSecretValueCommand({ SecretId: config.secretName, SecretString: SECRET_VALUE }));
    } else {
      await secrets.send(new CreateSecretCommand({ Name: config.secretName, SecretString: SECRET_VALUE }));
    }
  });

  console.log("Listo. Ejecuta npm run check para verificar.");
} catch (err) {
  console.error(`No se pudo crear la infraestructura: ${err.message}`);
  console.error("¿Ejecutaste docker compose up -d desde la raíz del repositorio?");
  process.exitCode = 1;
}
