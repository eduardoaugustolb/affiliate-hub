# Tema e hero BLACK HEM — primeira implementação

17/10/2026. Base: identidade em `../design/brand` e planejamento em `hero-storytelling.md`.

## Tema

`src/app/globals.css` usa Tailwind v4 com configuração CSS-first. Tokens:

| Token / utilitário | Função |
|---|---|
| ink / bg-ink | Preto #080808 |
| bone / text-bone | Osso #ECE9E2 |
| muted / text-muted | Cinza #96938D |
| surface / bg-surface | Superfície #111110 |
| line / border-line | Divisória osso translúcida |
| font-display | Black Hem Display, peso 400 |
| font-sans | Arial / Helvetica / sans-serif para leitura |
| font-mono | Courier New / monospace |
| rounded-editorial | Moldura de 24 px |
| ease-reveal | Curva de desaceleração para interações |

A descoberta de classes do Tailwind está limitada a src; os bundles de referências não alimentam o CSS da aplicação. As pastas research também foram excluídas do TypeScript e Biome do aplicativo, pois contêm artefatos de terceiros e scripts de investigação.

## Fonte

Arquivo copiado sem modificação de `../design/brand/type/fonts/black-hem-display-regular.woff2` para `src/app/fonts/`. Integração por next/font/local no layout, self-hosted, com variável `--font-black-hem` ligada ao utilitário font-display via @theme inline. A marca usa a ligatura discricionária do texto exato BLACK HEM; os outros títulos usam glifos normais. Sem peso negrito sintetizado, sem fonte externa e sem recorte das pontas.

Origem e direitos: fonte proprietária BLACK HEM, Copyright 2026 Eduardo Augusto Lima Bueno. Condições e fontes editáveis no README original em `../design/brand/type/README.md`. Este arquivo é uma cópia de integração, não uma nova fonte mestre.

## Hero

Implementada a variante tipográfica prevista no planejamento, pois não há fotografia editorial real de produto selecionada. Marca ampla, descrição, CTA por âncora e moldura com guias e cruzes. A arte de linhas foi desenhada em SVG nesta implementação, identificada como estudo visual; não é fotografia ou item à venda. Nenhum asset visual de Outfit, AVARA ou KVS foi publicado.

A sequência atual é marca → explicação do acesso por códigos → início da seleção. O catálogo mostra um estado vazio explícito. Não há integração à API, busca funcional, mercadorias de exemplo, carrinho ou about-us nesta entrega.

GSAP e @gsap/react controlam entrada sobreposta, resposta ao ponteiro e progressão de escala/posição no scroll desktop. O scroll permanece nativo, sem pin ou bloqueio. Uma camada recebe entrada, outra recebe scroll e outra recebe ponteiro, evitando disputa de transforms. useGSAP e matchMedia desfazem listeners e animações ao desmontar ou trocar condições. Movimento reduzido mantém a composição estática; toque não ativa o efeito de ponteiro. A navegação e o conteúdo continuam presentes no HTML inicial.

A transformação fotográfica look→detalhe→produto permanece para a próxima etapa, dependente de fotografia e dados correspondentes. Não foi simulada usando a prancha de identidade.

## Validação

- Build de produção Next.js e TypeScript.
- Biome no projeto, excluindo snapshots da pesquisa.
- HTTP da home, CSS e arquivo WOFF2; âncoras e idioma no HTML.
- Revisão de componentes conforme a skill react-best-practices: hooks com cleanup, chaves estáveis, ícones decorativos, navegação semântica e ausência de rerender por movimento do ponteiro.
- Navegador indisponível: não houve captura de tela, medição de fluidez ou validação visual de quebras mobile. Breakpoints e reduced motion estão implementados e ainda precisam dessa revisão em execução.

