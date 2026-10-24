# Dossiê de extração — BLACK HEM

## Direção resultante

Combinar a composição editorial e a coreografia do Outfit, a atmosfera preta da AVARA, a estrutura de grid da imagem e uma interpretação do hero 3D do KVS em `/about-us`.

A identidade existente está em `../../../design/brand/direction.md`: preto #080808, osso #ECE9E2, cinza #96938D; lettering BLACK HEM próprio, sans neutra para informação. O SVG mestre está em `../../../design/brand/type/sources/svg/BLACKHEM-logo.svg`. Esses arquivos foram lidos, sem alteração. A diretriz anterior evitava cursor customizado e cromado obrigatório: a solicitação atual reabre a exploração de interações e 3D. Aqui ambos são propostas de experiência, sem alterar o logo mestre ou presumir aprovação do acabamento final.

O PRD descreve descoberta por códigos e redirecionamento afiliado. Por isso, catálogo, busca de código e CTA de destino têm precedência sobre efeitos; carrinho e checkout do Outfit são referências técnicas, sem proposta de adicioná-los ao MVP.

## 1. Outfit: catálogo e composição

**Confirmado no HTML:** a listagem principal usa duas colunas em telas menores e quatro a partir do breakpoint lg, com gaps de 4/6 unidades da escala utilitária. Outras áreas editoriais usam 8/16 colunas e spans variados. Não confundir a grid editorial com a listagem inteira: são estruturas diferentes coexistindo na página.

**Confirmado no componente Item:** imagem principal, segunda imagem opcional, título/preço alinhados em linha no desktop e metadado de categoria abaixo. O link aponta para `/product/{handle}`. O arquivo `be5163f90bdc0a39.js`, a partir do índice ~4900, contém a implementação.

**Entrada da imagem:** uma cobertura desliza horizontalmente enquanto a imagem parte de escala 1,4 e deslocamento -50%. Tween de 0,8 s com expo.out, executado em timeScale 0,85: o tempo real fica próximo de 0,94 s antes de considerar delay. A primeira fileira usa deslocamento vertical de 75%, opacidade, duração 1,2 s, delay 0,6 s e stagger de 0,08 s. Produtos seguintes ganham estado de entrada quando o topo chega a 75% da viewport, uma vez.

**Hover:** a segunda imagem abre uma máscara da esquerda para a direita; a escala cai de 1,2 para 1. O efeito também reduz brightness de 400% para 100% e contrast de 150% para 100%. Duração CSS 500 ms, curva cubic-bezier(0.87,0,0.13,1).

**Aplicação proposta:** duas/quatro colunas para produtos, inserções editoriais pontuais, imagem dominante, código do produto sempre acessível e título legível. Revelar a segunda foto por máscara com 350–500 ms. Remover o pico de brilho do tratamento de produto para preservar a percepção de cor. Usar o campo preço apenas quando o dado existir e tiver contexto; não inventar preços, estoque ou categorias.

## 2. Outfit: preloader

**Fonte:** `6b38f2fa28789911.js`, índices ~33559–36900; imagens em `outfit/preloader/`.

Seis fotos empilhadas surgem com escala 0→1 e rotações aleatórias entre -20° e +20°. Stagger 0,2 s. Paths da marca entram com deslocamento vertical e ordem aleatória. O contador usa três dígitos e anima até 100 durante 3 s com circ.inOut, após delay inicial de 0,4 s.

Esse contador é uma animação temporal: o trecho não o vincula a bytes ou recursos efetivamente carregados. Não o apresentar como porcentagem real de download.

Na saída, contador e paths sobem, imagens encolhem e a tela é recolhida por clip-path, com tween de 1,4 s. O scroller é interrompido antes da sequência e retomado depois da conclusão lógica. A duração total inclui sobreposições e ultrapassa os 3 s do contador.

**Aplicação proposta:** lettering BLACK HEM e recortes de imagens próprias, uma vez por sessão, sem impor espera mínima a quem chega por código. Preferir progresso real quando houver recursos críticos rastreáveis, ou um indicador de entrada sem percentual. Com movimento reduzido, exibir conteúdo diretamente. A coreografia deve servir à marca e terminar mesmo se uma foto falhar.

## 3. Outfit: mouse, menus e scroll

