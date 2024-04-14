// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import axios from 'axios';
import * as config from './config.json';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	console.log('Congratulations, your extension "smart-contract-generator" is now active!');

	let disposable = vscode.commands.registerCommand('smart-contract-generator.generateSmartContract', async () => {
		const editor = vscode.window.activeTextEditor;
		if (!editor) {
			vscode.window.showInformationMessage('Open a file to generate code');
			return;
		}

		const prompt = editor.document.getText(editor.selection);
		const selectionStart = editor.selection.start;
		const selectionEnd = editor.selection.end;

		if (editor.selection.isEmpty) {
			vscode.window.showErrorMessage('Please select some text to generate code.');
			return;
		}

		console.log("Selected text:", prompt);

		if (!isValidComment(prompt)) {
			vscode.window.showErrorMessage('Selected text is not a valid comment. Please select text within /* block comments */ or // line comments.');
			return;
		}

		const action = await vscode.window.showInformationMessage("What language are you using?", "TypeScript", "Rust");
		const programmingLanguage = action?.toLowerCase();

		console.log("Programming language:", programmingLanguage);

		if (!programmingLanguage) { return; }

		try {
			const extractedPrompt = extractPromptFromComment(prompt);
			const response = await axios.post(config.backendUrl, { description: extractedPrompt, language: programmingLanguage }, {
				headers: { 'Content-Type': 'application/json' }
			});

			insertTemporaryCode(editor, new vscode.Selection(selectionStart, selectionEnd), response.data.code);

		} catch (error) {
			console.error("Error with custom backend:", error);
			const errorMessage = (error as Error).message;
			vscode.window.showErrorMessage(`Failed to generate code: ${errorMessage}`);
		}
	});

	context.subscriptions.push(disposable);
}

async function insertTemporaryCode(editor: vscode.TextEditor, selection: vscode.Selection, code: string) {
	const insertionPoint = new vscode.Position(selection.end.line, selection.end.character); // Declare the insertionPoint variable
	editor.edit(editBuilder => {
		editBuilder.insert(insertionPoint, `\n${code}\n\n`);
		editor.selection = new vscode.Selection(selection.start, selection.end);
	});

	const lines = code.split("\n");
	const newEnd = insertionPoint.translate(lines.length, lines[lines.length - 1].length);
	const insertedRange = new vscode.Range(insertionPoint, newEnd);

	const decoration = vscode.window.createTextEditorDecorationType({
		backgroundColor: 'rgba(255,255,0,0.3)',
		isWholeLine: false
	});
	editor.setDecorations(decoration, [insertedRange]);

	const action = await vscode.window.showInformationMessage("Do you want to accept the generated code?", "Accept", "Regenerate", "Discard");

	switch (action) {
		case "Accept":
			editor.selection = new vscode.Selection(selection.start, selection.end);
			decoration.dispose();
			break;
		case "Regenerate":
			decoration.dispose();
			editor.edit(editBuilder => editBuilder.delete(insertedRange));
			editor.selection = new vscode.Selection(selection.start, selection.end);
			vscode.commands.executeCommand('smart-contract-generator.generateSmartContract');
			break;
		case "Discard":
			decoration.dispose();
			editor.edit(editBuilder => editBuilder.delete(insertedRange));
			editor.selection = new vscode.Selection(selection.start, selection.end);
			break;
	}
}

function isValidComment(text: string): boolean {
	const lines = text.split('\n').map(line => line.trim());
	return (lines[0].startsWith('/*') && lines[lines.length - 1].endsWith('*/')) || lines.every(line => line.startsWith('//') || line.trim() === '');
}

function extractPromptFromComment(comment: string): string {
	const lines = comment.split('\n');
	return lines.map(line => {
		if (line.trim().startsWith('/*') || line.trim().endsWith('*/')) {
			return line.replace(/\/\*|\*\//g, '').trim(); // Remove block comment markers and trim
		} else if (line.trim().startsWith('//')) {
			return line.trim().substring(2).trim(); // Remove line comment markers and trim
		}
		return line.trim(); // Return line trimmed (fallback, in case of no markers)
	}).join('\n');
}

// This method is called when your extension is deactivated
export function deactivate() { }
