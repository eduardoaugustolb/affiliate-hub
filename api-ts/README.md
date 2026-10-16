# Affiliate Hub API + Web

MVP local do Product Resolver. O Bun serve a API, a home pública e o painel administrativo na mesma origem. Não é necessário build do frontend.

## Iniciar

```sh
bun install
# Configure DATABASE_URL em .env; use PostgreSQL com as migrações deste projeto.
bun run migrate
bun run admin:create
bun run dev
```

Abra `http://localhost:3000/` para buscar um código e `/admin` para entrar no painel. O script de admin impede criar outro primeiro administrador quando um já existe. Para execução sem watch: `bun run start`.

## Fluxo disponível

1. Criar o administrador pelo terminal.
2. Fazer login no painel com e-mail e senha.
3. Cadastrar nome, marketplace, link afiliado, URL HTTPS da imagem e status.
4. Copiar o código gerado para o post.
5. Digitar o código na home ou abrir `/:productCode` para chegar à loja.
6. Editar destino, nome, imagem e status, preservando o código; desativar/reativar pelo painel.

Upload, storage de imagens e remoção de assets foram adiados. O painel aceita uma URL de imagem e mostra uma prévia.

## Contratos HTTP

| Método | Rota | Comportamento |
| --- | --- | --- |
| GET | `/` | Home com formulário GET de código, funciona sem JavaScript |
| GET | `/:productCode` | 302 com Location para produto ativo; 404 inexistente; 410 inativo |
| GET | `/resolve?code=...` | Mesmo comportamento do link direto, usado pelo formulário |
| GET | `/admin/login` | Formulário de login |
| GET | `/admin` | Painel protegido; 303 para login se a sessão for inválida |
| POST | `/auth/login` | Cookie de sessão HttpOnly, SameSite=Strict, duração de sete dias |
| GET | `/auth/me` | Dados do usuário autenticado |
| POST | `/auth/logout` | Revoga a sessão no banco e apaga o cookie |
| GET | `/products?limit=25&offset=0` | Lista privada para admin, limite de 1 a 100 |
| POST | `/products` | Admin; cria e retorna 201 com `{ "code": "A7K2XY" }` |
| GET | `/products/:code` | JSON do produto, sem redirecionamento |
| PUT | `/products/:code` | Admin; substitui os campos editáveis, retorna 204 |
| DELETE | `/products/:code` | Admin; exclui o registro, preserva a reserva permanente do código |
| GET | `/health` | Health check |

Criação e atualização recebem `name` (1–160 caracteres, sem espaços nas bordas), `marketplace` (`shopee` ou `shein`), `destinationUrl`, `imageUrl` (HTTPS) e `status` (`active` ou `inactive`). A identidade enviada no body é ignorada; a atualização usa o código da rota. O nome é obrigatório na API.

Os códigos novos têm seis caracteres do alfabeto `ABCDEFGHJKLMNPQRSTUVWXYZ23456789`. O domínio aceita de quatro a seis e normaliza espaços nas bordas e casing. Códigos antigos com `1` continuam resolvendo. A migração dá nomes provisórios aos registros antigos sem mudar seus códigos.

A tabela `reserved_product_codes` e o trigger de produtos garantem reserva atômica, inclusive após DELETE, e impedem mudar o código de um registro. Não esvazie essa tabela no ambiente real. Desative produtos indisponíveis, em vez de excluí-los. A migração só pode preservar os códigos existentes quando aplicada; códigos excluídos antes dela não podem ser recuperados sem backup.

Redirecionamentos usam 302 e `Cache-Control: no-store`, para não fixar destinos que podem mudar. Dados privados e HTML administrativo não são armazenados em cache. Nome e código são exibidos no frontend via `textContent`.

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
- Proxy HTTPS para a porta `PORT` (3000 por padrão), servindo frontend e API na mesma origem.
- Manter a pasta `src/web` disponível no runtime, pois os assets são servidos diretamente.
- Em produção, o cookie padrão é `__Host-session`, com Secure, HttpOnly, Path=/, SameSite=Strict e expiração. `SESSION_COOKIE_NAME` pode sobrescrever o nome; Secure permanece obrigatório em produção.
- Validar login, logout, copiar código e busca em outro dispositivo com HTTPS, incluindo a abertura real dos links afiliados.

Não há publicação automática nesta entrega. A verificação local por HTTP não comprova o comportamento dos cookies sob HTTPS nem a navegação mobile real.

## Decisões

A stack existente foi preservada: Bun, TypeScript, Hono, Bun.sql/PostgreSQL, Knex para migrações, `bun test`, HTML/CSS/JavaScript sem framework adicional. Veja `docs/brand-dossier.md` para a direção visual provisória e `../PRD.MVP.md` para o brief original.
