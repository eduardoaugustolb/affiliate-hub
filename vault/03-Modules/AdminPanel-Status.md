---
title: Status do Admin Panel
tags:
  - module
  - module/admin-panel
status: in-progress
created: 2026-09-03
updated: 2026-09-03
---

# Admin Panel

> [!warning] Em andamento
> Existe uma aplicação Next.js em `services/admin-panel`, mas ela ainda não é
> uma capacidade de produção completa. O painel não é um bounded context de
> domínio e não possui tabelas próprias.

## Implementado

- Next.js App Router com TypeScript, React e Tailwind.
- Cliente HTTP próprio do frontend; ele não importa `FetchHttpClient` da API.
- Fluxo inicial de setup consumindo `POST /admin/setup`.
- Sessão planejada para cookie `HttpOnly` e renderização SSR, com a API como
  backend e Route Handlers/BFF como fronteira same-origin.
- Lint, typecheck, testes e build integrados à CI.

## Em andamento

- Completar telas e fluxos de autenticação, curadoria e gestão de usuário.
- Completar os Route Handlers BFF que encaminham `Cookie` e preservam
  `Set-Cookie`.
- Validar a configuração de produção (`API_URL`, HTTPS e origens permitidas).

## Fora do escopo do painel

O painel não deve armazenar tokens em `localStorage` ou `sessionStorage`, nem
conhecer adapters ou repositórios da API. A sessão deve permanecer em cookie
`HttpOnly`, `Secure`, `SameSite=Lax`, com proteção CSRF para mutações.

## Ver também

- [[Module-Status|Status real dos módulos]]
- [[01-Architecture/Frontend-Clean-Architecture|Clean Architecture do frontend]]
- [[02-Decisions/ADR-0011-auth-caseiro-sem-supabase|Autenticação caseira]]
