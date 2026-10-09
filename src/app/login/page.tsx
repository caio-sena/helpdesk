import { Suspense } from "react";
import { redirect } from "next/navigation";
import { cadastrarAction, entrarAction } from "@/actions";
import { usuarioAtual } from "@/auth";

type Params = { searchParams: Promise<{ erro?: string }> };

const input = "w-full rounded border border-zinc-300 bg-transparent p-2 dark:border-zinc-700";
const botao = "rounded bg-blue-600 p-2 font-medium text-white hover:bg-blue-700";

export default function Login({ searchParams }: Params) {
  return (
    <Suspense fallback={<p className="p-6">Carregando...</p>}>
      <Formularios searchParams={searchParams} />
    </Suspense>
  );
}

async function Formularios({ searchParams }: Params) {
  if (await usuarioAtual()) redirect("/");
  const { erro } = await searchParams;

  return (
    <main className="mx-auto grid max-w-3xl gap-8 p-6 md:grid-cols-2">
      <h1 className="text-2xl font-bold md:col-span-2">Helpdesk</h1>
      {erro && (
        <p className="rounded bg-red-100 p-3 text-red-800 md:col-span-2">{erro}</p>
      )}

      <form action={entrarAction} className="grid content-start gap-3">
        <h2 className="text-lg font-semibold">Entrar</h2>
        <input name="email" type="email" placeholder="E-mail" required className={input} />
        <input name="senha" type="password" placeholder="Senha" required className={input} />
        <button className={botao}>Entrar</button>
      </form>

      <form action={cadastrarAction} className="grid content-start gap-3">
        <h2 className="text-lg font-semibold">Criar conta</h2>
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
        <button className={botao}>Cadastrar</button>
      </form>
    </main>
  );
}