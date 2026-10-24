# Páginas de produto e outfit

Referência: https://outfit.hellohello.is/product/kerned-confidence-1, consultada em 19/10/2026. A composição observada usa galeria à esquerda e informações/ação à direita. BLACK HEM conserva fundo preto, texto bone, fonte de marca no logo e ícones Cut. Fotos, nomes, códigos, cores e destinos vêm da API; não há preços nem variantes fictícias.

## Rotas e dados

- `/p/:productCode` → redirecionamento 307 para `/products/:id`.
- `/o/:outfitCode` → redirecionamento 307 para `/outfits/:id`.
- Nesta implementação, `id` é o código público normalizado. O banco de outfits possui apenas o código como chave; não foi criada uma chave interna adicional.
- Leituras via Server Components sob ApiBoundary/Suspense, com fallback BH estático.
- A DAL `src/data/entries.ts` valida identificadores e projeta DTOs mínimos. Não encaminha cookies de visitantes.
- Endpoints públicos dedicados na API: `GET /storefront/products/:code` e `GET /storefront/outfits/:code`. Operações administrativas anteriores continuam autenticadas.
- Produtos inativos retornam 404 na leitura pública e são omitidos dos outfits. Produtos excluídos também são omitidos.

## Cor e marketplace

O cadastro atual tem categorias de cor, mas não vincula produtos como variantes de uma mesma peça. Por isso, “Cores desta peça” mostra apenas as cores associadas ao produto e leva ao catálogo filtrado. No outfit, os botões filtram apenas as peças daquele look, usando `?color=<id>` e SSR. Cores são nomeadas com dados reais; não são inferidos códigos hexadecimais.

A ação “Ir para Shopee/Shein” usa o destino cadastrado, abre outra aba e inclui `rel="sponsored noopener noreferrer"`. Preço e disponibilidade são conferidos no marketplace.

## Verificação

`bun .harness/storefront/check.ts` inicia API HTTP de teste e Next em produção em portas temporárias. Verifica redirecionamentos, HTML SSR, projeção de dados, destinos, cores, mobile, 404 e recuperação de falhas. Evidências visuais são salvas na mesma pasta do harness.


## Galeria e múltiplas cores

A DAL aceita `imageUrls` com 1–20 URLs HTTPS, remove duplicadas preservando a ordem e deriva `imageUrl` da primeira foto. Respostas legadas sem galeria são normalizadas para `[imageUrl]`. Produtos de outfits usam a mesma projeção.

A galeria mantém fotos no HTML SSR e limita o estado cliente à foto selecionada. Miniaturas, anterior/próxima e setas/Home/End permitem navegação. Uma única foto dispensa controles. Mudanças no conteúdo da galeria reiniciam a seleção.

O admin preserva a galeria ao editar. A URL principal define a capa; um campo de URLs adicionais, uma por linha, define a ordem restante. Múltiplas cores continuam sendo enviadas com `optionIds`, sem inferir associação entre cor e fotografia.

O retorno ao catálogo antecede a imagem no fluxo da página. A área de compra agrupa a ação do marketplace com tamanhos e cores, lado a lado no desktop e empilhados no mobile. O link usa o GlitchText existente, preenchimento de fundo e deslocamento diagonal do ícone no hover/foco; movimento reduzido mantém apenas a mudança estática de cor.


A altura útil usa `100svh` descontando cabeçalho, retorno, padding e margem inferior. No desktop, a galeria e a área de ação compartilham esse limite; detalhes extensos têm rolagem interna. No mobile, a foto e o CTA sólido aparecem primeiro, e as informações continuam abaixo. Em alturas de até 600 px, as miniaturas ficam ocultas e a navegação por setas permanece disponível. O harness verifica foto e CTA inteiros em oito viewports, incluindo paisagem de 568×320.
