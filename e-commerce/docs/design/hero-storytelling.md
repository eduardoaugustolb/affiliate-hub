# BLACK HEM — hero e chegada aos produtos

Proposta v0.1 · 17/10/2026 · Planejamento, ainda sem implementação ou aprovação visual.

## Base

Identidade: [direção](../../../design/brand/direction.md), [prancha](../../../design/brand/black-hem-direction-01.png) e [tipografia](../../../design/brand/type/README.md). A prancha foi inspecionada visualmente nesta etapa. Pesquisa técnica: [extração das referências](../../research/references/design-extraction.md).

A prancha sustenta lettering amplo, preto/osso, fotografia com luz lateral, matéria têxtil e código como informação. Suas fotos e etiquetas são simulações de marca: não comprovam produtos disponíveis ou fabricação própria. O PRD descreve curadoria de produtos afiliados. A narrativa deve ligar uma composição editorial às peças encontráveis, sem sugerir que a BLACK HEM fabrica as roupas.

## Tese

A página apresenta um look, aproxima o olhar dos seus detalhes e transforma a composição em peças para explorar. A grid aparente é o elemento que une essas três escalas: enquadrar → observar → encontrar.

Isso é uma direção de experiência, não um slogan para publicar. A copy inicial será direta: “Curadoria de roupas e acessórios”, “Explorar peças” e “Buscar por código”. Categorias e textos finais dependem do catálogo real.

## Direções comparadas

| Direção | O que organiza a abertura | Avaliação |
|---|---|---|
| Editorial fotográfica — recomendada | Look real, recortes, lettering e grid | Liga atmosfera a produto; reaproveita a linguagem da marca e dos posts |
| Tipográfica | Marca ampla, espaço vazio e entrada de imagens | Alternativa se a fotografia editorial ainda não existir; mantém a proposta sem simular estoque |
| Escultura 3D | Marca volumétrica como protagonista | Adequada ao about-us já proposto; aqui deslocaria a atenção das peças para o objeto de marca |

## Storyboard recomendado

### Cena 1 — reconhecer a marca e entender o conteúdo

Primeira viewport: fundo #080808, lettering osso em escala grande e um único enquadramento editorial. O contraste vem da fotografia e da proporção entre marca e corpo, sem cores adicionais.

Header compacto com marca/home à esquerda; “Peças”, “Sobre” e “Buscar por código” à direita. No celular, marca, busca e menu. Links e busca utilizáveis desde a renderização inicial.

A marca principal ocupa aproximadamente 65–75% da largura útil na faixa superior. O enquadramento da foto ocupa inicialmente cerca de metade da largura, deslocado à direita, sobrepondo parcialmente a região inferior da marca sem ocultar letras essenciais. À esquerda, descrição curta e CTA “Explorar peças”. Nos limites da imagem, guias finas e cruzes de registro. Metadados só quando reais: nome da seleção ou código ligado à peça mostrada.

Em 1440×900: margens iniciais de 40–56 px; header em torno de 72 px; imagem entre 52–60% da largura útil. São pontos de partida, a ajustar ao recorte e ao lettering. Altura da hero próxima de 100svh, com crescimento livre em janelas baixas/zoom. Não recortar as pontas da marca.

**Mensagem entendida:** este é o universo BLACK HEM, com roupas e acessórios para explorar.

### Cena 2 — aproximar o olhar

Ao rolar, a fotografia ganha área e passa a dominar o enquadramento. A marca grande sai pelo fluxo; a marca pequena permanece no header. As guias se prolongam e enquadram um detalhe real da mesma composição — corte, sobreposição ou textura visível na foto.

O visitante percebe uma relação entre look e detalhe. Não usar adjetivos de qualidade sem prova, promessas sobre materiais ou cenas de confecção de uma curadoria afiliada.

Com imagem adequada, usar mudança de recorte da mesma foto; se o detalhe precisar de outra imagem, revelar um close correspondente por máscara curta. Mostrar uma segunda peça pode acontecer em um pequeno recorte lateral, sem virar um carrossel automático.

Copy opcional: “Explore as peças deste look”, somente se os itens estiverem realmente mapeados. Se não houver associação look→produto, substituir por “Explore a seleção”, sem sugerir correspondência.

**Mensagem entendida:** há peças e detalhes concretos por trás da imagem editorial.

### Cena 3 — a composição se organiza em catálogo

A moldura editorial se contrai para a largura de um item destacado, enquanto as guias passam a coincidir com as colunas do catálogo. Entram título “Peças”, busca e primeira fileira. A leitura deixa de acompanhar uma cena e passa a comparar imagens.

Se a foto editorial for diferente da foto de catálogo, a transição usa uma máscara/crossfade deliberada. Não presumir um morph perfeito entre imagens incompatíveis. O item destacado só é apresentado como parte do look quando o vínculo existir nos dados.

Desktop: quatro colunas de catálogo; celular: duas quando nomes e imagens funcionarem em 360 px. Título, código e CTA de destino visíveis sem hover. Foto frontal/alternativa no hover como camada adicional. Preço apenas se vier de fonte confiável e sua exibição estiver prevista no produto.

