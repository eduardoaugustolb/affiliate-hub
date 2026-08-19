---
title: "Módulo 7: IdentityAccess"
tags:
  - module
  - module/identity-access
status: implemented
created: 2026-08-06
updated: 2026-08-12
---

# IdentityAccess (Autenticação do Painel)

> [!success] Implementado de ponta a ponta
> Pacote `packages/identity-access` com casos de uso, repositórios SQL,
> adapters criptográficos, rotas HTTP de sessão e middleware de autenticação.
> Restam pendências de conformidade operacional e cobertura dos casos de uso
> de gestão de usuário.

## Responsabilidade

Login e controle de acesso ao painel administrativo (curadoria de produto,
kill switch do broadcast, visualização de analytics).

## Portas (implementadas)

- `UserRepository`: `findById`, `findByEmail`, `save`, `updateById`,
  `deleteById`.
- `SessionRepository`: `save`, `findById`, `deleteById`, `findByUserId`,
  `findByTokenHash`, `deleteByTokenHash`, `updateById`.
- `PasswordHasher`: `hash`/`verify`.
- `TokenGenerator`: `generate`.

`TokenHasher` existia como porta própria e foi **removido**, era
estruturalmente idêntico a `KeyedHasher` (hash determinístico e chaveado de
uma string), só que moldado erroneamente como "específico de auth". Hash
não se importa com a origem do input; quem tinha requisito de entropia
diferente era o `TokenGenerator` (gera segredo, não identificador), não o
hash em si. `AuthenticateUser`/`GetAuthenticatedUser` usam `KeyedHasher`
(`@affiliate-hub/shared-kernel`) direto agora, ver
[[04-Infrastructure/Ports-Adapters-Matrix#Onde cada adapter mora]].

Diferente do design original (uma porta genérica `UserAuthenticator`), o
módulo foi construído com portas separadas por responsabilidade, mais
granular, cada uma trocável e fakeável isoladamente (ver testes em
`test/unit/doubles/`).

## Adapters

Implementados dentro do próprio pacote (`src/adapters/`):

- `UserRepositorySql implements UserRepository`: recebe `Cipher` e
  `KeyedHasher` no construtor; `findByEmail` busca por
  `email_lookup_hash` e decripta só a linha encontrada.
- `SessionRepositorySql implements SessionRepository`.

Implementados na composition root (`services/api/src/adapters/crypto/`):

- `Argon2Hasher` usa `Bun.password` com argon2id.
- `CryptoTokenGenerator` gera 32 bytes aleatórios em Base64URL.
- `CipherAdapter` usa AES-256-GCM e recebe `PII_ENCRYPTION_KEY` decodificada
  de Base64URL.
- `HmacKeyedHasher` usa HMAC-SHA256. A composição cria instâncias distintas
  para `EMAIL_LOOKUP_HMAC_KEY` e `SESSION_TOKEN_HMAC_KEY`.

## Infraestrutura

- Migration `sessions`: `token_hash` já é `UNIQUE`, correto, evita
  colisão entre sessões e mantém `findByTokenHash` (hot path de toda
  request autenticada) com busca por índice em vez de scan de tabela.
- Purge de sessão expirada é **lazy** (delete no momento da leitura, não
  worker/cron), ver [[#Pendências restantes]].

## Casos de Uso (implementados)

- `AuthenticateUser`: login, gera sessão + token.
- `GetAuthenticatedUser`: valida token e retorna uma view serializável do
  usuário (`id`, `name`, `email`), sem expor `passwordHash`.
- `Logout`: recebe o token opaco, calcula seu HMAC e chama
  `SessionRepository.deleteByTokenHash` direto, sem `find` antes.
  **Decidido: comportamento idempotente por design**, deletar uma sessão
  que já não existe (token já invalidado, logout duplicado) é sucesso, não
  erro; um `find` antes reintroduziria a segunda ida ao banco que
  `deleteByTokenHash` foi criado pra eliminar. Quando ligado ao HTTP
  (passo 3 do plano),
   a rota `POST /session/logout` deve responder sucesso independente de a sessão
  ter sido encontrada, nunca usar o resultado do delete pra sinalizar
   "token inválido" (evita enumeração de token). Exportado e testado.
- `RegisterUser`, `UpdateUser` e `DeleteUser`: implementados e cobertos por
  testes unitários.

## HTTP e acesso

- `POST /session` autentica e responde `204`, emitindo cookie
  `__Host-session` com `HttpOnly`, `Secure`, `SameSite=Lax`, `Path=/` e 20
  dias de duração.
- `GET /session` retorna o usuário autenticado pelo cookie.
- `POST /session/logout` invalida a sessão e expira o cookie.
- Credenciais/sessão ausentes, inválidas, expiradas ou revogadas respondem
  `401 { message: "Unauthorized" }`; payload de login incompleto responde
  `400`.
- `requireAuthentication` valida a sessão uma vez, guarda a view do usuário
  em `request.context.authenticatedUser` e protege `/products` e `/users/*`.
- `POST /users/me/update` atualiza nome e/ou e-mail da própria conta.
- `POST /users/me/delete` elimina a própria conta; as sessões relacionadas
  são removidas pelo cascade do banco.

## Mecanismo (auth caseira)

- **Hash de senha**: `Bun.password`   (nativo do runtime, argon2id por padrão),
  sem dependência npm de bcrypt/argon2.
- **Sessão/token**: sessão opaca em tabela (`sessions`, token hasheado via
  `KeyedHasher`), decisão já tomada e refletida no código, não JWT.

## Domínio

`Session`/`User`: se precisar de invariante de domínio própria (ex.: nível
de permissão), essa regra mora na entidade, não no adapter de auth. Diferente
da versão anterior deste módulo (que delegava a um provedor terceirizado),
agora **este módulo é dono da própria lógica de autenticação**, hash de
senha, emissão/validação de sessão, e (se necessário) rate limiting de
tentativa de login viram código do projeto, não responsabilidade de SDK
externo.

## LGPD

`User` guarda dado pessoal de titular (nome, e-mail), a LGPD se aplica
mesmo sendo usuário interno do painel, não cliente final. Ver
[[09-Compliance/LGPD]] para o inventário completo e checklist. Pontos que
afetam diretamente este módulo:

- **E-mail criptografado em repouso**: `email` não pode ficar em texto
  plano em `users`; ver [[02-Decisions/ADR-0013-lgpd-criptografia-de-email|ADR-0013]]
  pro desenho (colunas `email_encrypted`/`email_lookup_hash`, porta
  `Cipher`). **Decidido: `RegisterUser` já nasce gravando e-mail
  criptografado desde o primeiro registro**, não existe janela de dado
  legado em texto plano nem migração de dado a fazer depois. Isso funde os
  antigos passos 2 e 4 do plano abaixo em um só.
- **Direito de correção/eliminação do titular** (art. 18): rotas autenticadas
  permitem que o operador corrija ou elimine a própria conta. Diferente da
  regra de "nunca deleção física" que vale pra `Product`, dado pessoal de
  `User` precisa de eliminação real quando o vínculo do operador termina.
- **Token de sessão já guardado como hash** (`KeyedHasher`): alinhado com
  a exigência de medida técnica adequada do art. 46, nenhuma ação adicional
  aqui.

## Pendências restantes

1. **Purge de sessão expirada**: **decidido: purge preguiçoso
   (lazy), sem worker/cron dedicado.** `SessionRepositorySql.findByTokenHash`/
   `findById` deleta a linha na hora se `expires_at < now()`, em vez de só
   checar `isExpired()` em memória e devolver, cobre o caso relevante pra
   segurança (token expirado sendo reutilizado) de graça, sem infra nova.
   Sessão órfã (nunca mais consultada após expirar) fica de baixa
    prioridade, se decidir limpar, reaproveitar `TaskScheduler` já
   planejado pro `AffiliateSync` rodando dentro do serviço `api` existente,
   nunca subir um serviço Railway dedicado só pra isso (desproporcional à
    NFR de custo-alvo, ver [[07-NFR/Requisitos-Nao-Funcionais]]).

2. **Operação LGPD**: registrar a região efetiva do Postgres na Railway e a
garantia de transferência internacional aplicável, se houver.
3. **Deploy**: aplicar e verificar as migrations `users` e `sessions` com a
`DATABASE_URL` do ambiente Railway antes de abrir o painel. As migrations foram
aplicadas e verificadas no Postgres local em `2026-08-12`.
