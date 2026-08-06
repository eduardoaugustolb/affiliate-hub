---
title: Taxonomia de Tags
tags:
  - meta
status: living
created: 2026-08-06
updated: 2026-08-06
---

# Taxonomia de Tags

Convenção de tags usada em todo o vault, para permitir navegação por busca
(`tag:#...`) além dos links explícitos.

## Tags de Tipo de Nota

| Tag | Uso |
|---|---|
| `#moc` | Mapa de conteúdo (índice de uma seção) |
| `#architecture` | Conceito arquitetural transversal |
| `#decision` | ADR (Architecture Decision Record) |
| `#module` | Nota de bounded context |
| `#roadmap` | Nota de fase de entrega |
| `#risk` | Risco conhecido |
| `#nfr` | Requisito não funcional |
| `#meta` | Nota sobre o próprio vault |

## Tags de Status (usadas no frontmatter `status:`, não como tag solta)

| Status | Significado |
|---|---|
| `proposed` | Levantado, ainda não decidido |
| `accepted` | Decidido e vigente |
| `superseded` | Substituído por outra decisão (linkar a que substituiu) |
| `living` | Nota que é atualizada continuamente (MOCs, glossário) |

## Tags de Módulo

Uma por bounded context, aplicadas em qualquer nota que discuta aquele módulo
especificamente (não só a nota principal dele):

`#module/catalog` `#module/affiliate-sync` `#module/media-template`
`#module/link-redirect` `#module/broadcast` `#module/comment-assist`
`#module/identity-access`

## Tags de Camada (Clean Architecture)

`#layer/domain` `#layer/application` `#layer/adapters` `#layer/main`

Usadas em notas de arquitetura e em ADRs para indicar em qual camada a decisão
tem efeito — útil pra filtrar "tudo que toca camada de domínio", por exemplo.

## Regra

Toda nota nova deve ter **pelo menos** uma tag de tipo. Tags de módulo/camada
são adicionadas conforme relevância, não obrigatórias.
