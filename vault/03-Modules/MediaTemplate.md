---
title: "Módulo 3: MediaTemplate"
tags:
  - module
  - module/media-template
status: accepted
created: 2026-08-06
updated: 2026-08-06
---

# MediaTemplate (Geração de Imagem)

## Responsabilidade

Transformar fotos brutas de produto em imagem final de post, seguindo um dos
templates registrados (`cutout-flatlay`, `grid-colagem`, outros no futuro).

## Casos de Uso

- `RemoveImageBackground`: pré-processamento de foto crua.
- `RenderPost`: dado `productId` + `templateId`, monta a imagem final
  (overlay de ID, nome, QR code).
- `RegisterTemplate`: permite adicionar um novo layout sem alterar código do
  motor de renderização (template é dado, não lógica hardcoded).

## Portas

- `BackgroundRemover`: porta abstraindo a remoção de fundo. Isso é o motivo de
  não travar em rembg: se um dia for trocado por uma API paga, é um novo
  adapter, caso de uso intacto.
- `ImageRenderer`: porta abstraindo o motor de renderização (Satori
  hoje, poderia ser Playwright amanhã pra templates mais complexos, sem
  reescrever `RenderPost`).
- `FileStorage`: porta de object storage (upload/get URL pública).
- `QRCodeGenerator`: porta isolada (troca de lib de QR sem tocar em nada mais).

## Adapters

- `RembgBackgroundRemover implements BackgroundRemover`
- `SatoriImageRenderer implements ImageRenderer`
- `CloudflareR2Storage implements FileStorage`
- `QRCodeNpmAdapter implements QRCodeGenerator`

## Domínio

`Template`: entidade que carrega layout como dado (posições, tamanho de
overlay), não como lógica hardcoded no motor de renderização. Adicionar
template novo é registrar dado via `RegisterTemplate`, não editar código do
`ImageRenderer`.

## Risco Conhecido

Fotos "lifestyle" de review de terceiros (template `grid-colagem`) exigem
curadoria humana quanto a direito de imagem, não deve virar pipeline 100%
automático. Ver [[06-Risks/Riscos-Conhecidos]].
