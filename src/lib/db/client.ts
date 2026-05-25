import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "./schema";

// prepare: false is required for Supabase's connection pooler (Supavisor
// runs in transaction mode, which doesn't support prepared statements).
const client = postgres(
  process.env.DATABASE_URL || "postgresql://placeholder:placeholder@localhost/placeholder",
  { prepare: false }
);
export const db = drizzle(client, { schema });
