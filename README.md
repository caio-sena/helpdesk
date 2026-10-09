# Helpdesk

Sistema de chamados de suporte de TI, fullstack, com autenticação, perfis de acesso, dashboard e API REST. Projeto de portfólio feito com Next.js em formato de monolito, com poucos arquivos e muitas funcionalidades.

**Demo:** https://SEU-PROJETO.vercel.app

![Lista de chamados](docs/chamados.png)

## Funcionalidades

- Cadastro e login com sessão em cookie `httpOnly` (JWT)
- Três perfis de acesso: **usuário**, **técnico** e **admin**
- CRUD de chamados com categoria, prioridade e status
- Comentários em cada chamado
- Busca por título e filtro por status
- Dashboard com indicadores e gráficos
- Exportação para CSV (compatível com Excel em português)
- API REST (`/api/chamados`)
- Área de administração: criar usuários e alterar papéis
- Tema claro/escuro automático

## Perfis e permissões

| Ação | Usuário | Técnico | Admin |
|---|:-:|:-:|:-:|
| Abrir chamados e comentar | ✅ | ✅ | ✅ |
| Ver chamados | só os seus | todos | todos |
| Alterar status | ❌ | ✅ | ✅ |
| Excluir chamado | só os seus | ✅ | ✅ |
| Criar usuários e alterar papéis | ❌ | ❌ | ✅ |

As permissões são verificadas **no servidor**, em cada página e em cada Server Action.

## Tecnologias

- **Next.js** (App Router, Server Actions, Route Handlers) e **React**
- **TypeScript**
- **Tailwind CSS**
- **SQLite** com **Drizzle ORM** (`@libsql/client`; Turso em produção)
- **jose** (JWT), **bcryptjs** (hash de senha) e **zod** (validação)

## Capturas de tela

| Dashboard | Administração |
|---|---|
| ![Dashboard](docs/dashboard.png) | ![Admin](docs/admin.png) |

## Como rodar localmente

Pré-requisitos: Node.js 20+ e Git.

```bash
git clone https://github.com/SEU-USUARIO/helpdesk.git
cd helpdesk
npm install
cp .env.example .env.local   # no Windows: copy .env.example .env.local
```

Preencha o `.env.local`:

| Variável | Descrição |
|---|---|
| `DATABASE_URL` | `file:local.db` para desenvolvimento |
| `DATABASE_AUTH_TOKEN` | só em produção (Turso) |
| `JWT_SECRET` | string aleatória longa |
| `ADMIN_EMAIL` | e-mail que vira admin ao se cadastrar |

Gere um `JWT_SECRET`:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Crie as tabelas e inicie:

```bash
npx drizzle-kit push
npm run dev
```

Acesse http://localhost:3000 e cadastre-se com o e-mail definido em `ADMIN_EMAIL` para ter acesso de administrador.

## API

A API usa a mesma sessão do site (cookie), então é preciso estar logado. Ela respeita as permissões: usuário comum só enxerga os próprios chamados.

### `GET /api/chamados`

Lista chamados em JSON.

| Parâmetro | Descrição |
|---|---|
| `status` | `aberto`, `em_andamento` ou `resolvido` |
| `q` | busca no título |
| `formato` | `csv` para baixar a planilha |

### `POST /api/chamados`

Cria um chamado. Corpo JSON:

```json
{
  "titulo": "Impressora sem toner",
  "descricao": "A impressora do 2º andar parou de imprimir.",
  "categoria": "hardware",
  "prioridade": "media"
}
```

`categoria` (padrão `geral`) e `prioridade` (`baixa`, `media` ou `alta`; padrão `media`) são opcionais.

Respostas: `200`/`201` com JSON, `400` para dados inválidos e `401` sem login.

```js
fetch("/api/chamados", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ titulo: "Teste", descricao: "Criado pela API" }),
}).then((r) => r.json()).then(console.log);
```

## Estrutura do projeto

```
src/
├── db.ts          # conexão e schema (users, chamados, comentarios)
├── auth.ts        # sessão JWT, login, cadastro, permissões
├── actions.ts     # Server Actions (chamados, comentários, administração)
└── app/
    ├── page.tsx               # lista, filtros e novo chamado
    ├── login/page.tsx
    ├── chamado/[id]/page.tsx  # detalhe, status e comentários
    ├── dashboard/page.tsx
    ├── admin/page.tsx
    └── api/chamados/route.ts  # API REST e CSV
```

## Decisões técnicas

- **Monolito Next.js:** front e back no mesmo projeto, sem camada de API separada, para reduzir arquivos e complexidade.
- **Papel lido do banco a cada requisição:** a mudança de papel feita pelo admin vale na hora, sem novo login.
- **`<Suspense>` ao redor da leitura de sessão:** compatível com a pré-renderização do Next atual.
- **CSV seguro:** células escapadas e protegidas contra injeção de fórmulas em planilhas.
- **Validação com zod** em todas as entradas (formulários e API).

## Deploy

Site na **Vercel** e banco no **Turso**. Variáveis de ambiente: `DATABASE_URL`, `DATABASE_AUTH_TOKEN`, `JWT_SECRET` e `ADMIN_EMAIL`.

## Próximos passos

- [ ] Testes automatizados e CI com GitHub Actions
- [ ] Paginação na lista de chamados
- [ ] Notificações por e-mail
- [ ] Anexos nos chamados

## Autor

**Caio Sena Pereira** · [LinkedIn] (https://www.linkedin.com/in/caiosena2601/) · [GitHub](https://github.com/caio-sena)

## Licença

MIT