---
title: "LGPD (Lei 13.709/2018): Conformidade"
tags:
  - compliance
  - lgpd
status: living
created: 2026-08-10
updated: 2026-08-12
---

# LGPD: Lei Geral de Proteção de Dados (Lei 13.709/2018)

Nota dedicada à lei e ao plano de conformidade do projeto. Existe porque o
sistema passou a tratar dado pessoal de verdade a partir de
[[03-Modules/IdentityAccess|IdentityAccess]] (login do painel), antes disso
o projeto não tinha nenhum dado identificável de pessoa natural em repouso.

> [!info] A LGPD não é "só sobre cliente"
> A lei se aplica a **qualquer** tratamento de dado pessoal de pessoa natural
> identificável feito no Brasil (ou por empresa que oferece serviço a pessoas
> no Brasil), **independentemente de o titular ser cliente final,
> colaborador ou operador interno do painel**. Os usuários de
> [[03-Modules/IdentityAccess]] (quem faz login pra curar produto/derrubar o
> kill switch) são titulares de dado pessoal como qualquer outro: nome,
> e-mail e (indiretamente) padrão de acesso ao sistema.

## Conceitos da lei usados neste documento

- **Dado pessoal** (art. 5º, I): qualquer informação relacionada a pessoa
  natural identificada ou identificável. E-mail, nome e IP são dado pessoal.
