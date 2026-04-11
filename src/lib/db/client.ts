import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

// Use a placeholder during build when DATABASE_URL isn't set yet
const sql = neon(process.env.DATABASE_URL || "postgresql://placeholder:placeholder@localhost/placeholder");
export const db = drizzle(sql, { schema });
