# Referências para BLACK HEM

Coleta: 17/10/2026. Escopo: frontend publicado de [Outfit](https://outfit.hellohello.is/), [AVARA](https://www.avara.band/) e [KVS](https://www.kvs.services/), mais a imagem fornecida pelo usuário.

## Entrega e limites

Foram preservados HTML das três homes, bundles JavaScript/CSS alcançados a partir deles, módulo de cursor e HTML de um produto do Outfit, seis imagens do preloader e o modelo GLB do KVS. O inventário inicial contém 46 arquivos dentro das pastas de sites, aproximadamente 5,79 MB; os três HTML iniciais estão no nível acima. Isso é uma coleta direcionada, não um espelho completo de todas as páginas e mídias.

É código compilado enviado ao cliente, não o repositório original. Nenhum bundle coletado declarou sourceMappingURL. Não foram recuperados componentes originais TSX/Vue, backend, arquivos de Blender ou configuração de build. Não foi feita busca por repositórios privados. Não executar os bundles como dependências do e-commerce.

O navegador de automação não estava disponível nesta sessão. As descrições de movimento abaixo são leitura estática do código, não avaliação de FPS, gravação de interações ou confirmação visual de cada estado. A imagem da grid é evidência visual fornecida pelo usuário e não tem URL de origem identificada.

## Leitura

- [Dossiê e adaptação à BLACK HEM](./design-extraction.md).
- [Análise aprofundada da AVARA](./avara-analysis.md).
- [Evidências com arquivo, posição e contexto](./evidence.json).
- [Inventário com tamanho, SHA-256 e tipo real](./inventory.json).
- [Inspeção estrutural do GLB](./kvs/model-inspection.json).
- [Imagem original da grid](./grid-reference.png).

As posições em evidence.json são índices de caracteres no texto decodificado, não offsets de bytes. Os hashes identificam a versão exata analisada. Os manifests por site registram URLs de coleta e tentativas que falharam. O download inicial fez algumas resoluções incorretas de caminhos relativos; os 404 estão preservados como tentativas, não como dependências ausentes confirmadas.

Há quatro respostas HTML salvas com extensão JS: três caminhos de decoder na AVARA e script.js no KVS. São fallbacks/rotas que devolveram HTML; estão explicitamente identificados no inventário e não comprovam disponibilização de decoders ou de um módulo JS. A leitura de código excluiu esses arquivos. O modelo KVS foi validado por cabeçalho e JSON do contêiner, sem renderização ou descompressão das geometrias Draco.

## Reprodução da coleta

Use Bun. Os scripts acessam rede; em ambiente restrito precisam da permissão correspondente.

- `bun research/references/download.ts`: coleta inicial a partir dos HTML já salvos; preserva manifest de tentativas.
- `bun research/references/supplement.ts`: completa referências explícitas de chunks do Outfit e imagens do preloader.
- `bun research/references/build-evidence.ts`: recompõe inventário, trechos e inspeção GLB; a cópia da imagem usa o caminho original do clipboard e requer esse arquivo disponível.

A página de produto, o chunk do cursor e o GLB foram baixados por URLs explícitas registradas no dossiê. Os scripts não prometem reproduzir um build futuro idêntico: os sites podem mudar seus hashes e assets.

Os arquivos de terceiros permanecem nesta pasta de pesquisa. A implementação deve recriar os mecanismos com código e assets próprios; não copiar marcas, fotografia de produtos, fonte proprietária ou modelo KVS para public/.

A skill reverse-engineer-anything orientou a investigação. Foi tentado o analisador REA de aplicação JavaScript, mas ele não retornou resultado antes do encerramento da chamada. Nenhuma conclusão deste pacote depende de grafo ou Evidence ID do REA: as evidências são os arquivos preservados, hashes e posições extraídas diretamente com Bun.

Verificação final: os 46 hashes do inventário foram recalculados e coincidiram; o comprimento declarado do GLB (2.003.248 bytes) coincide com o arquivo. Isso valida integridade da coleta, não desempenho ou comportamento em navegador.
