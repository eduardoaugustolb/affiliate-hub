---
title: "IdentityAccess: setup inicial concorrente"
tags:
  - module/identity-access
  - auth
  - transaction
  - mvp
status: implemented
created: 2026-08-22
updated: 2026-08-22
---

# Setup inicial do painel: criar exatamente uma primeira conta

## O que esta feature resolve

O painel precisa de uma primeira conta para que alguém consiga fazer login.
Não existe cadastro público: depois que essa conta existir, novas chamadas de
setup devem falhar.

A rota é `POST /admin/setup`. Ela recebe:

```json
{
  "name": "Eduardo",
  "email": "eduardo@example.com",
  "password": "segredo"
}
```

Quando for bem-sucedida, ela cria o usuário, abre uma sessão e responde com
`201`, definindo o cookie `__Host-session`. A resposta não devolve senha,
hash de senha, token ou e-mail.

## O problema de concorrência

O fluxo anterior consultava se existia um usuário e, depois, chamava
`RegisterUser`. Isso falhava se duas requisições chegassem ao mesmo tempo:

```text
Requisição A                  Requisição B
------------                  ------------
consulta users: vazio         consulta users: vazio
cria usuário A                cria usuário B
```

Abrir uma transação padrão com `BEGIN` e `COMMIT` não altera esse resultado.
Ela garante que a operação de cada requisição seja toda aplicada ou toda
desfeita, mas não impede as duas de lerem o estado vazio antes das inserções.

Também não é suficiente abrir uma transação somente dentro de
`hasAnyUser()`: ela termina antes de `RegisterUser` começar.

## Decisão

Usar uma **transação serializável** que engloba toda a inicialização:

```text
iniciar transação serializável
  consultar se existe usuário
  se existir, retornar conflito
  criar usuário
  criar sessão
confirmar transação
```

Em duas execuções concorrentes, somente uma pode confirmar. A outra recebe um
conflito de serialização, repete a leitura e então retorna `409` porque o
usuário já existe.

Não será usado lock Redis e não será usada uma função exclusiva do PostgreSQL,
como `pg_advisory_xact_lock`.

Redis já existe para jobs assíncronos. Usá-lo para proteger dados que pertencem
ao banco acrescentaria TTL, renovação de lease e falha de coordenação sem
eliminar a necessidade de transação para `users` e `sessions`.

## Limite de abstração

O caso de uso e os repositories não podem receber `PgAdapter`, SQL específico
do PostgreSQL ou nomes de funções do driver. Eles devem depender de portas.

Criar a porta em
`packages/identity-access/src/application/ports/IdentityAccessUnitOfWork.ts`:

```ts
export interface IdentityAccessUnitOfWork {
  serializable<T>(
    callback: (scope: IdentityAccessTransactionScope) => Promise<T>,
  ): Promise<T>
}

export interface IdentityAccessTransactionScope {
  users: UserRepository
  sessions: SessionRepository
}
```

O caso de uso somente chama `unitOfWork.serializable(...)`. A implementação
concreta recebe o `DatabaseConnection`, abre a transação com a isolação
equivalente ao banco instalado e cria repositories ligados à conexão da
transação.

Criar o adapter em
`packages/identity-access/src/adapters/IdentityAccessUnitOfWorkSql.ts`.
Ele recebe `DatabaseConnection`, `Cipher` e `KeyedHasher` no construtor e,
dentro da transação, instancia:

- `new UserRepositorySql(transaction, cipher, keyedHasher)`;
- `new SessionRepositorySql(transaction)`.

Esse adapter usa somente a porta `DatabaseConnection`. Ele não importa
`PgAdapter`, `Bun.sql`, `postgres`, `pg` ou qualquer driver.

Uma implementação PostgreSQL pode emitir a sintaxe que o PostgreSQL exige;
uma implementação SQLite pode emitir a sintaxe SQLite. Essa diferença fica
restrita ao adapter da unidade de trabalho. Nenhum repository de domínio usa
função `pg_*` nem conhece o driver.

> [!important]
> Uma transação serializável pode abortar por concorrência. O adapter deve
> reconhecer o conflito serializável do driver e repetir a callback inteira,
> com limite explícito de tentativas. Depois do limite, deve propagar um erro
> técnico, nunca confirmar parcialmente o setup.

## Implementação, em ordem

### 1. Remover o middleman atual

Remover:

- `packages/identity-access/src/application/use-cases/HasAnyUser.ts`;
- `hasAnyUser` de `AdminUseCases`;
- a chamada `HasAnyUser.execute()` da rota.

`HasAnyUser` não contém política, transformação ou coordenação. Ele apenas
repassa uma chamada do repository e não deve ser um caso de uso.
`UserRepository.hasAnyUser()` permanece: `SetupInitialUser` precisa dessa
consulta dentro da transação que ele próprio controla.

### 2. Criar o caso de uso de verdade

Criar `packages/identity-access/src/application/use-cases/SetupInitialUser.ts`.

Entrada:

```ts
interface SetupInitialUserInput {
  name: string
  email: string
  password: string
}
```

