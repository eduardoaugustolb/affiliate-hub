---
title: Módulo 7 — IdentityAccess
tags:
  - module
  - module/identity-access
status: accepted
created: 2026-08-06
updated: 2026-08-06
---

# IdentityAccess (Autenticação do Painel)

## Responsabilidade

Login e controle de acesso ao painel administrativo (curadoria de produto,
kill switch do broadcast, visualização de analytics).

## Portas

- `UserAuthenticator` — porta de autenticação.

## Adapters

- `UserAuthenticatorDatabase implements UserAuthenticator` — auth caseira,
  sem provedor terceirizado (ver [[02-Decisions/ADR-0011-auth-caseiro-sem-supabase|ADR-0011]]).
  Credenciais guardadas na mesma base Postgres do projeto, acessada pela
  porta `DatabaseConnection` — mesmo padrão de todo outro `*RepositoryDatabase`
  do sistema, sem exceção arquitetural pra este módulo.

## Mecanismo (auth caseira)

- **Hash de senha**: `Bun.password` (nativo do runtime, argon2id por padrão)
  — sem dependência npm de bcrypt/argon2.
- **Sessão/token**: decisão de implementação a fechar quando o módulo for
  construído de fato (JWT assinado vs. sessão opaca em tabela) — não muda a
  porta `UserAuthenticator` nem o resto da arquitetura, é detalhe interno do
  adapter.

## Domínio

`Session`/`User` — se precisar de invariante de domínio própria (ex.: nível
de permissão), essa regra mora na entidade, não no adapter de auth. Diferente
da versão anterior deste módulo (que delegava a um provedor terceirizado),
agora **este módulo é dono da própria lógica de autenticação** — hash de
senha, emissão/validação de sessão, e (se necessário) rate limiting de
tentativa de login viram código do projeto, não responsabilidade de SDK
externo.