- **Dado pessoal sensível** (art. 5º, II): origem racial/étnica, convicção
  religiosa, opinião política, saúde, vida sexual, dado genético/biométrico.
  **O projeto não trata, hoje, nenhuma categoria sensível**, ver
  [[#MediaTemplate e direito de imagem]] pra um caso
  limítrofe.
- **Titular**: a pessoa natural a quem o dado se refere.
- **Controlador**: quem decide o tratamento, aqui, a operação "Drops do
  Frost" (o projeto/negócio por trás deste repositório).
- **Operador**: quem trata dado em nome do controlador (ex.: Railway como
  hospedagem do banco).
- **Tratamento**: qualquer operação com dado pessoal: coleta, armazenamento,
  uso, acesso, eliminação etc. (art. 5º, X).
- **Base legal** (art. 7º): fundamento jurídico que autoriza o tratamento.
  Não é preciso consentimento pra tudo: existem outras 9 bases legais.
- **Encarregado / DPO** (art. 41): pessoa indicada pelo controlador como
  canal de comunicação entre controlador, titulares e ANPD. **Item de
  processo, não de código**, ver checklist abaixo.
- **ANPD**: Autoridade Nacional de Proteção de Dados, órgão fiscalizador.

## Inventário de dado pessoal do sistema

Levantamento por módulo: é isto que funciona como o "Registro das
Operações de Tratamento" (ROPA, art. 37) do projeto até ter algo mais formal.

| Módulo | Dado pessoal tratado | Onde fica | Base legal aplicável | Status |
|---|---|---|---|---|
| [[03-Modules/IdentityAccess]] | Nome, e-mail, hash de senha, token de sessão | tabelas `users`/`sessions` (Postgres na Railway) | Execução de contrato/vínculo (art. 7º, V): usuário é operador interno, não cliente | E-mail criptografado; atualização e exclusão são operações da própria conta autenticada |
| [[03-Modules/LinkRedirect]] | Nenhum hoje (`click_logs` só tem `product_id` + `clicked_at`); planejado ganhar "métrificadores" (analytics/pixel) | tabela `click_logs` | N/A (se vier cookie/pixel de terceiro: consentimento, art. 7º, I) | OK hoje. Ver [[02-Decisions/ADR-0014-cookies-e-rastreamento-de-clique\|ADR-0014]] antes de adicionar qualquer tracking |
| [[03-Modules/Broadcast]] | Nenhum dado de terceiro persistido no banco do projeto (grupo de WhatsApp é gerido pelo próprio WhatsApp; `authState` do Baileys é credencial do número do bot, não dado de cliente) | `SessionStorage` (credencial do bot) | N/A | OK, ver [[#Broadcast e grupo de WhatsApp]] |
| [[03-Modules/CommentAssist]] | Potencialmente identificador de usuário do TikTok (manual, não persistido em banco pelo módulo) | Nenhuma tabela: fluxo manual | N/A | Baixo risco, ver nota no módulo |
| [[03-Modules/AffiliateSync]] | Nenhum dado de cliente hoje (integração é com API de afiliado, não com dado de comprador) | N/A | N/A | Revisar quando o módulo for de fato implementado, ver [[#AffiliateSync]] |
| [[03-Modules/MediaTemplate]] | Foto "lifestyle" de terceiro pode conter imagem que identifica pessoa | `FileStorage` (Cloudflare R2) | Curadoria humana obrigatória (já é regra do módulo) | Ver [[#MediaTemplate e direito de imagem]] |
| [[03-Modules/Catalog]] | Nenhum | N/A | N/A | OK |

## Decisão principal: criptografia de e-mail em repouso

E-mail de `users` deve ser armazenado **criptografado em repouso**, não em
texto plano. **Decidido: `RegisterUser` já nasce gravando e-mail
criptografado desde o primeiro registro**. Não há janela de dado legado em
texto plano nem migração posterior a fazer. Desenho técnico completo
(colunas, porta `Cipher`, estratégia de busca por igualdade) está em
[[02-Decisions/ADR-0013-lgpd-criptografia-de-email|ADR-0013]], esta nota só
resume o "porquê" jurídico:

- Art. 46 da LGPD exige "medidas de segurança técnicas e administrativas
  aptas a proteger os dados pessoais de acessos não autorizados". E-mail em
  texto plano numa coluna de banco é o cenário clássico de vazamento em caso
  de dump/backup exposto, injection, ou acesso indevido a réplica/backup.
  Senha já está protegida (`Bun.password`, argon2id, ver
  [[02-Decisions/ADR-0011-auth-caseiro-sem-supabase|ADR-0011]]); e-mail
  ficava sendo o dado identificável mais exposto do módulo.
- Nome **não** entra nesta rodada de criptografia. É exibido diretamente na
  UI do painel (menor sensibilidade isolada, maior custo de UX se
  criptografado). Revisar se o escopo do painel crescer (mais usuários,
  dado mais sensível associado ao nome).

## Direitos do titular (art. 18)

A lei garante ao titular, mediante requisição: confirmação de tratamento,
acesso, correção, anonimização/bloqueio/eliminação de dado desnecessário,
portabilidade, eliminação, informação sobre compartilhamento, revogação de
consentimento. O painel expõe operações autenticadas sobre a própria conta:

- [x] `UpdateUser`: corrige nome/e-mail a pedido do
      titular (art. 18, III).
- [x] `DeleteUser`: elimina o
      registro quando o vínculo do usuário com o painel acaba (art. 18, VI,
      combinado com art. 16, dado pessoal deve ser eliminado após o
      término do tratamento, salvo hipótese legal de retenção).
      **Atenção**: isso é o oposto da regra de "nunca deleção física" que
      vale para `Product` (ver [[07-NFR/Requisitos-Nao-Funcionais]]), soft
      delete indefinido de dado pessoal **não** é a postura correta sob
      LGPD; dado de `User` inativo deve ter rota de eliminação/anonimização
      real, não só um flag de status.
- [ ] Endpoint/fluxo pra titular (ou operador em nome dele) solicitar os
      dados guardados, pode ser manual no começo (o próprio dev responde
      via export SQL), não precisa ser self-service dia um.

## Retenção e eliminação

- `sessions.expires_at` implementa TTL e o repositório faz purge lazy ao ler
  sessão expirada. Sessões que nunca mais forem consultadas continuam de
  baixa prioridade; se uma limpeza em lote for necessária, reutilizar o
  scheduler da API em vez de criar um serviço dedicado.
- `users` são eliminados imediatamente pelo fluxo de exclusão. Backups têm
  retenção máxima de 30 dias e não são usados operacionalmente.

## Auditoria e registro de acesso

Art. 37 e boas práticas de segurança recomendam log de quem acessou/alterou
dado pessoal. Hoje não existe nenhum log de auditoria em nenhum módulo. Não
é bloqueante para o estágio atual (equipe pequena, poucos operadores), mas
deve virar item de backlog junto com o roadmap de
[[03-Modules/IdentityAccess]], ver [[05-Roadmap/_Index]].

## Hospedagem e operação

O Postgres é hospedado na Railway. Antes de produção, registrar a região do
projeto e, se fora do Brasil, a garantia de transferência internacional do
provedor (art. 33). As chaves ficam somente nos secrets da Railway e no
gerenciador de segredos de recuperação. Rotacionar em incidente ou anualmente;
rotação de cifra exige recriptografar e-mails, e rotação de HMAC exige
recalcular lookup hashes e invalidar sessões. O responsável pelo projeto atua
como encarregado/DPO provisório; publicar seu e-mail de contato na política de
privacidade antes de abrir o painel a operadores externos. Em incidente:
conter acesso, revogar sessões, rotacionar chaves, preservar evidências e
avaliar/notificar ANPD e titulares quando aplicável.

## Checklist de conformidade (vivo: marcar conforme avança)

### Técnico (código)
- [x] Criptografia de `users.email` em repouso: sem migração de dado legado;
       `Cipher` + `UserRepositorySql` implementados, ver
      [[02-Decisions/ADR-0013-lgpd-criptografia-de-email|ADR-0013]] e
       [[03-Modules/IdentityAccess#Pendências restantes]]
- [x] Expor `UpdateUser` (correção de dado a pedido do titular)
- [x] Expor `DeleteUser`/anonimização (eliminação de dado a pedido do titular
       ou fim de vínculo)
- [x] Purge lazy de sessão expirada durante consulta; limpeza de sessões
       nunca mais consultadas continua baixa prioridade
- [x] Senha nunca em texto plano nem reversível (`Bun.password`, argon2id)
- [x] Token de sessão guardado como hash (`KeyedHasher`), nunca em claro no
      banco

### Cookies e rastreamento (LinkRedirect)
- [ ] Definir se algum cookie será usado no link-in-bio (dedupe de
      clique, sessão) e classificar necessário vs. não-essencial:
      [[02-Decisions/ADR-0014-cookies-e-rastreamento-de-clique|ADR-0014]]
- [ ] Se pixel de terceiro (Meta/TikTok/Google) for adicionado: banner de
      consentimento que bloqueia o script até aceite explícito
- [ ] Política de cookies/privacidade publicada antes de qualquer pixel ir
      ao ar
- [ ] Decidir se o log de conexão do Marco Civil (art. 15) será
      implementado; se sim, tabela própria com TTL de 6 meses, separada de
      analytics de marketing
- [x] Contagem agregada de clique (`click_logs`) mantida sem identificador
      de visitante: não precisa de consentimento

### Infraestrutura/processo
- [ ] Registrar região do Postgres na Railway e garantia aplicável (art. 33)
- [x] Definir retenção de `users`/`sessions`
- [x] Definir rotação/backup de chaves
- [x] Designar encarregado/DPO provisório e canal de contato
- [x] Definir resposta a incidente de segurança (art. 48)

## Pontos de atenção por módulo

### LinkRedirect: cookies, pixel e "métrificadores" de clique

Decisão completa em [[02-Decisions/ADR-0014-cookies-e-rastreamento-de-clique|ADR-0014]].
Resumo: **contar clique não fere a LGPD; o risco entra com granularidade
de pessoa/dispositivo e com terceiro**:

- **Contagem agregada (o que existe hoje)**: `click_logs(product_id,
  clicked_at)`, sem identificador de visitante: **não é dado pessoal**,
  não precisa de base legal nem de banner de cookie. Incrementar esse
  contador é operação normal do produto, sem exposição LGPD.
- **Cookie próprio de dedupe/analytics** (ex.: "não contar dois cliques do
  mesmo visitante em 5 min"): um identificador de cookie **é** dado
  pessoal (torna o visitante identificável entre visitas), mesmo sendo só
  um UUID aleatório sem nome/e-mail atrelado. Se for estritamente
  necessário ao funcionamento (ex.: evitar contagem duplicada), pode se
  enquadrar como cookie necessário/legítimo interesse operacional, mas
  **cookie de marketing/remarketing não se enquadra nessa exceção**.
- **IP e user-agent completos por clique**: dado pessoal. Se guardado, tem
  que ter finalidade e retenção definidas, nunca "guardar tudo por via
  das dúvidas".
- **Pixel de terceiro (Meta Pixel, TikTok Pixel, Google
  Analytics/Ads)**: o mais delicado. Envia dado (IP, device, comportamento
  de clique, às vezes e-mail/telefone hasheado via *Advanced Matching*)
  pra servidor de outro controlador, fora do Brasil, combina **dois**
  problemas de uma vez: (a) compartilhamento de dado pessoal com terceiro
  controlador sem base legal robusta se disparado sem consentimento, e (b)
  transferência internacional (art. 33). **Não dispara antes de
  consentimento explícito do visitante**, ver ADR-0014.
- **Obrigação do Marco Civil da Internet** (Lei 12.965/2014, art. 15): se o
  link-in-bio for entendido como "aplicação de internet" de pessoa
  jurídica, existe obrigação (não escolha) de guardar registro de acesso
  (IP + timestamp) por 6 meses, sob sigilo, só liberável por ordem
  judicial. **Isso é diferente de analytics de marketing**, se for
  implementado, fica numa tabela própria com TTL de 6 meses e nunca é
  reaproveitado pra perfilamento publicitário (princípio da finalidade,
  art. 6º, I).

**Regra prática pra qualquer "métrificador" novo nesta página**: antes de
adicionar, perguntar (1) esse dado identifica o visitante, sozinho ou
combinado? (2) algum terceiro recebe esse dado? Se sim pra qualquer um dos
dois, precisa de consentimento explícito antes de carregar o
script/gravar o cookie, não é opcional nem "padrão de mercado
suficiente".

### Broadcast e grupo de WhatsApp

O bot participa de um único grupo de WhatsApp, não há tabela de contato
individual de membro do grupo no banco do projeto. O próprio WhatsApp expõe
número de telefone dos membros do grupo entre si (comportamento nativo do
app, fora do controle deste sistema), isso é responsabilidade de produto
(considerar grupo "broadcast-only"/anúncio, onde só admin posta, que reduz
exposição de número entre membros), não um gap de código deste projeto.

### AffiliateSync

Módulo ainda não implementado. Quando for construído, revisar se a API de
afiliado (Shopee etc.) retorna dado de comprador (ex.: em relatório de
comissão por pedido), se sim, esse dado entra no inventário desta nota
antes do módulo ser considerado "pronto" (ver
[[08-DoD/Definition-of-Done]]).

### MediaTemplate e direito de imagem

Já registrado como risco de produto em
[[06-Risks/Riscos-Conhecidos]] (direito de imagem em foto "lifestyle").
Sob a LGPD, imagem que permite identificar uma pessoa é dado pessoal (não
necessariamente sensível, a menos que revele categoria do art. 5º, II).
Curadoria humana obrigatória (regra já existente do módulo) cobre a parte
de direito de imagem; a parte LGPD adicional é: se o projeto vier a
reter essas fotos de forma associável a uma pessoa identificável de forma
duradoura, isso também entra no inventário de dado pessoal.

### CommentAssist

Fluxo é manual (operador lê comentário, copia resposta), o módulo em si
não persiste identificador de usuário do TikTok em nenhuma tabela (ver
[[03-Modules/CommentAssist]]). Baixo risco enquanto isso não mudar; revisar
se o módulo ganhar qualquer forma de log/histórico de comentário atendido.

## Ver também

[[02-Decisions/ADR-0013-lgpd-criptografia-de-email]] ·
[[02-Decisions/ADR-0014-cookies-e-rastreamento-de-clique]] ·
[[03-Modules/IdentityAccess]] · [[03-Modules/LinkRedirect]] ·
[[06-Risks/Riscos-Conhecidos]] · [[07-NFR/Requisitos-Nao-Funcionais]]
