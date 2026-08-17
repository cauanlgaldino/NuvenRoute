# Nuven Route

Aplicativo mobile desenvolvido para o Desafio Técnico Mobile do laboratório NUVEN. Feito em React Native com Expo para visualização e execução de rotas de atendimento em campo, com foco em uso offline, registro de leitura, foto, geolocalização e sincronização simulada.

## Demonstração

![Demonstração do app](./assets/NuvenRoute%20-%20Demo.gif)

## Como executar

Requisitos:

- Node.js
- npm
- Expo Go instalado no dispositivo físico ou emulador Android/iOS configurado

Instale as dependências:

```bash
npm install
```

Execute o projeto:

```bash
npx expo start
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

As rotas importadas, os pontos de atendimento e os dados das visitas são persistidos primeiro no banco SQLite local do dispositivo. Dessa forma, o usuário consegue visualizar a rota, acessar os pontos e concluir atendimentos mesmo sem conexão com a internet.

Quando uma visita é concluida offline, seus dados permanecem armazenados localmente com status de sincronização pendente. Ao recuperar a conexão, o aplicativo tenta sincronizar automaticamente os registros pendentes com o serviço remoto simulado.

## Estratégia de sincronização

Como o desafio não possui backend real, a sincronizacao foi simulada por uma camada de servico.

A ViewModel solicita a sincronizacao ao `SyncPendingVisitsService`, que busca visitas pendentes no repositorio local, marca os registros como em sincronizacao e envia os dados para uma implementacao concreta de `SyncVisitsInterface`.

Atualmente, essa implementacao e o `SyncVisitsService`, que simula o envio e retorna sucesso ou erro. Futuramente, essa classe poderia ser substituida por uma implementacao com chamada HTTP real para uma API, mantendo o contrato da interface e reduzindo o impacto nas ViewModels.

## Decisões técnicas

- Arquitetura MVVM para separar Views, ViewModels, Models e Services.
- App centrado no mapa, com bottom sheets para rotas, pontos e detalhe do atendimento.
- Persistência local com SQLite para garantir funcionamento offline.
- Interfaces no `model` para representar contratos e Services para implementações concretas.
- Sincronização desacoplada por interface, facilitando troca da simulação por backend real.
- Rotas importáveis via JSON, mantendo uma rota inicial nos assets para facilitar avaliação.
- Marcadores e caminhos no mapa indicam visualmente pontos pendentes, aguardando sincronização e sincronizados.

## Limitações e evoluções futuras

- OCR da leitura do med  idor não foi implementado. Uma evolucao seria processar a imagem capturada para sugerir automaticamente a leitura.
- Tratamento avancado de imagem tambem ficou fora do escopo, como compressão, recorte, melhoria de contraste e validação visual da foto.
- A cobertura de testes esta focada na sincronização. Como evolução, seria importante adicionar testes para services relevantes, especialmente câmera, localização, importação de arquivo e repositório local.
- O código poderia ter sido melhor documentado.
