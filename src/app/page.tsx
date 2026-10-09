import { Suspense } from "react";
import Link from "next/link";
import { and, desc, eq, like } from "drizzle-orm";
import { db, chamados } from "@/db";
import { exigirUsuario, ehEquipe } from "@/auth";
import { criarChamadoAction, sairAction } from "@/actions";

type Status = (typeof chamados.$inferSelect)["status"];
type Params = { searchParams: Promise<{ status?: string; q?: string }> };

const input = "rounded border border-zinc-300 bg-transparent p-2 dark:border-zinc-700";
const botao = "rounded bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700";

export default function Home({ searchParams }: Params) {
  return (
    <Suspense fallback={<p className="p-6">Carregando...</p>}>
      <Chamados searchParams={searchParams} />
    </Suspense>
  );
}

async function Chamados({ searchParams }: Params) {
  const u = await exigirUsuario();
  const { status, q } = await searchParams;

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

  // o CSV exportado respeita os filtros que estão na tela
  const exportar = new URLSearchParams({
    formato: "csv",
    ...(status ? { status } : {}),
    ...(q ? { q } : {}),
  }).toString();

  return (
    <main className="mx-auto max-w-3xl space-y-8 p-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Chamados</h1>
        <div className="flex items-center gap-4 text-sm">
          <Link href="/dashboard" className="underline">
            Dashboard
          </Link>
          {u.papel === "admin" && (
            <Link href="/admin" className="underline">
              Admin
            </Link>
          )}
          <form action={sairAction} className="flex items-center gap-3">
            <span>
              {u.nome} ({u.papel})
            </span>
            <button className="underline">Sair</button>
          </form>
        </div>
      </header>

      <form
        action={criarChamadoAction}
        className="grid gap-3 rounded border border-zinc-300 p-4 dark:border-zinc-700"
      >
        <h2 className="font-semibold">Novo chamado</h2>
        <input name="titulo" placeholder="Título" required className={input} />
        <textarea
          name="descricao"
          placeholder="Descreva o problema"
          required
          rows={3}
          className={input}
        />
        <div className="flex flex-wrap gap-3">
          <select name="categoria" className={input}>
            <option value="geral">Geral</option>
            <option value="hardware">Hardware</option>
            <option value="software">Software</option>
            <option value="rede">Rede</option>
            <option value="acesso">Acesso/Senha</option>
          </select>
          <select name="prioridade" defaultValue="media" className={input}>
            <option value="baixa">Baixa</option>
            <option value="media">Média</option>
            <option value="alta">Alta</option>
          </select>
          <button className={botao}>Abrir chamado</button>
        </div>
      </form>

      <form className="flex flex-wrap gap-3">
        <input name="q" defaultValue={q} placeholder="Buscar por título" className={input} />
        <select name="status" defaultValue={status ?? ""} className={input}>
          <option value="">Todos os status</option>
          <option value="aberto">Aberto</option>
          <option value="em_andamento">Em andamento</option>
          <option value="resolvido">Resolvido</option>
        </select>
        <button className={botao}>Filtrar</button>
        <a href={`/api/chamados?${exportar}`} className="self-center text-sm underline">
          Exportar CSV
        </a>
      </form>

      <ul className="space-y-2">
        {lista.length === 0 && (
          <li className="text-zinc-500">Nenhum chamado encontrado.</li>
        )}
        {lista.map((c) => (
          <li key={c.id}>
            <Link
              href={`/chamado/${c.id}`}
              className="flex items-center justify-between rounded border border-zinc-300 p-3 hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-900"
            >
              <span>
                <strong>#{c.id}</strong> {c.titulo}
                <span className="ml-2 text-sm text-zinc-500">
                  {c.categoria} · {c.prioridade}
                </span>
              </span>
              <span className="text-sm">{c.status.replace("_", " ")}</span>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}