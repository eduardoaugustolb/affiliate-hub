# Affiliate Hub

A product resolver for creators who post outfit roundups and product finds on social media. Each item gets a short code. Visitors enter that code to reach the affiliate link, even if the destination changes later.

**Flow:** social post with a code → product code → destination link.

> This project is under development. The repository currently contains the TypeScript API, domain rules, PostgreSQL persistence, and tests. The only HTTP route currently exposed is `GET /health`; the public home page and admin dashboard have not been implemented yet.

## Current status

- Product creation and code generation use cases.
- Product lookup by code.
- Domain and persistence layers for products, users, and sessions.
- A script to create the first administrator.
- An HTTP API built with Hono and running on Bun.
- Unit and integration tests run with `bun test`.

The [MVP product brief](PRD.MVP.md) describes the planned flow and features. Some of the work it covers is not available in the application yet.

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
bun run knex migrate:latest
bun run src/main.ts
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
| `bun run knex migrate:latest` | Apply pending migrations |
| `bun run knex migrate:rollback` | Roll back the latest migration batch |
| `bun run scripts/createAdmin.ts` | Prompt for details and create the first administrator |

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

The code shown in a post stays the same while its affiliate destination can change. That keeps older posts useful when a product link needs to be replaced. The MVP focuses on getting from a product in a social post to its destination without searching by name or marketplace ID.

See [PRD.MVP.md](PRD.MVP.md) for the MVP scope and acceptance criteria, and [CHANGELOG.md](CHANGELOG.md) for the release history.

## Contributing and license

Bug reports and improvement ideas are welcome. Read the [contribution guidelines](.github/CONTRIBUTING.md) before opening a pull request. For security issues, follow the [security policy](.github/SECURITY.md) and avoid public disclosure.

This repository contains proprietary software. All rights are reserved by Eduardo Augusto Lima Bueno. No permission to use, copy, modify, or distribute the software is granted without the owner's prior written authorization. See [LICENSE](LICENSE) for the full terms. Third-party dependencies and services remain subject to their own licenses and terms.
