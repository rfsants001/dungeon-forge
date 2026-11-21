# Dungeon Forge

<p>
  <img src="public/assets/logo.webp" width="320" alt="Dungeon Forge" />
</p>

Prepare uma dungeon para sua mesa de D&D 2024. Informe o grupo e a dificuldade, gere a Forja, edite o conteúdo de cada sala e mostre aos jogadores a imagem de uma criatura ou as salas reveladas.

O MVP web pode ser hospedado no seu computador ou servidor. Usa HTML, CSS e JavaScript com módulos nativos e mapa SVG interativo. Logo, ilustrações, fontes e ícones acompanham a aplicação.

## O que já funciona

- Geração por quantidade de personagens, nível comum ou níveis individuais, dificuldade, tamanho e preferência de chefão.
- Semente para reproduzir o mapa e seu conteúdo.
- Edição de criaturas, baús, moedas, armadilhas e descrição pública das salas, com acompanhamento do orçamento de XP.
- Janela dos jogadores com imagem e nome público da criatura ou mapa das salas reveladas. Fichas e estatísticas ficam na mesa do mestre.
- Salvamento local de uma dungeon no navegador.
- Layout responsivo, navegação por teclado e reenquadramento da sala focada no mapa com zoom.

## Rodar localmente

Com Git e Python 3 instalados, execute os comandos abaixo.

```sh
git clone https://github.com/rfsants001/dungeon-forge.git
cd dungeon-forge
python3 -m http.server 8080 --bind 127.0.0.1 --directory public
```

Abra `http://127.0.0.1:8080` no navegador. O servidor HTTP serve os módulos JS e os arquivos estáticos. Com Node.js e npm instalados, você também pode iniciar o servidor com `npm start`, que usa o mesmo comando Python.

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

A aplicação salva uma dungeon por origem no armazenamento do navegador. Ao gerar outra, o app pede confirmação para substituir a atual. Edições ficam no navegador que você está usando. A janela dos jogadores usa a mesma origem e recebe somente informações públicas. Uma criatura sem ilustração mostra seu nome. O catálogo inicial tem nove fichas resumidas e quatro retratos originais.

## Próximas etapas

A integração com a D&D 5e SRD API, backups e PWA estão planejados. Também fazem parte da evolução do produto a sala do mestre com entrada por QR code, publicação de cenas nos celulares dos jogadores, versão desktop e ambientações procedurais por tema.

## Verificar

```sh
node --test
```

A suíte testa o orçamento de XP, a distribuição e a conectividade do mapa, sementes, chefões e os dados enviados para a janela pública. A validação inclui diferentes tamanhos de grupo e níveis.

A revisão visual foi executada no Chromium em larguras de 320, 390, 768, 1024 e 1440 px, com texto a 100% e 200%. Criar e Mesa passaram sem rolagem horizontal, incluindo oito níveis individuais. Com a semente `review-visual` e zoom máximo, o mapa reenquadrou as oito salas durante a navegação com Tab nas cinco larguras.

## Licença

O código é distribuído sob a [licença MIT](LICENSE).

## Créditos

Dados de regras e fichas resumidas adaptados do *System Reference Document 5.2.1* da Wizards of the Coast LLC, distribuído sob CC BY 4.0. A seleção, as traduções, os resumos e as regras de geração são adaptações para este projeto. [SRD 5.2.1](https://www.dndbeyond.com/srd) · [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)

Ícones Lucide e fontes Inter e STIX Two Text, com seus avisos de licença em `public/assets/`. Logo e ilustrações originais geradas com o ImageGen integrado.
