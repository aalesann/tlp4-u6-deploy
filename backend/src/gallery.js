import { Router } from "express";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { config } from "./config.js";
import { s3 } from "./aws.js";
import { pool } from "./db.js";

export const galleryRouter = Router();

const presign = (key) =>
  getSignedUrl(s3, new GetObjectCommand({ Bucket: config.bucket, Key: key }), { expiresIn: 300 });

// Only files that already have a thumbnail appear here, so a freshly uploaded image shows
// up a moment later, once the worker has processed its SQS message.
galleryRouter.get("/", async (_req, res, next) => {
  try {
    const { rows } = await pool.query(`
      SELECT f.id, f.original_name, f.object_key, f.created_at, t.thumb_key, t.width, t.height
      FROM thumbnails t JOIN files f ON f.object_key = t.object_key
      ORDER BY f.created_at DESC LIMIT 100
    `);
    const items = await Promise.all(
      rows.map(async (row) => ({
        id: row.id,
        name: row.original_name,
        createdAt: row.created_at,
        width: row.width,
        height: row.height,
        thumbUrl: await presign(row.thumb_key),
        originalUrl: await presign(row.object_key),
      })),
    );
    res.json(items);
  } catch (err) {
    next(err);
  }
});
