import pg from "pg";
import dotenv from "dotenv";

dotenv.config();

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set");
}

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

export async function testDatabase() {
  const result = await pool.query("SELECT NOW() AS now");

  console.log("Neon database connected!");
  console.log("Database time:", result.rows[0].now);
}