**Mensagem entendida:** posso reconhecer a peça, usar seu código e abrir seu destino.

## Continuidade espacial e duração

O primeiro protótipo terá uma sequência desktop de aproximadamente 170–190svh no total, incluindo a primeira viewport de 100svh e 70–90svh de desenvolvimento. O catálogo começa em seguida e deve aparecer por volta da segunda viewport; ajustar por conteúdo, sem impor três telas vazias. Uma única região sticky pode sustentar foto e guias durante a transformação.

Percentuais abaixo são do trecho de scroll da transformação, não da página inteira:

| Progresso | Estado dominante | Transformação |
|---|---|---|
| 0–20% | Abertura ainda legível | Foto começa a ampliar; descrição sai com seu bloco |
| 20–60% | Imagem e detalhe | Área de foto cresce; recorte aproxima; guias permanecem no mesmo sistema |
| 60–85% | Organização | Moldura encontra a coluna de destaque; título de catálogo entra |
| 85–100% | Produtos | Primeira fileira aparece; sticky termina; segue scroll comum |

A progressão é reversível durante o trecho; subir restaura as relações espaciais. Revelações de itens seguintes acontecem uma vez e não reiniciam com pequenas oscilações de scroll. Nenhum estágio exige aguardar um tempo para continuar.

## Entrada e contratos de movimento

| Alvo / propósito | Gatilho e transformação | Ritmo inicial | Estado e alternativa |
|---|---|---|---|
| Marca / reconhecimento | Primeira visita: recorte revela wordmark inteiro | 650–850 ms; desaceleração forte | Logo estático legível; sem entrada repetida ao voltar |
| Foto / profundidade | Entrada: escala 1,04→1 com opacidade | 900–1100 ms, sobreposta à marca | Poster visível; sem espera por vídeo |
| Guias / enquadramento | Entrada: extensão das linhas a partir das bordas | 500–700 ms | Moldura completa; linhas decorativas |
| Texto e CTA / orientação | Entrada curta de 12–20 px | 350–450 ms | Ação acessível desde o início; foco não fica escondido |
| Foto e moldura / narrativa | Scroll: ampliar, aproximar, reorganizar | Progresso controla estado; sem atraso acumulado | Layout linear quando não houver animação |
| Foto / resposta ao mouse | Pointer preciso: deslocamento de até 6 px dentro do crop | Retorno em 250–400 ms | Área clicável estável; desativado em toque/reduced motion |
| CTA / feedback | Hover/foco: traço, contraste e seta até 4 px | 180–240 ms | Mesmo alvo e texto; teclado equivalente |
| Cards / descoberta | Entrada em viewport e imagem alternativa por hover | Entrada 450–650 ms; hover 350–450 ms | Conteúdo e ações visíveis em toque |

O impacto da abertura vem da entrada sobreposta e da transformação pelo scroll. Não somar um preloader longo antes dessa sequência. Um preloader futuro deve compartilhar os mesmos elementos e desembocar diretamente no primeiro frame; não repetir logo, fotos e apresentação em duas introduções seguidas.

Transição de página é outro contrato: “Explorar peças” rola para #pecas e encerra a cena diretamente; não dispara troca de rota. “Sobre” pode usar a máscara preto/osso já pesquisada. Destino afiliado segue imediatamente, respeitando a navegação prevista no produto.

## Sistema visual

- Fundo principal #080808; informação principal #ECE9E2; secundária #96938D, com contraste verificado no tamanho real.
- BLACK HEM no SVG mestre para a assinatura; fonte display própria em chamadas pontuais acima de ~48 px. Sans de leitura para navegação, descrições, códigos e ações; família ainda em aberto.
- Guias de 1 px, osso em aproximadamente 12–16% como ponto de partida. Quatro cruzes no enquadramento editorial; no catálogo, divisórias e alinhamentos dão continuidade sem cruzes repetidas em todos os cards.
- Radius moderado, inicialmente 20–32 px na moldura desktop e 14–20 px mobile; ajustar para conviver com terminais afiados do lettering. A imagem de referência orienta a moldura, não obriga reproduzir a proporção.
- Fotografia escura com textura legível; manter cor fiel nas fotos de produto. Um recorte editorial pode ter tratamento tonal, desde que não represente incorretamente o item.
- Cursor nativo nesta primeira proposta; riqueza de mouse nos elementos. Um cursor substituto fica como experimento posterior, pois a identidade atual o desaconselha e a pesquisa não equivale à aprovação dessa mudança.

## Mobile, acessibilidade e interrupções

Mobile recebe a mesma ordem narrativa em fluxo: marca, foto, contexto curto e produtos. Sem pin longo ou sequência horizontal. A imagem toma a largura útil, a marca cabe sem deformação e a busca permanece explícita. Diminuir o trecho editorial para que os primeiros produtos estejam próximos de 1,5–2 telas, conforme altura e conteúdo.

