import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db, users } from "./db";

const chave = new TextEncoder().encode(process.env.JWT_SECRET!);
const COOKIE = "sessao";

export async function criarSessao(userId: number) {
  const token = await new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(String(userId))
    .setExpirationTime("7d")
    .sign(chave);

  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function encerrarSessao() {
  (await cookies()).delete(COOKIE);
}

export async function usuarioAtual() {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, chave);
    const [u] = await db
      .select({ id: users.id, nome: users.nome, email: users.email, papel: users.papel })
      .from(users)
      .where(eq(users.id, Number(payload.sub)));
    return u ?? null;
  } catch {
    return null; // token inválido ou expirado
  }
}

export async function exigirUsuario() {
  const u = await usuarioAtual();
  if (!u) redirect("/login");
  return u;
}

export async function exigirAdmin() {
  const u = await exigirUsuario();
  if (u.papel !== "admin") redirect("/");
  return u;
}

export const ehEquipe = (papel: string) => papel === "tecnico" || papel === "admin";

export async function registrar(nome: string, email: string, senha: string) {
  const senhaHash = await bcrypt.hash(senha, 10);
  const papel = email === process.env.ADMIN_EMAIL?.toLowerCase() ? "admin" : "usuario";
  const [u] = await db
    .insert(users)
    .values({ nome, email, senhaHash, papel })
    .returning({ id: users.id });
  await criarSessao(u.id);
}

export async function autenticar(email: string, senha: string) {
  const [u] = await db.select().from(users).where(eq(users.email, email));
  if (!u || !(await bcrypt.compare(senha, u.senhaHash))) return false;
  await criarSessao(u.id);
  return true;
}