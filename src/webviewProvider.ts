import * as vscode from 'vscode';
import * as QRCode from 'qrcode';
import { fetchNgrokPublicUrl } from './configParser';

export class NgrokShareProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'ngrok-share.sidebar';
    private _view?: vscode.WebviewView;

    constructor(private readonly _context: vscode.ExtensionContext) {}

    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        _context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken
    ) {
        this._view = webviewView;

        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this._context.extensionUri]
        };

        // Handle messages from the webview
        webviewView.webview.onDidReceiveMessage(async (data) => {
            switch (data.command) {
                case 'copyText': {
                    if (data.text) {
                        await vscode.env.clipboard.writeText(data.text);
                        vscode.window.showInformationMessage(`${data.label || 'Texto'} copiado para a área de transferência!`);
                    }
                    break;
                }
                case 'openLink': {
                    if (data.url) {
                        vscode.env.openExternal(vscode.Uri.parse(data.url));
                    }
                    break;
                }
                case 'refresh': {
                    if (data.localUrl !== undefined) {
                        await this._context.workspaceState.update('localUrl', data.localUrl);
                    }
                    if (data.token !== undefined) {
                        await this._context.workspaceState.update('authtoken', data.token);
                    }
                    if (data.localUrl) {
                        this.startNgrokTunnel(data.localUrl);
                    }
                    vscode.window.showInformationMessage('Configurações atualizadas! Iniciando túnel Ngrok...');
                    break;
                }
                case 'showError': {
                    if (data.message) {
                        vscode.window.showErrorMessage(data.message);
                    }
                    break;
                }
                case 'probeNgrok': {
                    // Webview asked us to probe ngrok and send back the QR
                    if (data.localUrl) {
                        this._probeAndUpdateQr(data.localUrl);
                    }
                    break;
                }
            }
        });

        // Embed config directly into HTML — zero race conditions
        const localUrl = this._getEffectiveUrl();
        const token = this._getEffectiveToken();
        webviewView.webview.html = this._getHtmlForWebview(localUrl, token);

        // Probe ngrok in background — send QR via postMessage when ready
        if (localUrl) {
            this._probeAndUpdateQr(localUrl);
        }

        // Auto-refresh panel when the user saves settings.json
        vscode.workspace.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration('ngrokShare')) {
                this.refresh();
            }
        });
    }

    /**
     * Called from the refresh command button in VS Code toolbar.
     * Re-renders the HTML with current stored values (instant, no async).
     */
    public refresh() {
        if (!this._view) {
            return;
        }
        const localUrl = this._getEffectiveUrl();
        const token = this._getEffectiveToken();
        this._view.webview.html = this._getHtmlForWebview(localUrl, token);
        if (localUrl) {
            this._probeAndUpdateQr(localUrl);
        }
    }

    /**
     * Priority chain for URL:
     *   1. workspaceState (saved via UI panel)   — most specific
     *   2. workspace settings.json               — team/project default
     *   3. user settings.json                    — global default
     *   4. empty string
     */
    private _getEffectiveUrl(): string {
        const fromState = this._context.workspaceState.get<string>('localUrl');
        if (fromState) { return fromState; }
        const cfg = vscode.workspace.getConfiguration('ngrokShare');
        return cfg.get<string>('localUrl', '');
    }

    /**
     * Priority chain for token (same logic as URL).
     */
    private _getEffectiveToken(): string {
        const fromState = this._context.workspaceState.get<string>('authtoken');
        if (fromState) { return fromState; }
        const cfg = vscode.workspace.getConfiguration('ngrokShare');
        return cfg.get<string>('authtoken', '');
    }

    /**
     * Probes ngrok local API ports for an active tunnel.
     * Sends the public URL + QR Code back to the webview via postMessage.
     * This runs fully in the background and never blocks the UI.
     */
    private async _probeAndUpdateQr(localUrl: string) {
        try {
            const publicUrl = await fetchNgrokPublicUrl(localUrl);
            if (!publicUrl || !this._view) {
                return;
            }

            let qrCodeDataUrl: string | undefined;
            try {
                qrCodeDataUrl = await QRCode.toDataURL(publicUrl, {
                    errorCorrectionLevel: 'Q',
                    margin: 1.5,
                    width: 256,
                    color: {
                        dark: '#0f172a',
                        light: '#ffffff'
                    }
                });
            } catch (err) {
                console.error('Failed to generate QR Code:', err);
            }

            // postMessage is safe here because by the time ngrok responds
            // (at least 1-3 seconds), the webview is definitely fully loaded
            this._view.webview.postMessage({
                command: 'showQr',
                publicUrl: publicUrl,
                qrCode: qrCodeDataUrl
            });
        } catch (e) {
            console.error('Error probing ngrok public URL:', e);
        }
    }

    private async startNgrokTunnel(localUrl: string) {
        try {
            const existingTerminal = vscode.window.terminals.find(t => t.name === 'Ngrok Share');
            if (existingTerminal) {
                existingTerminal.dispose();
                await new Promise(resolve => setTimeout(resolve, 800));
            }

            const terminal = vscode.window.createTerminal({
                name: 'Ngrok Share'
            });

            const token = this._context.workspaceState.get<string>('authtoken') || '';

            let command = `ngrok http ${localUrl}`;

            if (localUrl.includes('.local') || (!localUrl.includes('localhost') && !localUrl.includes('127.0.0.1'))) {
                command += ` --host-header=rewrite`;
            }

            if (token) {
                command += ` --authtoken=${token}`;
            }

            terminal.sendText(command);
            terminal.show(true);

            // After tunnel starts, probe for QR code
            setTimeout(() => {
                this._probeAndUpdateQr(localUrl);
            }, 3000);
        } catch (e: any) {
            vscode.window.showErrorMessage(`Falha ao iniciar o túnel Ngrok: ${e.message}`);
        }
    }

    private _getHtmlForWebview(localUrl: string, token: string): string {
        // Escape values for safe embedding in HTML attributes
        const safeUrl = localUrl.replace(/"/g, '&quot;').replace(/</g, '&lt;');
        const safeToken = token.replace(/"/g, '&quot;').replace(/</g, '&lt;');

        return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Ngrok Share</title>
    <style>
        :root {
            --primary: #38bdf8;
            --primary-hover: #0ea5e9;
            --bg-glass: rgba(255, 255, 255, 0.05);
            --border-glass: rgba(255, 255, 255, 0.08);
            --text-main: var(--vscode-foreground, #cccccc);
            --text-muted: var(--vscode-descriptionForeground, #888888);
            --font-family: var(--vscode-font-family, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif);
        }

        body {
            font-family: var(--font-family);
            background-color: transparent;
            color: var(--text-main);
            margin: 0;
            padding: 16px;
            box-sizing: border-box;
            user-select: none;
        }

        .container {
            display: flex;
            flex-direction: column;
            gap: 16px;
            max-width: 100%;
        }

        .card {
            background: var(--bg-glass);
            border: 1px solid var(--border-glass);
            border-radius: 12px;
            padding: 16px;
            backdrop-filter: blur(8px);
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .card:hover {
            border-color: rgba(56, 189, 248, 0.25);
            box-shadow: 0 6px 16px rgba(56, 189, 248, 0.08);
        }

        .header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 4px;
        }

        .header h2 {
            font-size: 16px;
            font-weight: 600;
            margin: 0;
            color: #ffffff;
            letter-spacing: 0.5px;
        }

        .status-badge {
            display: flex;
            align-items: center;
            gap: 6px;
            font-size: 11px;
            font-weight: 500;
            color: var(--text-muted);
            background: rgba(0, 0, 0, 0.2);
            padding: 3px 8px;
            border-radius: 20px;
            border: 1px solid var(--border-glass);
        }

        .status-dot {
            width: 7px;
            height: 7px;
            border-radius: 50%;
            background-color: #94a3b8;
            box-shadow: 0 0 8px #94a3b8;
            transition: all 0.3s ease;
        }

        .status-dot.active {
            background-color: #10b981;
            box-shadow: 0 0 8px #10b981;
        }

        .status-dot.missing {
            background-color: #f59e0b;
            box-shadow: 0 0 8px #f59e0b;
        }

        .qr-card {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 12px;
            padding: 20px;
            text-align: center;
        }

        .qr-wrapper {
            position: relative;
            background: #ffffff;
            padding: 12px;
            border-radius: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
            transition: transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
            max-width: 180px;
            max-height: 180px;
        }

        .qr-wrapper:hover {
            transform: scale(1.05);
        }

        .qr-image {
            width: 100%;
            height: 100%;
            display: block;
            border-radius: 4px;
        }

        .qr-hint {
            font-size: 11px;
            color: var(--text-muted);
            margin-top: 4px;
            line-height: 1.4;
        }

        .field {
            display: flex;
            flex-direction: column;
            gap: 6px;
        }

        .field-label {
            font-size: 11px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.8px;
            color: var(--primary);
        }

        .field-row {
            display: flex;
            align-items: center;
            gap: 8px;
            background: rgba(0, 0, 0, 0.25);
            border: 1px solid var(--border-glass);
            border-radius: 8px;
            padding: 8px 12px;
            font-size: 13px;
            position: relative;
            overflow: hidden;
        }

        .text-input {
            flex: 1;
            background: transparent;
            border: none;
            color: #f1f5f9;
            font-family: Consolas, "Courier New", monospace;
            font-size: 13px;
            outline: none;
            padding: 0;
            width: 100%;
        }

        .text-input::placeholder {
            color: var(--text-muted);
            opacity: 0.7;
        }

        .icon-btn {
            background: transparent;
            border: none;
            color: var(--text-muted);
            cursor: pointer;
            padding: 4px;
            border-radius: 4px;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.2s ease;
        }

        .icon-btn:hover {
            color: #ffffff;
            background: rgba(255, 255, 255, 0.08);
        }

        .icon-btn:active {
            transform: scale(0.9);
        }

        .btn-primary {
            background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%);
            color: #ffffff;
            border: none;
            padding: 10px 16px;
            border-radius: 8px;
            font-size: 13px;
            font-weight: 500;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            transition: all 0.2s ease;
            box-shadow: 0 4px 12px rgba(2, 132, 199, 0.2);
            width: 100%;
        }

        .btn-primary:hover {
            background: linear-gradient(135deg, #38bdf8 0%, #0284c7 100%);
            box-shadow: 0 4px 16px rgba(56, 189, 248, 0.3);
            transform: translateY(-1px);
        }

        .btn-primary:active {
            transform: translateY(1px);
        }

        .btn-secondary {
            background: transparent;
            color: #ffffff;
            border: 1px solid var(--border-glass);
            padding: 8px 16px;
            border-radius: 8px;
            font-size: 12px;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 6px;
            transition: all 0.2s ease;
            width: 100%;
            margin-top: 0px;
        }

        .btn-secondary:hover {
            background: rgba(255, 255, 255, 0.05);
            border-color: rgba(255, 255, 255, 0.2);
        }

        .error-card {
            display: flex;
            flex-direction: column;
            gap: 12px;
            border-left: 3px solid #f59e0b;
        }

        .error-title {
            font-weight: 600;
            color: #f59e0b;
            font-size: 13px;
            display: flex;
            align-items: center;
            gap: 6px;
        }

        .error-desc {
            font-size: 12px;
            color: var(--text-muted);
            line-height: 1.5;
        }

        .footer-logo {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 6px;
            font-size: 10px;
            color: var(--text-muted);
            margin-top: 16px;
            opacity: 0.6;
        }

        .spin {
            animation: spinner 0.8s linear infinite;
        }

        @keyframes spinner {
            to { transform: rotate(360deg); }
        }

        .qr-placeholder {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 24px;
            background: rgba(0, 0, 0, 0.25);
            border: 1px dashed var(--border-glass);
            border-radius: 12px;
            text-align: center;
            color: var(--text-main);
            min-height: 160px;
            box-sizing: border-box;
            width: 100%;
        }

        .qr-placeholder svg {
            margin-bottom: 12px;
            opacity: 0.85;
            color: var(--primary);
        }
    </style>
</head>
<body>
    <div class="container">
        <!-- Header -->
        <div class="header">
            <h2>NGROK SHARE</h2>
            <div class="status-badge">
                <span id="status-dot" class="status-dot ${localUrl ? '' : 'missing'}"></span>
                <span id="status-text">${localUrl ? 'Desconectado' : 'Sem URL Local'}</span>
            </div>
        </div>

        ${!localUrl ? `
        <div class="card error-card" style="margin-bottom: 0; border-left-color: #f59e0b;">
            <div class="error-title" style="color: #f59e0b;">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"/>
                    <line x1="12" y1="8" x2="12" y2="12"/>
                    <line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                URL Ausente
            </div>
            <div class="error-desc" style="font-size: 11px; margin-top: 4px;">
                Nenhuma URL local foi definida. Digite a URL desejada abaixo e clique em <strong>Atualizar</strong>.
            </div>
        </div>
        ` : ''}

        <!-- QR Code Card -->
        <div class="card qr-card" id="qr-card" style="margin-bottom: 0;">
            <div class="qr-placeholder" id="qr-placeholder">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <rect x="2" y="2" width="20" height="20" rx="2" ry="2"/>
                    <rect x="5" y="5" width="6" height="6"/>
                    <rect x="13" y="5" width="6" height="6"/>
                    <rect x="5" y="13" width="6" height="6"/>
                    <path d="M13 13h2v2h-2zM17 17h2v2h-2zM13 17h2v-2h2v-2h-2z"/>
                </svg>
                <div style="font-weight: 600; font-size: 13px; color: #f1f5f9;">Aguardando Túnel Ativo</div>
                <div style="font-size: 11px; color: var(--text-muted); max-width: 200px; margin-top: 4px; line-height: 1.4;">
                    Insira o endereço local abaixo e clique em <strong>Atualizar</strong> para iniciar o túnel.
                </div>
            </div>
        </div>

        <!-- Settings Card -->
        <div class="card" style="display: flex; flex-direction: column; gap: 12px; margin-bottom: 0;">
            <div class="field">
                <span class="field-label">URL Local (Alvo)</span>
                <div class="field-row">
                    <input type="text" id="local-url-input" class="text-input"
                        value="${safeUrl}"
                        placeholder="Ex: https://saldaomogi.local" />
                </div>
            </div>

            <div class="field">
                <span class="field-label">Token de Acesso (Authtoken)</span>
                <div class="field-row">
                    <input type="password" id="token-input" class="text-input"
                        value="${safeToken}"
                        placeholder="Opcional: seu authtoken do Ngrok" />
                    <button class="icon-btn" id="btn-toggle-token" title="Mostrar/Ocultar Token">
                        <svg id="toggle-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                            <circle cx="12" cy="12" r="3"/>
                        </svg>
                    </button>
                    <button class="icon-btn" id="btn-copy-token" title="Copiar Token">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" id="copy-token-icon">
                            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                        </svg>
                    </button>
                </div>
            </div>
        </div>

        <!-- Action Buttons -->
        <div style="display:flex; gap: 8px;">
            <button class="btn-primary" id="btn-refresh" style="flex: 1;">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" id="refresh-icon">
                    <path d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
                </svg>
                Atualizar
            </button>
            <button class="btn-secondary" id="btn-signup-ngrok" style="flex: 1; margin: 0;">
                Criar Conta
            </button>
        </div>

        <div class="footer-logo">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17h-2v-2h2v2zm2.07-7.75l-.9.92C13.45 12.9 13 13.5 13 15h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26c.37-.36.59-.86.59-1.41 0-1.1-.9-2-2-2s-2 .9-2 2H7c0-2.76 2.24-5 5-5s5 2.24 5 5c0 1.04-.42 1.99-1.07 2.75z"/>
            </svg>
            Brandev Tech
        </div>
    </div>

    <script>
        const vscode = acquireVsCodeApi();
        let tokenVisible = false;

        // Listen for background updates (QR code from ngrok probe)
        window.addEventListener('message', event => {
            const msg = event.data;
            if (msg.command === 'showQr') {
                showQrCode(msg.qrCode, msg.publicUrl);
            }
        });

        function resetQrToLoading() {
            const qrCard = document.getElementById('qr-card');
            const dot = document.getElementById('status-dot');
            const statusText = document.getElementById('status-text');
            if (qrCard) {
                qrCard.innerHTML =
                    '<div class="qr-placeholder" id="qr-placeholder">' +
                    '  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="spin">' +
                    '    <path d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>' +
                    '  </svg>' +
                    '  <div style="font-weight: 600; font-size: 13px; color: #f1f5f9; margin-top: 4px;">Iniciando túnel...</div>' +
                    '  <div style="font-size: 11px; color: var(--text-muted); margin-top: 4px;">Aguardando Ngrok responder</div>' +
                    '</div>';
            }
            if (dot) { dot.className = 'status-dot'; dot.style.backgroundColor = '#38bdf8'; dot.style.boxShadow = '0 0 8px #38bdf8'; }
            if (statusText) { statusText.innerText = 'Conectando...'; }
        }

        function showQrCode(qrDataUrl, publicUrl) {
            // Always target the stable parent #qr-card — never #qr-placeholder which disappears
            const qrCard = document.getElementById('qr-card');
            const dot = document.getElementById('status-dot');
            const statusText = document.getElementById('status-text');

            if (qrCard && qrDataUrl) {
                qrCard.innerHTML =
                    '<div class="qr-wrapper">' +
                    '  <img class="qr-image" src="' + qrDataUrl + '" alt="QR Code Ngrok" />' +
                    '</div>' +
                    '<div class="qr-hint">Escaneie o QR Code com seu celular para acessar o projeto.</div>';
            }

            if (dot) { dot.style.backgroundColor = ''; dot.style.boxShadow = ''; dot.className = 'status-dot active'; }
            if (statusText) { statusText.innerText = 'Ativo (Ngrok)'; }
        }

        // Toggle token visibility
        document.getElementById('btn-toggle-token').addEventListener('click', () => {
            tokenVisible = !tokenVisible;
            const input = document.getElementById('token-input');
            const icon = document.getElementById('toggle-icon');
            input.type = tokenVisible ? 'text' : 'password';
            if (tokenVisible) {
                icon.innerHTML =
                    '<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>' +
                    '<line x1="1" y1="1" x2="23" y2="23"/>';
            } else {
                icon.innerHTML =
                    '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>' +
                    '<circle cx="12" cy="12" r="3"/>';
            }
        });

        // Copy token
        document.getElementById('btn-copy-token').addEventListener('click', () => {
            const val = document.getElementById('token-input').value.trim();
            if (!val) { return; }
            const icon = document.getElementById('copy-token-icon');
            icon.innerHTML = '<polyline points="20 6 9 17 4 12"/>';
            vscode.postMessage({ command: 'copyText', text: val, label: 'Token' });
            setTimeout(() => {
                icon.innerHTML = '<rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>';
            }, 2000);
        });

        // Update / Start Tunnel
        document.getElementById('btn-refresh').addEventListener('click', () => {
            const refreshIcon = document.getElementById('refresh-icon');
            refreshIcon.classList.add('spin');

            let localUrl = document.getElementById('local-url-input').value.trim();
            const token = document.getElementById('token-input').value.trim();

            if (!localUrl) {
                vscode.postMessage({ command: 'showError', message: 'Defina uma URL local antes de atualizar!' });
                refreshIcon.classList.remove('spin');
                return;
            }

            // Auto-prepend https:// if missing
            if (!/^https?:\\/\\//i.test(localUrl)) {
                localUrl = 'https://' + localUrl;
                document.getElementById('local-url-input').value = localUrl;
            }

            setTimeout(() => refreshIcon.classList.remove('spin'), 2000);
            resetQrToLoading();
            vscode.postMessage({ command: 'refresh', localUrl: localUrl, token: token });
        });

        // Open Ngrok signup
        document.getElementById('btn-signup-ngrok').addEventListener('click', () => {
            vscode.postMessage({ command: 'openLink', url: 'https://dashboard.ngrok.com/signup' });
        });
    </script>
</body>
</html>`;
    }
}
