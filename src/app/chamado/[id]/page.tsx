import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { db, chamados, comentarios, users } from "@/db";
import { exigirUsuario, ehEquipe } from "@/auth";
import {
  atualizarStatusAction,
  comentarAction,
  excluirChamadoAction,
} from "@/actions";

type Params = { params: Promise<{ id: string }> };

const input = "rounded border border-zinc-300 bg-transparent p-2 dark:border-zinc-700";
const botao = "rounded bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700";

// O banco guarda a data em UTC como "2026-10-09 14:30:00"
const data = (s: string) =>
  new Date(s.replace(" ", "T") + "Z").toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    dateStyle: "short",
    timeStyle: "short",
  });

export default function Pagina({ params }: Params) {
  return (
    <Suspense fallback={<p className="p-6">Carregando...</p>}>
      <Detalhe params={params} />
    </Suspense>
  );
}

async function Detalhe({ params }: Params) {
  const u = await exigirUsuario();
  const { id: idParam } = await params;
  const id = Number(idParam);
  if (!Number.isInteger(id)) notFound();

  const [c] = await db.select().from(chamados).where(eq(chamados.id, id));
  // usuário comum só enxerga os próprios chamados
  if (!c || (!ehEquipe(u.papel) && c.autorId !== u.id)) notFound();

  const [autor] = await db
    .select({ nome: users.nome })
    .from(users)
    .where(eq(users.id, c.autorId));

  const lista = await db
    .select({
      id: comentarios.id,
      texto: comentarios.texto,
      criadoEm: comentarios.criadoEm,
      autor: users.nome,
      papel: users.papel,
    })
    .from(comentarios)
    .innerJoin(users, eq(comentarios.autorId, users.id))
    .where(eq(comentarios.chamadoId, id))
    .orderBy(asc(comentarios.id));

  return (
    <main className="mx-auto max-w-3xl space-y-6 p-6">
      <Link href="/" className="text-sm underline">
        ← Voltar
      </Link>

      <header className="space-y-1">
        <h1 className="text-2xl font-bold">
          #{c.id} {c.titulo}
        </h1>
        <p className="text-sm text-zinc-500">
          Aberto por {autor?.nome} em {data(c.criadoEm)} · {c.categoria} · prioridade{" "}
          {c.prioridade} · status <strong>{c.status.replace("_", " ")}</strong>
        </p>
      </header>

      <p className="whitespace-pre-wrap rounded border border-zinc-300 p-4 dark:border-zinc-700">
        {c.descricao}
      </p>

      {ehEquipe(u.papel) && (
        <form action={atualizarStatusAction.bind(null, c.id)} className="flex gap-3">
          <select name="status" defaultValue={c.status} className={input}>
            <option value="aberto">Aberto</option>
            <option value="em_andamento">Em andamento</option>
            <option value="resolvido">Resolvido</option>
          </select>
          <button className={botao}>Atualizar status</button>
        </form>
      )}

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Comentários ({lista.length})</h2>
        {lista.length === 0 && (
          <p className="text-sm text-zinc-500">Nenhum comentário ainda.</p>
        )}
        {lista.map((m) => (
          <article
            key={m.id}
            className="rounded border border-zinc-300 p-3 dark:border-zinc-700"
          >
            <p className="mb-1 text-sm text-zinc-500">
              {m.autor}
              {m.papel === "tecnico" && " (técnico)"}
              {m.papel === "admin" && " (admin)"} · {data(m.criadoEm)}
            </p>
            <p className="whitespace-pre-wrap">{m.texto}</p>
          </article>
        ))}

        <form action={comentarAction.bind(null, c.id)} className="grid gap-3">
          <textarea
            name="texto"
            placeholder="Escreva um comentário"
            required
            rows={3}
            className={input}
          />
          <button className={`${botao} justify-self-start`}>Comentar</button>
        </form>
      </section>

      <details className="text-sm">
        <summary className="cursor-pointer text-red-600">Excluir chamado</summary>
        <form action={excluirChamadoAction.bind(null, c.id)}>
          <button className="mt-2 rounded bg-red-600 px-3 py-1 text-white hover:bg-red-700">
            Confirmar exclusão
          </button>
        </form>
      </details>
    </main>
  );
}