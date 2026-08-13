---
title: Drops do Frost — Vault de Arquitetura
tags:
  - index
  - home
status: living
created: 2026-08-06
updated: 2026-08-10
aliases: [Home, Índice, MOC Principal]
---

# Drops do Frost — Sistema de Automação de Afiliados

> [!abstract] Visão Geral
> Sistema de automação ponta a ponta para operação de um perfil de afiliados
> (Shopee, Shein, Mercado Livre) no nicho streetwear + perfumes. Ver detalhe
> completo em [[Visao-Geral-do-Produto]].
>
> "Drops do Frost" é o produto/marca. O repositório e o escopo de pacote npm
> chamam **`affiliate-hub`** (`@affiliate-hub/*`) — nome mais genérico,
> desacoplado da marca específica.

Este é o índice mestre (MOC — Map of Content) do vault. Toda nota nova deve
ser linkada a partir daqui ou de um dos MOCs de seção abaixo.

## Mapa do Vault

- 🏛️ **[[01-Architecture/_Index|Arquitetura]]** — Clean Architecture, Hexagonal,
  regra de dependência, modelo de domínio rico, padrões de caso de uso/repositório/erro.
- 📜 **[[02-Decisions/_Index|Decisões (ADRs)]]** — todo registro de decisão técnica,
  com contexto, alternativas consideradas e status.
- 🧩 **[[03-Modules/_Index|Módulos (Bounded Contexts)]]** — os 7 contextos delimitados
  do sistema, cada um com domínio, casos de uso, portas e adapters.
- 🏗️ **[[04-Infrastructure/_Index|Infraestrutura & Deploy]]** — topologia de
  serviços, matriz de portas↔adapters, monorepo.
- 🗺️ **[[05-Roadmap/_Index|Roadmap]]** — fases de entrega.
- ⚠️ **[[06-Risks/_Index|Riscos Conhecidos]]**
- ✅ **[[07-NFR/_Index|Requisitos Não Funcionais]]**
- 🎯 **[[08-DoD/_Index|Definition of Done por Módulo]]**
- 🔒 **[[09-Compliance/_Index|Compliance]]** — LGPD: lei, inventário de dado
  pessoal por módulo, checklist de conformidade.
- 📖 **[[00-Meta/_Index|Meta]]** — glossário e taxonomia de tags

## Princípios Inegociáveis

> [!important] As três regras que não se negociam neste projeto
> 1. **A regra de dependência aponta sempre para dentro** — ver [[Dependency-Rule]].
> 2. **Toda dependência externa vive atrás de uma porta** — ver [[Hexagonal-Ports-and-Adapters]].
> 3. **Entidades de domínio são ricas, nunca anêmicas** — ver [[Rich-Domain-Model]].

## Stack Confirmada

| Decisão | Escolha | ADR |
|---|---|---|
| Runtime/PM/bundler | Bun | [[ADR-0001-bun-runtime-e-tooling]] |
| Acesso a banco | Porta `DatabaseConnection`, sem ORM | [[ADR-0002-database-connection-sem-orm]] |
| HTTP de saída | Porta `HttpClient` | [[ADR-0003-http-client-port]] |
| Test runner | `bun:test` (unitário + integração) | [[02-Decisions/ADR-0010-bun-test-em-todo-lugar]] |
| HTTP server | Hono | `HonoAdapter implements HttpServer` |
| Organização de código | Monorepo, Bun workspaces | [[ADR-0005-bun-workspaces-monorepo]] |
| Migrations | Knex (só migration, não query builder) | [[ADR-0006-knex-apenas-para-migrations]] |
| Banco gerenciado | Postgres hospedado no Supabase | [[ADR-0007-postgres-via-supabase-hosting]] |
| Arquitetura de referência | [drummerpva/erp](https://github.com/drummerpva/erp) | [[ADR-0008-arquitetura-de-referencia]] |
| Idioma | Código em inglês, documentação em pt-BR | [[02-Decisions/ADR-0009-idioma-codigo-vs-documentacao]] |
| Auth do painel | Caseira, sem Supabase Auth | [[02-Decisions/ADR-0011-auth-caseiro-sem-supabase]] |
| Versionamento | Conventional Commits em pt-BR, sem Co-Authored-By | [[02-Decisions/ADR-0012-conventional-commits-ptbr]] |

## Status do Projeto

- [x] PRD inicial rascunhado
- [x] Decisões de tecnologia core confirmadas com o usuário
- [x] Vault de arquitetura estruturado
- [x] Esqueleto do monorepo (Bun workspaces) — `shared-kernel` + `catalog` + `link-redirect` + `services/api`
- [x] Módulo [[03-Modules/Catalog|Catalog]] implementado (Fase 1) — domínio rico, 13 testes
- [x] Módulo [[03-Modules/LinkRedirect|LinkRedirect]] implementado (Fase 2) — 4 testes unitários
      + 3 de integração HTTP
- [x] Infra local via `docker-compose.yml` (Postgres + DBGate em `http://localhost:8080`)
- [x] `PgAdapter` com `Bun.SQL` nativo (zero dependência npm de driver Postgres em runtime)
- [x] `HonoAdapter` como `HttpServer`, com testes HTTP ponta a ponta passando
- [x] Repositório público no GitHub + CI (GitHub Actions) — ver [[04-Infrastructure/Deploy-Topology]]
- [ ] IdentityAccess caseiro (auth própria — ver [[02-Decisions/ADR-0011-auth-caseiro-sem-supabase]])
  — domínio/aplicação implementados e testados; faltam adapters concretos,
  `RegisterUser`/`UpdateUser`/`DeleteUser`, wiring HTTP e a criptografia de
  e-mail exigida pela LGPD (ver abaixo).
- [ ] AffiliateSync (Fase 2, bloqueado em confirmar acesso à Shopee Affiliate API)
- [ ] Conformidade com a LGPD — ver [[09-Compliance/LGPD]] e
      [[02-Decisions/ADR-0013-lgpd-criptografia-de-email|ADR-0013]]
      (criptografia de e-mail em repouso, direitos do titular, checklist
      técnico/processo)

---

*Última atualização: 2026-08-10*
