# PRD — MVP Product Resolver

## 1. Visão geral

O produto será uma aplicação simples para facilitar o acesso a produtos divulgados em dumps de moda publicados em redes sociais.

Cada produto terá um código curto e fácil de digitar, exibido visualmente nas imagens dos posts.

Exemplo:

A7K2

O usuário acessa o site, informa esse código e é redirecionado diretamente para o link afiliado correspondente ao produto.

O objetivo principal do MVP é validar uma experiência simples:

ver produto no post → identificar código → acessar site → digitar código → abrir produto

O sistema também terá um dashboard administrativo privado para cadastrar e gerenciar os produtos sem necessidade de manipulação direta do banco de dados.

---

## 2. Problema

Perfis que publicam dumps de roupas normalmente exibem IDs de produtos da Shopee ou SHEIN.

Esse modelo tem alguns problemas:

- o ID da plataforma não necessariamente gera comissão de afiliado;
- o usuário precisa abrir a plataforma e pesquisar manualmente;
- IDs originais podem ser grandes ou difíceis de digitar;
- o criador não controla o destino do código;
- caso o link do produto mude, o conteúdo antigo pode ficar inutilizável.

O sistema resolve isso usando códigos próprios associados a links afiliados.

---

## 3. Objetivo do MVP

Permitir que:

1. O administrador cadastre um produto.
2. O sistema gere um código curto único para esse produto.
3. O administrador utilize esse código nos dumps publicados em redes sociais.
4. O usuário acesse o site.
5. O usuário informe o código exibido no post.
6. O sistema localize o produto.
7. O usuário seja redirecionado diretamente para o link afiliado correspondente.

O MVP deve ser simples o suficiente para ser desenvolvido durante um final de semana.

---

## 4. Fora do escopo do MVP

Não fazem parte desta versão:

- analytics;
- tracking avançado de cliques;
- dumps como entidade;
- páginas de coleção;
- busca por link de Instagram;
- busca por link de TikTok;
- aliases de publicações sociais;
- múltiplos usuários administrativos;
- cadastro público;
- recuperação de senha;
- validação de e-mail;
- OTP;
- magic link;
- permissões e roles;
- Redis;
- múltiplas imagens por produto;
- histórico de preços;
- sincronização automática com Shopee ou SHEIN;
- scraping;
- geração automática de links de afiliado;
- atualização automática de preço;
- disponibilidade automática de estoque.

Essas funcionalidades podem ser avaliadas posteriormente.

---

# 5. Personas

## 5.1 Visitante

Pessoa que encontrou um produto em um conteúdo publicado no Instagram, TikTok ou outra rede social.

Objetivo:

Encontrar rapidamente o produto que viu no conteúdo.

O visitante não possui conta.

---

## 5.2 Administrador

Responsável por cadastrar e manter os produtos utilizados nos conteúdos.

No MVP haverá apenas um administrador ou um número extremamente limitado de administradores criados manualmente.

Não haverá signup.

---

# 6. Fluxo principal do visitante

## 6.1 Conteúdo social

O visitante encontra um produto em um dump.

Exemplo:

CAMISETA

ID: A7K2

O conteúdo também deve deixar explícito que o código pode ser utilizado no site.

---

## 6.2 Home

O visitante acessa:

/

A tela principal deve possuir como foco um único input.

Exemplo:

Digite o ID do produto

[A7K2]

[Encontrar produto]

A home aceita exclusivamente códigos de produto.

Não aceita:

- links;
- URLs de posts;
- nomes de produto;
- IDs da Shopee;
- IDs da SHEIN.

---

## 6.3 Resolução do código

O usuário envia:

A7K2

O sistema:

1. normaliza o código;
2. procura o produto correspondente;
3. verifica se está ativo;
4. redireciona para sua destination URL.

Fluxo:

A7K2
→ Product
→ destinationUrl
→ Shopee / SHEIN

Não haverá página intermediária de produto no MVP.

---

# 7. URLs públicas

## Home