Saída:

```ts
interface SetupInitialUserOutput {
  token: string
}
```

Dentro de `serializable`, o caso de uso deve:

1. Consultar `scope.users.hasAnyUser()`.
2. Lançar `InitialSetupAlreadyCompletedError` se a consulta encontrar usuário.
3. Criar `User` com id novo e senha hasheada.
4. Persistir o usuário com `scope.users.save(user)`.
5. Criar e persistir `Session` com token opaco hasheado.
6. Retornar somente o token opaco para a camada HTTP.

O hash da senha pode ser calculado antes da transação. Geração de token,
hash do token, criação da sessão e persistência devem ocorrer dentro da
callback, pois pertencem ao mesmo resultado de negócio.

### 3. Implementar a unidade de trabalho

Implementar
`packages/identity-access/src/adapters/IdentityAccessUnitOfWorkSql.ts`. Ele deve:

1. Pedir uma transação serializável ao `DatabaseConnection`.
2. Construir `UserRepositorySql` e `SessionRepositorySql` com a conexão
   transacional recebida.
3. Executar a callback fornecida pelo caso de uso.
4. Repetir somente conflitos de serialização, no máximo três vezes.
5. Fazer rollback automático em qualquer outro erro.

O `DatabaseConnection` precisa evoluir para expor uma operação transacional
com isolação solicitada. Essa porta usa um vocabulário neutro:

```ts
transaction<T>(
  options: { isolationLevel: 'serializable' },
  callback: (transaction: DatabaseConnection) => Promise<T>,
): Promise<T>
```

`PgAdapter` traduz a opção para o driver PostgreSQL. Um adapter futuro decide
como obter a mesma semântica ou rejeita explicitamente o nível não suportado.

Alterar também estes arquivos:

- `packages/shared-kernel/src/ports/DatabaseConnection.ts`: acrescentar a
  sobrecarga ou opção de isolação transacional, sem mencionar PostgreSQL;
- `services/api/src/adapters/database/PgAdapter.ts`: traduzir
  `isolationLevel: 'serializable'` para o driver instalado;
- `packages/identity-access/src/index.ts`: exportar a porta, o adapter SQL e
  o novo caso de uso;
- `services/api/src/main.ts`: instanciar
  `IdentityAccessUnitOfWorkSql` e injetá-lo em `SetupInitialUser`.

### 4. Simplificar a rota

`services/api/src/http/routes/adminRoutes.ts` recebe só `setupInitialUser`.

Ela valida campos obrigatórios, executa o caso de uso, define
`SESSION_COOKIE_NAME` e responde `201`. Ela não consulta repository, não
instancia caso de uso e não decide se o setup já terminou.

### 5. Ajustar a composition root

Em `services/api/src/main.ts`:

1. Criar `IdentityAccessUnitOfWork` com o `PgAdapter`, `CipherAdapter` e
   `HmacKeyedHasher` já existentes.
2. Instanciar somente `SetupInitialUser` para a rota de setup.
3. Manter `AuthenticateUser` exclusivamente em `POST /session`.

## Critérios de aceite e testes

### Testes unitários de `SetupInitialUser`

- Banco vazio cria usuário e sessão, retornando token.
- Banco com usuário retorna `InitialSetupAlreadyCompletedError` sem criar sessão.
- Falha ao salvar sessão desfaz a criação do usuário.
- Conflito serializável na primeira tentativa executa a transação novamente.
- Conflitos além do limite viram erro técnico explícito.

### Testes HTTP

Arquivo: `services/api/test/integration/identity-access/adminRoutes.test.ts`.

- Primeiro `POST /admin/setup`: `201`, cookie de sessão e corpo seguro.
- Corpo sem `name`, `email` ou `password`: `400`.
- Depois de setup concluído: `409`.
- Duas chamadas simultâneas: exatamente um `201`, exatamente um `409`, um
  usuário e uma sessão persistidos.

### Definition of Done

- Typecheck, Biome e `bun run test:coverage` verdes.
- Cobertura global de linhas e funções maior ou igual a 90%.
- Nenhuma classe de aplicação importa `PgAdapter`, `Bun.sql`, `postgres`,
  `pg_*` ou SQL do driver.
- Nenhuma rota HTTP acessa repository diretamente.

## Estado atual

- [x] Rota `POST /admin/setup` criada com validação de campos e cookie.
- [x] Testes HTTP sequenciais: sucesso, conflito posterior e payload inválido.
- [x] Substituir `HasAnyUser` por `SetupInitialUser`.
- [x] Abranger usuário e sessão na mesma transação serializável.
- [x] Tratar e repetir conflito serializável, até três tentativas no total.
- [x] Testes HTTP sequenciais e testes unitários do adaptador transacional.
- [ ] Teste de concorrência real contra PostgreSQL, em banco de teste isolado.

## Referências

- [[IdentityAccess]]
- [[01-Architecture/Use-Case-Pattern]]
- [[02-Decisions/ADR-0002-database-connection-sem-orm]]
- [[08-DoD/Definition-of-Done]]
