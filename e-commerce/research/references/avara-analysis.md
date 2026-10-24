# Avara — análise do material público baixado

Análise estática de `https://www.avara.band/`, com foco em atmosfera dark. O material é o bundle de produção entregue ao navegador, não o repositório original. Os offsets abaixo são índices de caracteres zero-based, contados por `Bun.file(...).text()`; os bundles minificados concentram múltiplos componentes em uma linha.

## Achados confirmados

| Elemento | Evidência local | Consequência visual/técnica |
|---|---|---|
| Preto absoluto como base | `entry.T26Jnyvf.css`, `:root`: `--color-black:#000;--color-white:#fff`; `html{background-color:var(--color-black)}` | O cenário escuro nasce do fundo e da composição, não apenas de um filtro aplicado sobre fotografias. |
| Terceiro tom declarado | Mesmo CSS: `--color-firefly:#182833` | Azul petróleo existe como token; a declaração sozinha não comprova sua predominância visual. |
| Contraste graduado | `default.DUsKC7Nt.css`: back-link `#ffffff80`, overlay-body `#ffffffbf`, botões do loader `#fff9` | Texto principal branco e metadados em brancos translúcidos criam hierarquia discreta. |
| Tipografia de interface | `entry.T26Jnyvf.css`: `Inter-Thin`, `Inter-Light`, com arquivos locais em `/fonts/` e `font-display:swap` | Interface fina, espaçada e sóbria. |
| Tipografia expressiva | `default.DUsKC7Nt.css`: `ff-brokenscript-bc-web` nos rótulos/menu/loader; `owners-wide` e `owners-xxwide` nos textos destacados | Mistura de lettering expressivo e sans largas. As fontes citadas não devem ser presumidas livres para reutilização. |
| Canvas fixo de fundo | `default.DUsKC7Nt.css`, offset 25502: `.canvas-animation` fixo, largura e altura 100%, `z-index:0` | Experiência organizada em uma cena contínua com conteúdo sobreposto. |
| Cenário 3D escuro | `BkkWIOyj.js`, offsets 974316–974390: `background=new Oe("#000000")`, `fog=new Eu(0,40,100)` | Fundo e neblina pretos escondem profundidade e permitem surgimento gradual dos objetos. |
| Assets materiais | `BkkWIOyj.js`, offsets 1026500–1029000: estrada, sombras, roughness, vidros, normal maps, HDRI e `/mesh/avara_mesh2.glb` | A atmosfera usa materiais de estrada molhada, reflexos, vidro e ambiente 3D, além do CSS. |
| Chuva e superfícies molhadas | `BkkWIOyj.js`, offset 985166, instancia sistema de chuva; loader inclui `raindrop2.png`, `watersplash.ktx2`, `road_roughness.ktx2`, `windows_texture.ktx2` | Camadas de chuva, respingos e brilho especular contribuem para a sensação noturna. |
| Relâmpago procedural | `BkkWIOyj.js`, offsets 706817–708900: ruído, FBM de 5/6/7 oitavas e função `fullBolt`; offset 955315: intensidade de flash 1.5 | Relâmpagos são gerados em shader; flash afeta a exposição da cena no offset 1022485. Não há evidência de um pipeline geral de bloom só pelo nome de um parâmetro. |
| Glitch cromático no cursor | `BkkWIOyj.js`, offsets 735113–736800: shader calcula distância do cursor, desloca amostras R/G/B; `uStrength:.01`, `uFalloff:.2` | Distorção localizada, controlada por proximidade, em vez de tremor uniforme da tela. |
| Suavização do cursor | `BkkWIOyj.js`, offset 1007193: `uMouse.value.lerp(...,.15)` e interpolação de `uActive` com .15; espera de 200ms e decaimento por 400ms | Efeito acompanha o cursor com atraso e se dissolve quando o mouse para. |
| Luz interativa | `BkkWIOyj.js`, offset 975925: luz do cursor adicionada à câmera somente fora do viewport mobile; offsets 1000603 e 1003131 animam sua intensidade | O mouse participa da iluminação de objetos em estados específicos. |
| Overlays de imagem animada | `BkkWIOyj.js`, offsets 956000–961000: atlas, shaders de overlay e interpolação entre frames vizinhos | Sobreposições usam sequência de imagens e crossfade; não confundir todo efeito com geometria 3D. |
| Scroll amortecido | `BkkWIOyj.js`, offsets 768860–769350: duração 1.7, easing `1-Math.pow(1-r,5)`, wheel multiplier .7, limites de delta 50/140 e multiplicador 2.2 | Lenis regula diferenças entre trackpad e roda. `syncTouch:!1` mantém tratamento de toque distinto. |
| Movimento de interface | `default.DUsKC7Nt.css`: logo .45s `cubic-bezier(.16,1,.3,1)`; menu entra .35s e links escalonados de .05 a .30s | Pequenas durações e curvas de desaceleração complementam a lentidão atmosférica da cena. |
| Loader com abertura | Mesmo CSS: dois painéis de aproximadamente 50% da altura, transformações `--frame-up-transition`/`--frame-down-transition`; onda com `mix-blend-mode:difference` | Entrada funciona como cortina, acompanhada de identidade gráfica, progresso e opções de música. |
| Cuidados de execução | `BkkWIOyj.js`, offset 1019447, interrompe avanço de animação se `document.hidden`; offset 953931 distingue mobile/low-end | Há adaptações de execução, mas não comprovam desempenho em nosso catálogo. Não foi encontrado `prefers-reduced-motion` no bundle principal. |

