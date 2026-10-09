"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { db, chamados, comentarios, users } from "./db";
import {
  autenticar,
  registrar,
  encerrarSessao,
  exigirUsuario,
  exigirAdmin,
  ehEquipe,
} from "./auth";

function erroLogin(msg: string): never {
  redirect("/login?erro=" + encodeURIComponent(msg));
}

// ---------- Sessão ----------
const cadastroSchema = z.object({
  nome: z.string().trim().min(2),
  email: z.string().trim().toLowerCase().email(),
  senha: z.string().min(6),
});

export async function cadastrarAction(form: FormData) {
  const dados = cadastroSchema.safeParse(Object.fromEntries(form));
  if (!dados.success) erroLogin("Dados inválidos (a senha precisa ter 6+ caracteres)");
  try {
    await registrar(dados.data.nome, dados.data.email, dados.data.senha);
  } catch {
    erroLogin("Esse e-mail já está cadastrado");
  }
  redirect("/");
}

export async function entrarAction(form: FormData) {
  const email = String(form.get("email")).trim().toLowerCase();
  const ok = await autenticar(email, String(form.get("senha")));
  if (!ok) erroLogin("E-mail ou senha incorretos");
  redirect("/");
}

export async function sairAction() {
  await encerrarSessao();
  redirect("/login");
}

// ---------- Chamados ----------
const chamadoSchema = z.object({
  titulo: z.string().trim().min(3).max(120),
  descricao: z.string().trim().min(5),
  categoria: z.string().trim().min(1).default("geral"),
  prioridade: z.enum(["baixa", "media", "alta"]),
});

export async function criarChamadoAction(form: FormData) {
  const u = await exigirUsuario();
  const dados = chamadoSchema.safeParse(Object.fromEntries(form));
  if (!dados.success) return;
  await db.insert(chamados).values({ ...dados.data, autorId: u.id });
  revalidatePath("/");
}

export async function atualizarStatusAction(id: number, form: FormData) {
  const u = await exigirUsuario();
  if (!ehEquipe(u.papel)) return;
  const status = z.enum(["aberto", "em_andamento", "resolvido"]).parse(form.get("status"));
  await db.update(chamados).set({ status, tecnicoId: u.id }).where(eq(chamados.id, id));
  revalidatePath("/");
  revalidatePath(`/chamado/${id}`);
}

export async function excluirChamadoAction(id: number) {
  const u = await exigirUsuario();
  const [c] = await db.select().from(chamados).where(eq(chamados.id, id));
  if (!c || (c.autorId !== u.id && !ehEquipe(u.papel))) return;
  await db.delete(comentarios).where(eq(comentarios.chamadoId, id));
  await db.delete(chamados).where(eq(chamados.id, id));
  revalidatePath("/");
  redirect("/");
}

export async function comentarAction(chamadoId: number, form: FormData) {
  const u = await exigirUsuario();
  const texto = String(form.get("texto") ?? "").trim();
  if (!texto) return;
  await db.insert(comentarios).values({ chamadoId, autorId: u.id, texto });
  revalidatePath(`/chamado/${chamadoId}`);
}

// ---------- Administração ----------
const papelSchema = z.enum(["usuario", "tecnico", "admin"]);
const novoUsuarioSchema = cadastroSchema.extend({ papel: papelSchema });

function erroAdmin(msg: string): never {
  redirect("/admin?erro=" + encodeURIComponent(msg));
}

export async function criarUsuarioAction(form: FormData) {
  await exigirAdmin();
  const dados = novoUsuarioSchema.safeParse(Object.fromEntries(form));
  if (!dados.success) erroAdmin("Dados inválidos (a senha precisa ter 6+ caracteres)");
  try {
    await db.insert(users).values({
      nome: dados.data.nome,
      email: dados.data.email,
      senhaHash: await bcrypt.hash(dados.data.senha, 10),
      papel: dados.data.papel,
    });
  } catch {
    erroAdmin("Esse e-mail já está cadastrado");
  }
  revalidatePath("/admin");
}

export async function alterarPapelAction(id: number, form: FormData) {
  const eu = await exigirAdmin();
  if (id === eu.id) return; // o admin não pode tirar o próprio cargo (evita ficar sem nenhum admin)
  const papel = papelSchema.parse(form.get("papel"));
  await db.update(users).set({ papel }).where(eq(users.id, id));
  revalidatePath("/admin");
}