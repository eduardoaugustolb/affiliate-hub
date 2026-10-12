# Affiliate Hub

Um resolvedor de produtos para quem publica looks e dumps nas redes sociais. Cada peça recebe um código curto; a pessoa digita esse código e chega ao link afiliado, mesmo que o destino seja atualizado depois.

**Fluxo:** post com código → código do produto → link de destino.

> O projeto está em desenvolvimento. Hoje o repositório contém a API TypeScript, regras de domínio, acesso ao PostgreSQL e testes. A única rota HTTP exposta no momento é `GET /health`; a home e o painel administrativo ainda não estão implementados.

## Estado atual

- Cadastro de produtos e geração de códigos nos casos de uso.
- Busca de produto pelo código.
- Domínio e persistência para produtos, usuários e sessões.
- Criação do primeiro administrador por script.
- API HTTP com Hono rodando no Bun.
- Testes unitários e de integração com `bun test`.

O [PRD do MVP](PRD.MVP.md) descreve o fluxo e as funcionalidades planejadas. Ele inclui etapas que ainda não estão disponíveis na aplicação.

## Requisitos

- [Bun](https://bun.sh/) — runtime e gerenciador de pacotes.
- Docker Compose — para subir o PostgreSQL localmente.

## Desenvolvimento local

Os comandos da API devem ser executados dentro de `api-ts/`.

```bash
cd api-ts
bun install
```

Crie `api-ts/.env` com a URL do PostgreSQL:

```dotenv
DATABASE_URL=postgres://postgres:postgres@localhost:5432/affiliate-hub
```

Suba o banco a partir da raiz do repositório:

```bash
docker compose -f infra/dev/docker-compose.yml up -d
```

O Compose cria o banco `affiliate-hub` dentro do PostgreSQL local e mantém os dados no volume `pg_data`.

Com o banco disponível, rode as migrações e inicie a API:

```bash
cd api-ts
bun run knex migrate:latest
bun run src/main.ts
```

A API escuta na porta `3000`. Confira se está ativa:

```bash
curl http://localhost:3000/health
```

Resposta esperada: `OK`.

## Comandos da API

Dentro de `api-ts/`:

| Comando | Ação |
| --- | --- |
| `bun test` | Executa os testes unitários e de integração |
| `bun run check` | Verifica formatação e regras do Biome |
| `bun run lint` | Executa o lint do Biome |
| `bun run knex migrate:latest` | Aplica migrações pendentes |
| `bun run knex migrate:rollback` | Reverte o último lote de migrações |
| `bun run scripts/createAdmin.ts` | Solicita os dados e cria o primeiro administrador |

O script de administrador também exige `DATABASE_URL` no ambiente. Se a conta inicial já existir, a regra de criação impede cadastrar outra como primeiro administrador.

## Estrutura

```text
api-ts/
  src/
    application/  # casos de uso e contratos de repositório
    domain/       # entidades, valores e regras de domínio
    external/     # adaptadores Bun, Hono, SQL e hashing
    infra/        # HTTP, banco e repositórios
  scripts/        # tarefas administrativas
  test/           # testes unitários e de integração
infra/dev/        # PostgreSQL local via Docker Compose
```

## Stack

- Bun e TypeScript
- Hono
- PostgreSQL e Knex para migrações
- Zod para validação
- Biome para formatação e lint
- `bun test` para testes

## Visão do produto

O código do post é estável; o destino afiliado pode mudar. Assim, um post antigo continua útil quando o link do produto precisa ser trocado. O foco do MVP é encurtar o caminho entre ver uma peça e abrir seu produto, sem busca por nome ou por IDs das plataformas.

Veja o [PRD.MVP.md](PRD.MVP.md) para escopo e critérios do MVP e o [CHANGELOG.md](CHANGELOG.md) para o histórico de versões.

## Contribuição e licença

Contribuições, relatos de bugs e propostas de melhoria são bem-vindos. Leia as [orientações para contribuir](.github/CONTRIBUTING.md) antes de abrir um pull request. Para vulnerabilidades, siga a [política de segurança](.github/SECURITY.md) e evite reportes públicos.

Este repositório contém software proprietário. Todos os direitos são reservados a Eduardo Augusto Lima Barboza. Nenhuma permissão de uso, cópia, modificação ou distribuição é concedida sem autorização prévia por escrito do titular. Consulte [LICENSE](LICENSE) para os termos completos. Dependências e serviços de terceiros mantêm suas próprias licenças e termos.
