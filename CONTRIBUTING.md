# Contribuindo

## Commits

Este projeto usa **Conventional Commits** com **descrição em português**.
Isso é núcleo do processo de desenvolvimento, não estilo opcional.

```
<tipo>(<escopo opcional>): <descrição curta, no imperativo, minúscula>

<corpo opcional — explica o porquê, não o quê>

<rodapé opcional — BREAKING CHANGE, referência a issue>
```

O `<tipo>` fica em inglês (é vocabulário de ferramenta — changelog automático,
`commitlint`, etc. — não prosa). A descrição, o corpo e o rodapé são em
português.

### Tipos

| Tipo | Quando usar |
|---|---|
| `feat` | Nova funcionalidade visível pro usuário/consumidor do código |
| `fix` | Correção de bug |
| `docs` | Só documentação (vault, PRD, README, comentário) |
| `refactor` | Mudança de código que não altera comportamento |
| `test` | Adiciona ou corrige teste, sem mudar código de produção |
| `perf` | Melhoria de performance |
| `build` | Build, dependências, config de pacote (`package.json`, `tsconfig.json`) |
| `ci` | Pipeline de integração contínua |
| `chore` | Manutenção que não se encaixa nos anteriores |
| `revert` | Reverte um commit anterior |

### Escopo

Nome do pacote/módulo afetado, quando fizer sentido:
`feat(catalog): ...`, `fix(link-redirect): ...`, `docs(vault): ...`. Omitir
quando a mudança é transversal (ex.: renomear o projeto inteiro).

### Exemplos

```
feat(catalog): adiciona caso de uso ApproveProductMedia

fix(link-redirect): corrige parseBody quebrando POST sem corpo

docs(vault): documenta ADR-0011 (auth caseira, sem Supabase Auth)

refactor(shared-kernel): move HttpStatus pra dentro da porta HttpServer

test(link-redirect): cobre rota GET /p/:id com produto sem link ainda

chore: renomeia escopo de pacote @drops-do-frost pra @affiliate-hub
```

### Regras

- **Nunca** adicionar `Co-Authored-By` — o autor é sempre a pessoa que
  commitou, não a ferramenta usada pra escrever o código.
- Mensagem no imperativo ("adiciona", não "adicionado" ou "adicionando").
- Um commit, uma mudança lógica — não misturar `feat` com `chore` no mesmo
  commit só porque tocou nos mesmos arquivos.
- `BREAKING CHANGE:` no rodapé quando quebra compatibilidade (relevante uma
  vez que os pacotes internos comecem a ser consumidos por mais de um
  serviço).
