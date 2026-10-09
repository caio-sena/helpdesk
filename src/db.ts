import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { sql } from "drizzle-orm";
import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  nome: text("nome").notNull(),
  email: text("email").notNull().unique(),
  senhaHash: text("senha_hash").notNull(),
  papel: text("papel", { enum: ["usuario", "tecnico", "admin"] }).notNull().default("usuario"),
  criadoEm: text("criado_em").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const chamados = sqliteTable("chamados", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  titulo: text("titulo").notNull(),
  descricao: text("descricao").notNull(),
  categoria: text("categoria").notNull().default("geral"),
  status: text("status", { enum: ["aberto", "em_andamento", "resolvido"] }).notNull().default("aberto"),
  prioridade: text("prioridade", { enum: ["baixa", "media", "alta"] }).notNull().default("media"),
  autorId: integer("autor_id").notNull().references(() => users.id),
  tecnicoId: integer("tecnico_id").references(() => users.id),
  criadoEm: text("criado_em").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const comentarios = sqliteTable("comentarios", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  chamadoId: integer("chamado_id").notNull().references(() => chamados.id, { onDelete: "cascade" }),
  autorId: integer("autor_id").notNull().references(() => users.id),
  texto: text("texto").notNull(),
  criadoEm: text("criado_em").notNull().default(sql`CURRENT_TIMESTAMP`),
});

const client = createClient({
  url: process.env.DATABASE_URL!,
  authToken: process.env.DATABASE_AUTH_TOKEN, // só usado em produção (Turso)
});

export const db = drizzle(client);