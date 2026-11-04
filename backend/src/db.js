import pg from "pg";
import { MongoClient } from "mongodb";
import { config } from "./config.js";

export const pool = new pg.Pool({ connectionString: config.databaseUrl });

const mongoClient = new MongoClient(config.mongoUrl);
let mongoDb;

export async function getMongo() {
  if (!mongoDb) {
    await mongoClient.connect();
    mongoDb = mongoClient.db();
  }
  return mongoDb;
}

// The API and the worker start at the same time and both create tables.
// CREATE TABLE IF NOT EXISTS is not safe against that race, so DDL runs under an advisory lock.
const SCHEMA_LOCK_ID = 4242;

export async function runSchemaMigration(sql) {
  const client = await pool.connect();
  try {
    await client.query("SELECT pg_advisory_lock($1)", [SCHEMA_LOCK_ID]);
    await client.query(sql);
  } finally {
    await client.query("SELECT pg_advisory_unlock($1)", [SCHEMA_LOCK_ID]);
    client.release();
  }
}

// PostgreSQL stores relational metadata about each uploaded file.
export async function initPostgres() {
  await runSchemaMigration(`
    CREATE TABLE IF NOT EXISTS files (
      id SERIAL PRIMARY KEY,
      object_key TEXT NOT NULL UNIQUE,
      original_name TEXT NOT NULL,
      size_bytes INTEGER NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);
}
