// Verifies that the local infrastructure is ready.
// Cross-platform replacement for the old bash script. Run with: npm run check
import { HeadBucketCommand, ListBucketsCommand } from "@aws-sdk/client-s3";
import { GetQueueUrlCommand } from "@aws-sdk/client-sqs";
import { GetParameterCommand } from "@aws-sdk/client-ssm";
import { GetSecretValueCommand } from "@aws-sdk/client-secrets-manager";
import { config } from "../src/config.js";
import { s3, sqs, ssm, secrets } from "../src/aws.js";
import { getMongo, pool } from "../src/db.js";

let failed = false;

async function check(label, action) {
  try {
    await action();
    console.log(`  OK     ${label}`);
  } catch {
    console.log(`  FALLA  ${label}`);
    failed = true;
  }
}

console.log("Verificando la infraestructura...");
await check(`Floci responde en ${config.aws.endpoint}`, () => s3.send(new ListBucketsCommand({})));
await check(`Bucket de S3 ${config.bucket}`, () => s3.send(new HeadBucketCommand({ Bucket: config.bucket })));
await check(`Cola de SQS ${config.queueName}`, () => sqs.send(new GetQueueUrlCommand({ QueueName: config.queueName })));
await check(`Parámetro de SSM ${config.greetingParam}`, () =>
  ssm.send(new GetParameterCommand({ Name: config.greetingParam })),
);
await check(`Secreto ${config.secretName}`, () =>
  secrets.send(new GetSecretValueCommand({ SecretId: config.secretName })),
);
await check("PostgreSQL acepta conexiones", () => pool.query("SELECT 1"));
await check("MongoDB acepta conexiones", async () => (await getMongo()).command({ ping: 1 }));

console.log(failed ? "Algunas verificaciones fallaron. Consulta docs/01-setup.md" : "Todo en orden.");
process.exit(failed ? 1 : 0);
