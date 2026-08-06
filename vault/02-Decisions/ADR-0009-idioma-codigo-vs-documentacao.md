---
title: ADR-0009 — Idioma: Código em Inglês, Documentação em pt-BR
tags:
  - decision
status: accepted
created: 2026-08-06
updated: 2026-08-06
---

# ADR-0009 — Código em Inglês, Documentação em pt-BR

## Contexto

O rascunho inicial do projeto (PRD e primeira versão do monorepo) foi escrito
com nomes de classe, método, campo e mensagem de erro em português
(`Produto`, `CadastrarProduto`, `ProdutoRepository`, `ativar()`). O usuário
pediu explicitamente que o **código fique inteiramente em inglês** e que essa
convenção fosse documentada — a documentação (vault, PRD, comentários de PR)
continua em pt-BR.

## Decisão

- **Código: sempre inglês.** Nome de classe, interface, método, variável,
  campo de banco, mensagem de `DomainError`/`ApplicationError`, rota HTTP,
  nome de tabela/coluna de migration — tudo em inglês. Isso vale tanto pro
  código já implementado (`packages/catalog`, `services/api`) quanto pros
  nomes de porta/adapter/caso de uso ainda só planejados nas notas de módulo
  (ver [[03-Modules/_Index|Módulos]]) — o vocabulário já nasce em inglês pra
  não exigir tradução quando o módulo for implementado.
- **Documentação: sempre pt-BR.** Este vault, o `PRD.md`, mensagens de commit,
  descrição de PR, comentário de code review — tudo em português. Um bloco de
  código dentro de uma nota do vault reflete o código real (em inglês); a
  prosa ao redor dele explica em português.
- **Exemplo do padrão**: domínio `Produto` (conceito de negócio, em português
  na conversa e na documentação) → classe `Product` (código, em inglês) →
  nota [[03-Modules/Catalog|Catalog]] explica isso em português citando
  `Product` entre crases.

## Alternativas Consideradas

- **Código em português** (estado inicial, revertido): rejeitado — o usuário
  quer o código alinhado ao padrão predominante do ecossistema TypeScript/OSS,
  que é inglês, mesmo em um projeto de operação 100% nacional.
- **Documentação em inglês**: não considerada — o usuário e a operação são
  em português; documentação em pt-BR reduz fricção de leitura no dia a dia.

## Consequências

- Toda nota de módulo que ainda descreve funcionalidade não implementada
  (`AffiliateSync`, `MediaTemplate`, `LinkRedirect`, `Broadcast`,
  `CommentAssist`, `IdentityAccess`) já usa os nomes de porta/caso de
  uso/adapter em inglês que o código real vai usar quando for escrito — evita
  duas rodadas de tradução.
- Novas notas de arquitetura/módulo/ADR devem seguir o mesmo padrão: prosa em
  pt-BR, todo identificador entre crases em inglês.
- Mensagens de erro de domínio (`DomainError`, `ApplicationError`,
  `NotFoundError`) são em inglês mesmo sendo lidas por operador brasileiro —
  são runtime/log, não UI; texto de UI (painel administrativo) pode e deve
  ser traduzido separadamente na camada de apresentação, sem tocar na
  mensagem do erro de domínio.

## Ver também

[[01-Architecture/Rich-Domain-Model]] · [[01-Architecture/Error-Handling-Strategy]]
