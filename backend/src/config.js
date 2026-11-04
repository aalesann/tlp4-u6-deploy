// Every value can be overridden with an environment variable.
// The defaults match docker-compose.yml and scripts/init.sh.
const env = process.env;

export const config = {
  port: Number(env.PORT ?? 3000),
  corsOrigin: env.CORS_ORIGIN ?? "http://localhost:5173",
  aws: {
    // The ONLY difference between local and real AWS: the endpoint.
    // On real AWS you leave AWS_ENDPOINT_URL unset and the SDK uses the default.
    endpoint: env.AWS_ENDPOINT_URL ?? "http://localhost:4566",
    region: env.AWS_REGION ?? "us-east-1",
    credentials: {
      accessKeyId: env.AWS_ACCESS_KEY_ID ?? "test",
      secretAccessKey: env.AWS_SECRET_ACCESS_KEY ?? "test",
    },
  },
  bucket: env.S3_BUCKET ?? "tlp4-uploads",
  queueName: env.SQS_QUEUE_NAME ?? "tlp4-events",
  greetingParam: env.SSM_GREETING_PARAM ?? "/tlp4/app/greeting",
  secretName: env.SECRET_NAME ?? "tlp4/app/credentials",
  databaseUrl: env.DATABASE_URL ?? "postgres://tlp4:tlp4@localhost:5432/tlp4",
  mongoUrl: env.MONGO_URL ?? "mongodb://localhost:27017/tlp4",
};
