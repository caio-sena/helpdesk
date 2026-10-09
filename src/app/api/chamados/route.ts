import { and, desc, eq, like } from "drizzle-orm";
import { z } from "zod";
import { db, chamados } from "@/db";
import { usuarioAtual, ehEquipe } from "@/auth";

type Status = (typeof chamados.$inferSelect)["status"];

const naoAutenticado = () =>
  Response.json({ erro: "Não autenticado" }, { status: 401 });

// Escapa a célula do CSV e evita injeção de fórmulas no Excel (=, +, -, @)
function celulaCsv(valor: unknown) {
  let texto = String(valor ?? "");
  if (/^[=+\-@\t\r]/.test(texto)) texto = "'" + texto;
  return `"${texto.replace(/"/g, '""')}"`;
}

// GET /api/chamados?status=aberto&q=impressora&formato=csv
export async function GET(request: Request) {
  const u = await usuarioAtual();
  if (!u) return naoAutenticado();

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const q = searchParams.get("q");

  const lista = await db
    .select()
    .from(chamados)
    .where(
      and(
        ehEquipe(u.papel) ? undefined : eq(chamados.autorId, u.id),
        status ? eq(chamados.status, status as Status) : undefined,
        q ? like(chamados.titulo, `%${q}%`) : undefined,
      ),
    )
    .orderBy(desc(chamados.id));

  if (searchParams.get("formato") === "csv") {
    const colunas = [
      "id",
      "titulo",
      "descricao",
      "categoria",
      "status",
      "prioridade",
      "autorId",
      "tecnicoId",
      "criadoEm",
    ] as const;

    // ";" como separador e BOM no início: o Excel em português abre certo, com acentos
    const linhas = [
      colunas.join(";"),
      ...lista.map((c) => colunas.map((k) => celulaCsv(c[k])).join(";")),
    ];

    return new Response("\uFEFF" + linhas.join("\r\n"), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="chamados.csv"',
      },
    });
  }

  return Response.json(lista);
}

const novoSchema = z.object({
  titulo: z.string().trim().min(3).max(120),
  descricao: z.string().trim().min(5),
  categoria: z.string().trim().min(1).default("geral"),
  prioridade: z.enum(["baixa", "media", "alta"]).default("media"),
});

// POST /api/chamados  (corpo JSON)
export async function POST(request: Request) {
  const u = await usuarioAtual();
  if (!u) return naoAutenticado();

  const corpo = await request.json().catch(() => null);
  const dados = novoSchema.safeParse(corpo);
  if (!dados.success) {
    return Response.json(
      { erro: "Dados inválidos", detalhes: dados.error.issues },
      { status: 400 },
    );
  }

  const [novo] = await db
    .insert(chamados)
    .values({ ...dados.data, autorId: u.id })
    .returning();

  return Response.json(novo, { status: 201 });
}