Documentação consultada: guias locais da versão instalada de Next.js sobre fontes, CSS e layouts; Tailwind via Context7 (/tailwindlabs/tailwindcss.com); [GSAP matchMedia](https://gsap.com/docs/v3/GSAP/gsap.matchMedia()/).

## Revisão — labels e SplitText

Removidos os labels decorativos em caixa alta: numeração, legendas da moldura, descrições repetidas e frases auxiliares. O lettering da marca permanece intacto. Textos de navegação e rodapé usam caixa natural.

SplitText adicionado à descrição e ao apoio da hero (revelação por palavras com máscara de linhas); título da seção seguinte revela palavras ao entrar na viewport. O título Peças anima por linha, sem máscara, preservando os terminais da fonte. autoSplit/onSplit recompõem linhas após fontes/resize, retornam a animação para sincronização e cleanup; matchMedia e revert restauram o HTML quando a preferência por movimento reduzido muda ou o componente desmonta. Os elementos divididos usam aria auto e não contêm links interativos. A marca não é dividida por caracteres para preservar a ligatura proprietária.

Verificação desta revisão: Biome, TypeScript e build de produção aprovados. Sem nova instância de servidor; segue o servidor do usuário na porta 3000. Revisão visual em navegador permanece pendente.

Ajuste de ritmo: stagger de 75 ms nas palavras principais e 120 ms nas linhas do apoio; guias e cruzes entram com stagger de 100/80 ms. Textos, links e CTA agora disparam pela própria entrada na viewport, evitando que uma animação abaixo da dobra termine antes de ser vista. O parágrafo explicativo também usa SplitText. Sem alterações ao servidor do usuário. Lint e TypeScript aprovados após o ajuste; sensação de movimento ainda sem revisão visual nesta sessão.

## Logo animada e direção de elemento de fundo

A hero agora usa SplitText por caracteres no nome BLACK HEM: entrada vertical de 35%, rotação X de -65° para 0°, duração de 1,1 s e stagger de 70 ms. Para permitir letras independentes, somente a marca da hero usa os glifos individuais da fonte proprietária, com ligatura discricionária desativada e escala reajustada. Isso difere do lockup completo anterior; o mestre original e a marca do header permanecem inalterados. Em movimento reduzido, a composição fica estática.

Proposta para estudo seguinte, ainda não implementada: manequim autoral com silhueta própria, material grafite fosco e caminhada lenta em loop atrás da marca. Avaliar proporção, luz e leitura da silhueta em frames estáticos antes de modelar/rigar a caminhada. Não usar roupas que pareçam itens disponíveis sem associação real com o catálogo. Comparar caminhada no lugar, com parallax suave, a deslocamento lateral; a primeira opção mantém enquadramento e leitura mais estáveis. Alternativa de menor presença humana: tecido abstrato suspenso com movimento de dobra. O manequim exige asset próprio, rig, animação e poster para toque/movimento reduzido; nada disso foi declarado disponível.

Simplificação solicitada: a logo começa com B e H centralizados, aparece em 350 ms, pausa breve e leva as iniciais às posições finais em 900 ms (B à esquerda, H à direita). As demais letras surgem por opacidade com stagger de 45 ms durante a abertura, formando BLACK HEM. Sem rotação ou elevação. SplitText recompõe após fontes/resize, medindo a posição final das iniciais; reduced motion permanece estático. Esta sequência substitui a entrada com rotação descrita acima. Lint e TypeScript aprovados; revisão visual pendente.

## Estado atual — somente Tailwind CSS

Esta revisão substitui as implementações GSAP/SplitText descritas acima. A hero agora é um Server Component, sem hooks, listeners, SplitText ou GSAP. As dependências GSAP e @gsap/react foram removidas porque não há outros consumidores no app.

Toda a composição usa utilitários Tailwind. Os keyframes estão registrados em @theme como animate-wordmark-initial, animate-wordmark-letter e animate-hero-content. B e H aparecem lado a lado no centro, permanecem juntos até 42% da sequência de 1,6 s e deslizam para seus lugares finais. As demais letras começam a surgir após 62% com pequeno stagger. A geometria usa as métricas em em dos glifos proprietários (largura total 4,339em, espaço central 0,22em), evitando medição por JavaScript e mantendo o nome inline. motion-safe aplica as animações; com movimento reduzido, o nome inteiro está presente e estático. Acessibilidade: título com aria-label BLACK HEM e letras visuais agrupadas com aria-hidden.

A resposta ao mouse e as revelações por viewport da implementação anterior foram retiradas para atender ao pedido de usar somente Tailwind CSS. Fonte local, navegação e estados de conteúdo foram preservados. Documentação Tailwind consultada via Context7 sobre @theme/--animate/@keyframes e motion-safe.

## Hero orientada a produtos — estado atual

O usuário rejeitou o bloco de apresentação com arte abstrata e pediu produtos imediatamente, com placeholders até buscar imagens via ISR. ThreadStudy e a apresentação em duas colunas foram removidos. A marca animada foi preservada com altura menor; agora abre diretamente para quatro previews de jaqueta, calça cargo, camiseta e bolsa. O catálogo continua com uma segunda fileira e a explicação por código foi reduzida e colocada após as peças.

As imagens são ilustrações SVG genéricas produzidas para layout, não fotografias de mercadorias reais. Cards sinalizados como prévia/imagem em breve; sem preços, estoque, códigos reais ou navegação de compra inventados. Duas colunas no mobile e quatro no desktop, superfícies claras e contornos escuros para distinguir as peças sobre o tema da marca. Entrada curta com stagger e hover de escala via Tailwind; reduced motion preservado.

O componente ProductPlaceholder isola a representação provisória da imagem. Dados de preview são locais e explicitamente nomeados como tal. ISR, carregamento remoto e associação de produtos reais ficaram para a etapa seguinte, conforme o pedido; não há endpoint fictício ou simulação de revalidação nesta entrega.

## Interações de produto inspiradas no Outfit

Componente ProductPreview separado para compartilhar a interação nas duas fileiras. A pesquisa anterior do Outfit confirmou máscara lateral para a segunda imagem e recuo de escala; a adaptação usa close do placeholder atual em 500 ms, escala 1,15→1 e recuo sutil da peça inteira. Não há pico de brilho, mudança de cor do produto, cursor substituto ou efeito 3D.

A entrada combina cobertura preta saindo para a direita e imagem acomodando escala, com stagger definido por --card-delay. A legenda recebe sublinhado e o controle recebe contraste preto/osso com seta animada. Os controles usam details/summary nativos: hover revela temporariamente em dispositivos compatíveis; toque/clique/Enter/Espaço alternam o close persistente, com rótulos Ver detalhe/Ver peça. Fechar retorna à imagem inteira quando o ponteiro sai do card. O detalhe acessível é descrito no conteúdo do disclosure; a camada visual duplicada é decorativa. motion-safe/motion-reduce mantêm alternativas sem movimento.

Os detalhes são recortes das mesmas ilustrações genéricas, não segunda foto real ou mercadoria disponível. O ponto de substituição continua isolado em ProductPlaceholder para a integração posterior das imagens. Tudo permanece em Tailwind e HTML nativo, sem runtime de animação. Esta entrega não incluiu inspeção visual em navegador; testes de build, tipagem e lint são registrados separadamente da validação de interação real.

Correção de affordance: retirada a seta que rotacionava no controle de detalhe. Agora o estado fechado mostra lupa com + (ampliar) e o aberto mostra lupa com − (reduzir), acompanhadas por Ver detalhe/Ver peça. Ícone sem animação de direção; apenas o contraste do controle responde ao hover. Biome e TypeScript aprovados.

## Correção da navbar — 2026-10-19

O estilo global de Button mantinha o toggle mobile visível no desktop, deslocando
“Explorar peças” para cima da navegação central. A visibilidade responsiva agora
fica em um wrapper; header usa três colunas com áreas separadas para marca,
navegação e CTA. A navegação central participa do grid em vez de sobrepor o header.
GlitchText reaplica o texto atual após cleanup para alternar Menu/Fechar corretamente.

Verificação em Chromium: sem sobreposição em 768, 900, 1280 e 1920px; menu mobile,
Escape e foco em 390 e 767px, sem erros JS. Capturas em
`.harness/admin/navbar-desktop.png` e `.harness/admin/navbar-mobile.png`.
