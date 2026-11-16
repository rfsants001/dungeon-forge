# Dungeon Forge

Primeira implementação web para mestres de D&D. Gere uma dungeon da Forja, revise e edite salas, salve localmente e use uma janela separada para projetar mapas revelados ou a imagem de uma criatura.

## Rodar localmente

Abra a pasta descompactada e execute:

```sh
python3 -m http.server 8080 --bind 127.0.0.1 --directory public
```

Abra `http://127.0.0.1:8080` no navegador. O servidor HTTP serve os módulos JS e os arquivos estáticos. A prévia de design em HTML é um arquivo separado.

## Hospedar

Sirva o conteúdo de `public/` com seu servidor HTTP. Também é possível construir a imagem com o Dockerfile:

```sh
docker build -t dungeon-forge .
docker run --rm -p 127.0.0.1:8080:80 dungeon-forge
```

Esse comando fica acessível no próprio computador. Para disponibilizar a aplicação na rede, configure o endereço de escuta e o proxy do seu ambiente. Os arquivos WebP, a logo, as fontes e os ícones acompanham a aplicação.

## Usar em mesa

1. Informe os níveis do grupo e gere a dungeon. A semente permite reproduzir a mesma planta e conteúdo com os mesmos parâmetros e versão do catálogo.
2. Edite as salas. O orçamento de XP se atualiza ao adicionar ou personalizar uma criatura. Em **Personalizar criatura**, o mestre pode definir um nome público ou carregar uma ilustração local.
3. Em **Mostrar criatura**, a janela dos jogadores abre com a imagem e o nome público. Fichas e estatísticas ficam na mesa do mestre. Arraste essa janela para a segunda tela. Para exibir a planta, use **Revelar sala**.
4. Use **Ocultar projeção** para voltar à espera. Se a janela estiver bloqueada, permita pop-ups deste site e clique **Abrir tela dos jogadores**.

A aplicação salva uma dungeon por origem no armazenamento do navegador. Ao gerar outra, o app pede confirmação para substituir a atual. Edições ficam no navegador que você está usando. A janela dos jogadores usa a mesma origem e recebe somente informações públicas. Uma criatura sem ilustração mostra seu nome. O catálogo inicial tem nove fichas resumidas e quatro retratos originais. A importação automática da D&D 5e SRD API, backups e PWA estão reservados para etapas seguintes.

## Verificar

```sh
node --test
```

A suíte testa o orçamento de XP, a distribuição e a conectividade do mapa, sementes, chefões e os dados enviados para a janela pública. A validação inclui diferentes tamanhos de grupo e níveis.

## Créditos

Dados de regras e fichas resumidas adaptados do *System Reference Document 5.2.1* da Wizards of the Coast LLC, distribuído sob CC BY 4.0. A seleção, as traduções, os resumos e as regras de geração são adaptações para este projeto. [SRD 5.2.1](https://www.dndbeyond.com/srd) · [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)

Ícones Lucide e fontes Inter e STIX Two Text, com seus avisos de licença em `public/assets/`. Logo e ilustrações originais geradas com o ImageGen integrado.
