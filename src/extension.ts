// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

// Helper function to get the path to the .todo file
function getTodoFilePath(): string | undefined {
	const workspaceFolders = vscode.workspace.workspaceFolders;
	if (!workspaceFolders || workspaceFolders.length === 0) {
		vscode.window.showErrorMessage("No workspace folder open to store TODO list.");
		return undefined;
	}
	// Use the first workspace folder
	const folderPath = workspaceFolders[0].uri.fsPath;
	return path.join(folderPath, '.todo');
}

// Helper function to load tasks from the file
async function loadTodoItems(): Promise<string[]> {
	const filePath = getTodoFilePath();
	if (!filePath) return []; // Return empty if no path

	try {
		// Check if file exists
		await fs.promises.access(filePath, fs.constants.F_OK);
		// Read file
		const fileContent = await fs.promises.readFile(filePath, 'utf8');
		// Split into lines, filter out empty lines
		return fileContent.split(/\r?\n/).filter(line => line.trim() !== '');
	} catch (error) {
		if (error instanceof Error && (error as NodeJS.ErrnoException).code === 'ENOENT') {
			// File doesn't exist, return empty list (first run)
			return [];
		} else {
			// Other error reading file
			vscode.window.showErrorMessage(`Error loading TODO list: ${error instanceof Error ? error.message : String(error)}`);
			return []; // Return empty on error
		}
	}
}

// Helper function to save tasks to the file
async function saveTodoItems(items: string[]): Promise<void> {
	console.log(`rrrrr saveTodoItems: ${items}`);
	const filePath = getTodoFilePath();
	if (!filePath) return; // Don't save if no path

	try {
		const fileContent = items.join('\n');
		await fs.promises.writeFile(filePath, fileContent, 'utf8');
	} catch (error) {
		vscode.window.showErrorMessage(`Error saving TODO list: ${error instanceof Error ? error.message : String(error)}`);
	}
}

