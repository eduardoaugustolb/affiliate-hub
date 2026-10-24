# BLACK HEM / Cut — sistema de ícones e navegação

Versão 0.1 · 17/10/2026 · Coleção desenhada nesta implementação para BLACK HEM; proposta de sistema secundário, ainda sem testes de reconhecimento com público.

## Conceito e posição

A marca tem lettering com terminais afiados, preto/osso e composição por guias. Os ícones traduzem essa estrutura por facetas e terminais retos. O objetivo é manter coerência visual sem diminuir a clareza das ações. O lettering e o nome continuam sendo os ativos principais; ícones e trilho de navegação são apoio, não um novo logo.

Não foram copiados paths, ícones ou fontes da AVARA. A navbar aproveita mecanismos observados no material público já coletado: cabeçalho persistente, logo à esquerda, seletor central com linha e pontos, menu compacto no celular. Evidência: `research/references/avara/default.DUsKC7Nt.css`, trecho entre aproximadamente 1550 e 9000 caracteres. O acesso web à AVARA falhou nesta sessão; não houve observação nova do site em execução.

## Regras de desenho

- Grade 24 × 24; área útil aproximada entre 2 e 22.
- Traço 1,5 px em 24 px, terminais retos e encontros em miter.
- Uma faceta de 45° em contornos fechados (lupa, informação, tag, bolsa); não adicionar espinhos decorativos a toda linha.
- Escala recomendada: 20/24 px em controles; 16 px apenas com rótulo e contraste adequado. Alvo interativo independente do desenho: 44–48 px.
- currentColor: osso em preto, preto em osso; muted para apoio, nunca único sinal de estado.
- Sem rotação de setas para representar mudança de ação. O nome do símbolo corresponde à direção ou operação real.
- Rótulos seguem sans de leitura; a fonte display não é usada em informações pequenas.
- Imagens de produto e lettering não foram alterados por esta coleção.

## Coleção e uso

20 mestres em `src/lib/brand-icons.ts`; componente `src/components/ui/brand-icon.tsx` com nome tipado. Exportações SVG, manifesto e galeria em `public/brand/icons/`. Reprodução: `bun tools/design/export-icons.ts` (usa Sharp já instalado no projeto para rasterizar as pranchas).

| Família | Ícones |
|---|---|
| Navegação | arrow-right, arrow-left, arrow-up, arrow-down, external-link |
| Exploração | search, zoom-in, zoom-out, grid, layers, tag, filter |
| Interface | menu, close, plus, minus, check, info |
| Coleção futura | heart, bag |

Ter heart/bag na coleção não cria funcionalidades de favoritos ou carrinho. A página usa apenas os ícones pertinentes aos controles disponíveis.

`<BrandIcon name="zoom-in" className="size-5" />` é decorativo por padrão. Para um ícone informativo isolado, fornecer `label`; botões apenas com ícone precisam de nome acessível no próprio botão. Links de saída devem usar external-link; links que rolam a página usam arrow-down/arrow-up.

## Navbar

Cabeçalho sticky com marca à esquerda e trilho central de três destinos: Peças em foco, A seleção e Como encontrar. Pontos facetados mantêm a linha compacta; hover/foco expõem ícone e rótulo, sem alterar seu significado. Um observador de interseção atualiza aria-current e o destaque conforme a seção visível. O link textual Explorar peças permanece explícito no desktop.

No celular, botão Menu/Fechar com ícone correspondente e aria-expanded controla uma lista de links com nomes visíveis. Fecha por seleção, Escape, clique externo e mudança para desktop. Escape devolve foco ao botão; seleção leva foco à seção. O menu é uma expansão não modal e não bloqueia a rolagem da página. Âncoras reservam espaço para o header. Motion reduced desliga as transições e o scroll suave.

Estilo e animações continuam em Tailwind CSS, sem GSAP. O pequeno componente client é usado somente para estado, eventos do menu e indicação da seção; a hero e os cards continuam componentes de servidor.

## Validação de desenho

Pranchas collection.png e collection-no-brand.png renderizadas por Sharp. A versão sem marca foi inspecionada em 16, 20, 24 e 32 px: contornos facetados e peso permanecem consistentes; símbolos de lupa, menu e direção continuam identificáveis na revisão interna. O teste sem logo avalia coerência, não comprova reconhecimento exclusivo da BLACK HEM.

Troca de nome: setas, plus/minus e check ainda são convenções compartilhadas; facetas e uso consistente dão unidade, mas não comprovam exclusividade. Redução: em 16 px alguns detalhes de grid/filter ficam delicados; usar 20 px ou mais nos controles principais. Sem pontuações de reconhecimento ou memorização: não houve teste com usuários, exposição de cinco segundos ou comparação cega.

Riscos visuais a evitar: arredondar apenas parte da coleção; misturar um pack externo com terminais redondos; tornar o símbolo gótico a ponto de perder leitura; usar movimento para mudar o significado de uma seta; empregar a coleção como se fosse um novo monograma aprovado.

## Limites de verificação

Galeria de ícones verificada por renderização raster. Lint, tipagem e build executados no aplicativo. Navegador não conectado nesta sessão: menu, foco e scrollspy foram revisados no código, sem validação visual/interativa completa em dispositivo. Galeria pública local: `/brand/icons/index.html`.
