# LEIT Route

Aplicativo mobile desenvolvido para o Desafio Técnico Mobile do laboratório NUVEN. Feito em React Native com Expo para visualizacao e execucao de rotas de atendimento em campo, com foco em uso offline, registro de leitura, foto, geolocalizacao e sincronizacao simulada.

## Como executar

Requisitos:

- Node.js
- npm
- Expo Go instalado no dispositivo fisico ou emulador Android/iOS configurado

Instale as dependencias:

```bash
npm install
```

Execute o projeto:

```bash
npx expo start
```

Para limpar cache do Metro Bundler, caso necessario:

```bash
npx expo start -c
```

Depois, abra pelo Expo Go no iPhone/Android ou execute em um emulador.

## Tecnologias utilizadas

- React Native com Expo
- TypeScript
- Expo SQLite para persistencia local
- React Native Maps para visualizacao do mapa, pontos e caminho da rota
- Expo Camera para captura de evidencia fotografica
- Expo Location para captura de latitude, longitude e horario do atendimento
- Expo Network para monitoramento de conectividade
- Expo Document Picker e File System para importacao de rotas em JSON
- Node test runner para testes automatizados da sincronizacao

## Funcionamento offline

O aplicativo foi desenvolvido seguindo uma abordagem offline first.

As rotas importadas, os pontos de atendimento e os dados das visitas sao persistidos primeiro no banco SQLite local do dispositivo. Dessa forma, o usuario consegue visualizar a rota, acessar os pontos e concluir atendimentos mesmo sem conexao com a internet.

Quando uma visita e concluida offline, seus dados permanecem armazenados localmente com status de sincronizacao pendente. Ao recuperar a conexao, o aplicativo tenta sincronizar automaticamente os registros pendentes com o servico remoto simulado.

## Estrategia de sincronizacao

Como o desafio nao possui backend real, a sincronizacao foi simulada por uma camada de servico.

A ViewModel solicita a sincronizacao ao `SyncPendingVisitsService`, que busca visitas pendentes no repositorio local, marca os registros como em sincronizacao e envia os dados para uma implementacao concreta de `SyncVisitsInterface`.

Atualmente, essa implementacao e o `SyncVisitsService`, que simula o envio e retorna sucesso ou erro. Futuramente, essa classe poderia ser substituida por uma implementacao com chamada HTTP real para uma API, mantendo o contrato da interface e reduzindo o impacto nas ViewModels.

## Decisoes tecnicas

- Arquitetura MVVM para separar Views, ViewModels, Models e Services.
- App centrado no mapa, com bottom sheets para rotas, pontos e detalhe do atendimento.
- Persistencia local com SQLite para garantir funcionamento offline.
- Interfaces no `model` para representar contratos e Services para implementacoes concretas.
- Sincronizacao desacoplada por interface, facilitando troca da simulacao por backend real.
- Rotas importaveis via JSON, mantendo uma rota inicial nos assets para facilitar avaliacao.
- Marcadores e caminhos no mapa indicam visualmente pontos pendentes, aguardando sincronizacao e sincronizados.

## Limitacoes e evolucoes futuras

- OCR da leitura do medidor nao foi implementado. Uma evolucao seria processar a imagem capturada para sugerir automaticamente a leitura.
- Tratamento avancado de imagem tambem ficou fora do escopo, como compressao, recorte, melhoria de contraste e validacao visual da foto.
- A sincronizacao e simulada e nao realiza chamada HTTP real, pois o desafio nao fornece backend.
- A cobertura de testes esta focada na sincronizacao. Como evolucao, seria importante adicionar testes para services relevantes, especialmente camera, localizacao, importacao de arquivo e repositorio local.
