# SSR, streaming e loader BLACK HEM

2026-10-19. Direção solicitada: priorizar SSR + Suspense nas leituras da API,
inclusive na home; usar o título da hero pulsando por cor e preservar sua entrada.

- `src/lib/server/api.ts` concentra leituras sem cache e timeout. Cookies são
  encaminhados somente nas leituras privadas. API_URL não vai para o navegador.
- `CatalogServer` lê filtros e resultados em paralelo. `AdminServer` autoriza a
  sessão antes de ler a seção; os dados independentes da seção rodam em paralelo.
- URL representa filtros/página da home e aba/página/editor/outfit do admin.
  Navegação e refresh solicitam novos Server Components; os formulários de
  gravação continuam nos endpoints de mutação já existentes.
- `ApiBoundary` mantém a camada GSAP fora da área suspensa para que ela hidrate
  durante a requisição. O conteúdo assíncrono fica dentro de Suspense; `ApiContent`
  confirma seu commit e encerra o loader. Só usar o componente animado em fallback
  não iniciou seus hooks enquanto o segmento de servidor estava pendente no teste.
- `BrandLoader` usa a mesma fonte, texto e escala da hero. SplitText separa
  palavras/caracteres; GSAP alterna cinza #625f59 e osso #ece9e2 com stagger,
  repeat e yoyo. useGSAP/matchMedia revertem animação e DOM ao desmontar.
- `HeroIntro` aguarda dados e fonte. A timeline existente de B/H abrindo para
  BLACK HEM permanece em `HeroTitle`, seguida pelas revelações existentes.
  Movimento reduzido elimina pulsação e transformação, sem espera artificial.

A paginação da home agora é por páginas de 24 peças, com Anteriores/Próximas,
para representar a leitura no servidor e restaurar a seleção pelo histórico.
Erros da API encerram a espera e oferecem retry por SSR.

Validação automatizada em `.harness/admin/check.ts`: servidor Next de produção
contra uma API HTTP isolada, sem acesso ao banco de dados real. O teste inspeciona
o stream e a presença dos produtos no HTML antes de verificar a interface com
Chromium; a mera presença no HTML não afirma que a aplicação funcione sem JS.

Resultado: build padrão Turbopack, TypeScript e Biome aprovados; 13 testes de
catálogo, proxy e componentes passaram. O teste HTTP/Chromium passou para todos
os fluxos descritos, sem erros JavaScript e sem GETs de dados da API no navegador.
Capturas desktop, mobile e da pulsação foram inspecionadas em `.harness/admin/`.

O teste integrado identificou e cobriu uma correção no proxy: validar Origin
contra o Host recebido, pois Next pode normalizar a URL interna para localhost
mesmo quando o navegador acessa 127.0.0.1. O bloqueio de origens diferentes continua
coberto por teste. Não houve validação contra PostgreSQL/contas reais nesta etapa.

## Alinhamento vertical do preloader

O BH usa a mesma origem vertical da hero: altura do header (5rem) mais o
espaçamento acima do título (1.5rem). As medidas ficam em `:root` como
`--site-header-height` e `--hero-title-gap`, compartilhadas pelo header, hero e
loader. O loader mantém a centralização horizontal, sem centralizar no eixo Y
pela altura da janela. As variáveis de layout ficam fora de `@theme` para serem
emitidas no CSS. O harness compara as posições no desktop e no mobile.

Atualização: removida a pulsação a pedido do usuário. O preloader agora mostra
BH estático na cor osso, sem hooks, SplitText ou GSAP. A animação de abertura da
hero continua intacta. O alinhamento vertical compartilhado permanece.

Atualização de arquitetura: os antigos acessos em `src/lib/server/api.ts` foram
substituídos pela DAL `server-only` em `src/data/`. Componentes só recebem DTOs;
mutações usam Server Actions finas. Route Handlers também delegam à DAL. Consulte
`docs/data-access-layer.md` para autorização, validação e tratamento de sessão.