GET /

Responsável pela interface de resolução de código.

---

## Produto

GET /:productCode

Exemplo:

/A7K2

Comportamento:

1. normalizar código;
2. buscar produto;
3. verificar status;
4. redirecionar para destinationUrl.

Essa rota também permite utilizar o sistema como um encurtador próprio.

Exemplo:

seudominio.com/A7K2

---

# 8. Código do produto

## Requisitos

O código deve:

- possuir no mínimo 4 caracteres;
- utilizar letras e números;
- evitar caracteres visualmente ambíguos;
- ser único;
- ser permanente;
- nunca ser reutilizado;
- ser case-insensitive para busca;
- ser armazenado em formato canônico uppercase.

Exemplo:

A7K2

Entradas equivalentes:

A7K2
a7k2
A7k2
a7K2

Todas devem resolver para:

A7K2

---

## Alfabeto

Evitar:

0
O
1
I

Uma possibilidade:

ABCDEFGHJKLMNPQRSTUVWXYZ23456789

Com 32 caracteres possíveis e códigos de 4 caracteres:

32^4 = 1.048.576 combinações

O tamanho poderá ser aumentado futuramente caso necessário.

---

# 9. Produto

## Product

Campos mínimos:

- id
- code
- name
- marketplace
- destinationUrl
- imageUrl
- status
- createdAt
- updatedAt

---

## id

Identificador interno.

Preferencialmente UUID ou UUIDv7.

Não deve ser exposto como identificador principal para usuários.

---

## code

Código curto exibido nos posts.

Exemplo:

A7K2

Deve possuir constraint UNIQUE no banco.

---

## name

Nome administrativo do produto.

Exemplos:

Camiseta oversized preta

Calça baggy cinza

Tênis branco casual

Não precisa necessariamente aparecer publicamente no MVP.

---

## marketplace

Identifica a plataforma de destino.

Valores inicialmente suportados:

- shopee
- shein

Um produto pertence a apenas um marketplace.

---

## destinationUrl

URL final utilizada para redirecionamento.

Deve representar o link afiliado que deverá receber o tráfego.

No MVP será armazenada apenas a destination URL.

Não será necessário armazenar URL original separadamente.

---

## imageUrl

Imagem principal do produto.

Obrigatória.

Cada produto possui exatamente uma imagem no MVP.

---

## status

Estados:

active
inactive

### active

Produto pode ser resolvido e redirecionado.

### inactive

O código continua existindo, mas não deve redirecionar para a destination URL.

Um produto não deve ser excluído apenas porque ficou indisponível.

Isso permite preservar códigos antigos utilizados em posts.

---

# 10. Produto inexistente ou inativo

## Código inexistente

Se o usuário acessar um código inexistente:

/ZZZZ

o sistema deve apresentar uma resposta amigável.

Exemplo:

Produto não encontrado.

O código informado não corresponde a nenhum produto.

---

## Produto inativo

Se o produto existir, mas estiver inativo:

Produto indisponível.

Este produto não está disponível no momento.

O sistema não deve redirecionar para a destination URL.

---

# 11. Dashboard administrativo

URL sugerida:

/admin

O dashboard será privado.

Seu objetivo é substituir operações manuais via SQL.

Não haverá analytics no MVP.

---

# 12. Autenticação administrativa

O administrador será criado manualmente através de script ou CLI.

Não haverá:

- signup;
- confirmação de e-mail;
- recovery;
- magic link;
- OTP.

---

## Credenciais

Login utilizando:

- e-mail;
- senha.

Fluxo:

email + senha
→ valida credenciais
→ cria sessão
→ cookie seguro

---

## Sessão

A sessão deve utilizar cookie com:

- HttpOnly;
- Secure em produção;
- SameSite adequado;
- expiração definida.

---

# 13. Provisionamento do administrador

O projeto deve oferecer um script administrativo.

Exemplo:

bun run admin:create

O script pode solicitar:

Email:
Senha:

A senha nunca deve ser armazenada diretamente.

