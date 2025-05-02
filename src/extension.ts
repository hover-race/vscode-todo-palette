// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "todo-list" is now active!');

	// Create a status bar item
	const myStatusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
	myStatusBarItem.text = `$(checklist) TODOs`; // Example text with an icon
	myStatusBarItem.tooltip = `View TODO List`;
	// Optionally, assign a command to run when the item is clicked
	// myStatusBarItem.command = 'todo-list.showList'; // Example command ID
	myStatusBarItem.show();

	// Add the status bar item to the context's subscriptions so it's disposed automatically
	context.subscriptions.push(myStatusBarItem);

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json
	const disposable = vscode.commands.registerCommand('todo-list.helloWorld', () => {
		// The code you place here will be executed every time your command is executed
		// Display a message box to the user
		vscode.window.showInformationMessage('Hello World from TODO List!');
	});

	context.subscriptions.push(disposable);

	const combobulateDisposable = vscode.commands.registerCommand('todo-list.combobulate', () => {
		vscode.window.showInformationMessage('Combobulating...');
	});

	context.subscriptions.push(combobulateDisposable);
}

// This method is called when your extension is deactivated
export function deactivate() {}
