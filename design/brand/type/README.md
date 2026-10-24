# Black Hem Display — 0.1

Fonte própria de títulos para a BLACK HEM. Primeira versão funcional, para avaliação de desenho e uso em protótipos.

## Arquivos

- `fonts/black-hem-display-regular.woff2`: fonte web, aproximadamente 7 KB.
- `fonts/black-hem-display-regular.ttf`: fonte instalável em programas de design.
- `black-hem.css`: declaração `@font-face` e classes de uso.
- `specimen.html`: página interativa com tamanho, espaçamento, alfabeto e comparação entre texto e logo original.
- `sources/glyphs.json`: contornos editáveis e avanços horizontais em unidades de fonte.
- `sources/svg/`: exportações vetoriais individuais; `BLACKHEM-logo.svg` preserva a composição do nome da prancha aprovada.
- `qa-specimen.png` e `validation.json`: amostra renderizada e resultado da verificação técnica.

## Desenho

As oito letras de BLACK HEM foram isoladas e vetorizadas da prancha aprovada, sem usar contornos de uma fonte comercial. As letras restantes, números e pontuação foram construídos para expandir essa linguagem. Essa expansão é uma proposta inicial: ainda precisa de ajuste óptico e revisão de consistência, especialmente nos encontros de letras e terminais.

O desenho usa formas maiúsculas. Digitar minúsculas produz as mesmas formas; esta versão não possui um conjunto separado de minúsculas. Há A–Z, 0–9, pontuação essencial, caracteres latinos acentuados e composição de acentos. Não possui cobertura Unicode geral, todos os símbolos monetários, itálico, outros pesos, eixos variáveis ou hinting manual.

Use em marca, títulos e chamadas a partir de aproximadamente 48 px. A amostra inclui 32 px para avaliar os limites, não como recomendação. Para corpo, botões, preços, códigos e informações de produto, use a fonte de leitura do site. Preserve espaço vertical para as pontas; não recorte o texto com `overflow: hidden`.

## Uso web

Copie esta pasta, ou ajuste os caminhos ao mover os arquivos. O CSS resolve a URL da fonte relativamente ao próprio arquivo CSS.

```html
<link rel="stylesheet" href="/brand/type/black-hem.css">

<h1 class="black-hem-display">AFTER HOURS</h1>
<span class="black-hem-wordmark">BLACK HEM</span>
```

O texto exato `BLACK HEM`, com espaço comum e caixa alta, tem uma ligatura discricionária opcional que usa o contorno completo do logo. Ela é ativada apenas na classe `.black-hem-wordmark`. Assim, a marca preserva sua composição enquanto outros títulos continuam sendo texto editável. Não aplique espaçamento entre letras à classe de logo. O SVG é uma alternativa apropriada quando a reprodução fixa da marca for mais importante que o uso como fonte.

Se implementar CSS próprio:

```css
@font-face {
  font-family: "Black Hem Display";
  src: url("/fonts/black-hem-display-regular.woff2") format("woff2");
  font-weight: 400;
  font-style: normal;
  font-display: swap;
}

.brand-title {
  font-family: "Black Hem Display", Georgia, serif;
  font-weight: 400;
  font-synthesis: none;
  line-height: 1.4;
}
```

O único peso é 400, embora o desenho seja visualmente pesado. Evite negrito ou itálico sintetizado pelo navegador.

## Prévia e reconstrução

Na raiz do repositório:

```sh
bun design/brand/type/scripts/serve.ts
# Abra http://127.0.0.1:4389/

bun design/brand/type/scripts/build.ts
bun design/brand/type/scripts/validate.ts
```

Bun é o ponto de entrada dos scripts. O processo de engenharia de fontes usa Python com FontTools, Brotli, OpenCV e NumPy já disponíveis neste ambiente; a verificação visual usa Pillow com suporte a RAQM/HarfBuzz. Não há dependência dessas ferramentas no navegador.

O build normal lê `sources/glyphs.json`, preservando alterações manuais. `--refresh-sources` recria esse arquivo a partir da prancha e das construções iniciais, substituindo alterações nos contornos; não use essa opção após refinamentos manuais sem guardar sua versão. Os SVGs são exportações: edite o JSON para que mudanças entrem no build, ou incorpore um importador vetorial em uma evolução do processo.

## Validação e limites

A validação verifica cobertura declarada, reabertura de TTF/WOFF2, limites verticais, métricas, kerning, ligatura do logo e acentos compostos/decompostos. O espécime foi inspecionado visualmente. Não houve validação no navegador: não havia navegador conectado à ferramenta de automação nesta sessão. A página interativa fica pronta para essa revisão.

Reconhecimento, exclusividade e leitura pelo público não foram medidos. A versão 0.1 não substitui revisão tipográfica final em produção. A fonte não foi instalada no sistema nem integrada ao aplicativo nesta etapa.

## Direitos

Copyright 2026 Eduardo Augusto Lima Bueno. Todos os direitos reservados. Fonte proprietária para projetos BLACK HEM; nenhuma licença de redistribuição a terceiros é concedida. Não inclui contornos de fontes de terceiros. Esta declaração não substitui pesquisa de disponibilidade de marca ou análise jurídica.

Documentação técnica consultada: [FontBuilder](https://github.com/fonttools/fonttools/blob/main/Lib/fontTools/fontBuilder.py), [OpenType features](https://github.com/fonttools/fonttools/blob/main/Doc/source/feaLib/index.rst) e [WOFF2](https://github.com/fonttools/fonttools/blob/main/Lib/fontTools/ttLib/woff2.py), via Context7.