Reduced motion: todas as cenas ficam estáticas e lineares; sem parallax, sticky narrativo ou grandes escalas. As guias e a hierarquia continuam contando a sequência.

A hero deve funcionar sem JavaScript, com imagens dimensionadas e conteúdo semântico. Se a mídia falhar, manter marca, descrição, busca e CTA. Retorno pelo histórico preserva a posição; não reproduzir abertura. Âncora #pecas deve resolver sem exigir que o visitante assista à sequência. Resize ou mudança de orientação recalculam o layout sem duplicar estados. O header não pode cobrir título ou foco ao navegar por âncora.

## Assets e dependências de conteúdo

| Material | Estado | Uso |
|---|---|---|
| Wordmark SVG e fonte BLACK HEM | Disponíveis em ../design/brand/type | Marca e linguagem tipográfica |
| Prancha de identidade | Disponível; referência visual, não catálogo | Direção de luz, recorte, cor e composição |
| Foto editorial horizontal + recorte vertical | Ainda não identificados entre os materiais inspecionados | Hero; precisa admitir área para texto e detalhe aproveitável |
| Close correspondente | Pendente; pode derivar de foto com resolução adequada | Cena 2 |
| Produtos e associação com a foto | Pendente para essa cena | Continuidade real até o catálogo |
| Modelo 3D próprio | Fora desta hero | Exploração futura no about-us |

Se a fotografia não existir, prototipar com blocos de composição claramente rotulados e a marca real. A prancha não será recortada para fabricar fotos de mercadoria. A definição dos assets é a principal dependência para fechar o layout com precisão.

## Próxima execução

1. Escolher uma composição editorial e 4–8 produtos reais; confirmar se a imagem representa esses itens.
2. Produzir frames estáticos de abertura, aproximação e catálogo em 1440×900 e 390×844; comparar também 360 px e janela baixa.
3. Ajustar tipografia, recortes e grid antes de animar; aprovar a relação entre marca, fotografia e código.
4. Prototipar entrada e uma transformação de scroll; verificar rolagem rápida, reversão, âncora, histórico e foco.
5. Acrescentar hover e transições de rota, medindo em navegador e dispositivo móvel.

Ferramentas/bibliotecas ficam para a implementação. Nesta etapa foram definidos comportamento e estados, sem alteração da aplicação ou instalação de dependências.

## Critérios de revisão

A primeira tela comunica o tipo de oferta e tem caminho para peças/código; a passagem para o catálogo é uma continuação reconhecível; o produto aparece sem uma introdução longa; marca e detalhes seguem legíveis; imagem e item não induzem associação falsa; teclado, toque e movimento reduzido concluem as mesmas tarefas. Duração e posições são hipóteses de protótipo, ainda sem validação em navegador.

## Interações de outubro de 2026

A entrada usa callbacks da timeline: abertura BH → BLACK HEM, controles e então cards. Os produtos ficam ocultos até a conclusão dos controles, inclusive enquanto a API termina de transmitir o HTML.


Os cards usam uma abertura lateral e escala 1.2 → 1 em 500 ms, com o easing observado no Outfit: cubic-bezier(.4,0,.2,1). Conforme a revisão solicitada, o brilho foi substituído por deslocamento SVG, jitter e granulado que desaparecem em 500 ms. A API fornece uma imagem por produto; ambas as camadas usam essa imagem. Teclado e toque também ativam a interação.

Lenis replica os parâmetros efetivos do Outfit: lerp 0.1, smoothWheel true, syncTouch false e RAF pelo ticker GSAP, com ScrollTrigger.update. Menu, carregamento e operações pendentes suspendem o scroll. Movimento reduzido utiliza scroll nativo. Evidências da referência estão em `research/references/outfit-motion`.

Os controles usam stagger de 90 ms por campo e botão, incluindo título da seção e contagem. O contêiner não recebe deslocamento: a conclusão do último item libera os produtos. A ocultação inicial acompanha cada etapa e reinicia quando a timeline do título recomeça. O harness verifica visibilidade quadro a quadro e diferença de progresso entre os campos.

O recorte e a escala do hover pertencem à camada externa; jitter e filtro SVG pertencem à imagem interna. A conclusão da timeline limpa somente a distorção temporária, preservando a camada aberta enquanto houver hover. `.harness/admin/hover-check.ts` verifica os pixels de duas imagens distintas após a conclusão, permanência do cursor, saída e reentrada.

## Scroll de #pecas

O alvo nativo `id="pecas"` só é publicado quando os callbacks de todos os cards confirmam a conclusão da entrada. Durante a abertura existe apenas `data-scroll-anchor="pecas"`, evitando que o navegador ou o Next antecipe o scroll. Links de retorno e de cor usam `scroll={false}`.

O scroll aguarda os bloqueios ativos no provider e então usa Lenis com o offset de `scroll-padding-top`; movimento reduzido usa scroll nativo. Acessos com hash começam no topo durante a entrada. Não há timer estimando a duração da animação. `.harness/admin/anchor-check.ts` verifica quadro a quadro acesso direto, retorno de produto, hash durante a entrada e movimento reduzido.