// Helper function to update the status bar based on the latest pending task
function updateStatusBar(items: string[], statusBarItem: vscode.StatusBarItem): void {
	let latestPendingTask: string | undefined = undefined;
	for (let i = items.length - 1; i >= 0; i--) {
		if (!items[i].endsWith(' [DONE]')) {
			latestPendingTask = items[i];
			break;
		}
	}

	if (latestPendingTask) {
		statusBarItem.text = `$(checklist) TODO: ${latestPendingTask}`;
		statusBarItem.tooltip = `Latest pending TODO: ${latestPendingTask}`;
	} else {
		// All tasks done or list is empty
		statusBarItem.text = `$(check) All tasks done!`;
		statusBarItem.tooltip = `All TODO tasks are completed.`;
	}
	statusBarItem.show(); // Ensure it's visible
}

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export async function activate(context: vscode.ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "todo-list" is now active!');

	// Load TODO items from file or initialize if empty
	let todoItems: string[] = await loadTodoItems();
	console.log(`rrrrr loaded todoItems: ${todoItems}`);
	// // Simple in-memory storage for TODO items - replaced by loading
	// let todoItems: string[] = ['Task A', 'Task B']; // Shared list

	// Create a status bar item
	const myStatusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
	// Initial status bar update after loading
	updateStatusBar(todoItems, myStatusBarItem); 
	// myStatusBarItem.text = `$(checklist) TODOs`; // Example text with an icon - replaced by updateStatusBar
	// myStatusBarItem.tooltip = `View TODO List`; // - replaced by updateStatusBar
	myStatusBarItem.command = 'todo-list.showList'; // Assign the command to show the list
	// myStatusBarItem.show(); // Already called in updateStatusBar

	// Add the status bar item to the context's subscriptions so it's disposed automatically
	context.subscriptions.push(myStatusBarItem);

	// --- File Watcher for .todo file ---
	const todoFilePath = getTodoFilePath();
	if (todoFilePath) {
		const watcher = vscode.workspace.createFileSystemWatcher(new vscode.RelativePattern(vscode.workspace.workspaceFolders![0], path.basename(todoFilePath)));

		watcher.onDidChange(async () => {
			console.log('.todo file changed, reloading...');
			const newItems = await loadTodoItems();
			// Update the shared list - crucial to reassign for other commands to see the change
			todoItems = newItems; 
			updateStatusBar(todoItems, myStatusBarItem);
			vscode.window.showInformationMessage('TODO list reloaded from file.'); // Optional user feedback
		});

		// Add watcher to subscriptions for cleanup on deactivation
		context.subscriptions.push(watcher);
	} else {
		console.warn('Could not get .todo file path, watcher not started.');
	}

	// --- TODO Commands ---

	// Command to show the TODO list dropdown
	const showListDisposable = vscode.commands.registerCommand('todo-list.showList', async () => {
		// Use the shared todoItems list

		// Function to display the Quick Pick, allowing it to be called recursively
		const showPicker = async () => {
			// Map todoItems to QuickPickItems with status prefixes
			const taskItems: vscode.QuickPickItem[] = todoItems.map(item => {
				if (item.endsWith(' [DONE]')) {
					const baseTask = item.replace(' [DONE]', '');
					return {
						label: `✅ ${baseTask}`, // Use green check emoji
						originalTask: item // Store original for reference
					};
				} else {
					return {
						label: `⬜️ ${item}`, // Use empty checkmark emoji
						originalTask: item // Store original for reference
					};
				}
			});

			// Special options
			const addNewOptionLabel = "➕ Add New Task";
			const clearAllOptionLabel = "🗑️ Clear All Tasks"; // User updated this emoji
			const addNewOptionItem: vscode.QuickPickItem = { label: addNewOptionLabel };
			const clearAllOptionItem: vscode.QuickPickItem = { label: clearAllOptionLabel };

			// Combine tasks and special options
			const quickPickItems = [...taskItems, addNewOptionItem, clearAllOptionItem];

			const selectedQuickPickItem = await vscode.window.showQuickPick<vscode.QuickPickItem & { originalTask?: string }>(quickPickItems, {
				placeHolder: 'Select a TODO item, Add New, or Clear All',
				// Keep the picker open if the user selects an item to toggle
				ignoreFocusOut: true // Helps keep it open, but re-showing is the key
			});

			if (selectedQuickPickItem) {
				if (selectedQuickPickItem.label === addNewOptionLabel) {
					// Trigger the Add TODO command - this exits the loop implicitly
					await vscode.commands.executeCommand('todo-list.addTodo');
					// Picker will close after input box, no need to re-show here
					return; // Exit the showPicker function
				} else if (selectedQuickPickItem.label === clearAllOptionLabel) {
					// Handle clearing all tasks
					const confirm = await vscode.window.showWarningMessage(
						'Are you sure you want to clear all TODO items? This cannot be undone.',
						{ modal: true },
						'Yes, Clear All'
					);
					if (confirm === 'Yes, Clear All') {
						todoItems.length = 0; // Clear the array
						await saveTodoItems(todoItems);
						updateStatusBar(todoItems, myStatusBarItem);
						vscode.window.showInformationMessage('TODO list cleared.');
						// Exit the picker after clearing
						return; // Exit the showPicker function
					} else {
						// User cancelled clear, show the picker again
						await showPicker(); // Re-show picker
					}
				} else {
					// Otherwise, toggle the done status of the selected task
					const originalTask = selectedQuickPickItem.originalTask;
					if (originalTask) {
						const index = todoItems.findIndex(item => item === originalTask);
						if (index !== -1) {
							let taskDescriptionForMessage = '';
							if (originalTask.endsWith(' [DONE]')) {
								// Mark as pending - JUST update status, no reorder here
								const baseTask = originalTask.replace(' [DONE]', '');
								taskDescriptionForMessage = baseTask;
								todoItems[index] = baseTask; // Update in place
								// todoItems.splice(index, 1);
								// const firstDoneIndex = todoItems.findIndex(item => item.endsWith(' [DONE]'));
								// if (firstDoneIndex !== -1) {
								// 	todoItems.splice(firstDoneIndex, 0, baseTask);
								// } else {
								// 	todoItems.push(baseTask);
								// }
							} else {
								// Mark as done - JUST update status, no reorder here
								const doneTask = `${originalTask} [DONE]`;
								taskDescriptionForMessage = originalTask;
								todoItems[index] = doneTask; // Update in place
								// todoItems.splice(index, 1);
								// const firstDoneIndex = todoItems.findIndex(item => item.endsWith(' [DONE]'));
								// if (firstDoneIndex !== -1) {
								// 	todoItems.splice(firstDoneIndex, 0, doneTask);
								// } else {
								// 	todoItems.push(doneTask);
								// }
							}
							// Save the status change immediately
							await saveTodoItems(todoItems); // Save status change
							updateStatusBar(todoItems, myStatusBarItem); // Update status bar

							// Re-show the picker with updated status but original order
							await showPicker();

							// --- Reordering after picker is closed ---
							const pendingItems = todoItems.filter(item => !item.endsWith(' [DONE]'));
							const doneItems = todoItems.filter(item => item.endsWith(' [DONE]'));
							const reorderedItems = [...pendingItems, ...doneItems];

							// Check if reordering actually changed the array to avoid unnecessary save/update
							if (JSON.stringify(todoItems) !== JSON.stringify(reorderedItems)) {
								console.log("Reordering TODO list after picker closed.");
								todoItems = reorderedItems; // Update the main list
								await saveTodoItems(todoItems); // Save the final reordered list
								updateStatusBar(todoItems, myStatusBarItem); // Update status bar with final order
							}
						} else {
							vscode.window.showWarningMessage(`Could not find task to toggle: ${originalTask}`);
							await showPicker(); // Re-show picker even on error
						}
					} else {
						// Should not happen with current logic, but good practice
						vscode.window.showWarningMessage('Selected item had no original task data.');
						await showPicker(); // Re-show picker
					}
				}
			}
			// If selectedQuickPickItem is undefined (user pressed Esc), the function naturally exits
		};

		// Initial call to show the picker
		await showPicker();
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
			// Add new task to the beginning of the list
			todoItems.unshift(newTask);
			vscode.window.showInformationMessage(`Added TODO: ${newTask}`);
			console.log(`rrrrr Added TODO: ${newTask}`);
			await saveTodoItems(todoItems); // Save after adding
			updateStatusBar(todoItems, myStatusBarItem); // Update status bar


			// Optionally, update the status bar or refresh the list view if you have one - Handled by updateStatusBar
			// // Update status bar to show the latest task - Handled by updateStatusBar
			// myStatusBarItem.text = `$(checklist) TODO: ${newTask}`;
			// myStatusBarItem.tooltip = `Latest TODO: ${newTask}`; // Update tooltip too

		} else if (taskDescription !== undefined) {
            // Handle empty input if the user didn't cancel
            vscode.window.showWarningMessage('Cannot add an empty TODO task.');
        }
	});
	context.subscriptions.push(addTodoDisposable);

	// Command to mark a specific task as done via Quick Pick - REMOVED
	/*
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
	*/

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
