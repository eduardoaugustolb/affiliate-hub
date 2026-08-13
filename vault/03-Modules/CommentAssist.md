---
title: "Módulo 6: CommentAssist"
tags:
  - module
  - module/comment-assist
status: accepted
created: 2026-08-06
updated: 2026-08-06
---

# CommentAssist (Apoio a Comentário no TikTok)

## Responsabilidade

Painel interno onde o operador informa o identificador do produto citado num
comentário e recebe a mensagem pronta para copiar/colar manualmente.
**Não há automação de leitura ou postagem de comentário**, decisão
consciente de não violar ToS do TikTok.

## Casos de Uso

- `GenerateReplyMessage`: dado identificador de produto, monta texto com
  link/QR pronto pra colar.

## Portas

- `ProductRepository` (reaproveitada de [[Catalog]], leitura)

## Nota de Design

Módulo propositalmente enxuto, é o único que não tem adapter de "ação
automática" porque a ação em si é manual por design. Não criar abstração
adicional aqui só por simetria com os outros módulos, ver princípio de não
adicionar abstração além do necessário.

## Risco Conhecido

Nenhuma automação de leitura/resposta de comentário no TikTok, decisão de
produto, não só técnica. Ver [[06-Risks/Riscos-Conhecidos]].