## Não confundir com evidência válida

`draco_decoder.js`, `draco_wasm_wrapper.js` e `basis_transcoder.js` têm 1.684 caracteres e começam com `<!DOCTYPE`: são respostas HTML de fallback, não decodificadores JavaScript válidos. O código do app configura caminhos `/draco/` e `/basis/`, mas os arquivos locais com esses nomes não documentam suas implementações.

O bundle inclui Three.js (constante de revisão `183`) e código de bibliotecas. A ocorrência isolada de `fog`, `ShaderMaterial` ou `gsap` não foi usada como prova de um efeito; os achados acima apontam instanciações e configurações do app. Há uma galeria/tutorial embutida com descrições de shaders (offset 1044800), cuja explicação é consistente com os shaders efetivamente incluídos, mas pode representar conteúdo demonstrativo.

## Inferências e proposta de adaptação ao e-commerce

- A identidade obscura resulta da combinação de preto, contraste contido, materiais molhados, luz pontual e movimento. Copiar apenas `background:#000` produziria uma referência superficial.
- Usar preto e carvão próprios da marca, texto principal claro e divisórias discretas. Metadados podem ser secundários, preservando contraste de leitura e foco visível.
- Reservar a cena mais atmosférica para a abertura institucional ou About Us; a área de catálogo precisa mostrar fielmente material, cor, preço e controles do produto.
- Uma luz suave ou deslocamento cromático pequeno pode aparecer na marca, hero ou campanha. Não aplicar glitch sobre preço, disponibilidade, inputs ou checkout.
- Tratar chuva, trovão e áudio como linguagem específica de Avara, não requisito do nosso site. O princípio transferível é iluminação seletiva e profundidade; os assets e símbolos devem ser originais.
- Implementar versões estáticas e redução de movimento para os efeitos que adotarmos. A ausência da string no bundle analisado não demonstra o comportamento completo do site em todos os dispositivos.

## Limites

Sem execução visual nesta análise: estados, ordem narrativa e percepção exata de brilho dependem de renderização e assets externos. Não foi avaliada licença dos arquivos, disponibilidade dos modelos/texturas ou autorização de reprodução. O material serve para entender mecanismos e formular uma implementação própria.
