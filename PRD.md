# PRD: Drops do Frost
### Sistema de Automação de Afiliados (Streetwear + Perfumes)

**Versão:** 1.1
**Status:** Rascunho para validação técnica
**Stack:** TypeScript + **Bun** (runtime, package manager, bundler e test runner de sistema)
em todos os serviços, Clean Architecture + Arquitetura Hexagonal (Ports & Adapters).
Arquitetura de referência: [drummerpva/erp](https://github.com/drummerpva/erp),
mesma disciplina de portas/adapters, caso de uso tipado e erro mapeado na borda
(a estrutura de pastas daquele repo é só ilustrativa, não normativa).

---

## 1. Visão Geral

Sistema de automação de ponta a ponta para operação de um perfil de afiliados
(Shopee, Shein, Mercado Livre) no nicho streetwear + perfumes, cobrindo:

- Sincronização de produtos e links de afiliado (Shopee Affiliate Open API).
- Geração automática de imagens de post (formato "photo dump") a partir de templates.
- Encurtador de link próprio com redirecionamento sempre atualizado + QR code embutido.
- Distribuição automática de novos produtos para um grupo de WhatsApp (via Baileys).
- Painel administrativo para curadoria de produtos, mídia e templates.
- Ferramenta de apoio (não automação) para responder comentários no TikTok.

**Fora de escopo nesta versão:** automação de resposta de comentário no TikTok
(viola ToS), automação de postagem no TikTok em si, geração de imagem via IA generativa
no pipeline principal (usada só offline, para criação de ativos de marca).

---

## 2. Princípio Arquitetural

A aplicação segue **Clean Architecture** com **Arquitetura Hexagonal (Ports & Adapters)**,
com a seguinte regra inegociável:

> **A regra de dependência aponta sempre para dentro.**
> Domínio não conhece caso de uso. Caso de uso não conhece framework, banco,
> fila ou biblioteca externa, ele só conhece **portas** (interfaces) que ele mesmo declara.
> Frameworks, bancos, filas e SDKs de terceiros são **adapters**, implementações
> descartáveis e substituíveis dessas portas.

Isso não é um layout de pastas específico, é uma disciplina de dependência. A estrutura de
pastas abaixo é uma forma de organizar isso, não o objetivo em si. Sinal de que a regra está
sendo seguida: **trocar Fastify por Express, ou MySQL por Postgres, ou Baileys por outra lib
de WhatsApp deve significar trocar uma linha no composition root, nunca editar um caso de uso
ou uma entidade de domínio.**

### 2.1 Camadas

| Camada | Responsabilidade | Conhece |
|---|---|---|
| **Domain** | Entidades, regras de negócio invariantes, value objects | Nada externo |
| **Application** | Casos de uso (orquestração), portas (interfaces) | Domain + suas próprias portas |
| **Adapters** | Implementações concretas das portas (banco, HTTP, filas, SDKs) | Application (via porta) + biblioteca externa |
| **Main (composition root)** | Instancia adapters concretos, injeta nos casos de uso, faz o "fiação" da aplicação | Tudo (é a única camada que pode conhecer implementações concretas) |

### 2.2 Padrão de Caso de Uso

Todo caso de uso implementa uma interface genérica `UseCase<Input, Output>`, com
`Input`/`Output` tipados junto ao próprio caso de uso (não em arquivo de tipos solto).
Casos de uso dependem de **portas**, nunca de adapters concretos; a porta é declarada
pela camada de aplicação, e o adapter concreto é injetado de fora (composition root),
nunca instanciado dentro do caso de uso.

### 2.3 Padrão de Repositório

Portas de persistência são definidas em termos de domínio (`ProductRepository`, não
`ProductTable`). O adapter concreto (`ProductRepositoryDatabase`) **não conhece o banco
específico**, ele recebe a porta `DatabaseConnection` injetada (seção 2.6) e só sabe
executar `query`. Trocar de banco é trocar o adapter de `DatabaseConnection`
(`PgAdapter` → `MysqlAdapter` → `SQLiteAdapter`), sem tocar no repositório nem em
nenhum caso de uso, igual ao par `BankRepositoryDatabase`/`DatabaseConnection` do
repo de referência.

### 2.4 Padrão de Entrada (Controller/Handler)

Quem define o contrato de entrada (rota HTTP, mensagem de fila, comando de cron) é a
própria camada que expõe aquele caso de uso, e essa camada declara a porta de
transporte (`HttpServer`, `QueueConsumer`) que os adapters de framework implementam.
Isso significa: o caso de uso não sabe se foi chamado por uma rota REST, um worker de
fila ou um comando de terminal.

### 2.5 Tratamento de Erro

Erros de domínio/aplicação são tipados e distintos de erros de infraestrutura
(`DomainError`, `ApplicationError`, `NotFoundError` vs. exceções de driver de banco,
timeout de rede etc.). Um mapeador de erro na borda de cada adapter de entrada traduz
esses erros para o formato apropriado (HTTP status code, retry de fila, log estruturado).

### 2.6 Decisões de Tecnologia (confirmadas)

Decisões tomadas por espelhamento direto do repositório de referência, adaptadas a Bun:

- **Runtime/package manager/bundler:** Bun, em todos os serviços. `bun install`,
  `bun build`, `bun run`: sem Node.js, sem tsx/tsup no dev loop.
- **Acesso a banco: sem ORM, e repositório não conhece o banco.** Porta própria
  `DatabaseConnection` (método `query`), implementada por um adapter fino
  (`PgAdapter`, via `postgres.js`, driver `pg` ou `Bun.sql` nativo, decisão de
  adapter, não de arquitetura). Toda classe `<Entidade>RepositoryDatabase`
  (ex.: `ProductRepositoryDatabase`) implementa a porta de domínio (`ProductRepository`)
  recebendo `DatabaseConnection` injetada no construtor, ela só sabe montar SQL e
  chamar `query`, nunca importa `pg`, `postgres.js` ou qualquer driver diretamente.
  **Migrations via Knex** (`knex migrate:latest`/`migrate:rollback`), igual ao repo
  de referência, Knex entra só como ferramenta de migration/CLI, nunca como query
  builder dentro de repositório ou caso de uso.
- **Chamada HTTP de saída:** porta própria `HttpClient` (espelhando o `FetchAdapter`
  do repo de referência), implementada com `fetch` nativo do Bun. Toda integração
  externa (Shopee API, etc.) passa por essa porta, nunca `fetch`/`axios` direto
  dentro de um caso de uso ou adapter de domínio específico.
- **Test runner:** `bun:test`, unitário e integração, sem dependência externa.
  Vitest foi tentado primeiro por paridade com o repo de referência, mas não
  consegue importar o builtin `"bun"`, quebra qualquer teste que toque um
  adapter que use `Bun.SQL` (ex.: `PgAdapter`). Adapter fake/in-memory de cada
  porta é obrigatório por módulo (ver seção 14).
- **Organização de código:** monorepo com **Bun workspaces**. Cada bounded context
  (seção 3) é um pacote interno com seu domain + application + ports. Cada serviço
  deployável (seção 11) é outro pacote que importa só os módulos que roda e monta
  seu próprio composition root (`main.ts`), nunca importa de outro serviço deployável.
- **Banco de dados gerenciado:** Postgres hospedado no Supabase, mas acessado via
  protocolo Postgres puro pela porta `DatabaseConnection`, **não** pelo client SDK
  `@supabase/supabase-js` para dados. Nenhum módulo usa o SDK do Supabase, nem
  IdentityAccess: Supabase é hosting de Postgres, ponto final.
- **Autenticação do painel:** caseira, sem provedor terceirizado (Supabase Auth,
  Clerk, Auth0, etc.). Hash de senha via `Bun.password` (nativo, argon2id),
  credenciais na mesma base Postgres do projeto via `DatabaseConnection`.

---

## 3. Bounded Contexts (Módulos)

A aplicação é dividida em módulos de domínio, cada um seguindo a mesma disciplina de
camadas internamente. Módulos se comunicam via banco compartilhado (Supabase/Postgres)
e, quando cruzam processo, via fila, nunca chamando função interna de outro módulo
diretamente.

```
1. Catalog        → produtos, curadoria, ciclo de vida (entrada/remoção)
2. AffiliateSync   → integração com Shopee Affiliate Open API
3. MediaTemplate   → geração de imagens de post (dump), remoção de fundo, templates
4. LinkRedirect    → encurtador próprio + QR code
5. Broadcast       → distribuição automática no grupo de WhatsApp (Baileys)
6. CommentAssist   → painel de apoio a comentários do TikTok (não automatizado)
7. IdentityAccess  → autenticação do painel administrativo (auth caseira)
```

Cada módulo é meio (`app/`, se for monorepo) ou serviço (se for deploy separado na
Railway), a fronteira de domínio é a mesma independentemente de onde ele é implantado.

---

## 4. Módulo 1: Catalog (Gestão de Produtos)

### 4.1 Responsabilidade
Fonte de verdade dos produtos: cadastro, curadoria de mídia, ciclo de vida
(ativo/inativo), decisão de qual template de post usar.

### 4.2 Domínio
- **Entidade `Product`**: id, nome, categoria (streetwear/perfume), status
  (`draft | active | inactive`), `mediaType` (`catalog | lifestyle`),
  `assignedTemplate`, timestamps. Regra invariante: produto não pode ser
  publicado (`active`) sem ter ao menos uma foto aprovada e link de afiliado válido.
- **Value Object `ProductId`**: o código curto tipo `BBA-QES-MZN`,
  gerado uma vez, imutável, é a chave usada no link, no QR e no overlay da imagem.
- Produto nunca é deletado fisicamente, só transita para `inactive`
  (`removedAt` preenchido). Isso evita 404 em posts antigos e preserva analytics.

### 4.3 Casos de Uso
- `RegisterProduct`: recebe dados vindos da sincronização Shopee, cria em `draft`.
- `ApproveProductMedia`: curadoria humana escolhe a foto/template, produto pode virar `active`.
- `DeactivateProduct`: soft delete; dispara remoção da fila de broadcast e do link tree.
- `ListProductsForCuration`: produtos em `draft` aguardando decisão humana.

### 4.4 Portas
- `ProductRepository` (persistência)
- `EventPublisher` (porta para publicar `ProductActivated`, `ProductDeactivated`, consumida
  pelos módulos Broadcast e LinkRedirect sem acoplamento direto)

### 4.5 Adapters (exemplos, substituíveis)
- `ProductRepositoryDatabase` implementa `ProductRepository`, recebe `DatabaseConnection`
  injetada (seção 2.6), não conhece Postgres nem nenhum outro banco especificamente
- `OutboxPublisherDatabase` implementa `EventPublisher`, mesma ideia: tabela de outbox
  acessada via `DatabaseConnection`, evita depender de Supabase Realtime ou de
  qualquer feature específica de um banco

---

## 5. Módulo 2: AffiliateSync (Integração Shopee)

### 5.1 Responsabilidade
Buscar produtos/comissões na Shopee Affiliate Open API (GraphQL + HMAC-SHA256),
gerar/atualizar links de afiliado e subIds a cada 3 dias.

### 5.2 Casos de Uso
- `SyncAffiliateLinks`: para cada produto ativo, busca link fresco na Shopee,
  atualiza a entidade `AffiliateLink` associada ao produto.
- `ImportProductFromFeed`: traduz payload da Shopee em comando `RegisterProduct`
  (delegando ao módulo Catalog via porta, não import direto de classe).

### 5.3 Portas
- `AffiliateProvider`: porta de domínio própria (não "ShopeeClient"!). Métodos como
  `findLink(externalProductId)`, `listUpdatedProducts()`. Isso é o ponto-chave:
  se amanhã vocês adicionarem Shein ou Mercado Livre como fonte, é só escrever um novo
  adapter `SheinAffiliateProvider implements AffiliateProvider`, nenhum caso de uso muda.
- `TaskScheduler`: porta para dispor a rotina periódica (cron), abstrata o
  agendador real (Railway Cron, node-cron, etc.)

### 5.4 Adapters
- `ShopeeAffiliateProvider implements AffiliateProvider` (GraphQL + HMAC-SHA256,
  chamadas feitas através da porta `HttpClient` (seção 2.6), nunca `fetch` direto)
- `RailwayCronScheduler implements TaskScheduler`

---

## 6. Módulo 3: MediaTemplate (Geração de Imagem)

### 6.1 Responsabilidade
Transformar fotos brutas de produto em imagem final de post, seguindo um dos
templates registrados (`cutout-flatlay`, `grid-colagem`, outros no futuro).

### 6.2 Casos de Uso
- `RemoveImageBackground`: pré-processamento de foto crua.
- `RenderPost`: dado `productId` + `templateId`, monta a imagem final
  (overlay de ID, nome, QR code).
- `RegisterTemplate`: permite adicionar um novo layout sem alterar código do
  motor de renderização (template é dado, não lógica hardcoded).

### 6.3 Portas
- `BackgroundRemover`: porta abstraindo a remoção de fundo. Isso é o motivo de
  não travar em rembg: se um dia vocês quiserem trocar por uma API paga,
  é um novo adapter, caso de uso intacto.
- `ImageRenderer`: porta abstraindo o motor de renderização (Satori hoje,
  poderia ser Playwright amanhã para templates mais complexos, sem reescrever
  `RenderPost`).
- `FileStorage`: porta de object storage (upload/get URL pública).
- `QRCodeGenerator`: porta isolada (troca de lib de QR sem tocar em nada mais).

### 6.4 Adapters
- `RembgBackgroundRemover implements BackgroundRemover`
- `SatoriImageRenderer implements ImageRenderer`
- `CloudflareR2Storage implements FileStorage`
- `QRCodeNpmAdapter implements QRCodeGenerator`

---

## 7. Módulo 4: LinkRedirect (Encurtador + QR)

### 7.1 Responsabilidade
Servir `dominio.link/p/{identificador}` com redirecionamento 302 para o link de
afiliado vigente, registrando o clique.

### 7.2 Casos de Uso
- `RedirectToAffiliateLink`: resolve identificador → link atual, loga clique, redireciona.
- `RegisterClick`: analytics próprio, desacoplado do redirecionamento em si
  (pode virar um evento assíncrono no futuro sem travar a resposta HTTP).

### 7.3 Portas
- `ProductRepository` (reaproveitada do domínio compartilhado, leitura apenas)
- `ClickLog`: porta de analytics.
- `HttpServer`: porta de transporte, implementada por adapter de framework
  (Hono hoje; trocar por outro é isolado aqui).

### 7.4 Adapters
- `HonoAdapter implements HttpServer`
- `ClickLogDatabase implements ClickLog`: via `DatabaseConnection`,
  não conhece Postgres especificamente

---

## 8. Módulo 5: Broadcast (Grupo de WhatsApp via Baileys)

### 8.1 Responsabilidade
Enviar automaticamente novo produto ativado para o grupo de WhatsApp, com
cadência controlada (throttle, humano-símile), usando fila persistente, nunca
disparo direto no evento.

### 8.2 Casos de Uso
- `EnqueueProductForBroadcast`: reage a `ProductActivated` (assinando `EventPublisher`
  do módulo Catalog), insere item na fila com agendamento.
- `ProcessBroadcastQueue`: worker que consome a fila respeitando throttle/jitter,
  chama a porta de mensageria.
- `PauseBroadcast` / `ResumeBroadcast`: kill switch operacional.

### 8.3 Portas
- `BroadcastQueue` (persistência da fila, pode ser tabela Postgres hoje, Redis/BullMQ amanhã)
- `MessagingClient`: porta central. **Este é o ponto que garante a troca fácil
  de lib de WhatsApp**: hoje `BaileysMessagingAdapter implements MessagingClient`,
  amanhã se precisar trocar por outra biblioteca (ou até por uma API oficial de
  Business, se surgir viabilidade), é um novo adapter, `ProcessBroadcastQueue`
  não muda uma linha.
- `SessionStorage`: porta separada para persistir `authState` do Baileys
  (crítico: não pode ser adapter de disco local em ambiente efêmero).

### 8.4 Adapters
- `BaileysMessagingAdapter implements MessagingClient`
- `SessionStorageDatabase implements SessionStorage`: via `DatabaseConnection`
- `BroadcastQueueDatabase implements BroadcastQueue`: via `DatabaseConnection`,
  trocável por `BroadcastQueueRedis`/BullMQ no futuro sem tocar em `ProcessBroadcastQueue`

---

## 9. Módulo 6: CommentAssist (Apoio a Comentário no TikTok)

### 9.1 Responsabilidade
Painel interno onde o operador informa o identificador do produto citado num
comentário e recebe a mensagem pronta para copiar/colar manualmente.
**Não há automação de leitura ou postagem de comentário**, decisão consciente
de não violar ToS do TikTok.

### 9.2 Casos de Uso
- `GenerateReplyMessage`: dado identificador de produto, monta texto com
  link/QR pronto pra colar.

### 9.3 Portas
- `ProductRepository` (reaproveitada, leitura)

Módulo propositalmente enxuto, é o único que não tem adapter de "ação automática"
porque a ação em si é manual por design.

---

## 10. Módulo 7: IdentityAccess (Autenticação do Painel)

### 10.1 Responsabilidade
Login e controle de acesso ao painel administrativo (curadoria de produto,
kill switch do broadcast, visualização de analytics).

### 10.2 Portas
- `UserAuthenticator`: porta de autenticação.

### 10.3 Adapters
- `UserAuthenticatorDatabase implements UserAuthenticator`: auth caseira,
  sem provedor terceirizado (hash de senha via `Bun.password`, credenciais
  na mesma base Postgres do projeto via `DatabaseConnection`)

---

## 11. Infraestrutura & Deploy

| Serviço (Railway) | Contém | Padrão de execução | Custo |
|---|---|---|---|
| `api` | Catalog, LinkRedirect, CommentAssist, IdentityAccess | HTTP sob demanda | Baixo |
| `sync-worker` | AffiliateSync | Cron periódico (3 em 3 dias) | Quase zero |
| `broadcast-worker` | Broadcast (inclui processo Baileys) | Sempre ativo (WebSocket persistente) | Fixo, mas baixo (piso de custo do sistema) |
| `template-svc` | MediaTemplate | HTTP sob demanda / fila | Baixo |

- **Monorepo**: Bun workspaces. Cada serviço da tabela acima é um pacote deployável
  próprio na Railway, com seu `main.ts` (composition root), importa só os pacotes
  de bounded context que efetivamente roda (seção 2.6).
- **Banco**: Postgres hospedado no Supabase, acessado via protocolo Postgres puro
  pela porta `DatabaseConnection` (sem `@supabase/supabase-js` para dados, seção 2.6)
  , compartilhado entre módulos, cada módulo só acessa suas próprias tabelas via
  seu próprio adapter de repositório (sem acoplamento de schema entre módulos).
- **Object storage**: Cloudflare R2 (sem custo de egress).
- **Domínio de redirect**: `dominio.link` (ou equivalente curto), apontando pro serviço `api`.

---

## 12. Requisitos Não Funcionais

- **Substituibilidade de infraestrutura**: qualquer porta de infraestrutura
  (banco, framework HTTP, storage, mensageria, fila, agendador) deve poder trocar
  de adapter concreto **sem alterar código de domínio ou caso de uso**, critério
  de aceite arquitetural, não sugestão.
- **Resiliência de sessão WhatsApp**: `authState` do Baileys nunca em disco
  efêmero, persistido via `SessionStorage`.
- **Nunca deleção física de produto**, sempre soft delete via campo de status.
- **Custo operacional total-alvo**: entre R$0 e R$50/mês no estágio inicial.
- **Observabilidade mínima**: healthcheck do módulo Broadcast deve notificar
  (e-mail/Telegram) se a conexão do WhatsApp cair.

---

## 13. Riscos Conhecidos (herdados das discussões anteriores)

- Baileys é biblioteca não-oficial, risco de ban do número do WhatsApp mesmo
  com cadência humana-símile. Mitigado por kill switch (`PauseBroadcast`) e
  monitoramento ativo.
- Nenhuma automação de leitura/resposta de comentário no TikTok, decisão de
  produto, não só técnica.
- Fotos "lifestyle" de review de terceiros (template `grid-colagem`) exigem
  curadoria humana quanto a direito de imagem, não deve virar pipeline 100% automático.
- Acesso ao Shopee Affiliate Open API depende de aprovação/nível de afiliado,
  validar antes de iniciar o módulo `AffiliateSync`.

---

## 14. Critério de Aceite Arquitetural (Definition of Done por módulo)

Um módulo só está "pronto" quando:
1. Toda dependência externa (framework, SDK, biblioteca de terceiro) está atrás
   de uma porta definida pela camada de aplicação.
2. Existe pelo menos um teste de caso de uso rodando com um **adapter fake/in-memory**
   da porta (prova de que o caso de uso não depende de infraestrutura real para
   ser testado).
3. Composition root (`main`) é o único lugar onde adapters concretos são instanciados
   e injetados.
4. Trocar um adapter concreto por outro (ex: trocar `SatoriImageRenderer` por um novo
   `PlaywrightImageRenderer`) não exige alterar nenhum arquivo de caso de uso ou entidade.

---

## 15. Roadmap Proposto

**Fase 1: Fundação**
Catalog (CRUD + soft delete) + IdentityAccess + banco Supabase.

**Fase 2: Afiliação**
AffiliateSync (Shopee) + LinkRedirect (encurtador + QR).

**Fase 3: Conteúdo**
MediaTemplate (remoção de fundo + templates + renderização).

**Fase 4: Distribuição**
Broadcast (Baileys) + CommentAssist.

**Fase 5: Operação**
Observabilidade, kill switches, painel de curadoria completo.
