// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import axios from 'axios';
import * as config from './config.json';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "smart-contract-generator" is now active!');

	let disposable = vscode.commands.registerCommand('smart-contract-generator.generateSmartContract', async () => {
		const editor = vscode.window.activeTextEditor;
		if (!editor) {
			vscode.window.showInformationMessage('Open a file to generate code');
			return;
		}

		const prompt = editor.document.getText(editor.selection);

		try {
			const response = await axios.post(config.backendUrl, { prompt }, {
				headers: { 'Content-Type': 'application/json' }
			});
			editor.edit(editBuilder => {
				editBuilder.replace(editor.selection, response.data.code);
			});
		} catch (error) {
			console.error("Error with custom backend:", error);
			vscode.window.showErrorMessage("Failed to generate code. See console for details.");
		}
	});

	context.subscriptions.push(disposable);
}

// This method is called when your extension is deactivated
export function deactivate() { }
