# TODO List in Command Palette 

![Extension Icon](https://raw.githubusercontent.com/hover-race/vscode-todo-palette/master/extension/images/todo-newicons.png)

Manage a TODO list directly from VS Code Command Palette

![Animation of TODO list features](https://raw.githubusercontent.com/hover-race/vscode-todo-palette/master/extension/images/todo-demo2.webp)


## Features

*   **Add Tasks:** Quickly add new TODO items via an input box (`todo-list.addTodo`).
*   **View & Manage Tasks:** Access your TODO list through a Quick Pick menu (`todo-list.showList`).
    *   Click on a task to toggle its status between pending and done.
    *   Done tasks are marked with `[DONE]` and moved below pending tasks.
    *   An "Add New Task" option is available directly in the list view.
    *   A "Clear All Tasks" option allows you to remove all items after confirmation.
*   **Plain Text Storage:** Your TODO list is saved as plain text in a `.todo` file in your workspace root. You can directly edit this file, and the extension will automatically reload the changes.
*   **Status Bar Integration:** Shows the latest pending task in the status bar. Clicking it opens the TODO list. Shows "All tasks done!" when the list is empty or all tasks are completed.

### 0.0.9
- Added a .done file
- Added a button to edit .todo file

### 0.0.5
- Added emojis ✅
- Added keybinding: Ctrl Shift T

### 0.0.1
- Add basic TODO list functionality: add, view, toggle done/pending, clear all tasks.
- Save list to `.todo` file in the workspace.
- Status bar integration showing the latest task.
