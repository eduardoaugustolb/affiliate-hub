# Data Access Layer

A camada `src/data/` é o único ponto de acesso do frontend à API. Todos os seus
módulos usam `import 'server-only'`. A API existente continua responsável pelo
banco e por autorizar suas próprias operações; a DAL também autoriza cada leitura
e gravação privada, independentemente da página que chamou a operação.

- `config.ts`: configuração interna de API_URL e SESSION_COOKIE_NAME.
- `transport.ts`: HTTP sem cache, timeout, erros seguros e apenas o cookie de
  sessão configurado. Respostas de transporte não chegam aos componentes.
- `auth.ts`: sessão verificada na API, papel admin e cache React somente durante
  a requisição. O cache usa a sessão atual, para não reutilizar um usuário após
  login/logout dentro da mesma requisição. Tokens não integram DTOs.
- `validation.ts`: validação de entradas e identificadores, listas, limites,
  enums e URLs HTTPS. Identificadores são validados antes de formar caminhos.
- `dto.ts`: projeção explícita das respostas. Campos extras nunca são copiados.
- `products.ts` e `catalog.ts`: operações por recurso. Cada operação privada
  chama requireAdmin; catálogo público não recebe cookies de sessão.
- `dashboard.ts` e `storefront.ts`: DTOs de tela, com leituras independentes em
  paralelo e mensagens seguras de falha.

Componentes de servidor só solicitam DTOs. Componentes de cliente recebem o nome
do administrador, campos de produto usados pela UI, opções ou outfits; não
recebem e-mail, papel, IDs internos, datas técnicas, tokens ou respostas brutas.

`src/app/admin/actions.ts` contém Server Actions finas: delegam à DAL, invalidam
`/admin` após sucesso e retornam somente resultado mínimo ou erro seguro. As
entradas da Action são `unknown`, validadas pela DAL; chamadas diretas também
exigem autorização. A proteção de origem das Actions fica a cargo do Next.js.

Os Route Handlers `/api/admin/*` e `/api/catalog/*` também delegam à DAL, sem
transporte direto ou acesso a variáveis de ambiente. Nas mutações HTTP do admin,
o adaptador ainda exige Origin compatível com o Host. Os DTOs desses endpoints
são os mesmos DTOs mínimos, e não espelhos completos da API de backend.

Login só grava a sessão após confirmar o papel admin. Usuários sem esse papel
não recebem cookie e sua sessão recém-criada é revogada. Cookies persistem com
HttpOnly, Path=/, SameSite=Strict, duração e Secure derivados da API; logout revoga
na API e expira o cookie local. Use HTTPS quando o backend emite Secure.

Configure SESSION_COOKIE_NAME com o mesmo nome da API. O padrão é `session` no
desenvolvimento e `__Host-session` em produção. Se rodar Next em produção contra
uma API local em desenvolvimento, configure `SESSION_COOKIE_NAME=session`.

Verificação: `bun test test src/lib src/components/ui`, `bun run lint`,
`bunx --no-install tsc --noEmit`, `bun run build` e
`bun .harness/admin/check.ts`. Os testes unitários verificam todos os acessos
privados sem sessão e com papel insuficiente, DTOs mínimos, validação de entradas,
allowlist de campos, cookies e chamadas diretas de Server Actions. O harness
verifica HTTP e navegador com serviços de teste isolados, sem banco real.

Referência: documentação local da versão instalada e
[Next.js — Data Security](https://nextjs.org/docs/app/guides/data-security).

Resultado desta implementação: build Turbopack, TypeScript e Biome aprovados;
17 testes passaram. O harness de produção também passou, incluindo o adaptador
HTTP sem sessão (401), bloqueio de origem externa (403), isolamento entre sessões,
fluxos via Server Actions, streaming e erro/retry. A validação usou API HTTP de
fixture; não executou operações contra o banco real.
