# BLACK HEM — loja e administração

Frontend Next.js com Bun. Instale com `bun install` e execute
`bun run dev --port 3001`. A API fica em um projeto separado (`../api-ts`).
Configure `API_URL` em `.env.local` com a origem interna da API
(padrão `http://127.0.0.1:3000`). Reinicie o Next após alterar a variável.

## SSR e Suspense

Home e `/admin` usam Server Components assíncronos sob Suspense. O shell com
BH centralizado é enviado antes da resposta da API; produtos, filtros e sessão são
renderizados no servidor e transmitidos por streaming. As leituras usam
`cache: no-store`, timeout de 15 segundos e a origem interna `API_URL`.
O navegador não faz GETs iniciais para `/api/catalog` ou `/api/admin`.

O loader mostra apenas BH centralizado, na mesma escala do início da hero, sem pulsação ou mudança de cor. Ao
resolver, a home mantém a animação existente de B/H abrindo para BLACK HEM e as
revelações do conteúdo. Transições de navegação e gravações também mostram o
loader. O lettering do preloader é sempre estático, sem atraso artificial.

Os filtros da home e a paginação usam query parameters; tamanho e cor aceitam
múltiplas opções. Buscar reinicia o offset, Limpar remove os filtros. A navegação
usa páginas de 24 peças com Anteriores/Próximas, respeitando `hasMore` da API.
As URLs preservam filtros e página ao recarregar ou navegar pelo histórico.

## Dashboard

Acesse `/admin` e entre com uma conta admin provisionada pelo backend
(`bun run admin:create` no projeto da API). A sessão e os dados da seção são
lidos no servidor. Produtos usam páginas de 25 registros. As abas usam `tab`;
o editor usa `edit=new` ou `edit=CODIGO`; a consulta de outfit usa `outfit`.

Inclui cadastro, edição e exclusão de produtos, filtros de tamanho/cor e
criação, consulta e exclusão de outfits. O editor recebe os filtros e as opções
atuais do produto por SSR e envia `optionIds` junto com os campos da peça.
Exclusões exigem confirmação. A API não fornece totais globais nem listagem de
outfits; a consulta usa o código retornado na criação.

Todos os acessos passam pela DAL `server-only` em `src/data/`. Cada operação
privada verifica a sessão e o papel admin, valida as entradas e devolve DTOs
mínimos. Gravações e login/logout usam Server Actions que delegam à DAL e
revalidam `/admin`. A API também continua autorizando suas operações.

Os Route Handlers `/api/admin/*` e `/api/catalog/*` delegam à mesma DAL, sem
transporte HTTP direto. Cookies só são enviados nas operações privadas; o
catálogo público não recebe cookies de sessão. Configure `SESSION_COOKIE_NAME`
com o mesmo nome da API: padrão `session` no desenvolvimento e `__Host-session`
em produção. Use HTTPS para cookies Secure. Detalhes em
[Data Access Layer](docs/data-access-layer.md).

## Verificação

```sh
bun test test src/lib src/components/ui
bunx --no-install tsc --noEmit
bun run lint
bun run build
bun .harness/admin/check.ts
```

O último comando exige Chromium do Playwright instalado. Ele inicia uma API HTTP
de teste e um servidor Next de produção em portas livres e encerra ambos ao
terminar. Verifica streaming antes da API, dados no HTML sem hidratação, BH estático,
transição da hero, filtros/paginação SSR, cookies, editor, criação de produto e
outfit, layout mobile, logout, erro/retry e movimento reduzido. Não usa o banco
nem contas reais. Screenshots e logs ficam em `.harness/admin/`.

O teste de fixture verifica a integração HTTP do Next; a validação com PostgreSQL
e o backend real continua dependendo dos serviços e de uma conta admin local.

### Páginas públicas de detalhes

- `/p/:productCode` redireciona para `/products/:id`.
- `/o/:outfitCode` redireciona para `/outfits/:id`.
- `id` usa o código público; consultas via DAL e SSR/Suspense.
- A API deve disponibilizar `GET /storefront/products/:code` e `GET /storefront/outfits/:code` (implementados em `../api-ts`).
- Cores do produto abrem o catálogo filtrado; cores do outfit filtram suas peças pela URL. Botões de compra abrem o marketplace correspondente.

Detalhes e validação: [product-and-outfit.md](docs/design/product-and-outfit.md).
