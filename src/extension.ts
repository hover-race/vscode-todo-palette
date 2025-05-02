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

		// Map todoItems to QuickPickItems with status icons
		const taskItems: vscode.QuickPickItem[] = todoItems.map(item => {
			if (item.endsWith(' [DONE]')) {
				const baseTask = item.replace(' [DONE]', '');
				return {
					label: `$(check) ${baseTask}`,
					description: "Done",
					originalTask: item // Store original for reference
				};
			} else {
				return {
					label: item,
					description: "Pending",
					originalTask: item // Store original for reference
				};
			}
		});

		// Special option for adding a new task
		const addNewOptionLabel = "$(add) Add New Task";
		const addNewOptionItem: vscode.QuickPickItem = { label: addNewOptionLabel };

		const quickPickItems = [...taskItems, addNewOptionItem]; // Combine tasks and add option

		const selectedQuickPickItem = await vscode.window.showQuickPick<vscode.QuickPickItem & { originalTask?: string }>(quickPickItems, {
			placeHolder: 'Select a TODO item or Add New',
			matchOnDescription: true // Optional: Allow searching description field
		});

		if (selectedQuickPickItem) {
			if (selectedQuickPickItem.label === addNewOptionLabel) {
				// Trigger the Add TODO command if the special option was selected
				vscode.commands.executeCommand('todo-list.addTodo');
			} else {
				// Otherwise, toggle the done status of the selected task
				const originalTask = selectedQuickPickItem.originalTask;
				if (originalTask) {
					const index = todoItems.findIndex(item => item === originalTask);
					if (index !== -1) {
						if (originalTask.endsWith(' [DONE]')) {
							// Mark as pending (remove [DONE])
							const baseTask = originalTask.replace(' [DONE]', '');
							todoItems[index] = baseTask;
							vscode.window.showInformationMessage(`Marked as pending: ${baseTask}`);
						} else {
							// Mark as done (append [DONE])
							todoItems[index] = `${originalTask} [DONE]`;
							vscode.window.showInformationMessage(`Marked as done: ${originalTask}`);
						}
						// Optionally update status bar if the toggled item was the latest one
						// This simple logic might need refinement for perfect status bar updates
					} else {
						vscode.window.showWarningMessage(`Could not find task to toggle: ${originalTask}`);
					}
				}
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
