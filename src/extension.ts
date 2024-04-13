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

		let prompt = editor.document.getText(editor.selection);

		const selectionStart = editor.selection.start;
		const selectionEnd = editor.selection.end;

		if (editor.selection.isEmpty) {
            vscode.window.showErrorMessage('Please select some text to generate code.');
            return;
        }

		if (!isValidComment(prompt)) {
            vscode.window.showErrorMessage('Selected text is not a valid comment. Please select text within /* block comments */ or // line comments.');
            return;
        }

		try {
			prompt = extractPromptFromComment(prompt);
			const response = "sample text";
			// const response = await axios.post(config.backendUrl, { prompt }, {
			// 	headers: { 'Content-Type': 'application/json' }
			// });

			const code = response;

			await appendTextAfterSelection(editor, {startOfSelection: selectionStart, endOfSelection: selectionEnd}, code, prompt);
		} catch (error) {
			console.error("Error with custom backend:", error);
			vscode.window.showErrorMessage("Failed to generate code. See console for details.");
		}
	});

	context.subscriptions.push(disposable);
}

async function appendTextAfterSelection(editor: vscode.TextEditor, selection: {startOfSelection: vscode.Position, endOfSelection: vscode.Position}, newText: string, originalText: string) {
    const insertionPoint = new vscode.Position(selection.endOfSelection.line + 1, 0); // Position after the comment block

    await editor.edit(editBuilder => {
        editBuilder.insert(insertionPoint, `\n${newText}\n\n`);
    });

    // Re-select the original comment
    editor.selection = new vscode.Selection(selection.startOfSelection, selection.endOfSelection);

	promptUserToAccept(editor, insertionPoint, newText, selection);
}

async function promptUserToAccept(editor: vscode.TextEditor, insertionPoint: vscode.Position, code: string, selection: {startOfSelection: vscode.Position, endOfSelection: vscode.Position}) {
	const action = await vscode.window.showInformationMessage("Accept the generated code?", "Accept", "Regenerate");
	if (action === "Regenerate") {
		editor.edit(editBuilder => {// Remove the generated code
			const endOfSelection = editor.selection.end.line;
			const lastGeneratedRange = new vscode.Range(insertionPoint, insertionPoint.translate(code.split("\n").length + 2, 0));

			editBuilder.delete(lastGeneratedRange);
		});

		editor.selection = new vscode.Selection(selection.startOfSelection, selection.endOfSelection);

		vscode.commands.executeCommand('smart-contract-generator.generateSmartContract');
	}
}

function highlightText(editor: vscode.TextEditor, newText: string) {
	let startPos = editor.selection.start;
	let endPos = editor.selection.start.translate(0, newText.length);
	let newSelection = new vscode.Selection(startPos, endPos);
	editor.selection = newSelection;
}

function isValidComment(text: string): boolean {
    const lines = text.split('\n').map(line => line.trim());
    if (lines[0].startsWith('/*') && lines[lines.length - 1].endsWith('*/')) {
        return true; // Valid block comment
    } else if (lines.every(line => line.startsWith('//'))) {
        return true; // Valid line comment
    }
    return false; // Invalid comment
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
