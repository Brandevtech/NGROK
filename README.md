<div align="center">

# Ngrok Share QR Code

**Compartilhe seu projeto local em segundos — direto da Activity Bar do VS Code.**

[![VS Code](https://img.shields.io/badge/VS%20Code-%5E1.75.0-007ACC?style=flat-square&logo=visual-studio-code&logoColor=white)](https://code.visualstudio.com/)
[![Version](https://img.shields.io/badge/version-1.0.1-38bdf8?style=flat-square)](https://marketplace.visualstudio.com/items?itemName=Brandev.antigravity-ngrok-share)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/licença-MIT-10b981?style=flat-square)](#licença)

[👉 Instalar via VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=Brandev.antigravity-ngrok-share)

</div>

---

## O que é isso?

**Ngrok Share QR Code** é uma extensão para o Visual Studio Code que integra o [Ngrok](https://ngrok.com) diretamente ao seu editor. Com ela, você pode:

- 🚀 **Iniciar um túnel Ngrok** com um único clique
- 📱 **Gerar um QR Code** da URL pública automaticamente
- 🔗 **Compartilhar seu servidor local** com qualquer pessoa, em qualquer lugar
- ⚡ **Acessar tudo na Activity Bar** — sem abrir terminal, sem comandos manuais

> Ideal para desenvolvedores que precisam mostrar rapidamente um projeto local rodando em Apache/Nginx para um cliente, colega ou dispositivo móvel.

---

## Funcionalidades

| Funcionalidade | Descrição |
|---|---|
| 📟 **Painel Lateral** | Interface visual integrada na Activity Bar do VS Code |
| 🔄 **Inicialização Automática** | Clique em "Atualizar" para salvar a URL e já iniciar o túnel |
| 📱 **QR Code Dinâmico** | Gerado automaticamente assim que o Ngrok detecta o túnel ativo |
| 🔐 **Token de Autenticação** | O **Authtoken** é obrigatório para gerar os túneis do Ngrok (mesmo no plano gratuito) |
| 🌐 **Auto `https://`** | Protocolo inserido automaticamente se você digitar só o domínio |
| 🔁 **Virtual Hosts** | Suporte nativo a domínios `.local` (Apache/Nginx com VirtualHosts) |
| 💾 **Configurações Persistidas** | URL e token ficam salvos entre sessões do VS Code |
| 🎨 **Design Glassmorphic** | Interface moderna com tema escuro integrado ao VS Code |

---

## Pré-requisitos

Antes de usar a extensão, você precisa ter:

### 1. Ngrok instalado globalmente

Baixe e instale o Ngrok em [ngrok.com/download](https://ngrok.com/download), depois confirme a instalação:

```bash
ngrok version
# ngrok version 3.x.x
```

> 💡 No Windows, garanta que o executável `ngrok` esteja no `PATH` do sistema para que o terminal do VS Code possa encontrá-lo.

### 2. Conta e Authtoken do Ngrok (Obrigatório)

Crie sua conta gratuita em [dashboard.ngrok.com/signup](https://dashboard.ngrok.com/signup).

O **Authtoken** é **obrigatório** para que o Ngrok consiga gerar a URL pública e o QR Code, mesmo na versão gratuita. Sem ele, a extensão não conseguirá estabelecer o túnel.

---

## Instalação

### Via VS Code Marketplace (Recomendado)

1. Acesse a página do [Visual Studio Marketplace](https://marketplace.visualstudio.com/items?itemName=Brandev.antigravity-ngrok-share) e clique em **Install**, OU
2. No seu VS Code, abra o painel de **Extensões** (`Ctrl+Shift+X`), pesquise por `Ngrok Share QR Code` ou `Brandev` e clique em **Instalar**.

### Via VSIX (Instalação Local)

1. Abra o VS Code
2. Pressione `Ctrl+Shift+X` para abrir o painel de **Extensões**
3. Clique no ícone de **três pontos `...`** no canto superior direito
4. Selecione **"Instalar de VSIX..."**
5. Navegue até o arquivo baixado do Ngrok Share e confirme
6. Após a instalação, execute **`Developer: Reload Window`** via `Ctrl+Shift+P`

> ⚠️ Recarregar a janela é obrigatório para limpar o cache da versão anterior.

---

## Como usar

### Passo 1 — Abra o painel

Clique no ícone da extensão na **Activity Bar** (barra lateral esquerda do VS Code). O painel **Ngrok Share** abrirá automaticamente.

```
┌─────────────────────────────┐
│  NGROK SHARE   ● Desconectado│
├─────────────────────────────┤
│  ┌─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─┐  │
│  │  Aguardando Túnel     │  │
│  │       Ativo           │  │
│  └ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┘  │
│                             │
│  URL LOCAL (ALVO)           │
│  ┌─────────────────────┐    │
│  │ https://meu.local   │    │
│  └─────────────────────┘    │
│                             │
│  TOKEN DE ACESSO            │
│  ┌─────────────────┬──┬──┐  │
│  │ ••••••••••••••• │👁│📋│  │
│  └─────────────────┴──┴──┘  │
│                             │
│  [ Atualizar ] [Criar Conta]│
└─────────────────────────────┘
```

### Passo 2 — Configure a URL local

No campo **URL Local (Alvo)**, digite o endereço do seu servidor local.

Exemplos válidos:

```
https://meusite.local          ← domínio .local (Apache/Nginx VirtualHost)
http://localhost:3000           ← Node.js / Next.js / Vite
http://127.0.0.1:8080           ← qualquer porta local
saldaomogi.local                ← sem protocolo? sem problema! https:// é adicionado automaticamente
```

> ✨ **Dica:** Você não precisa digitar `https://`. A extensão adiciona o protocolo automaticamente se estiver faltando.

### Passo 3 — Adicione seu Authtoken (Obrigatório)

Cole seu **Authtoken** do Ngrok no campo dedicado. Para encontrá-lo:

1. Acesse [dashboard.ngrok.com/authtokens](https://dashboard.ngrok.com/authtokens)
2. Copie o token e cole no campo da extensão
3. Use o botão 👁 para mostrar/ocultar o token
4. Use o botão 📋 para copiar rapidamente

### Passo 4 — Clique em "Atualizar"

Ao clicar no botão **Atualizar**:

1. ✅ A URL e o token são **salvos automaticamente**
2. ✅ Um terminal **"Ngrok Share"** é aberto no VS Code com o comando correto
3. ✅ O painel mostra um **spinner animado** enquanto aguarda o túnel
4. ✅ O **QR Code** aparece automaticamente assim que o Ngrok responde (em ~3 segundos)

```
Comando executado no terminal:
ngrok http https://meusite.local --host-header=rewrite --authtoken=SEU_TOKEN
```

### Passo 5 — Compartilhe!

Escaneie o QR Code com seu celular ou envie o link público do Ngrok para quem precisar acessar seu projeto. 📱

---

## Configuração via `settings.json`

Você também pode configurar a extensão diretamente através do arquivo `settings.json` do VS Code. Isso é útil para agilizar o fluxo de trabalho e evitar ter que digitar as informações no painel:

- **Se você possui apenas um projeto principal:**
  Recomendamos inserir a URL local padrão e o seu Authtoken no `settings.json` global da IDE (**User Settings**). Dessa forma, a configuração estará disponível automaticamente em qualquer projeto ou janela do VS Code que você abrir.
  
- **Se você trabalha com múltiplos projetos (múltiplas URLs locais):**
  Recomendamos inserir as configurações no `settings.json` do **Workspace** (dentro da pasta `.vscode/settings.json` do seu respectivo projeto). Isso permite que cada projeto tenha sua própria URL local pré-configurada de forma totalmente independente.

### Exemplo de Configuração:

```json
{
  "ngrokShare.localUrl": "http://localhost:3000",
  "ngrokShare.authtoken": "SEU_AUTHTOKEN_AQUI"
}
```

> ⚠️ **Importante:** O **Authtoken é obrigatório** para o Ngrok conseguir gerar a URL pública e o QR Code, mesmo se você estiver utilizando o plano gratuito.


---

## Suporte a Virtual Hosts (`.local`)

A extensão tem suporte nativo a projetos Apache/Nginx configurados com Virtual Hosts locais. Quando a URL contém `.local` (ou qualquer domínio que não seja `localhost` / `127.0.0.1`), o parâmetro `--host-header=rewrite` é adicionado automaticamente ao comando Ngrok:

```bash
# URL: https://saldaomogi.local
ngrok http https://saldaomogi.local --host-header=rewrite --authtoken=...
```

Isso garante que o Ngrok repasse corretamente o cabeçalho `Host` para o Apache/Nginx, evitando redirecionamentos indesejados ou erros 404.

---

## Estrutura do Projeto

```
ngrok-share/
├── src/
│   ├── extension.ts          # Ponto de entrada da extensão
│   ├── webviewProvider.ts    # Painel lateral (UI + lógica)
│   └── configParser.ts       # Sondagem da API local do Ngrok
├── media/
│   └── icon.svg              # Ícone da extensão na Activity Bar
├── dist/
│   └── extension.js          # Bundle compilado (gerado pelo build)
├── package.json              # Manifesto da extensão VS Code
├── tsconfig.json             # Configuração TypeScript
└── antigravity-ngrok-share-1.0.1.vsix  # Instalador
```

---

## Desenvolvimento

### Clonar e instalar dependências

```bash
git clone <repositório>
cd ngrok-share
npm install
```

### Compilar

```bash
# Build de desenvolvimento
npm run build

# Observar alterações em tempo real
npm run watch
```

### Empacotar o instalador VSIX

```bash
npx @vscode/vsce package
```

### Executar em modo de desenvolvimento

1. Abra a pasta do projeto no VS Code
2. Pressione `F5` para abrir uma nova janela do VS Code com a extensão carregada
3. Faça alterações no código → rode `npm run build` → recarregue a janela de desenvolvimento (`Ctrl+Shift+P` → `Developer: Reload Window`)

---

## Como funciona internamente

```
┌──────────────────────────────────────────────────┐
│                   VS Code                         │
│                                                   │
│  ┌─────────────────┐    postMessage    ┌────────┐ │
│  │  Extension Host  │ ──────────────▶ │Webview │ │
│  │  (Node.js)       │                 │ (HTML) │ │
│  │                  │ ◀────────────── │        │ │
│  └────────┬─────────┘    postMessage  └────────┘ │
│           │                                       │
│           │ http.request (timeout: 1s)            │
│           ▼                                       │
│  ┌─────────────────┐                             │
│  │  Ngrok Local API │  localhost:4040/api/tunnels │
│  │  (porta 4040-42) │                             │
│  └─────────────────┘                             │
└──────────────────────────────────────────────────┘
```

1. **Carregamento zero-blocking**: a configuração salva é embutida diretamente no HTML gerado — sem esperar mensagens assíncronas
2. **Sondagem em background**: após o HTML carregar, a extensão sonda silenciosamente as portas `4040`, `4041` e `4042` da API local do Ngrok
3. **QR Code assíncrono**: quando o túnel é detectado, o QR Code é gerado e enviado via `postMessage` para a webview — com o painel já totalmente carregado e responsivo

---

## Solução de Problemas

| Sintoma | Causa Provável | Solução |
|---|---|---|
| QR Code não aparece | Ngrok ainda não iniciou | Aguarde 3-5 segundos após clicar Atualizar |
| Erro "ngrok: command not found" | Ngrok não está no PATH | Instale o Ngrok e adicione ao PATH do sistema |
| Túnel expira rapidamente | Sem authtoken configurado | Crie uma conta e adicione seu authtoken |
| Erro 404 ao acessar a URL | `--host-header` ausente | Use a URL exata configurada no VirtualHost |
| Painel mostra "Sem URL Local" | Campo em branco | Digite a URL local e clique em Atualizar |

---

## Licença

MIT © [Brandev Tech](https://brandev.com.br)

---

<div align="center">

Feito com ❤️ pela equipe **Brandev Tech**

</div>
