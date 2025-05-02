// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "todo-list" is now active!');

	// Simple in-memory storage for TODO items
	let todoItems: string[] = ['Task A', 'Task B']; // Shared list

	// Create a status bar item
	const myStatusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
	myStatusBarItem.text = `$(checklist) TODOs`; // Example text with an icon
	myStatusBarItem.tooltip = `View TODO List`;
	// Optionally, assign a command to run when the item is clicked
	myStatusBarItem.command = 'todo-list.showList'; // Assign the command to show the list
	myStatusBarItem.show();

	// Add the status bar item to the context's subscriptions so it's disposed automatically
	context.subscriptions.push(myStatusBarItem);

	// --- TODO Commands ---

	// Command to show the TODO list dropdown
	const showListDisposable = vscode.commands.registerCommand('todo-list.showList', async () => {
		// Use the shared todoItems list
		const selectedItem = await vscode.window.showQuickPick(todoItems, {
			placeHolder: 'Select a TODO item to view/manage', // Updated placeholder
		});

		if (selectedItem) {
			vscode.window.showInformationMessage(`Selected: ${selectedItem}`);
			// Add logic here for what to do when an item is selected
		}
	});
	context.subscriptions.push(showListDisposable);

	// Command to add a new TODO item
	const addTodoDisposable = vscode.commands.registerCommand('todo-list.addTodo', async () => {
		const taskDescription = await vscode.window.showInputBox({
			prompt: "Enter the description of the new TODO task",
			placeHolder: "e.g., Fix bug #123"
		});

		if (taskDescription && taskDescription.trim() !== '') {
			todoItems.push(taskDescription.trim());
			vscode.window.showInformationMessage(`Added TODO: ${taskDescription.trim()}`);
			// Optionally, update the status bar or refresh the list view if you have one
		} else if (taskDescription !== undefined) {
            // Handle empty input if the user didn't cancel
            vscode.window.showWarningMessage('Cannot add an empty TODO task.');
        }
	});
	context.subscriptions.push(addTodoDisposable);

	// Command to mark a specific task as done via Quick Pick
	const markTaskDoneDisposable = vscode.commands.registerCommand('todo-list.markTaskDone', async () => {
		const undoneItems = todoItems.filter(item => !item.endsWith(' [DONE]'));

		if (undoneItems.length === 0) {
			vscode.window.showInformationMessage('No pending TODO tasks to mark as done.');
			return;
		}

		// Add prefix for display
		const displayItems = undoneItems.map(item => `TODO: ${item}`);

		const selectedDisplayItem = await vscode.window.showQuickPick(displayItems, {
			placeHolder: 'Select a task to mark as done'
		});

		if (selectedDisplayItem) {
			// Remove prefix to get the original item
			const selectedItem = selectedDisplayItem.replace(/^TODO: /, ''); 

			// Find the original index in the main list
			const index = todoItems.findIndex(item => item === selectedItem);
			if (index !== -1) {
				todoItems[index] = `${selectedItem} [DONE]`;
				vscode.window.showInformationMessage(`Marked as done: ${selectedItem}`);
			}
		}
	});
	context.subscriptions.push(markTaskDoneDisposable);

	// --- Other Commands ---

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json
	const disposable = vscode.commands.registerCommand('todo-list.helloWorld', () => {
		// The code you place here will be executed every time your command is executed
		// Display a message box to the user
		vscode.window.showInformationMessage('Hello World from TODO List!');
	});

	context.subscriptions.push(disposable);

	const discombobulateDisposable = vscode.commands.registerCommand('todo-list.combobulate', () => {
		vscode.window.showInformationMessage('Discombobulating...');
	});

	context.subscriptions.push(discombobulateDisposable);
}

// This method is called when your extension is deactivated
export function deactivate() {}
