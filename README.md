<div align="center">

# 🌀 Aula Giroscópio

**Mini-jogo mobile criado com React Native + Expo que usa o giroscópio do dispositivo como controle**

[![Expo](https://img.shields.io/badge/Expo-54.0-000020?style=for-the-badge&logo=expo&logoColor=white)](https://expo.dev)
[![React Native](https://img.shields.io/badge/React_Native-0.81.5-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://reactnative.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](LICENSE)

</div>

---

## 📖 Sobre o Projeto

O **Aula Giroscópio** é um projeto educacional desenvolvido no contexto do **SENAI DS 2025**, com o objetivo de demonstrar na prática o uso de sensores nativos do dispositivo em aplicações mobile com Expo.

O app transforma o giroscópio do celular em um controle físico: incline o dispositivo e mova um jogador pela tela para **coletar orbes azuis** e acumular pontos — tudo em tempo real.

> 🎓 **Objetivo pedagógico:** Ensinar como integrar hardware (sensores) com interfaces visuais usando `expo-sensors`, `useState` e `useEffect` no React Native.

---

## ✨ Funcionalidades

| Funcionalidade | Descrição |
|---|---|
| 🕹️ **Controle por giroscópio** | Incline o celular para mover o jogador na tela |
| 🔵 **Coleta de orbes** | Orbes azuis reaparecem em posições aleatórias ao serem coletados |
| 🏆 **Sistema de pontuação** | Contador de pontos em tempo real |
| 📡 **Leitura bruta do sensor** | Componente dedicado exibe os eixos X, Y, Z ao vivo |
| ⚡ **Alta taxa de atualização** | Sensor configurado a ~60fps (16ms) para resposta fluida |

---

## 🏗️ Arquitetura do Projeto

```
aula-giroscopio/
├── app/
│   └── index.tsx              # Tela principal — monta o OrbeFlutuante
├── components/
│   ├── OrbeFlutuante.tsx      # Jogo completo: jogador, orbe, pontuação e física
│   └── LeituraGiroscopio.tsx  # Componente educacional: exibe dados brutos do sensor
├── assets/                    # Ícones e imagens do app
├── app.json                   # Configuração Expo (ícones, splash, plugins)
└── package.json               # Dependências e scripts
```

### Componentes principais

#### `OrbeFlutuante.tsx`
O coração do jogo. Responsável por:
- Assinar o `Gyroscope.addListener` com intervalo de **16ms**
- Calcular a nova posição do jogador a partir dos eixos **X** e **Y** do giroscópio
- Limitar o jogador dentro dos limites da tela
- Detectar colisão por **distância euclidiana** entre centros
- Gerar nova posição aleatória para o orbe a cada coleta

#### `LeituraGiroscopio.tsx`
Componente didático com código altamente comentado que:
- Demonstra o ciclo de vida de um sensor (subscribe → update → cleanup)
- Exibe os valores **x, y, z** com 1 casa decimal e trata o caso `-0.0`

---

## 🚀 Como Rodar Localmente

### Pré-requisitos

- [Node.js](https://nodejs.org/) v18+
- [Expo Go](https://expo.dev/client) instalado no celular (iOS ou Android)
- Git

### Instalação

```bash
# 1. Clone o repositório
git clone https://github.com/seu-usuario/aula-giroscopio.git
cd aula-giroscopio

# 2. Instale as dependências
npm install

# 3. Inicie o servidor de desenvolvimento
npm start
```

### Executar no dispositivo

```bash
# Android
npm run android

# iOS
npm run ios

# Web (sensor simulado)
npm run web
```

Após rodar `npm start`, escaneie o **QR Code** exibido no terminal com o app **Expo Go**.

> ⚠️ **Importante:** O giroscópio é um sensor físico. Para a experiência completa, teste em um dispositivo real (iOS ou Android). O simulador/emulador não possui suporte a sensores de movimento.

---

## 🧰 Stack Tecnológica

| Tecnologia | Versão | Finalidade |
|---|---|---|
| [Expo](https://expo.dev) | ~54.0 | Plataforma e toolchain mobile |
| [React Native](https://reactnative.dev) | 0.81.5 | Framework de UI mobile |
| [expo-sensors](https://docs.expo.dev/versions/v54.0.0/sdk/gyroscope/) | ~15.0 | Acesso ao giroscópio nativo |
| [expo-router](https://expo.github.io/router) | ~6.0 | Roteamento baseado em arquivos |
| [TypeScript](https://www.typescriptlang.org) | ~5.9 | Tipagem estática |
| [React](https://react.dev) | 19.1.0 | Biblioteca de UI |

---

## 🎮 Como Jogar

1. Abra o app no seu celular com o **Expo Go**
2. Segure o celular na horizontal, com a tela virada para cima
3. **Incline** o dispositivo para mover a bolinha coral pela tela
4. Encoste a bolinha no **orbe azul** para coletar pontos
5. Cada coleta soma **+1** na pontuação e teleporta o orbe para uma nova posição
6. Veja até que pontuação você consegue chegar! 🏆

---

## 📐 Conceitos Aprendidos

Este projeto cobre os seguintes conceitos de React Native e Expo:

- ✅ **`useState`** — gerenciamento de estado local (posição, pontuação, dados do sensor)
- ✅ **`useEffect`** — efeitos colaterais e ciclo de vida do componente
- ✅ **Cleanup de subscriptions** — prevenção de memory leaks ao desmontar componentes
- ✅ **`expo-sensors / Gyroscope`** — acesso a sensores de hardware via API assíncrona
- ✅ **Posicionamento absoluto** — layout com `position: 'absolute'` no React Native
- ✅ **Detecção de colisão** — cálculo de distância euclidiana entre dois elementos
- ✅ **`Dimensions` API** — adaptação do layout ao tamanho da tela

---

## 📚 Referências e Documentação

- 📘 [Expo SDK v54 — Documentação oficial](https://docs.expo.dev/versions/v54.0.0/)
- 📘 [expo-sensors — Gyroscope](https://docs.expo.dev/versions/v54.0.0/sdk/gyroscope/)
- 📘 [React Native — Documentação](https://reactnative.dev/docs/getting-started)
- 📘 [React Hooks — useState & useEffect](https://react.dev/reference/react)

---

## 🤝 Contribuindo

Contribuições são bem-vindas! Sinta-se à vontade para:

1. Fazer um **fork** do projeto
2. Criar uma branch com sua feature: `git checkout -b feature/minha-feature`
3. Commitar suas mudanças: `git commit -m 'feat: adiciona minha feature'`
4. Fazer push para a branch: `git push origin feature/minha-feature`
5. Abrir um **Pull Request**

---

## 📄 Licença

Distribuído sob a licença **MIT**. Veja o arquivo `LICENSE` para mais informações.

---

<div align="center">

Feito com ❤️ para fins educacionais no **SENAI DS 2025**

</div>
