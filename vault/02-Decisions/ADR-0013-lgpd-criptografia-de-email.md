---
title: "ADR-0013: LGPD, Criptografia de E-mail em Repouso"
tags:
  - decision
  - compliance
status: accepted
created: 2026-08-10
updated: 2026-08-12
---

# ADR-0013: LGPD: Criptografia de E-mail em Repouso

## Contexto

[[03-Modules/IdentityAccess]] usa e-mail como identificador de login
(`UserRepository.findByEmail`).
E-mail é dado pessoal sob a LGPD (Lei 13.709/2018, art. 5º, I) e o art. 46
exige medida de segurança técnica compatível com o risco. Senha já está
protegida corretamente (`Bun.password`, argon2id, ver
[[ADR-0011-auth-caseiro-sem-supabase]]); e-mail em claro era o dado
identificável mais exposto do módulo em caso de dump de banco, backup
exposto ou acesso indevido. Ver levantamento completo em
[[09-Compliance/LGPD]].

## Decisão

`users.email` passa a ser armazenado **criptografado em repouso**, nunca em
texto plano. Como Postgres não pode fazer `WHERE email = ?` em cima de
ciphertext não-determinístico, o dado vive em duas colunas:

- `email_encrypted`: ciphertext (AES-256-GCM ou XChaCha20-Poly1305, IV
  aleatório por registro, **não determinístico**). É o que a entidade
  `User` reidrata para expor `getEmail()`.
- `email_lookup_hash`: HMAC-SHA256 do e-mail normalizado (lowercase,
  trim) com chave secreta de servidor. **Determinístico, mas
  não-reversível**, existe só pra permitir igualdade exata na busca.
  `UNIQUE` fica nesta coluna, não em `email_encrypted`.

Fluxo de `findByEmail`: calcula o HMAC do e-mail de entrada → busca por
`email_lookup_hash` → decripta `email_encrypted` do registro encontrado →
reidrata `User`.

Nova porta **em `shared-kernel`**, `Cipher` (`encrypt(plaintext): string`,
`decrypt(ciphertext): string`) e uma segunda operação de hash determinístico
(pode ser a mesma porta ou uma `KeyedHasher` separada, a decidir na
implementação). Diferente de `PasswordHasher`/`TokenGenerator`/`TokenHasher`
(interfaces moldadas pra semântica de auth, `verify()` só faz sentido pra
credencial, geração de token tem requisito de entropia de segredo), `Cipher`
é uma primitiva **genérica**: cifra/decifra qualquer string, sem saber se é
e-mail, telefone ou endereço, mesma categoria de `HttpClient`/
`DatabaseConnection`/`IdGenerator`, que já são transversais mesmo com um só
consumidor real hoje (ver
[[04-Infrastructure/Ports-Adapters-Matrix#Onde cada adapter mora]]). LGPD é
obrigação cross-módulo, não específica de `IdentityAccess`, [[09-Compliance/LGPD]]
já mapeia outros módulos com risco futuro de dado pessoal (`AffiliateSync`,
`MediaTemplate`), que vão precisar da mesma primitiva. Adapter concreto
(`services/api/src/adapters/`) usa AES-256-GCM do `node:crypto`, disponível
no Bun, sem dependência npm de criptografia. Chave vem de env
var (`PII_ENCRYPTION_KEY`), nunca hardcoded, nunca versionada, nunca no
banco.

Senha continua como está, hash unidirecional (`Bun.password`), não entra
nesta decisão. Nome fica em texto plano por ora (exibido diretamente na UI
do painel, menor sensibilidade isolada que e-mail), revisar se o escopo do
módulo crescer.

## Alternativas Consideradas

- **`pgcrypto` (`pgp_sym_encrypt`) direto no SQL da migration/query**:
  rejeitado: moveria lógica de criptografia para dentro do SQL, acoplando
  a porta `DatabaseConnection` a uma feature específica do Postgres e
  quebrando a separação porta/adapter (ver
  [[ADR-0002-database-connection-sem-orm]]); trocar de banco deixaria de
  ser só trocar string de conexão.
- **Criptografia determinística direta do e-mail** (sem par
  ciphertext/hash separado, permitindo `WHERE` simples no próprio
  ciphertext): rejeitado: criptografia determinística vaza padrão de
  igualdade (mesmo e-mail sempre gera o mesmo ciphertext, permitindo
  correlação/inferência mesmo sem decriptar), fraqueza conhecida e evitável
  com o desenho de duas colunas.
- **Não criptografar, confiar em isolamento de rede/backup seguro**:
  rejeitado: não atende ao padrão de "medida técnica adequada" do art. 46;
  dump de banco ou backup exposto continuaria vazando e-mail em claro.

## Consequências

- Nova porta `Cipher` (shared-kernel) + adapter concreto em
  `services/api/src/adapters/`, injetado em `UserRepositorySql` na
  composição de `services/api/src/main.ts`, mais uma dependência
  transversal, junto de `HttpClient`/`DatabaseConnection`/`IdGenerator`.
- Migration em `identity-access/migrations` já nasce com
  `email_encrypted` e `email_lookup_hash` desde a criação da tabela
  `users`, **decidido: sem coluna `email` legada em texto plano em nenhum
  momento**, já que `RegisterUser` é implementado gravando direto nas
  colunas criptografadas. Não há passo de migração de dado existente.
- **Chave de criptografia vira segredo crítico de operação.** Perder a
  chave torna todo e-mail irrecuperável (ninguém loga por e-mail até reset
  manual de conta por outro canal). Precisa de processo de backup/rotação
  de chave documentado, ver checklist em [[09-Compliance/LGPD]].
- `Email` (domínio) não muda invariante de validação, criptografia é
  preocupação do adapter (`UserRepositorySql`), não do domínio. `User`
  continua manipulando `Email` em claro em memória; só a linha em repouso
  no banco é que fica opaca.
- Atualiza [[04-Infrastructure/Ports-Adapters-Matrix]] com a nova porta
  `Cipher` quando implementada.

## Status

`implemented`, e-mail nasce criptografado desde o primeiro `RegisterUser`,
sem coluna legada em texto plano. `CipherAdapter`, `HmacKeyedHasher` e
`UserRepositorySql` estão compostos na API com chaves separadas para lookup
de e-mail e token de sessão.

## Ver também

[[09-Compliance/LGPD]] · [[ADR-0011-auth-caseiro-sem-supabase]] ·
[[ADR-0002-database-connection-sem-orm]] · [[03-Modules/IdentityAccess]]
