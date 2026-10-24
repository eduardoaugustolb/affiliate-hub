# Busca pública, filtros e outfits

## Campos fixos

`GET /search/filters` é público e retorna `{ filters: [...] }`. Cada campo informa `key`, `label` e `type` para montar a interface. Não é possível criar ou excluir campos/categorias pela API.

| key | type | Comportamento |
| --- | --- | --- |
| `productCode` | `text` | Código exato, sem distinguir maiúsculas/minúsculas; 4–6 caracteres do alfabeto de produtos |
| `outfitCode` | `text` | Produtos associados ao código exato do outfit; formato `OUT-` + 16 caracteres hexadecimais |
| `name` | `text` | Trecho literal do nome, sem distinguir maiúsculas/minúsculas; até 160 caracteres |
| `size` | `choices` | Múltiplas opções cadastradas pelo admin |
| `color` | `choices` | Múltiplas opções cadastradas pelo admin |
| `marketplace` | `choices` | Uma opção: `shopee` ou `shein` |

Campos `text` retornam `match` (`exact` ou `contains`) e `maxLength`. Campos `choices` retornam `multiple` e `choices: [{ value, label }]`. `value` de tamanho e cor é o UUID da opção, usado tanto na associação ao produto quanto na busca. As categorias `size` e `color` vêm da migration; suas opções começam vazias e são administráveis. Marketplace é fixo.

As opções descrevem o produto/anúncio inteiro. Não há estoque ou combinações de variantes de tamanho × cor nesta versão.

## Busca

```http
GET /search?name=camiseta&outfitCode=OUT-0123456789ABCDEF&size=<uuid-p>,<uuid-m>&color=<uuid-azul>&marketplace=shein&limit=25&offset=0
```

Todos os campos são opcionais. Omita filtros sem seleção; valores vazios, filtros desconhecidos e formatos inválidos retornam 400. `limit` vai de 1 a 100 (padrão 25), `offset` é inteiro não negativo (padrão 0). Até 100 opções por campo.

A busca combina **OU** entre escolhas do mesmo campo e **E** entre campos. Retorna exclusivamente produtos ativos, sem exigir sessão. Nomes usam busca literal: `%` e `_` não funcionam como curingas. Códigos ou UUIDs válidos, mas desconhecidos, retornam lista vazia; uma opção enviada no campo errado também não retorna resultados.

```json
{
  "items": [
    {
      "code": "ABC234",
      "name": "Camiseta azul",
      "imageUrl": "https://example.com/image.jpg",
      "marketplace": "shein"
    }
  ],
  "limit": 25,
  "offset": 0,
  "hasMore": false
}
```

A ordem é criação mais recente primeiro, com ID como desempate. O resultado público não expõe IDs internos ou URLs de destino. Para acessar o link afiliado, use `GET /resolve?code=ABC234` ou `GET /ABC234`.

`GET /products` continua sendo a listagem administrativa autenticada, incluindo produtos inativos.

## Gestão: somente admin

Todas as operações abaixo exigem o cookie de sessão configurado. Sem sessão válida: 401. Usuário sem papel `admin`: 403. A autorização também é verificada no serviço, antes do acesso à persistência.

| Método | Rota | Payload / resposta |
| --- | --- | --- |
| POST | `/filter-categories/size/options` | `{ "name": "P" }` → 201 com `{ id, name }` |
| POST | `/filter-categories/color/options` | `{ "name": "Azul" }` → 201 com `{ id, name }` |
| DELETE | `/filter-options/:id` | 204; remove também associações da opção |
| PUT | `/products/:code/filter-options` | `{ "optionIds": ["uuid-p", "uuid-azul"] }` → 204 |
| POST | `/outfits` | `{ "name": "Look de verão", "productCodes": ["ABC234", "DEF567"] }` → 201 com `{ code, name, productCodes }` |
| GET | `/outfits/:code` | 200 com `{ code, name, productCodes }` |
| DELETE | `/outfits/:code` | 204; remove as associações, preservando produtos |

A associação de opções substitui o conjunto inteiro; envie `optionIds: []` para limpar. Nomes são aparados; duplicatas de opções na mesma categoria são rejeitadas sem distinguir maiúsculas/minúsculas. Referências inválidas retornam 400. Outfits devem conter de 1 a 100 códigos; repetições são removidas. O código é gerado pelo servidor.

As escritas de associações e criação de outfits são transacionais: uma referência inválida não deixa alterações parciais. A exclusão de um produto remove suas associações com opções e outfits.

## Banco, cache e testes

Aplique a migration com `bun run migrate`. Ela cria as categorias fixas, opções, associações e outfits, com chaves estrangeiras e índices. Esta migration é nova; não foi aplicada automaticamente ao banco da aplicação durante o desenvolvimento.

`REDIS_URL` habilita o cache opcional do catálogo de opções, usando o cliente nativo do Bun. `REDIS_CACHE_PREFIX` personaliza o namespace (padrão `affiliate-hub:catalog:v2`); use prefixos diferentes por ambiente/banco quando compartilhar Redis.

O TTL é de 30 segundos. Mudanças nas opções trocam a geração do cache, evitando que uma leitura em andamento restaure dados de uma geração anterior. Falhas do Redis usam o banco; se a invalidação falhar, as entradas existentes expiram pelo TTL. Resultados de `/search` consultam o banco diretamente. Respostas HTTP usam `Cache-Control: no-store` para que a invalidação seja controlada pelo servidor.

```sh
bun test test/unit test/integration
bunx tsc --noEmit
bun run check
```

Para executar os testes reais, configure explicitamente um PostgreSQL dedicado já migrado e, opcionalmente, um Redis de testes:

- `CATALOG_TEST_DATABASE_URL`: testes de persistência do catálogo.
- `CATALOG_TEST_REDIS_URL`: teste de cache hit, TTL e invalidação no Redis real; usa chaves temporárias próprias.
- `TEST_DATABASE_URL` e `TEST_API_URL`: testes completos da API, apontando para o mesmo banco de testes usado pela API em execução.

A suíte cobre filtros combinados, paginação, normalização, somente produtos ativos, permissões, referências inválidas, rollback, exclusões em cascata e cache com falhas e leituras concorrentes.
