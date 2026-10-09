import { Suspense } from "react";
import Link from "next/link";
import { and, count, eq, sql } from "drizzle-orm";
import { db, chamados } from "@/db";
import { exigirUsuario, ehEquipe } from "@/auth";

type Dado = { chave: string; total: number };

export default function Dashboard() {
  return (
    <Suspense fallback={<p className="p-6">Carregando...</p>}>
      <Painel />
    </Suspense>
  );
}

async function Painel() {
  const u = await exigirUsuario();
  // equipe (técnico e admin) vê tudo, usuário comum vê só os próprios chamados
  const escopo = ehEquipe(u.papel) ? undefined : eq(chamados.autorId, u.id);

  const agrupar = (coluna: typeof chamados.status | typeof chamados.prioridade | typeof chamados.categoria) =>
    db.select({ chave: coluna, total: count() }).from(chamados).where(escopo).groupBy(coluna);

  const porStatus = await agrupar(chamados.status);
  const porPrioridade = await agrupar(chamados.prioridade);
  const porCategoria = await agrupar(chamados.categoria);

  const dia = sql<string>`date(${chamados.criadoEm})`;
  const porDia = await db
    .select({ chave: dia, total: count() })
    .from(chamados)
    .where(and(escopo, sql`${chamados.criadoEm} >= date('now', '-6 days')`))
    .groupBy(dia)
    .orderBy(dia);

  const total = porStatus.reduce((soma, d) => soma + d.total, 0);
  const abertos = porStatus.find((d) => d.chave === "aberto")?.total ?? 0;
  const resolvidos = porStatus.find((d) => d.chave === "resolvido")?.total ?? 0;
  const pctResolvidos = total ? Math.round((resolvidos / total) * 100) : 0;

  return (
    <main className="mx-auto max-w-3xl space-y-6 p-6">
      <Link href="/" className="text-sm underline">
        ← Voltar
      </Link>
      <h1 className="text-2xl font-bold">Dashboard</h1>

      <div className="grid grid-cols-3 gap-3">
        <Card titulo="Total" valor={String(total)} />
        <Card titulo="Abertos" valor={String(abertos)} />
        <Card titulo="Resolvidos" valor={`${pctResolvidos}%`} />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Barras titulo="Por status" dados={porStatus} />
        <Barras titulo="Por prioridade" dados={porPrioridade} />
        <Barras titulo="Por categoria" dados={porCategoria} />
        <Barras
          titulo="Últimos 7 dias"
          dados={porDia.map((d) => ({
            chave: `${d.chave.slice(8, 10)}/${d.chave.slice(5, 7)}`,
            total: d.total,
          }))}
        />
      </div>
    </main>
  );
}

function Card({ titulo, valor }: { titulo: string; valor: string }) {
  return (
    <div className="rounded border border-zinc-300 p-4 text-center dark:border-zinc-700">
      <p className="text-sm text-zinc-500">{titulo}</p>
      <p className="text-3xl font-bold">{valor}</p>
    </div>
  );
}

function Barras({ titulo, dados }: { titulo: string; dados: Dado[] }) {
  const max = Math.max(1, ...dados.map((d) => d.total));
  return (
    <section className="rounded border border-zinc-300 p-4 dark:border-zinc-700">
      <h2 className="mb-3 font-semibold">{titulo}</h2>
      {dados.length === 0 && <p className="text-sm text-zinc-500">Sem dados.</p>}
      <ul className="space-y-2">
        {dados.map((d) => (
          <li key={d.chave} className="text-sm">
            <div className="mb-1 flex justify-between">
              <span>{d.chave.replace("_", " ")}</span>
              <span>{d.total}</span>
            </div>
            <div className="h-2 rounded bg-zinc-200 dark:bg-zinc-800">
              <div
                className="h-2 rounded bg-blue-600"
                style={{ width: `${(d.total / max) * 100}%` }}
              />
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}