# A3 - Computação Gráfica

Editor gráfico 2D para desenho rasterizado e composição de imagens em camadas, executado como aplicativo desktop com Electron.

## Funcionalidades

- Desenho pixel a pixel com mouse, traço contínuo e tamanho de pincel ajustável.
- Ferramentas de pincel, borracha e conta-gotas (amostragem da composição visível).
- Seleção de cores personalizadas pelo seletor de cor do sistema.
- Criação de telas com dimensões configuráveis (de 1 a 8192 pixels por eixo).
- Camadas independentes: criar, selecionar, renomear (duplo clique no nome), ocultar/mostrar, reordenar e excluir.
- Importação de imagens como novas camadas, mantendo a proporção e ajustando-as para caber na tela.
- Controles de opacidade, brilho, contraste e saturação por camada.
- Exportação da composição de todas as camadas visíveis como PNG, com filtros aplicados.
- Atalhos: `B` para desenhar, `I` para conta-gotas e `E` para borracha.

A tela inicial tem 800 × 500 pixels e fundo transparente. O padrão quadriculado indica áreas transparentes; imagens importadas podem ser pintadas em camadas acima delas. A exportação é um PNG composto — a versão atual não persiste um arquivo de projeto editável com suas camadas.

## Tecnologias

- HTML, CSS e JavaScript
- Electron
- Node.js
- Testes com o runner nativo `node:test`

## Requisitos

- Node.js 22.12.0 ou superior e npm.

## Executar

Na pasta do projeto:

```bash
npm install
npm start
```

## Testes

```bash
npm test
```

Os testes cobrem o modelo do documento e camadas, limites dos filtros, ordenação, rasterização de linhas de pixels, composição de camadas e importação de imagem. Para validar a interface gráfica, abra o aplicativo Electron e percorra o fluxo de criação/importação, edição e exportação.

## Estrutura

```text
electron/                 Inicialização do aplicativo Electron
src/index.html            Estrutura da interface
src/css/style.css         Tema e layout responsivo
src/js/app.js             Eventos e coordenação da interface
src/js/core/document.js   Documento, camadas e propriedades
src/js/core/renderer.js   Composição de camadas e filtros
src/js/tools/             Traçado e ferramentas de pixel
src/js/io/                Importação e exportação de imagens
tests/                    Testes automatizados
```
