---
title: Visão Geral do Produto
tags:
  - architecture
status: accepted
created: 2026-08-06
updated: 2026-08-06
---

# Visão Geral do Produto

Sistema de automação de ponta a ponta para operação de um perfil de afiliados
(Shopee, Shein, Mercado Livre) no nicho streetwear + perfumes, cobrindo:

- Sincronização de produtos e links de afiliado (Shopee Affiliate Open API).
- Geração automática de imagens de post (formato "photo dump") a partir de templates.
- Encurtador de link próprio com redirecionamento sempre atualizado + QR code embutido.
- Distribuição automática de novos produtos para um grupo de WhatsApp (via Baileys).
- Painel administrativo para curadoria de produtos, mídia e templates.
- Ferramenta de apoio (não automação) para responder comentários no TikTok.

## Fora de Escopo (nesta versão)

- Automação de resposta de comentário no TikTok (viola ToS).
- Automação de postagem no TikTok em si.
- Geração de imagem via IA generativa no pipeline principal (usada só offline,
  pra criação de ativos de marca).

## Ver também

- [[01-Architecture/_Index|Arquitetura]] — como o sistema é construído
- [[03-Modules/_Index|Módulos]] — em que contextos o domínio se divide
- [[06-Risks/Riscos-Conhecidos|Riscos Conhecidos]] — o que já sabemos que pode dar errado
