# Admin em mobile e tablet

Abaixo de 1100 px, a tabela usa cards com nome completo, rótulos dos campos e ações de editar, destino e excluir. De 700 a 1099 px, os cards ocupam duas colunas. A tabela tradicional permanece nas telas maiores.

Navegação, barras de ações e paginação ajustam as colunas à largura disponível. Campos, fieldsets e galeria podem encolher sem gerar rolagem horizontal. Inputs mobile usam 16 px para evitar zoom automático no foco.

A validação em `.harness/admin/check.ts` cobre larguras de 320, 390, 600, 768, 820, 1024 e 1280 px, além de login, editor, filtros, outfits e salvamento da galeria.

## Falha 500 ao salvar galeria

Causa confirmada no PostgreSQL: um parâmetro `JSON.stringify(imageUrls)` vinculado diretamente como `jsonb` pelo Bun era serializado novamente como string JSON. Isso violava `products_image_urls_check`.

A API agora vincula o parâmetro como texto e converte com `::text::jsonb` em INSERT e UPDATE. O teste real usa uma tabela temporária com a mesma regra, verifica array/ordem/capa e reverte a transação. Os dados do usuário não são alterados pelo teste. O teste pode ser ativado com `POSTGRES_GALLERY_TEST_URL` no arquivo de testes de ProductDAOSQL.

As seções usam rotas SSR próprias: `/admin/products`, `/admin/filters` e
`/admin/outfits`. `/admin` redireciona para produtos; URLs antigas com `tab`
continuam funcionando por redirecionamento, preservando edição e paginação.
O breadcrumb permite voltar à loja, à administração e à seção atual, e mostra
um último nível ao editar um produto ou outfit. Paginação e seleção do editor
continuam na query string.

No mobile (até 639px), o header mantém a marca e o botão de menu na mesma
linha. A navegação entre seções, o acesso à loja, o usuário e a saída ficam
no painel expansível. O botão informa seu estado com `aria-expanded`; Esc
fecha o painel e devolve o foco ao botão. No desktop, a navegação e os
controles da conta permanecem visíveis.
