import { defineConfig } from "drizzle-kit";
import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd()); // faz o drizzle-kit ler o .env.local

const url = process.env.DATABASE_URL!;

// libsql://... = Turso (produção); file:... = SQLite local
export default url.startsWith("libsql://")
  ? defineConfig({
      dialect: "turso",
      schema: "./src/db.ts",
      dbCredentials: { url, authToken: process.env.DATABASE_AUTH_TOKEN },
    })
  : defineConfig({
      dialect: "sqlite",
      schema: "./src/db.ts",
      dbCredentials: { url },
    });