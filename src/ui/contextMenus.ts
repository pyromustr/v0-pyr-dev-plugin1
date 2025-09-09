import * as vscode from "vscode"

export function registerContextMenus(context: vscode.ExtensionContext) {
  // Register context menu commands
  const contextMenuCommands = [
    vscode.commands.registerCommand("pyr-dev.contextMenu.askAboutCode", async () => {
      const editor = vscode.window.activeTextEditor
      if (!editor) return

      const selection = editor.selection
      const selectedText = editor.document.getText(selection)

      if (!selectedText.trim()) {
        vscode.window.showWarningMessage("Please select some code first")
        return
      }

      const question = await vscode.window.showInputBox({
        prompt: "What would you like to know about this code?",
        placeHolder: "e.g., How does this function work?",
      })

      if (question) {
        vscode.commands.executeCommand("pyr-dev.askAgent")
      }
    }),

    vscode.commands.registerCommand("pyr-dev.contextMenu.fixCode", () => {
      vscode.commands.executeCommand("pyr-dev.fixCode")
    }),

    vscode.commands.registerCommand("pyr-dev.contextMenu.explainCode", () => {
      vscode.commands.executeCommand("pyr-dev.explainCode")
    }),

    vscode.commands.registerCommand("pyr-dev.contextMenu.optimizeCode", async () => {
      const editor = vscode.window.activeTextEditor
      if (!editor) return

      const selection = editor.selection
      const selectedText = editor.document.getText(selection)

      if (!selectedText.trim()) {
        vscode.window.showWarningMessage("Please select some code to optimize")
        return
      }

      // This would integrate with the agent to optimize code
      vscode.window.showInformationMessage("Code optimization feature coming soon!")
    }),

    vscode.commands.registerCommand("pyr-dev.contextMenu.generateTests", async () => {
      const editor = vscode.window.activeTextEditor
      if (!editor) return

      const selection = editor.selection
      const selectedText = editor.document.getText(selection)

      if (!selectedText.trim()) {
        vscode.window.showWarningMessage("Please select a function or class to generate tests for")
        return
      }

      // This would integrate with the agent to generate tests
      vscode.window.showInformationMessage("Test generation feature coming soon!")
    }),
  ]

  context.subscriptions.push(...contextMenuCommands)
}
