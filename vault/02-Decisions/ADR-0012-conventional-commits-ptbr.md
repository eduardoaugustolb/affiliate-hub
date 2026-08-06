---
title: ADR-0012 — Conventional Commits em pt-BR
tags:
  - decision
status: accepted
created: 2026-08-06
updated: 2026-08-06
---

# ADR-0012 — Conventional Commits com Descrição em Português

## Contexto

O projeto virou repositório público no GitHub (ver [[04-Infrastructure/Deploy-Topology]])
e o usuário quer um processo de versionamento consistente daqui pra frente —
não mensagens de commit ad-hoc. Também estabeleceu como regra dura: **nunca**
`Co-Authored-By` nos commits — o autor é sempre a pessoa, nunca a ferramenta.

## Decisão

Todo commit segue [Conventional Commits](https://www.conventionalcommits.org/)
com `<tipo>` em inglês (vocabulário de ferramenta) e descrição/corpo/rodapé em
português. Documentado por completo em `CONTRIBUTING.md` na raiz do repo —
esse ADR só registra a decisão, o guia de uso vive lá.

```
<tipo>(<escopo opcional>): <descrição curta em português, imperativo>
```

Tipos: `feat`, `fix`, `docs`, `refactor`, `test`, `perf`, `build`, `ci`,
`chore`, `revert`. Escopo é o nome do pacote/módulo quando fizer sentido
(`feat(catalog): ...`).

## Alternativas Consideradas

- **Conventional Commits 100% em inglês**: rejeitado — a operação e a
  documentação inteira (vault, PRD) já são em pt-BR (ver
  [[ADR-0009-idioma-codigo-vs-documentacao]]); só o tipo fica em inglês
  porque é literalmente o protocolo que ferramentas de changelog/lint
  entendem, não prosa.
- **Mensagens livres, sem convenção**: era o que vinha sendo usado nos dois
  primeiros commits — abandonado porque não escala e não gera changelog
  automatizável.

## Consequências

- `CONTRIBUTING.md` é a fonte de verdade do formato — qualquer contribuidor
  (o repo é público) encontra a regra de cara.
- Abre caminho pra ferramentas futuras de changelog automático
  (`conventional-changelog`, `semantic-release`) sem precisar migrar nada,
  já que o `<tipo>` segue o padrão que essas ferramentas esperam.
- Regra de "nunca Co-Authored-By" vale pra todo commit, inclusive os que
  Claude Code ajuda a escrever — reforça que a autoria do repo é sempre do
  usuário.

## Ver também

[[ADR-0009-idioma-codigo-vs-documentacao]] · `CONTRIBUTING.md` (raiz do repo)
