import { Suspense } from "react";
import Link from "next/link";
import { asc } from "drizzle-orm";
import { db, users } from "@/db";
import { exigirAdmin } from "@/auth";
import { alterarPapelAction, criarUsuarioAction } from "@/actions";

type Params = { searchParams: Promise<{ erro?: string }> };

const input = "rounded border border-zinc-300 bg-transparent p-2 dark:border-zinc-700";
const botao = "rounded bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700";

const PAPEIS = [
  { valor: "usuario", rotulo: "Usuário" },
  { valor: "tecnico", rotulo: "Técnico" },
  { valor: "admin", rotulo: "Admin" },
];

export default function Admin({ searchParams }: Params) {
  return (
    <Suspense fallback={<p className="p-6">Carregando...</p>}>
      <Usuarios searchParams={searchParams} />
    </Suspense>
  );
}

async function Usuarios({ searchParams }: Params) {
  const eu = await exigirAdmin();
  const { erro } = await searchParams;
  const lista = await db
    .select({ id: users.id, nome: users.nome, email: users.email, papel: users.papel })
    .from(users)
    .orderBy(asc(users.id));

  return (
    <main className="mx-auto max-w-3xl space-y-8 p-6">
      <Link href="/" className="text-sm underline">
        ← Voltar
      </Link>
      <h1 className="text-2xl font-bold">Administração de usuários</h1>

      {erro && <p className="rounded bg-red-100 p-3 text-red-800">{erro}</p>}

      <form
        action={criarUsuarioAction}
        className="grid gap-3 rounded border border-zinc-300 p-4 dark:border-zinc-700"
      >
        <h2 className="font-semibold">Novo usuário</h2>
        <div className="grid gap-3 md:grid-cols-2">
          <input name="nome" placeholder="Nome" required className={input} />
          <input name="email" type="email" placeholder="E-mail" required className={input} />
          <input
            name="senha"
            type="password"
            placeholder="Senha (6+ caracteres)"
            required
            minLength={6}
            className={input}
          />
          <select name="papel" defaultValue="usuario" className={input}>
            {PAPEIS.map((p) => (
              <option key={p.valor} value={p.valor}>
                {p.rotulo}
              </option>
            ))}
          </select>
        </div>
        <button className={`${botao} justify-self-start`}>Criar usuário</button>
      </form>

      <ul className="space-y-2">
        {lista.map((u) => (
          <li
            key={u.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded border border-zinc-300 p-3 dark:border-zinc-700"
          >
            <span>
              <strong>{u.nome}</strong>
              <span className="ml-2 text-sm text-zinc-500">{u.email}</span>
            </span>

            {u.id === eu.id ? (
              <span className="text-sm text-zinc-500">{u.papel} (você)</span>
            ) : (
              <form action={alterarPapelAction.bind(null, u.id)} className="flex gap-2">
                <select name="papel" defaultValue={u.papel} className={input}>
                  {PAPEIS.map((p) => (
                    <option key={p.valor} value={p.valor}>
                      {p.rotulo}
                    </option>
                  ))}
                </select>
                <button className={botao}>Salvar</button>
              </form>
            )}
          </li>
        ))}
      </ul>
    </main>
  );
}