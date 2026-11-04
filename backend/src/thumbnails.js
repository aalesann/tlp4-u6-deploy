import sharp from "sharp";
import { GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { config } from "./config.js";
import { s3 } from "./aws.js";
import { pool, runSchemaMigration } from "./db.js";

const THUMB_WIDTH = 320;

// Must run after initPostgres(): thumbnails reference the files table.
export async function initGallery() {
  await runSchemaMigration(`
    CREATE TABLE IF NOT EXISTS thumbnails (
      object_key TEXT PRIMARY KEY REFERENCES files(object_key) ON DELETE CASCADE,
      thumb_key TEXT NOT NULL,
      width INTEGER NOT NULL,
      height INTEGER NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);
}

// Creates a thumbnail for an uploaded object. Returns false if it is not an image.
// Safe to run twice for the same key: the thumbnail key is deterministic and the
// database insert ignores duplicates (SQS delivers messages at least once).
export async function generateThumbnail(key) {
  const original = await s3.send(new GetObjectCommand({ Bucket: config.bucket, Key: key }));
  const input = Buffer.from(await original.Body.transformToByteArray());

  let thumb;
  try {
    thumb = await sharp(input)
      .rotate() // apply EXIF orientation so phone photos are not sideways
      .resize({ width: THUMB_WIDTH, withoutEnlargement: true })
      .webp()
      .toBuffer({ resolveWithObject: true });
  } catch {
    return false; // sharp could not decode it: not an image
  }

  const thumbKey = `thumbs/${key}.webp`;
  await s3.send(
    new PutObjectCommand({
      Bucket: config.bucket,
      Key: thumbKey,
      Body: thumb.data,
      ContentType: "image/webp",
    }),
  );

  await pool.query(
    `INSERT INTO thumbnails (object_key, thumb_key, width, height)
     VALUES ($1, $2, $3, $4) ON CONFLICT (object_key) DO NOTHING`,
    [key, thumbKey, thumb.info.width, thumb.info.height],
  );
  return true;
}
