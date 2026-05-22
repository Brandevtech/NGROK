import * as vscode from 'vscode';
import { NgrokShareProvider } from './webviewProvider';

export function activate(context: vscode.ExtensionContext) {
    console.log('Antigravity Ngrok Share Extension is now active.');

    const provider = new NgrokShareProvider(context);

    // Register Webview Provider for the sidebar view
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(NgrokShareProvider.viewType, provider)
    );

    // Register Refresh command
    let refreshCommand = vscode.commands.registerCommand('ngrok-share.refresh', () => {
        provider.refresh();
    });

    context.subscriptions.push(refreshCommand);
}

export function deactivate() {}
