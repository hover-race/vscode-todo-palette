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
		const addNewOption = "$(add) Add New Task"; // Special option
		const quickPickItems = [...todoItems, addNewOption]; // Add the option to the list

		const selectedItem = await vscode.window.showQuickPick(quickPickItems, {
			placeHolder: 'Select a TODO item or Add New', // Updated placeholder
		});

		if (selectedItem) {
			if (selectedItem === addNewOption) {
				// Trigger the Add TODO command if the special option was selected
				vscode.commands.executeCommand('todo-list.addTodo');
			} else {
				// Otherwise, show info about the selected task
				vscode.window.showInformationMessage(`Selected: ${selectedItem}`);
				// Add logic here for what to do when an item is selected (optional)
			}
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
			const newTask = taskDescription.trim();
			todoItems.push(newTask);
			vscode.window.showInformationMessage(`Added TODO: ${newTask}`);

			// --- Dynamically register a command for the new task ---
			// Sanitize task description for command ID
			const sanitizedTask = newTask.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_\-]/g, '');
			const dynamicCommandId = `ASDF.${sanitizedTask}`;

			// Register the command
			const dynamicCommandDisposable = vscode.commands.registerCommand(dynamicCommandId, () => {
				vscode.window.showInformationMessage(`Dynamic command triggered for: ${newTask}`);
				// You could potentially add logic here, like marking the task done
			});

			// Add the disposable to the context's subscriptions for cleanup
			context.subscriptions.push(dynamicCommandDisposable);
			console.log(`Registered dynamic command: ${dynamicCommandId}`);
			// ----------------------------------------------------

			// Optionally, update the status bar or refresh the list view if you have one
			// Update status bar to show the latest task
			myStatusBarItem.text = `$(checklist) TODO: ${newTask}`;
			myStatusBarItem.tooltip = `Latest TODO: ${newTask}`; // Update tooltip too

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
