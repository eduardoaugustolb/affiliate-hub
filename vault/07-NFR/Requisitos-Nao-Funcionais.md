---
title: Requisitos Não Funcionais
tags:
  - nfr
status: accepted
created: 2026-08-06
updated: 2026-08-10
---

# Requisitos Não Funcionais

- **Substituibilidade de infraestrutura**: qualquer porta de infraestrutura
  (banco, framework HTTP, storage, mensageria, fila, agendador) deve poder
  trocar de adapter concreto **sem alterar código de domínio ou caso de
  uso**, critério de aceite arquitetural, não sugestão. Ver
  [[08-DoD/Definition-of-Done]].
- **Resiliência de sessão WhatsApp**: `authState` do Baileys nunca em disco
  efêmero, persistido via `SessionStorage`. Ver [[03-Modules/Broadcast]].
- **Nunca deleção física de produto**, sempre soft delete via campo de
  status. Ver [[03-Modules/Catalog]].
- **Custo operacional total-alvo**: entre R$0 e R$50/mês no estágio inicial.
  Ver [[04-Infrastructure/Deploy-Topology]].
- **Observabilidade mínima**: healthcheck do módulo Broadcast deve notificar
  (e-mail/Telegram) se a conexão do WhatsApp cair. Ver
  [[06-Risks/Riscos-Conhecidos]].
- **Conformidade com a LGPD**: todo dado pessoal de titular (hoje, o
  usuário do painel em [[03-Modules/IdentityAccess]]) precisa de medida
  técnica de proteção compatível com o art. 46 da lei, mínimo: e-mail
  nunca em texto plano em repouso, senha e token de sessão sempre
  hash/não-reversíveis. Ver [[09-Compliance/LGPD]] (inventário e checklist)
  e [[02-Decisions/ADR-0013-lgpd-criptografia-de-email|ADR-0013]] (decisão
  técnica de criptografia de e-mail).
