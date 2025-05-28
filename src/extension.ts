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

// Helper function to get the path to the .done file
function getDoneFilePath(): string | undefined {
	const workspaceFolders = vscode.workspace.workspaceFolders;
	if (!workspaceFolders || workspaceFolders.length === 0) {
		// No workspace, error already shown by getTodoFilePath usually
		return undefined;
	}
	const folderPath = workspaceFolders[0].uri.fsPath;
	return path.join(folderPath, '.done');
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

// Helper function to log a completed task to the .done file
async function logTaskDone(taskDescription: string): Promise<void> {
	const filePath = getDoneFilePath();
	if (!filePath) {
		console.warn("Could not get .done file path, skipping log.");
		return;
	}

	const now = new Date();
	const year = now.getFullYear();
	const month = (now.getMonth() + 1).toString().padStart(2, '0'); // Month is 0-indexed
	const day = now.getDate().toString().padStart(2, '0');
	const hours = now.getHours().toString().padStart(2, '0');
	const minutes = now.getMinutes().toString().padStart(2, '0');
	const timestamp = `${year}-${month}-${day} ${hours}:${minutes}`;

	const logEntry = `${timestamp} ${taskDescription}\n`; // Add newline

	try {
		let existingContent = '';
		try {
			// Read existing content if file exists
			existingContent = await fs.promises.readFile(filePath, 'utf8');
		} catch (readError) {
			if (readError instanceof Error && (readError as NodeJS.ErrnoException).code !== 'ENOENT') {
				// If it's an error other than file not found, re-throw it
				throw readError;
			}
			// If file doesn't exist (ENOENT), existingContent remains empty, which is fine
		}

		// Prepend the new entry to the existing content
		const newContent = logEntry + existingContent;

		// Write the entire new content back to the file, overwriting it
		await fs.promises.writeFile(filePath, newContent, 'utf8');

		// // Append to the file, creating it if it doesn't exist - OLD LOGIC
		// await fs.promises.appendFile(filePath, logEntry, 'utf8');
	} catch (error) {
		vscode.window.showErrorMessage(`Error writing to .done file: ${error instanceof Error ? error.message : String(error)}`);
	}
}

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export async function activate(context: vscode.ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "todo-list" is now active!');


	// Create a status bar item
	const myStatusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
	// Initial status bar update requires loading the list for the current workspace
	const initialItems = await loadTodoItems();
	updateStatusBar(initialItems, myStatusBarItem); 
	myStatusBarItem.command = 'todo-list.showList';
	context.subscriptions.push(myStatusBarItem);

	// --- File Watcher for .todo file ---
	const todoFilePath = getTodoFilePath(); // Get path for potential watcher setup
	if (todoFilePath) {
		// Base watcher on the specific file path derived from the current workspace
		const watcher = vscode.workspace.createFileSystemWatcher(new vscode.RelativePattern(vscode.workspace.workspaceFolders![0], path.basename(todoFilePath)));

		watcher.onDidChange(async () => {
			console.log('.todo file changed, reloading for current workspace...');
			// Load items specifically for the workspace the change occurred in
			const currentItems = await loadTodoItems();
			// // Update the shared list - REMOVED Global state
			// todoItems = newItems; 
			updateStatusBar(currentItems, myStatusBarItem);
		});

		// Add watcher to subscriptions for cleanup on deactivation
		context.subscriptions.push(watcher);
	} else {
		console.warn('Could not get .todo file path, watcher not started.');
	}

	// --- TODO Commands ---

	// Command to show the TODO list dropdown
	const showListDisposable = vscode.commands.registerCommand('todo-list.showList', async () => {
		// Load items for the *current* workspace each time the command is run
		let todoItems = await loadTodoItems();

		// Function to display the Quick Pick, now takes items and status bar as args
		const showPicker = async (items: string[], statusBarItem: vscode.StatusBarItem) => {
			// Map CURRENT todoItems to QuickPickItems
			const taskItems: vscode.QuickPickItem[] = items.map(item => {
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
			const clearAllOptionLabel = "🗑️ Clear All Tasks";
			const editFileOptionLabel = "📝 Edit .todo File";
			const addNewOptionItem: vscode.QuickPickItem = { label: addNewOptionLabel };
			const clearAllOptionItem: vscode.QuickPickItem = { label: clearAllOptionLabel };
			const editFileOptionItem: vscode.QuickPickItem = { label: editFileOptionLabel };

			// Create a QuickPick with onDidChangeValue handler
			const quickPick = vscode.window.createQuickPick<vscode.QuickPickItem & { originalTask?: string }>();
			quickPick.placeholder = 'Select a TODO item, Add New, Edit File, or Clear All';
			quickPick.ignoreFocusOut = true;

			// Add the dynamic "Add task" option when user types
			quickPick.onDidChangeValue((value) => {
				if (value.trim()) {
					const addTaskWithSearchItem: vscode.QuickPickItem = {
						label: `➕ Add task: "${value}"`,
						description: 'Press Enter to add this task'
					};
					quickPick.items = [addTaskWithSearchItem, ...taskItems, editFileOptionItem, clearAllOptionItem];
				} else {
					quickPick.items = [...taskItems, addNewOptionItem, editFileOptionItem, clearAllOptionItem];
				}
			});

			// Set initial items
			quickPick.items = [...taskItems, addNewOptionItem, editFileOptionItem, clearAllOptionItem];

			// Handle selection
			quickPick.onDidAccept(async () => {
				const selected = quickPick.selectedItems[0];
				if (!selected) return;

				if (selected.label.startsWith('➕ Add task: "')) {
					// Extract the task text from the label
					const taskText = selected.label.replace('➕ Add task: "', '').replace('"', '');
					// Add the new task
					let currentItems = await loadTodoItems();
					currentItems.unshift(taskText);
					await saveTodoItems(currentItems);
					updateStatusBar(currentItems, statusBarItem);
					vscode.window.showInformationMessage(`Added TODO: ${taskText}`);
					// Close the quick pick
					quickPick.hide();
					// Show the picker again with updated items
					await showPicker(currentItems, statusBarItem);
				} else if (selected.label === addNewOptionLabel) {
					// Trigger the Add TODO command
					await vscode.commands.executeCommand('todo-list.addTodo');
					// Reload items after add command finishes before showing picker again
					const updatedItems = await loadTodoItems(); 
					await showPicker(updatedItems, statusBarItem);
				} else if (selected.label === editFileOptionLabel) {
					// Handle editing the file
					const filePath = getTodoFilePath();
					if (filePath) {
						try {
							const document = await vscode.workspace.openTextDocument(filePath);
							await vscode.window.showTextDocument(document);
							// Exit the picker after opening the file
							return; 
						} catch (error) {
							vscode.window.showErrorMessage(`Error opening .todo file: ${error instanceof Error ? error.message : String(error)}`);
							// Still show picker again even if opening failed
							await showPicker(items, statusBarItem);
						}
					} else {
						vscode.window.showErrorMessage('Could not find .todo file path.');
						// Still show picker again
						await showPicker(items, statusBarItem);
					}
				} else if (selected.label === clearAllOptionLabel) {
					// Handle clearing all tasks
					const confirm = await vscode.window.showWarningMessage(
						'Are you sure you want to clear all TODO items? This cannot be undone.',
						{ modal: true },
						'Yes, Clear All'
					);
					if (confirm === 'Yes, Clear All') {
						// Use the 'items' passed into showPicker
						items.length = 0; // Clear the array
						await saveTodoItems(items); // Save empty list
						updateStatusBar(items, statusBarItem);
						vscode.window.showInformationMessage('TODO list cleared.');
						// Close the quick pick
						quickPick.hide();
						// Show the picker again with empty items
						await showPicker(items, statusBarItem);
					} else {
						// User cancelled clear, show the picker again with the same items
						await showPicker(items, statusBarItem); // Re-show picker
					}
				} else {
					// Toggle the done status of the selected task using the passed 'items'
					const originalTask = selected.originalTask;
					if (originalTask) {
						const index = items.findIndex(item => item === originalTask);
						if (index !== -1) {
							if (originalTask.endsWith(' [DONE]')) {
								const baseTask = originalTask.replace(' [DONE]', '');
								items[index] = baseTask; // Update in place
							} else {
								const doneTask = `${originalTask} [DONE]`;
								items[index] = doneTask; // Update in place
								// Log the task completion before saving the main list
								await logTaskDone(originalTask);
							}
							// Save the status change immediately
							await saveTodoItems(items); // Save status change
							updateStatusBar(items, statusBarItem); // Update status bar

							// Re-show the picker with updated status but original order
							await showPicker(items, statusBarItem);
						} else {
							vscode.window.showWarningMessage(`Could not find task to toggle: ${originalTask}`);
							await showPicker(items, statusBarItem); // Re-show picker even on error
						}
					} else {
						vscode.window.showWarningMessage('Selected item had no original task data.');
						await showPicker(items, statusBarItem); // Re-show picker
					}
				}
			});

			// Show the quick pick
			quickPick.show();
		};

		// Initial call to show the picker, passing the loaded items and status bar item
		await showPicker(todoItems, myStatusBarItem);

		// --- Reordering after picker is closed ---
		// Load the final list state before reordering, in case it was modified by addTodo/clearAll
		const finalItems = await loadTodoItems(); 
		const pendingItems = finalItems.filter(item => !item.endsWith(' [DONE]'));
		const doneItems = finalItems.filter(item => item.endsWith(' [DONE]'));
		const reorderedItems = [...pendingItems, ...doneItems];

		// Check if reordering actually changed the array 
		if (JSON.stringify(finalItems) !== JSON.stringify(reorderedItems)) {
			console.log("Reordering TODO list after picker closed.");
			// Save the final reordered list
			await saveTodoItems(reorderedItems); 
			// Update status bar with final order (using the reordered list)
			updateStatusBar(reorderedItems, myStatusBarItem); 
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
			// Load the current list for THIS workspace
			let currentItems = await loadTodoItems();
			const newTask = taskDescription.trim();
			// Add new task to the beginning of the loaded list
			currentItems.unshift(newTask);
			vscode.window.showInformationMessage(`Added TODO: ${newTask}`);
			// Save the modified list for THIS workspace
			await saveTodoItems(currentItems); 
			// Update status bar with the modified list
			updateStatusBar(currentItems, myStatusBarItem); 
		} else if (taskDescription !== undefined) {
            vscode.window.showWarningMessage('Cannot add an empty TODO task.');
        }
	});
	context.subscriptions.push(addTodoDisposable);
}

// This method is called when your extension is deactivated
export function deactivate() {}
