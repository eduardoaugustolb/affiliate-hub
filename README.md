# Affiliate Hub

A product resolver for creators who post outfit roundups and product finds on social media. Each item gets a short code. Visitors enter that code to reach the affiliate link, even if the destination changes later.

**Flow:** social post with a code → product code → destination link.

> The repository currently provides the Product Resolver API, cookie authentication, product management, and PostgreSQL persistence. The public home and private dashboard will be built separately with Next.js. Image upload is deferred; products use an HTTPS image URL. Production hosting and a domain have not been configured.

## Current status

- Public resolution endpoints with direct `/:productCode` redirects and JSON errors.
- Case-insensitive codes, inactive-product handling, and permanent code reservations after deletion.
- Admin API: login/logout, paginated product list, creation, editing, activation/deactivation, and deletion.
- First-admin provisioning script and migrations.
- HTTP and application behavior tests using `bun test`.

See [API documentation](api-ts/README.md) for routes, setup, production requirements, and verification limits. The original [MVP product brief](PRD.MVP.md) remains the reference for the wider scope, including deferred image uploads.

## Requirements

- [Bun](https://bun.sh/), the JavaScript runtime and package manager.
- Docker Compose, to run PostgreSQL locally.

## Local development

Run API commands from `api-ts/`.

```bash
cd api-ts
bun install
```

Create `api-ts/.env` with your PostgreSQL connection URL:

```dotenv
DATABASE_URL=postgres://postgres:postgres@localhost:5432/affiliate-hub
```

Start the database from the repository root:

```bash
docker compose -f infra/dev/docker-compose.yml up -d
```

The Compose file creates the `affiliate-hub` database in the local PostgreSQL instance and stores data in the `pg_data` volume.

Once the database is available, run the migrations and start the API:

```bash
cd api-ts
bun run migrate
bun run admin:create
bun run dev
```

The API listens on port `3000`. Check that it is running:

```bash
curl http://localhost:3000/health
```

Expected response: `OK`.

## API commands

Run these from `api-ts/`:

| Command | Action |
| --- | --- |
| `bun test` | Run unit and integration tests |
| `bun run check` | Check formatting and Biome rules |
| `bun run lint` | Run the Biome linter |
| `bun run migrate` | Apply pending migrations |
| `bun run knex migrate:rollback` | Roll back the latest migration batch |
| `bun run admin:create` | Prompt for details and create the first administrator |

The administrator script also requires `DATABASE_URL` in the environment. The application prevents creating another first administrator once one already exists.

## Project structure

```text
api-ts/
  src/
    application/  # use cases and repository contracts
    domain/       # entities, value objects, and domain rules
    external/     # Bun, Hono, SQL, and hashing adapters
    infra/        # HTTP, database, and repositories
  scripts/        # administrative tasks
  test/           # unit and integration tests
infra/dev/        # local PostgreSQL with Docker Compose
```

## Tech stack

- Bun and TypeScript
- Hono
- PostgreSQL and Knex for migrations
- Zod for validation
- Biome for formatting and linting
- `bun test` for tests

## Product overview

A API de automações Instagram inclui campanhas por post, triggers configuráveis, respostas públicas/privadas, DMs recebidas, webhooks assinados e registro durável de envios. Consulte [setup Instagram/Meta](api-ts/docs/instagram-meta-setup.md) para ativação por credenciais de uma conta profissional. A configuração real na Meta e a verificação com essa conta ainda são necessárias. Referência de origem e licença: [Benion](THIRD_PARTY_NOTICES.md).

The code shown in a post stays the same while its affiliate destination can change. That keeps older posts useful when a product link needs to be replaced. The MVP focuses on getting from a product in a social post to its destination without searching by name or marketplace ID.

See [PRD.MVP.md](PRD.MVP.md) for the MVP scope and acceptance criteria, and [CHANGELOG.md](CHANGELOG.md) for the release history.

## Contributing and license

Bug reports and improvement ideas are welcome. Read the [contribution guidelines](.github/CONTRIBUTING.md) before opening a pull request. For security issues, follow the [security policy](.github/SECURITY.md) and avoid public disclosure.

This repository contains proprietary software. All rights are reserved by Eduardo Augusto Lima Bueno. No permission to use, copy, modify, or distribute the software is granted without the owner's prior written authorization. See [LICENSE](LICENSE) for the full terms. Third-party dependencies and services remain subject to their own licenses and terms.