Ela deve ser transformada em um hash seguro antes de persistir.

---

# 14. Funcionalidades do dashboard

## 14.1 Listar produtos

Exibir:

- imagem;
- código;
- nome;
- marketplace;
- status;
- ações.

Ações:

- editar;
- ativar/desativar;
- copiar código.

---

## 14.2 Criar produto

Campos:

Nome
Marketplace
Destination URL
Imagem

O código será gerado automaticamente.

Exemplo:

Novo produto

Nome:
[Camiseta oversized preta]

Marketplace:
[Shopee]

Destination URL:
[https://...]

Imagem:
[Upload]

[Salvar]

Após salvar:

Produto criado.

Código:
A7K2

[Copiar código]

---

## 14.3 Editar produto

Permitido alterar:

- nome;
- marketplace;
- destinationUrl;
- imagem;
- status.

O código não deve ser alterado.

---

## 14.4 Desativar produto

O produto pode ser marcado como inactive.

Seu código continua reservado permanentemente.

---

# 15. Upload de assets

O MVP terá upload simples de imagem.

Requisitos:

- uma imagem obrigatória por produto;
- preview no dashboard;
- substituir imagem;
- excluir/substituir asset quando necessário.

Formatos esperados:

- JPEG;
- PNG;
- WebP.

O storage deve ser externo ao banco de dados.

Exemplos possíveis:

- S3;
- Cloudflare R2;
- storage compatível com S3.

O banco guarda apenas a referência da imagem.

---

# 16. Regras de negócio

## ProductCode

ProductCode deve ser tratado como conceito de domínio.

Responsabilidades:

- validar tamanho;
- validar caracteres;
- normalizar casing;
- garantir representação canônica;
- rejeitar códigos inválidos.

Exemplo:

a7k2
→
A7K2

---

## Código permanente

Uma vez associado a um produto:

A7K2 → Product X

esse código nunca poderá ser utilizado por outro produto.

Mesmo após o produto ser desativado.

---

## Destination URL mutável

É permitido trocar:

A7K2
→ URL antiga

por:

A7K2
→ URL nova

sem alterar o código utilizado nos posts antigos.

Esse é um dos principais benefícios do sistema.

---

# 17. Arquitetura

O MVP deve utilizar uma arquitetura simples baseada em Clean Architecture.

Objetivos:

- domínio independente;
- casos de uso testáveis;
- infraestrutura substituível;
- permitir futura reimplementação em Go;
- preservar comportamento através de testes.

Não é objetivo reproduzir literalmente todas as camadas do diagrama clássico de Clean Architecture.

A prioridade é manter limites claros e dependências direcionadas para dentro.

---

# 18. Estrutura conceitual

Exemplo inicial:

src/
  product/
    domain/
    application/
    infrastructure/

  identity-access/
    domain/
    application/
    infrastructure/

  http/

Os detalhes podem evoluir conforme o projeto.

---

# 19. Stack do MVP

## Runtime

Bun

## Linguagem

TypeScript

## HTTP

Hono

## Front-end

Next.js

## Banco

PostgreSQL

## ORM

Drizzle ORM

## Testes

Vitest

## Assets

Storage S3-compatible

---

# 20. Redis

Redis não faz parte do MVP.

A resolução de produto inicialmente será:

productCode
→ PostgreSQL
→ destinationUrl

O campo code deve possuir índice/constraint UNIQUE.

O banco já será suficiente para o volume inicial.

Redis poderá ser introduzido futuramente caso métricas reais demonstrem necessidade.

---

# 21. Estratégia de testes

O projeto deve ser desenvolvido utilizando TDD nas partes de lógica e comportamento.

A suíte deve priorizar comportamento observável e evitar acoplamento excessivo à implementação.

---

## 21.1 Domain tests

Exemplos:

- ProductCode aceita código válido;
- ProductCode normaliza lowercase;
- ProductCode rejeita caracteres inválidos;
- ProductCode rejeita código abaixo do tamanho mínimo;
- Product inativo não pode ser redirecionado.

---

## 21.2 Application tests

Exemplos:

### ResolveProduct

Dado:

Produto ativo com código A7K2.

Quando:

A7K2 é resolvido.

Então:

retorna destinationUrl.

---

Dado:

Produto inexistente.

Quando:

código é resolvido.

Então:

retorna ProductNotFound.

---

Dado:

Produto inativo.

Quando:

código é resolvido.

Então:

retorna ProductUnavailable.

---

## 21.3 HTTP tests

Validar contratos externos.

Exemplos:

GET /A7K2

Produto ativo:

3xx
Location: <destinationUrl>

Produto inexistente:

404

Produto inativo:

resposta adequada sem redirect.

---

# 22. Preparação para futura migração para Go

A implementação inicial será feita em TypeScript.

Entretanto, o domínio e os testes devem ser escritos de forma que os comportamentos possam ser reproduzidos posteriormente em Go.

A futura versão Go deverá manter os mesmos contratos.

Exemplo:

TypeScript:

ResolveProduct("A7K2")
→ destinationUrl

Go:

ResolveProduct("A7K2")
→ destinationUrl

A implementação interna poderá ser completamente diferente.

O comportamento deverá permanecer equivalente.

---

# 23. UX da home

A página deve possuir o mínimo possível de distrações.

Elemento principal:

Digite o ID do produto

[A7K2]

[Encontrar produto]

Texto auxiliar:

O ID aparece nos nossos posts.

O visitante não deve precisar entender:

- Shopee ID;
- SHEIN ID;
- afiliados;
- códigos internos;
- arquitetura do sistema.

Para ele:

ID = produto

---

# 24. UX dos posts

Todos os conteúdos devem deixar claro que o produto possui um ID pesquisável.

Exemplo:

CAMISETA

ID: A7K2

🔎 seusite.com

A indicação do site deve aparecer de forma recorrente nos slides do dump.

O último slide poderá explicar o fluxo de maneira mais explícita:

1. Acesse seusite.com
2. Digite o ID da peça
3. Abra o produto

---

# 25. Requisitos não funcionais

## Segurança

- senha armazenada utilizando algoritmo de hashing seguro;
- cookies HttpOnly;
- dashboard protegido;
- validação de URLs;
- validação de uploads;
- nenhuma credencial sensível enviada ao client;
- queries parametrizadas através do ORM.

---

## Performance

A resolução de códigos deve ser simples e rápida.

Não há requisito de escala elevado no MVP.

Prioridade:

correção > simplicidade > performance prematura

---

## Responsividade

A home deve ser desenvolvida principalmente para mobile.

O tráfego esperado virá majoritariamente de redes sociais em smartphones.

O dashboard também deve funcionar em mobile, mas desktop pode receber maior prioridade administrativa.

---

# 26. Critérios de sucesso do MVP

O MVP será considerado funcional quando for possível concluir o seguinte fluxo ponta a ponta:

1. Criar admin através do script.
2. Fazer login no dashboard.
3. Fazer upload da imagem de um produto.
4. Cadastrar produto da Shopee ou SHEIN.
5. Receber automaticamente um código curto.
6. Copiar esse código.
7. Utilizá-lo em um post.
8. Acessar a home através de outro dispositivo.
9. Digitar o código.
10. Ser redirecionado corretamente para o destinationUrl.

Exemplo:

A7K2

→

https://link-afiliado-do-produto

Se esse fluxo funcionar de ponta a ponta, o MVP está pronto para ser utilizado em produção.

---

# 27. Princípio de escopo

Durante o desenvolvimento do MVP, qualquer nova feature deve responder à pergunta:

"Isso é necessário para uma pessoa sair de um post e chegar ao produto usando o código?"

Se a resposta for não, a feature deve ser considerada para uma versão futura.

Objetivo do primeiro final de semana:

PUBLICAR O PRIMEIRO DUMP UTILIZANDO O SISTEMA REAL.
