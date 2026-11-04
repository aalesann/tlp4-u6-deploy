import { randomUUID } from "node:crypto";
import cors from "cors";
import express from "express";
import multer from "multer";
import { GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { GetQueueUrlCommand, SendMessageCommand } from "@aws-sdk/client-sqs";
import { GetParameterCommand } from "@aws-sdk/client-ssm";
import { GetSecretValueCommand } from "@aws-sdk/client-secrets-manager";
import { config } from "./config.js";
import { s3, sqs, ssm, secrets } from "./aws.js";
import { getMongo, initPostgres, pool } from "./db.js";
import { galleryRouter } from "./gallery.js";
import { initGallery } from "./thumbnails.js";

const app = express();
app.use(cors({ origin: config.corsOrigin }));
app.use(express.json());

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

app.get("/health", (_req, res) => res.json({ status: "ok" }));

// Lab 3: configuration from Parameter Store, credentials from Secrets Manager.
app.get("/config", async (_req, res, next) => {
  try {
    const param = await ssm.send(new GetParameterCommand({ Name: config.greetingParam }));
    const secret = await secrets.send(new GetSecretValueCommand({ SecretId: config.secretName }));
    res.json({
      greeting: param.Parameter.Value,
      // Never send secret values to the browser; show only that they were read.
      secretKeys: Object.keys(JSON.parse(secret.SecretString)),
    });
  } catch (err) {
    next(err);
  }
});

// Labs 2 and 4: upload to S3, save metadata in PostgreSQL, publish an event to SQS.
app.post("/files", upload.single("file"), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: "El campo 'file' es obligatorio" });

    const key = `${randomUUID()}-${req.file.originalname}`;
    await s3.send(
      new PutObjectCommand({
        Bucket: config.bucket,
        Key: key,
        Body: req.file.buffer,
        ContentType: req.file.mimetype,
      }),
    );

    await pool.query(
      "INSERT INTO files (object_key, original_name, size_bytes) VALUES ($1, $2, $3)",
      [key, req.file.originalname, req.file.size],
    );

    const { QueueUrl } = await sqs.send(new GetQueueUrlCommand({ QueueName: config.queueName }));
    await sqs.send(
      new SendMessageCommand({
        QueueUrl,
        MessageBody: JSON.stringify({ type: "file.uploaded", key, name: req.file.originalname }),
      }),
    );

    res.status(201).json({ key });
  } catch (err) {
    next(err);
  }
});

app.get("/files", async (_req, res, next) => {
  try {
    const { rows } = await pool.query("SELECT * FROM files ORDER BY created_at DESC LIMIT 50");
    const files = await Promise.all(
      rows.map(async (row) => ({
        id: row.id,
        name: row.original_name,
        size: row.size_bytes,
        createdAt: row.created_at,
        // Presigned URL: temporary link so the browser can download without credentials.
        url: await getSignedUrl(
          s3,
          new GetObjectCommand({ Bucket: config.bucket, Key: row.object_key }),
          { expiresIn: 300 },
        ),
      })),
    );
    res.json(files);
  } catch (err) {
    next(err);
  }
});

// Lab 4: events written by the worker into MongoDB.
app.get("/events", async (_req, res, next) => {
  try {
    const db = await getMongo();
    const events = await db.collection("events").find().sort({ processedAt: -1 }).limit(50).toArray();
    res.json(events);
  } catch (err) {
    next(err);
  }
});

// Gallery feature: thumbnails of uploaded images (see docs/07-galeria.md).
app.use("/gallery", galleryRouter);

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: err.message });
});

await initPostgres();
await initGallery();
app.listen(config.port, () => console.log(`API listening on http://localhost:${config.port}`));
