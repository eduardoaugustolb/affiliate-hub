---
title: Definition of Done por Módulo
tags:
  - architecture
status: accepted
created: 2026-08-06
updated: 2026-08-06
---

# Definition of Done (Critério de Aceite Arquitetural)

Um módulo só está "pronto" quando:

1. Toda dependência externa (framework, SDK, biblioteca de terceiro) está
   atrás de uma porta definida pela camada de aplicação — ver
   [[01-Architecture/Hexagonal-Ports-and-Adapters]].
2. Existe pelo menos um teste de caso de uso rodando com um **adapter
   fake/in-memory** da porta (prova de que o caso de uso não depende de
   infraestrutura real para ser testado) — ver
   [[01-Architecture/Use-Case-Pattern]], rodando sob
   [[02-Decisions/ADR-0010-bun-test-em-todo-lugar|bun:test]].
3. Composition root (`main`) é o único lugar onde adapters concretos são
   instanciados e injetados — ver [[01-Architecture/Layers-Overview]].
4. Trocar um adapter concreto por outro (ex.: trocar `SatoriImageRenderer` por
   um novo `PlaywrightImageRenderer`) não exige alterar nenhum arquivo de caso
   de uso ou entidade.
5. **Nenhuma entidade de domínio é anêmica** — toda invariante de negócio
   mencionada na nota do módulo (ver [[03-Modules/_Index|Módulos]]) está
   implementada como método da entidade, não como `if` espalhado em caso de
   uso ou adapter. Ver [[01-Architecture/Rich-Domain-Model]].

6. **Teste de integração organizado por módulo, nunca por camada solta.**
   Em `services/api/test/integration/<módulo>/`, um arquivo por
   adapter/grupo-de-rota (`ProductRepositoryDatabase.test.ts`,
   `catalogRoutes.test.ts`, `linkRedirectRoutes.test.ts` — nunca um
   `http.integration.test.ts` genérico misturando rotas de módulos
   diferentes). Achado real ao implementar [[03-Modules/LinkRedirect]]: um
   arquivo único de teste HTTP cresce sem limite conforme módulos somam
   rotas no mesmo `HonoHttpServer` — a fronteira de teste tem que espelhar a
   fronteira de bounded context, do mesmo jeito que o código de produção já
   faz.

## Como checar rapidamente

Ver [[04-Infrastructure/Ports-Adapters-Matrix]] — toda porta listada ali
precisa ter adapter real **e** adapter fake antes do módulo correspondente
ser considerado pronto.
