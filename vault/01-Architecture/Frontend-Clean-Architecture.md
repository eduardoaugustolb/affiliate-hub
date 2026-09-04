---
title: Clean Architecture do frontend
tags:
  - architecture
  - frontend
status: in-progress
created: 2026-09-03
updated: 2026-09-03
---

# Clean Architecture do frontend

O Admin Panel em `services/admin-panel` é uma borda de apresentação, não um
bounded context de domínio. Ele conversa com a API por contratos HTTP e por um
cliente próprio; não importa portas, entidades ou adapters internos de
`services/api`.

## Sessão e BFF

A sessão usa cookie `__Host-session` com `HttpOnly`, `Secure`, `SameSite=Lax` e
`Path=/`. O browser não recebe o token em JavaScript nem o armazena em
`localStorage` ou `sessionStorage`.

Em produção, Route Handlers do Next.js funcionam como BFF same-origin:
encaminham o header `Cookie` para a API e preservam `Set-Cookie` nas respostas.
Leituras autenticadas no servidor usam SSR e `cache: 'no-store'`. Mutations
baseadas em cookie exigem a proteção CSRF da API.

## Estado real

Já existe o app Next.js, o cliente HTTP e a integração inicial de setup. Telas
completas de autenticação, curadoria e gestão de usuário e os Route Handlers BFF
estão em andamento. Consulte [[03-Modules/AdminPanel-Status]].
