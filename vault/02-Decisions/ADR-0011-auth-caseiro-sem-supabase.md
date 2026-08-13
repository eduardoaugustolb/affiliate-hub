---
title: "ADR-0011: Auth Caseiro, Sem Supabase Auth"
tags:
  - decision
status: accepted
created: 2026-08-06
updated: 2026-08-06
---

# ADR-0011: Autenticação Caseira, Sem Supabase Auth

## Contexto

O plano original ([[ADR-0007-postgres-via-supabase-hosting|ADR-0007]]) abria
uma exceção pro módulo [[03-Modules/IdentityAccess|IdentityAccess]]: usar o
SDK `@supabase/supabase-js` especificamente pra Auth, já que ali o SDK seria
a própria integração sendo adaptada, não um atalho de acesso a dado. O
usuário decidiu não seguir por esse caminho; login e controle de acesso do
painel administrativo serão implementados na mão.

## Decisão

`IdentityAccess` não usa Supabase Auth nem nenhum provedor de identidade
terceirizado. O adapter da porta `UserAuthenticator` é caseiro:
`UserAuthenticatorDatabase implements UserAuthenticator`, guardando
credenciais na mesma base Postgres do projeto, acessada pela porta
`DatabaseConnection` (seção 2.6 do PRD / [[ADR-0002-database-connection-sem-orm]]),
exatamente o mesmo padrão de todo outro repositório do sistema.

Hash de senha via `Bun.password` (nativo do runtime, argon2id por padrão),
sem dependência npm de bcrypt/argon2. Token/sessão é decisão de
implementação a fechar quando o módulo for de fato construído (JWT assinado
vs. sessão opaca guardada em tabela), não é o foco deste ADR.

## Alternativas Consideradas

- **Supabase Auth** (plano original, [[ADR-0007-postgres-via-supabase-hosting|ADR-0007]]):
  rejeitado pelo usuário: descartada a única exceção que ainda existia pra
  uso de SDK de provedor terceirizado no projeto.
- **Outro provedor terceirizado (Clerk, Auth0, etc.)**: não considerado:
  a direção agora é auth 100% caseira, não trocar um SDK terceirizado por outro.

## Consequências

- **Nenhum SDK do Supabase entra no código do projeto.** Antes deste ADR,
  `@supabase/supabase-js` era a única exceção tolerada (só em Auth). Agora
  Supabase é usado exclusivamente como **hosting** de um Postgres comum;
  trocar de provedor de hosting é trocar string de conexão, sem tocar em
  nenhuma linha de aplicação, nem mesmo em IdentityAccess.
- [[03-Modules/IdentityAccess]] segue exatamente a mesma disciplina dos
  outros módulos: porta + adapter `*Database` sobre `DatabaseConnection`,
  sem exceção arquitetural.
- Responsabilidade adicional que módulos com SDK terceirizado não tinham:
  gestão de hash de senha, emissão/validação de sessão e (se necessário no
  futuro) rate limiting de tentativa de login: tudo isso passa a ser código
  do projeto, não delegado a um provedor.

## Ver também

[[ADR-0007-postgres-via-supabase-hosting]] · [[ADR-0002-database-connection-sem-orm]] ·
[[03-Modules/IdentityAccess]]
