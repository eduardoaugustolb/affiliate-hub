# Affiliate Hub API

API do Product Resolver em Bun e TypeScript. Este diretório contém somente o backend; a home e o dashboard serão desenvolvidos em um projeto Next.js separado.

## Iniciar

```sh
bun install
# Configure DATABASE_URL em .env; use PostgreSQL com as migrações deste projeto.
bun run migrate
bun run admin:create
bun run dev
```

A API escuta em `http://localhost:3000`. Verifique `GET /health`. O script de admin impede criar outro primeiro administrador quando um já existe. Para execução sem watch: `bun run start`.

## Escopo

A API oferece autenticação por cookie, logout, CRUD e listagem de produtos para admin, geração e reserva permanente de códigos e resolução pública com redirecionamento. Não serve páginas HTML, CSS, JavaScript ou assets de interface.

Upload, storage de imagens e remoção de assets foram adiados. Os produtos recebem a referência da imagem em `imageUrl`.

## Contratos HTTP

| Método | Rota | Comportamento |
| --- | --- | --- |
| GET | `/:productCode` | 302 com Location para produto ativo; 404 inexistente; 410 inativo |
| GET | `/resolve?code=...` | Resolução pública por query, com os mesmos status do link direto |
| POST | `/auth/login` | Cookie de sessão HttpOnly, SameSite=Strict, duração de sete dias |
| GET | `/auth/me` | Dados do usuário autenticado |
| POST | `/auth/logout` | Revoga a sessão no banco e apaga o cookie |
| GET | `/products?limit=25&offset=0` | Lista privada para admin, limite de 1 a 100 |
| POST | `/products` | Admin; cria e retorna 201 sem corpo; consulte GET /products para obter os dados |
| GET | `/products/:code` | JSON do produto, sem redirecionamento |
| PUT | `/products/:code` | Admin; substitui os campos editáveis, retorna 204 |
| DELETE | `/products/:code` | Admin; exclui o registro, preserva a reserva permanente do código |
| GET | `/health` | Health check |

Criação e atualização recebem `name` (1–160 caracteres, sem espaços nas bordas), `marketplace` (`shopee` ou `shein`), `destinationUrl`, `imageUrl` (HTTPS) e `status` (`active` ou `inactive`). A identidade enviada no body é ignorada; a atualização usa o código da rota. O nome é obrigatório na API.

Os códigos novos têm seis caracteres do alfabeto `ABCDEFGHJKLMNPQRSTUVWXYZ23456789`. O domínio aceita de quatro a seis e normaliza espaços nas bordas e casing. Códigos antigos com `1` continuam resolvendo. A migração dá nomes provisórios aos registros antigos sem mudar seus códigos.

A tabela `reserved_product_codes` e o trigger de produtos garantem reserva atômica, inclusive após DELETE, e impedem mudar o código de um registro. Não esvazie essa tabela no ambiente real. Desative produtos indisponíveis, em vez de excluí-los. A migração só pode preservar os códigos existentes quando aplicada; códigos excluídos antes dela não podem ser recuperados sem backup.

Redirecionamentos usam 302 e `Cache-Control: no-store`, para não fixar destinos que podem mudar. A listagem privada e os dados de sessão não são armazenados em cache. Erros de resolução são JSON: `PRODUCT_NOT_FOUND` (404) ou `PRODUCT_UNAVAILABLE` (410), sem redirecionamento.

## Testes

```sh
bunx --no-install tsc --noEmit
bun run check
bun test test/unit test/integration
```

Para testes HTTP com PostgreSQL, configure `TEST_DATABASE_URL` e `TEST_API_URL`. Aplique primeiro as migrações no banco de testes e inicie uma instância da API conectada a **esse mesmo banco**; execute `bun test`. Não aponte esses testes para produção: eles criam e removem seus próprios usuários/produtos. Reservas de códigos de teste permanecem, conforme a regra do produto.

## Execução em produção

Ainda não há domínio nem ambiente de produção definidos. Para publicar, será necessário:

- PostgreSQL persistente, backups e `DATABASE_URL` disponível somente no servidor.
- `bun install`, `bun run migrate`, `bun run admin:create` e `NODE_ENV=production bun run start`.
- Proxy HTTPS para a porta `PORT` (3000 por padrão). A integração com o frontend Next.js, incluindo a estratégia de origem/proxy e cookies, será definida nesse projeto; a API ainda não configura CORS para origens externas.
- Em produção, o cookie padrão é `__Host-session`, com Secure, HttpOnly, Path=/, SameSite=Strict e expiração. `SESSION_COOKIE_NAME` pode sobrescrever o nome; Secure permanece obrigatório em produção.
- Validar login, logout e resolução sob HTTPS. A revisão de UI e os testes em navegador pertencem ao futuro frontend Next.js.

Não há publicação automática nesta entrega. A verificação local por HTTP não comprova o comportamento dos cookies sob HTTPS nem a navegação mobile real.

## Decisões

A stack da API é Bun, TypeScript, Hono, Bun.sql/PostgreSQL, Knex para migrações e `bun test`. O frontend será feito com Next.js separadamente. Veja `../PRD.MVP.md` para o brief original.

## CQS

Todos os commands implementam `Command<Actor, Input>` e retornam `Promise<void>`. Queries retornam dados e não alteram estado. O controller gera o token antes de chamar AuthenticateUser; o command recebe o token como entrada e persiste somente o hash. O cookie é emitido apenas após o sucesso. A criação de produto responde 201 sem corpo; os dados e o código são obtidos pelas queries de produto.

### Leitura pública das páginas BLACK HEM

| Método | Endpoint | Resposta |
| --- | --- | --- |
| GET | `/storefront/products/:code` | Produto ativo com código, nome, foto, marketplace, destino e opções de cor/tamanho |
| GET | `/storefront/outfits/:code` | Código, nome e projeções das peças ativas do outfit |

Essas leituras dispensam sessão, retornam `Cache-Control: no-store` e não expõem IDs internos ou timestamps. Ausentes/inativos retornam 404; peças inativas ou excluídas são omitidas do outfit. As rotas administrativas existentes mantêm suas exigências de autenticação. Não há migração nova para essas páginas; o código público identifica as URLs canônicas do e-commerce.

Produtos aceitam uma galeria ordenada em `imageUrls` (1–20 URLs HTTPS). A primeira imagem é a capa em `imageUrl`; URLs repetidas são removidas. O campo legado `imageUrl` continua aceito quando `imageUrls` não é enviado. PUT substitui a galeria. A migração `20261019120000_product_images` converte a imagem existente em uma galeria de um item.

Múltiplas cores usam `optionIds`: envie os IDs das opções da categoria `color`, junto das opções de tamanho desejadas. As associações são salvas na mesma transação do produto. A vitrine retorna `colors: [{ id, name }]` e `imageUrls`, inclusive nos produtos de looks.

Ao vincular a galeria serializada pelo Bun SQL, preserve o cast `::text::jsonb`. Um parâmetro string vinculado diretamente a `jsonb` é armazenado como string JSON, violando a regra da galeria. O teste opcional de PostgreSQL em `ProductDAOSQL.test.ts` usa `POSTGRES_GALLERY_TEST_URL`, tabela temporária e rollback para validar inserção e atualização sem alterar produtos reais.