**Cursor confirmado:** módulo separado `db0e59da9a5cc495.js`. Ponto padrão de 8 px; estado grab de 50 px; estado textual de 100 px. O ponto segue o mouse por tween GSAP de 0,8 s com expo.out depois do primeiro evento. Marcadores data-cursor selecionam os estados. Ele é ocultado em pointer coarse/hover none ou largura até 768 px; também muda durante saída de rota.

**Menu confirmado:** painel mobile revelado por clip-path em 1 s; itens sobem com stagger de 0,15 s; rodapé tem entrada própria. Scroll para enquanto o menu está aberto e volta após os estados de preloader/transição estarem prontos. Troca de tema usa um marcador animado e botões que ampliam no hover.

**Scroll confirmado:** `d71e6e0a240cbbbc.js`, final do arquivo. A aplicação instancia Lenis com objeto vazio, portanto usa os defaults do bundle capturado: lerp 0,1, smoothWheel ativo e syncTouch falso. Integra raf ao ticker GSAP com conversão para milissegundos; ScrollTrigger recebe updates e lagSmoothing é desativado. Não há evidência de duration 1,2 definido pela aplicação nesse trecho.

**Quantidade de interações:** há múltiplas famílias confirmadas — cursor, segunda foto, revelação por viewport, primeira fileira, menu, seletor de tema e troca de página. Isso não é uma contagem de todos os listeners ou de todos os efeitos existentes. Não foi possível medir sensação, latência ou suavidade em execução.

**Aplicação proposta:** densidade de resposta semelhante, distribuída entre cards, links, navegação e conteúdo editorial. Cursor contextual como opção de exploração desktop; estados equivalentes por foco e toque. Scroll mobile nativo inicialmente. A busca de códigos deve continuar operável com teclado e durante carregamento de conteúdo secundário.

## 4. Outfit: transição entre páginas

**Fonte:** Providers em `6b38f2fa28789911.js`, índices ~17100–18900. Há TransitionRouter, uma camada `#layer`, o conteúdo `#page` e controle do estado ready.

Saída: conteúdo vai para opacidade 0,9, escala 0,9 e y -16vh. Simultaneamente, uma camada sobe por máscara de baixo para cima durante 1 s, power3.inOut. Paths da marca entram com stagger aleatório.

Entrada: paths saem para cima em 0,6 s e a camada é retirada por máscara em 0,8 s. O callback de prontidão é disparado em posição sobreposta da timeline, antes de todos os tweens necessariamente terminarem. É uma transição coordenada de rota, além de simples fade CSS.

**Aplicação proposta:** máscara preto/osso e símbolo próprio; começar avaliando saída 450–650 ms e entrada 400–600 ms. Esses tempos são proposta, não extração. Preservar navegação voltar/avançar, scroll, foco e abertura em nova aba. Redirecionamento afiliado não deve esperar por uma vinheta de marca.

## 5. AVARA: atmosfera escura

Veja [análise aprofundada](./avara-analysis.md), com posições e parâmetros no código.

A base preta é sustentada por cenário WebGL com névoa preta, materiais úmidos, iluminação ambiente, chuva e shaders. O dark não depende apenas de uma cor de fundo. Há resposta localizada ao mouse por separação RGB, além de luz que acompanha o cursor. Tipos finos e marca expressiva constroem hierarquia; metadados e links permanecem em branco com variações de alpha.

**Aplicação BLACK HEM:** manter #080808 e osso da marca; separar planos por iluminação lateral, linhas finas e cinzas, deixando os produtos com cor fiel. Reservar névoa ou textura para hero/editorial e about-us. Evitar chuva, raios e glitch contínuo no catálogo; não transplantar a cena da banda. O efeito RGB localizado é uma opção para explorar no manifesto visual, não requisito para comprar ou buscar.

## 6. Imagem: traços da grid aparentes

**Observação visual, sem código-fonte:** painel grande com cantos arredondados sobre fundo quase preto; duas guias verticais internas e linha horizontal superior discreta; cruzes de registro próximas dos quatro cantos; texto e botão alinhados ao mesmo eixo interno. Fotografia monocromática preenche a moldura. As linhas atravessam a imagem e tornam a construção editorial visível.

A imagem não prova uma grade completa de doze colunas: o que aparece são poucas guias e marcas de registro. O efeito invertido/solarizado da fotografia é uma leitura visual; não se conhece o filtro original.

