# Setup do bot de Instagram com Meta

Verificado em 24/10/2026. Status: API de campanhas, regras, webhooks, worker, persistência implementados e verificados com testes sintéticos/PostgreSQL isolado. Ativação inicial por token configurado no servidor, para uma conta profissional. OAuth no dashboard e renovação automática ainda não implementados. Nenhuma conta Meta real foi conectada nem mensagem real enviada nesta etapa.

Referência: [fork Benion](https://github.com/eduardoaugustolb/benion), upstream `c291f10213c2972eefd0da287df15ca52e820a33`. A implementação foi adaptada à arquitetura TypeScript/PostgreSQL do Hub; [atribuição e licença MIT](../../THIRD_PARTY_NOTICES.md).

## Arquitetura implementada

- Domínio: `InstagramCampaign` controla gatilhos exatos, conflitos, números por post, templates e pausa, sem dependência da Meta ou do banco.
- Aplicação: `ManageInstagramCampaigns` autoriza administradores e gerencia configuração/prévia; `ProcessInstagramEvent` resolve outfits e coordena ações; `InstagramWorker` consome eventos duráveis.
- Portas: `InstagramGateway`, `InstagramRepository`, `OutfitLinkCatalog` e `InstagramWebhookVerifier`.
- Adaptadores: `MetaInstagramGateway` usa a API oficial; `InstagramWebhook` valida bytes originais e normaliza eventos; `InstagramRepositorySQL` mantém campanhas/inbox/ledger; `StorefrontOutfitLinkCatalog` reutiliza a consulta pública do catálogo.
- HTTP: `InstagramRestController`; composição em `src/main.ts`. A assinatura é validada antes do parse do webhook.

Campanhas são únicas por conta/post; a conta possui uma campanha de DM com várias regras. O worker inicia somente após confirmar que o token pertence ao `INSTAGRAM_ACCOUNT_ID` configurado.

## Fluxo proposto para o Affiliate Hub

Requisitos definidos: o administrador cadastra no dashboard os links dos posts/reels que serão monitorados, os triggers e as ações do bot. O bot pode responder publicamente ao comentário e/ou enviar os links por DM. Também haverá regras próprias para mensagens recebidas na DM.

| Entrada | Resultado padrão configurável |
| --- | --- |
| Comentário `links` | Enviar em uma DM os links de todos os outfits associados à publicação |
| Comentário `Link 01` | Enviar o link do outfit associado ao número `01` naquela publicação |
| Comentário correspondente a uma regra | Responder publicamente, enviar DM ou executar ambas as ações, conforme configuração |
| DM recebida correspondente a uma regra | Responder na conversa com o texto/links configurados, dentro da janela permitida |

`01` é um número de apresentação por publicação, não o ID global do outfit. O catálogo já possui outfits e a API `GET /storefront/outfits/:code` retorna JSON. No frontend, `/o/[outfitCode]` resolve para a página do outfit: usar esse link público nas mensagens, com o domínio real da loja. Não enviar o endpoint JSON da API.

### Dashboard: posts monitorados

1. Configurar a conta profissional no servidor e consultar o estado pela API. Login OAuth no dashboard permanece uma evolução futura.
2. Colar uma URL de post/reel do Instagram. Validar formato, identificar a mídia pela API oficial entre as mídias acessíveis da conta conectada e guardar seu `media_id` e permalink. Não usar scraping nem presumir que o shortcode da URL seja um `media_id`.
3. Mostrar a publicação encontrada para confirmação visual. Se a URL não puder ser resolvida ou pertencer a uma conta sem autorização, explicar o motivo e impedir a ativação.
4. Associar outfits do catálogo, ordenar e atribuir números únicos (`01`, `02` etc.) dentro desse post.
5. Configurar regras e ativar/pausar o monitoramento individualmente. Permitir editar, remover e listar posts com seu status e última atividade.

Cadastrar URL não concede acesso a posts de terceiros. A assinatura de webhook acontece no app/conta; o backend filtra os eventos pelos `media_id` cadastrados e ativos. Posts não cadastrados devem ser ignorados.

### Dashboard: triggers e ações

Cada regra deve ter nome, estado ativo/pausado, origem (`comentário` ou `DM recebida`), expressões/aliases de disparo, modo de correspondência e ação. Para comentários, vincular a regra a um post monitorado. Para DMs, configurar regras da conta com destino explícito: uma DM isolada não identifica a publicação nem qual é o outfit `01`.

Ações configuráveis:

- Resposta pública ao comentário, com template editável, por exemplo `Enviei os links na sua DM!`.
- Resposta privada ao comentário com texto livre, link de um outfit ou lista dos outfits do post.
- Resposta a uma DM recebida com texto/link/lista definidos na própria regra.

Templates podem ter variáveis documentadas por ação, como `{numero}`, `{nome}`, `{url}` e `{lista_outfits}`. Validar variáveis e tamanho antes de ativar; mostrar prévia e simulador de comentário/DM. Se o texto público confirmar o envio privado, publicar essa confirmação somente após sucesso confirmado da DM. Registrar cada ação separadamente para não repetir uma DM se apenas a resposta pública falhar.

Padrão de correspondência: expressão completa, sem distinguir maiúsculas/minúsculas, removendo espaços externos e reduzindo espaços repetidos. Assim ` LINKS ` e `link 01` funcionam, sem disparar em `não quero links`. Aliases como `link 1` podem ser cadastrados. Impedir regras conflitantes no salvamento e executar no máximo uma regra por evento. Gatilho desconhecido, número ausente, outfit indisponível ou post pausado não deve produzir envio; registrar o motivo.

Regras devem ser persistidas no backend com autorização administrativa. Disponibilizar histórico de ações, falhas, reconexão e um botão geral de pausa. Validar novamente a regra e o destino antes do envio, para respeitar alterações feitas após o recebimento do evento.

Uma lista de outfits deve caber em uma única resposta privada inicial. Se ultrapassar o limite da Meta, impedir a ativação até ajustar o template/seleção ou configurar um link de coleção existente. Não dividir automaticamente em várias DMs iniciais. O envio manual de DM no dashboard, se oferecido, também deve validar elegibilidade e janela; cadastrar um usuário não autoriza contato irrestrito.

## 1. Preparar conta e aplicação Meta

1. Usar uma conta Instagram profissional, Business ou Creator. Conta pessoal comum não atende este fluxo da API.
2. No [Meta for Developers](https://developers.facebook.com/), criar uma aplicação com o caso de uso/produto Instagram disponível no painel e selecionar **Instagram API with Instagram Login**.
3. Adicionar a conta profissional para os testes e aceitar os convites/papéis exigidos pelo painel. Começar com a conta administrada pelo proprietário do app.
4. Registrar uma URL HTTPS pública de webhook. Callback OAuth será necessário quando o login pelo dashboard for implementado. Localhost sozinho não recebe eventos da Meta; desenvolvimento precisa de um túnel HTTPS ou ambiente de teste publicado.
5. Registrar domínio, contato, política de privacidade e instruções/endpoint de exclusão de dados conforme exigido pelo painel para disponibilizar a aplicação.

Instagram Login permite esse caminho sem depender de uma Página Facebook vinculada. Não misturar com o setup **Facebook Login**, que usa permissões, tokens e host diferentes. Referência: [visão geral da plataforma](https://developers.facebook.com/documentation/instagram-platform/overview).

## 2. Solicitar as permissões mínimas

| Função | Permissões com Instagram Login |
| --- | --- |
| Identificar a conta conectada | `instagram_business_basic` |
| Receber comentários e enviar a primeira resposta privada ao comentário | `instagram_business_basic`, `instagram_business_manage_comments` |
| Receber DMs e responder à conversa | `instagram_business_basic`, `instagram_business_manage_messages` |

O escopo definido inclui comentários, respostas públicas, respostas privadas e regras para DMs recebidas: solicitar as três permissões acima. Publicar posts é outra capacidade e não faz parte deste bot.

Fontes: [webhooks e permissões](https://developers.facebook.com/documentation/instagram-platform/webhooks), [requisitos de respostas privadas](https://developers.facebook.com/documentation/instagram-platform/private-replies).

## 3. Login e tokens

### Ativação inicial suportada

Obter no painel Meta um token Instagram da conta profissional autorizada, com as permissões da seção anterior. Guardá-lo no ambiente privado do backend como `INSTAGRAM_ACCESS_TOKEN`, junto ao ID canônico da conta (`user_id` de `/me`), segredo do app, verify token e versão da API habilitada no painel. Não usar o ID app-scoped `id` como substituto automático de `user_id`.

O token não é retornado pelos endpoints administrativos. O backend verifica a identidade antes de iniciar o consumo de eventos. Token inválido/conta divergente impede o startup com Instagram habilitado; renovar/reautorizar no painel e atualizar o secret para recuperar. A renovação automática ainda não é feita pelo worker.

### Evolução futura: OAuth

Para conectar contas pelo dashboard, ainda será necessário implementar o [Business Login for Instagram](https://developers.facebook.com/documentation/instagram-platform/instagram-api-with-instagram-login/business-login):

1. Somente um administrador autenticado do Hub pode iniciar a conexão.
2. Redirecionar para `https://www.instagram.com/oauth/authorize` com o Instagram App ID exibido no painel, callback registrado, `response_type=code`, scopes necessários e `state` aleatório vinculado à sessão.
3. No callback, validar `state` e trocar o código no servidor, usando o segredo do app. Não enviar segredo ou token ao navegador.
4. Obter o token de longa duração e guardar o identificador da conta, permissões concedidas e expiração retornada.
5. Agendar renovação antes do vencimento. A documentação prevê renovação por mais 60 dias quando o token tem pelo menos 24 horas, ainda é válido e mantém `instagram_business_basic`. Token expirado exige nova autorização.
6. Disponibilizar desconexão e sinalizar token revogado/expirado no painel.

Armazenar tokens protegidos no servidor, sem incluí-los em logs ou no Git. Para várias contas, persistir conexão por conta, em vez de usar um único token global.

## 4. Configurar webhooks

Rotas disponíveis:

| Rota | Responsabilidade |
| --- | --- |
| `GET /integrations/instagram/status` | Consultar identidade, restrito ao administrador |
| `GET /integrations/instagram/campaigns` | Listar campanhas da conta |
| `PUT /integrations/instagram/campaigns/:id` | Criar/substituir configuração e validar post/outfits |
| `DELETE /integrations/instagram/campaigns/:id` | Remover campanha, preservando ledger de envios |
| `POST /integrations/instagram/preview` | Simular regra sem enviar nada |
| `GET /integrations/instagram/history` | Consultar até 100 eventos/resultados recentes |
| `GET /webhooks/instagram` | Validar `hub.mode`, `hub.verify_token` e devolver `hub.challenge` em texto |
| `POST /webhooks/instagram` | Validar assinatura, persistir evento e confirmar recebimento |

Endpoints administrativos exigem cookie de sessão de administrador, como o restante da API. São registrados quando `INSTAGRAM_ENABLED=true`. Rotas de OAuth `/connect` e `/callback` não existem ainda.

Exemplo de configuração para `PUT /integrations/instagram/campaigns/<id-estavel>`:

```json
{
  "name": "Looks do reel",
  "enabled": false,
  "source": "comment",
  "postUrl": "https://www.instagram.com/reel/SHORTCODE/",
  "outfits": [{ "number": "01", "code": "OUT-AAAAAAAAAAAAAAAA" }],
  "rules": [
    { "triggers": ["links"], "target": "all", "privateReply": "{lista_outfits}", "publicReply": "Enviei os links na DM!" },
    { "triggers": ["Link 01", "link 1"], "target": "01", "privateReply": "{nome}: {url}" }
  ]
}
```

Criar pausada, usar a prévia e depois salvar com `enabled: true`. Para prévia, enviar `{ "configuration": <configuração>, "text": "Link 01" }`. Para regras de DMs recebidas, usar `source: "message"`, `postUrl: null` e apenas `privateReply`; os outfits são explícitos nessa campanha da conta. A prévia funciona mesmo com campanha pausada. Não há endpoint para disparar DMs arbitrárias fora de um evento recebido.

No painel Meta, cadastrar callback e verify token; assinar `comments`. Para conversas, assinar também `messages`. Além da configuração do app, concluir a assinatura da conta profissional para o app, conforme o fluxo de `subscribed_apps` da versão escolhida. Conferir ambas as etapas se o teste do painel funciona, mas comentários reais não chegam.

O verify token é um segredo escolhido pelo Hub para o handshake; não é o access token. No POST, verificar `X-Hub-Signature-256` com HMAC SHA-256 sobre os bytes originais do corpo, usando o segredo correspondente ao app configurado, antes de processar JSON. Comparar assinaturas em tempo constante.

O handler deve confirmar rapidamente depois de gravar o evento de forma durável. Um worker processa o envio. A Meta pode reenviar eventos: usar unicidade por conta/comentário/ação, ignorar ecos e eventos da própria conta, e não enviar mensagens novamente quando um webhook duplicado chegar. Não confirmar sucesso antes de persistir; se a persistência falhar, permitir nova entrega.

Referência: [Instagram Webhooks](https://developers.facebook.com/documentation/instagram-platform/webhooks).

## 5. Executar a regra e responder

1. Validar conta conectada e origem. Para comentários, exigir publicação cadastrada e ativa; para DM, ignorar ecos e identificar a conversa elegível.
2. Encontrar a regra configurada no dashboard e seu destino. Em `links`, montar a lista ordenada; em `Link 01`, buscar o outfit numerado `01` no post. Em DMs, usar a associação explícita da regra da conta.
3. Consultar os outfits e montar os links públicos da loja. Outfit excluído ou sem conteúdo público disponível não deve gerar uma mensagem de compra válida. Não inferir o destino a partir de um número global.
4. Enviar a resposta privada pelo host `graph.instagram.com`, com versão fixada e suportada no painel, token Instagram da conta e ID do comentário como destinatário.

Contrato documentado pela Meta:

```http
POST https://graph.instagram.com/{API_VERSION}/{IG_USER_ID}/messages
Authorization: Bearer {INSTAGRAM_ACCESS_TOKEN}
Content-Type: application/json

{
  "recipient": { "comment_id": "ID_DO_COMENTARIO" },
  "message": { "text": "Outfit 01: https://loja.seu-dominio/o/OUT-0000000000000001" }
}
```

Guardar o `message_id` retornado e o estado do envio. Timeout após envio é resultado incerto: reconciliar antes de repetir, pois deduplicação do webhook não garante que um POST remoto repetido não duplique a ação. Tratar expiração de token, limites de uso e erros transitórios separadamente; respeitar as instruções de retry da API e não repetir erros permanentes.

Limites documentados: apenas uma resposta privada inicial por comentário; em post/reel, envio dentro de 7 dias do comentário. Em Live, somente durante a transmissão. Mensagens seguintes dependem de resposta do destinatário e devem respeitar a janela de 24 horas dessa resposta. O comentário não autoriza uma sequência irrestrita de DMs. Fonte: [Private Replies](https://developers.facebook.com/documentation/instagram-platform/private-replies).

## 6. Configuração prevista no backend

Aplicar a migration e configurar o backend antes de habilitar. Não alterar o `.env` do frontend com credenciais Meta.

```dotenv
INSTAGRAM_ENABLED=true
INSTAGRAM_ACCOUNT_ID=preencher_com_user_id_canonico
INSTAGRAM_ACCESS_TOKEN=preencher_no_servidor
INSTAGRAM_APP_SECRET=preencher_no_servidor
INSTAGRAM_WEBHOOK_VERIFY_TOKEN=segredo_aleatorio_exclusivo
INSTAGRAM_GRAPH_API_VERSION=preencher_com_versao_suportada
STOREFRONT_BASE_URL=https://loja.seu-dominio
```

```bash
cd api-ts
bun run migrate
bun run dev
```

Sem `INSTAGRAM_ENABLED=true`, o catálogo continua funcionando e as rotas/worker Instagram não são registrados. `STOREFRONT_BASE_URL` deve ser a origem HTTPS do frontend, sem path/query/credenciais. A versão Graph precisa ser explícita no formato `vNN.0`; escolher a versão suportada pelo app no painel, sem copiar cegamente exemplos de documentação.

Não usar prefixo `NEXT_PUBLIC_` para esses segredos. A primeira versão usa secrets do processo; não persiste tokens em tabelas de campanhas. A migration cria `instagram_campaigns`, `instagram_events` e `instagram_sends`. O payload inteiro da Meta não é armazenado, apenas os campos necessários do evento.

O histórico usa `accepted` para aceite da API, não entrega/leitura. `unknown` e `inflight` bloqueiam repetição automática permanentemente: investigar o resultado na Meta antes de qualquer recuperação manual. Não apagar ledger para desbloquear uma campanha. Eventos com falha de leitura/persistência podem ser retomados por lease com até cinco tentativas e backoff; isso não autoriza repetir um envio externo incerto. O worker não faz polling de comentários: configurar `comments` e `messages` nos webhooks é obrigatório.

## 7. Teste e disponibilização

- Conferir handshake válido e recusa de verify token inválido.
- Conferir assinatura válida e recusa de assinatura ausente/adulterada usando o corpo original.
- Cadastrar uma URL de post da conta, associar outfits e ativar as regras; recusar URL inválida, duplicada ou de mídia sem acesso.
- Comentar `links` e `Link 01`; verificar a lista e o outfit correto. Em outro post, `01` deve respeitar o mapeamento daquele post.
- Conferir resposta pública, DM e ambas, incluindo confirmação pública apenas depois do sucesso privado.
- Testar regra de DM recebida com destino explícito e janela válida.
- Reentregar o mesmo evento e verificar ausência de novo envio; testar eventos em lote.
- Testar gatilho desconhecido, número não configurado, outfit removido, regra/post pausado, token expirado e reinício do worker com eventos pendentes.
- Se DMs forem habilitadas, ignorar ecos e respeitar a janela de conversa.
- Antes de abrir para contas de terceiros, conferir no painel **Advanced Access/App Review** e eventual verificação empresarial para as permissões solicitadas. Acesso de desenvolvimento/Standard Access a contas com papéis no app não comprova liberação para terceiros.

Preparar demonstração gravada do fluxo e instruções reproduzíveis para revisão. A ativação depende do app Meta, conta, domínio HTTPS, credenciais e aprovação aplicável. Ainda não houve teste ponta a ponta contra a Meta.

## 8. Entregue e próximas etapas

- Adaptador HTTP Meta com host/versão configurados e tratamento de erros.
- Configuração inicial segura por token da conta; OAuth administrativo e renovação automática permanecem pendentes.
- Controller de webhook com acesso ao corpo bruto para assinatura.
- Inbox/outbox persistente e worker com deduplicação, retries e estados de resultado incerto.
- Persistência de posts monitorados, associação numerada de outfits, triggers, templates e ações por origem.
- API para o dashboard: cadastro por URL, regras, prévia, pausa por campanha e histórico. A tela administrativa será entregue em uma PR dependente.
- Resolução oficial de URL para mídia da conta e filtro por `media_id` nos eventos.
- Casos de uso de comentário → regra → resposta pública/privada e DM recebida → regra → resposta na conversa.
- Adaptadores para resposta pública, resposta privada ao comentário e resposta à DM recebida.
- Testes de assinatura, autorização administrativa, escopo por post, conflitos de gatilhos, duplicação, outfit indisponível e falhas parciais das ações.

Pendentes de operação: credenciais do proprietário, domínio HTTPS com acesso ao webhook, assinatura da conta no app Meta, liberação aplicável e teste acompanhado com a conta real. Pausa global dedicada, seletor de mídias em vez de URL, múltiplas contas e reconciliação administrativa de envios incertos são evoluções futuras. Não foram incluídos agendamento de Reels, geração por IA ou inbox generativo do Benion.

## Evidências de verificação

- TDD: testes de gatilhos, regras, processamento, gerenciamento e corpo HTTP bruto foram executados falhando antes da implementação e passaram depois.
- 42 testes Instagram passaram: domínio, casos de uso, transporte Meta simulado, assinatura/normalização, HTTP e PostgreSQL real isolado, com 138 assertions.
- Suíte completa da API com PostgreSQL e HTTP isolados: 637 testes passaram, nenhum falhou e um teste Redis foi pulado por depender de instância própria. As três expectativas antigas de produtos foram atualizadas para incluir `imageUrls`, campo já existente no contrato.
- TypeScript e Biome da API passaram. A interface administrativa será verificada na PR correspondente; estes testes não comprovam operação com a conta Meta real.

Para repetir a parte PostgreSQL, apontar `INSTAGRAM_TEST_DATABASE_URL` para uma base **isolada e migrada**, depois executar em `api-ts/`:

```bash
bun test test/unit/application/instagram test/unit/domain/entities/InstagramCampaign.spec.ts test/integration/external/instagram test/integration/external/database/DAOs/InstagramRepositorySQL.test.ts test/integration/infra/controllers/http/InstagramRestController.test.ts
bun run check
bunx tsc --noEmit
```