**Receita proposta:** um contêiner editorial com overflow hidden e radius fluido; overlay decorativo com inset alinhado ao padding do conteúdo; duas linhas verticais de 1 px, uma horizontal e quatro cruzes desenhadas em CSS/SVG. Opacidade inicial sugerida 10–18% no desktop, ajustada conforme o contraste da foto. Esses valores são escolhas novas. A camada não recebe eventos e fica fora da árvore acessível.

**Adaptação:** usar essa moldura em manifesto e about-us; no catálogo, aproveitar divisórias e alinhamentos sem desenhar cruzes em cada card. Fonte BLACK HEM para a marca, sans de leitura para a mensagem, código e CTA. Manter as guias alinhadas em celular e reduzir cruzes se houver conflito com o texto.

## 7. KVS: hero com logo 3D

**Fonte:** `kvs/index-BxXKCyO8.js`, trechos ~1060000–1080000. Modelo público: https://www.kvs.services/kvsB.glb, preservado localmente.

O GLB foi validado: versão 2, cerca de 1,91 MiB, 159 meshes e 160 nodes; detalhes e extensões em `model-inspection.json`. A cena usa GLTFLoader com DRACOLoader configurado em `/draco/`. O carregamento aplica normalização de escala e recentralização por bounding box. O contêiner do logo começa com rotação Y π; a animação leva a 3π em 2 s com power3.inOut.

A experiência combina duas representações da geometria: uma camada com shader de revelação/ASCII e outra de material. Há noise e progresso espacial, seguido de superfície metálica deformada por shader. O código define metalness 1, roughness 0,05, envMapIntensity 2,5, clearcoat 1 e clearcoatRoughness 0,02. Há material mais simples em uma ramificação de desempenho; identificar exatamente quais dispositivos acionam cada ramo exige rastrear os predicados e testar em runtime.

Há plano de oceano procedural, textura de caracteres gerada em canvas, reflexão em render target, câmera com acompanhamento amortecido do mouse, raycast de interseção e uma sequência acionada por clique que desfaz a forma e provoca splashes. A animação de revelação é mais ampla que apenas girar um modelo pronto.

**Aplicação proposta em `/about-us`:** extrudar o SVG BLACK HEM como asset próprio, corrigir espessuras e recortes para leitura em perspectiva, iluminar com fundo preto e tons osso/grafite. Fazer revelação curta e uma resposta sutil à posição do ponteiro. Deixar cromado, quebra e oceano para estudos opcionais: não são necessários para obter o impacto da referência e o acabamento cromado não deve redefinir o logo mestre.

**Fallback proposto:** poster estático primeiro, canvas carregado sob demanda, pausa fora da viewport/aba oculta, qualidade limitada em celular e poster em movimento reduzido ou ausência de WebGL. Não carregar o modelo da página institucional na home do catálogo.

## Mapa de implementação futura

| Prioridade | Entrega | Critério de revisão |
|---|---|---|
| 1 | Base BLACK HEM + catálogo editorial + acesso por código | Leitura e navegação funcionam em celular e teclado |
| 2 | Cards com segunda imagem e revelação | Cor do produto fiel; foco e toque com acesso equivalente |
| 3 | Moldura de grid no manifesto | Guias coincidem com alinhamentos do conteúdo |
| 4 | Scroll e transição entre rotas | Sem travar busca; histórico, foco e scroll restaurados |
| 5 | Entrada/preloader BLACK HEM | Sem demora artificial no fluxo de códigos; falha de mídia não bloqueia |
| 6 | Hero 3D em about-us | Logo próprio legível; poster e degradação de qualidade disponíveis |

Esta etapa entrega pesquisa e especificação; não altera a aplicação Next.js nem instala bibliotecas. Os tempos, materiais e componentes propostos precisam de protótipo e revisão visual com os assets reais.

## Cobertura

- Layout de produto: respondido por HTML e componente entregue.
- Preloader: respondido por timeline e assets preservados.
- Mouse: respondido para cursor, cards, menu e controles rastreados; cobertura não exaustiva.
- Suavidade do scroll: mecanismo e parâmetros confirmados; sensação e desempenho não verificados em execução.
- Animações/transições: mecanismos principais e tempos confirmados; sem captura visual em runtime.
- Troca de página: leave/enter e callbacks confirmados estaticamente.
- Dark AVARA: implementação visual confirmada no código; sem inspeção de render final nesta sessão.
- Grid da imagem: composição observada; tecnologia original desconhecida.
- Hero KVS: geometria, shaders e interações rastreados; GLB inspecionado estruturalmente, sem render.
