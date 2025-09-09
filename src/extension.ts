import * as vscode from "vscode"
import { PyrDevAgent } from "./agent/pyrDevAgent"
import { LLMProviderManager } from "./providers/llmProvider"
import { UniversalCodeAnalyzer } from "./analyzer/codeAnalyzer"
import { ChatViewProvider } from "./views/chatViewProvider"
import { TaskManager } from "./agent/taskManager"
import { StatusBarManager } from "./ui/statusBar"
import { QuickPickManager } from "./ui/quickPick"
import { registerContextMenus } from "./ui/contextMenus"
import { ChainTaskViewProvider } from "./views/chainTaskViewProvider"
import { RealTimeCodeProvider } from "./providers/realTimeProvider"

let pyrAgent: PyrDevAgent
let chatViewProvider: ChatViewProvider
let taskManager: TaskManager
let chainTaskViewProvider: ChainTaskViewProvider
let statusBarManager: StatusBarManager
let quickPickManager: QuickPickManager
let realTimeProvider: RealTimeCodeProvider

export function activate(context: vscode.ExtensionContext) {
  console.log("Pyr Dev extension is now active!")

  // Initialize core components
  const llmProviderManager = new LLMProviderManager()
  const codeAnalyzer = new UniversalCodeAnalyzer()
  pyrAgent = new PyrDevAgent(llmProviderManager.getActiveProvider(), codeAnalyzer)

  taskManager = new TaskManager()
  statusBarManager = new StatusBarManager(pyrAgent)
  quickPickManager = new QuickPickManager(pyrAgent)

  realTimeProvider = new RealTimeCodeProvider(pyrAgent)

  // Initialize chat view
  chatViewProvider = new ChatViewProvider(context.extensionUri, pyrAgent)

  chainTaskViewProvider = new ChainTaskViewProvider(context.extensionUri, taskManager, pyrAgent)

  // Register webview providers
  context.subscriptions.push(vscode.window.registerWebviewViewProvider("pyr-dev.chatView", chatViewProvider))
  context.subscriptions.push(vscode.window.registerWebviewViewProvider("pyr-dev.chainTaskView", chainTaskViewProvider))

  context.subscriptions.push(
    vscode.languages.registerInlineCompletionItemProvider({ scheme: "file" }, realTimeProvider),
  )

  context.subscriptions.push(vscode.languages.registerHoverProvider({ scheme: "file" }, realTimeProvider))

  context.subscriptions.push(
    vscode.languages.registerCodeActionsProvider({ scheme: "file" }, realTimeProvider, {
      providedCodeActionKinds: [
        vscode.CodeActionKind.QuickFix,
        vscode.CodeActionKind.Refactor,
        vscode.CodeActionKind.RefactorRewrite,
      ],
    }),
  )

  // Register commands
  const commands = [
    vscode.commands.registerCommand("pyr-dev.askAgent", askAgent),
    vscode.commands.registerCommand("pyr-dev.fixCode", fixCode),
    vscode.commands.registerCommand("pyr-dev.explainCode", explainCode),
    vscode.commands.registerCommand("pyr-dev.generateCode", generateCode),
    vscode.commands.registerCommand("pyr-dev.openSettings", openSettings),
    vscode.commands.registerCommand("pyr-dev.createTaskChain", createTaskChain),
    vscode.commands.registerCommand("pyr-dev.executeTaskChain", executeTaskChain),
    vscode.commands.registerCommand("pyr-dev.showTaskChains", showTaskChains),
    vscode.commands.registerCommand("pyr-dev.cancelTaskChain", cancelTaskChain),
    vscode.commands.registerCommand("pyr-dev.showMainMenu", showMainMenu),
    vscode.commands.registerCommand("pyr-dev.switchProvider", switchProvider),
    vscode.commands.registerCommand("pyr-dev.toggleRealTime", toggleRealTimeAssistance),
    vscode.commands.registerCommand("pyr-dev.applyQuickFix", applyQuickFix),
    vscode.commands.registerCommand("pyr-dev.refactorCode", refactorCode),
    vscode.commands.registerCommand("pyr-dev.optimizeCode", optimizeCode),
    vscode.commands.registerCommand("pyr-dev.addComments", addComments),
  ]

  context.subscriptions.push(...commands)

  registerContextMenus(context)

  statusBarManager.show()

  context.subscriptions.push(
    vscode.workspace.onDidChangeTextDocument((event) => {
      if (event.document.uri.scheme === "file") {
        // Debounce analysis to avoid excessive API calls
        setTimeout(() => {
          realTimeProvider.analyzeDocument(event.document)
        }, 1000)
      }
    }),
  )

  context.subscriptions.push(
    vscode.workspace.onDidOpenTextDocument((document) => {
      if (document.uri.scheme === "file") {
        realTimeProvider.analyzeDocument(document)
      }
    }),
  )

  // Set context for views
  vscode.commands.executeCommand("setContext", "pyr-dev.activated", true)

  // Show welcome message
  vscode.window.showInformationMessage("Pyr Dev AI Assistant is ready!")
}

async function askAgent() {
  const input = await vscode.window.showInputBox({
    prompt: "Ask Pyr Dev Agent anything about your code",
    placeHolder: "e.g., How can I optimize this function?",
  })

  if (input) {
    const editor = vscode.window.activeTextEditor
    const context = editor
      ? {
          code: editor.document.getText(),
          language: editor.document.languageId,
          selection: editor.selection ? editor.document.getText(editor.selection) : undefined,
        }
      : undefined

    try {
      const response = await pyrAgent.processQuery(input, context)
      chatViewProvider.addMessage("user", input)
      chatViewProvider.addMessage("assistant", response)
    } catch (error) {
      vscode.window.showErrorMessage(`Pyr Dev Error: ${error}`)
    }
  }
}

async function fixCode() {
  const editor = vscode.window.activeTextEditor
  if (!editor) {
    vscode.window.showWarningMessage("No active editor found")
    return
  }

  const selection = editor.selection
  const code = selection.isEmpty ? editor.document.getText() : editor.document.getText(selection)

  if (!code.trim()) {
    vscode.window.showWarningMessage("No code selected or found")
    return
  }

  try {
    vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: "Pyr Dev is analyzing and fixing your code...",
        cancellable: false,
      },
      async () => {
        const fixes = await pyrAgent.analyzeAndFix(code, editor.document.languageId)

        if (fixes.length > 0) {
          const fixedCode = await pyrAgent.applyFixes(code, fixes)

          // Show diff and apply changes
          const edit = new vscode.WorkspaceEdit()
          const range = selection.isEmpty ? new vscode.Range(0, 0, editor.document.lineCount, 0) : selection

          edit.replace(editor.document.uri, range, fixedCode)
          await vscode.workspace.applyEdit(edit)

          vscode.window.showInformationMessage(`Applied ${fixes.length} code fixes`)
        } else {
          vscode.window.showInformationMessage("No issues found in the code")
        }
      },
    )
  } catch (error) {
    vscode.window.showErrorMessage(`Fix Code Error: ${error}`)
  }
}

async function explainCode() {
  const editor = vscode.window.activeTextEditor
  if (!editor) {
    vscode.window.showWarningMessage("No active editor found")
    return
  }

  const selection = editor.selection
  const code = selection.isEmpty ? editor.document.getText() : editor.document.getText(selection)

  if (!code.trim()) {
    vscode.window.showWarningMessage("No code selected or found")
    return
  }

  try {
    const explanation = await pyrAgent.explainCode(code, editor.document.languageId)
    chatViewProvider.addMessage("user", "Explain this code")
    chatViewProvider.addMessage("assistant", explanation)
  } catch (error) {
    vscode.window.showErrorMessage(`Explain Code Error: ${error}`)
  }
}

async function generateCode() {
  const input = await vscode.window.showInputBox({
    prompt: "Describe what code you want to generate",
    placeHolder: "e.g., Create a function that sorts an array of objects by date",
  })

  if (input) {
    const editor = vscode.window.activeTextEditor
    const language = editor?.document.languageId || "javascript"

    try {
      const generatedCode = await pyrAgent.generateCode(input, language)

      if (editor) {
        const position = editor.selection.active
        const edit = new vscode.WorkspaceEdit()
        edit.insert(editor.document.uri, position, generatedCode)
        await vscode.workspace.applyEdit(edit)
      } else {
        // Show in new document
        const doc = await vscode.workspace.openTextDocument({
          content: generatedCode,
          language: language,
        })
        await vscode.window.showTextDocument(doc)
      }

      chatViewProvider.addMessage("user", `Generate: ${input}`)
      chatViewProvider.addMessage("assistant", `Generated code:\n\`\`\`${language}\n${generatedCode}\n\`\`\``)
    } catch (error) {
      vscode.window.showErrorMessage(`Generate Code Error: ${error}`)
    }
  }
}

function openSettings() {
  vscode.commands.executeCommand("workbench.action.openSettings", "pyr-dev")
}

async function createTaskChain() {
  const tasks = await quickPickManager.showTaskChainBuilder()
  if (!tasks || tasks.length === 0) {
    return
  }

  const name = await vscode.window.showInputBox({
    prompt: "Enter a name for this task chain",
    placeHolder: "e.g., Code Review and Optimization",
    validateInput: (value) => {
      if (!value.trim()) {
        return "Please provide a name for the task chain"
      }
      return null
    },
  })

  if (!name) return

  const editor = vscode.window.activeTextEditor
  const initialContext = editor
    ? {
        code: editor.document.getText(),
        language: editor.document.languageId,
        selection: editor.selection ? editor.document.getText(editor.selection) : undefined,
        filePath: editor.document.fileName,
      }
    : undefined

  try {
    const taskChain = taskManager.createTaskChain(name, tasks, initialContext)

    vscode.window.showInformationMessage(`Created task chain "${name}" with ${tasks.length} tasks`)

    // Ask if user wants to execute immediately
    const execute = await vscode.window.showQuickPick(["Execute Now", "Save for Later"], {
      placeHolder: "What would you like to do with this task chain?",
    })

    if (execute === "Execute Now") {
      executeTaskChainById(taskChain.id)
    }

    // Update chain task view
    chainTaskViewProvider.refresh()
  } catch (error: any) {
    vscode.window.showErrorMessage(`Failed to create task chain: ${error.message}`)
  }
}

async function executeTaskChain() {
  const taskChains = taskManager.getAllTaskChains().filter((chain) => chain.status === "pending")

  if (taskChains.length === 0) {
    vscode.window.showInformationMessage("No pending task chains found. Create one first!")
    return
  }

  const items = taskChains.map((chain) => ({
    label: chain.name,
    description: `${chain.tasks.length} tasks`,
    detail: chain.tasks.map((t) => t.description).join(", "),
    chainId: chain.id,
  }))

  const selected = await vscode.window.showQuickPick(items, {
    placeHolder: "Select a task chain to execute",
  })

  if (selected) {
    executeTaskChainById(selected.chainId)
  }
}

async function executeTaskChainById(chainId: string) {
  const chain = taskManager.getTaskChain(chainId)
  if (!chain) {
    vscode.window.showErrorMessage("Task chain not found")
    return
  }

  statusBarManager.showProgress(`Executing: ${chain.name}`)

  try {
    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: `Executing Task Chain: ${chain.name}`,
        cancellable: true,
      },
      async (progress, token) => {
        const results = await taskManager.executeTaskChain(chainId, pyrAgent)

        progress.report({ increment: 100, message: "Completed!" })

        statusBarManager.showSuccess(`Completed: ${chain.name}`)

        // Show results in chat
        const resultSummary = `Task Chain "${chain.name}" completed successfully!\n\nResults:\n${results.map((result, index) => `${index + 1}. ${chain.tasks[index].description}: ${typeof result === "string" ? result.substring(0, 100) + "..." : "Completed"}`).join("\n")}`

        chatViewProvider.addMessage("assistant", resultSummary)

        // Update chain task view
        chainTaskViewProvider.refresh()

        return results
      },
    )
  } catch (error: any) {
    statusBarManager.showError(`Failed: ${chain.name}`)
    vscode.window.showErrorMessage(`Task chain execution failed: ${error.message}`)
    chainTaskViewProvider.refresh()
  }
}

async function showTaskChains() {
  const allChains = taskManager.getAllTaskChains()

  if (allChains.length === 0) {
    vscode.window.showInformationMessage("No task chains found. Create one first!")
    return
  }

  const items = allChains.map((chain) => ({
    label: `$(${getChainStatusIcon(chain.status)}) ${chain.name}`,
    description: `${chain.tasks.length} tasks • ${chain.status}`,
    detail: chain.tasks.map((t) => t.description).join(", "),
    chainId: chain.id,
  }))

  const selected = await vscode.window.showQuickPick(items, {
    placeHolder: "Select a task chain to view details",
  })

  if (selected) {
    const chain = taskManager.getTaskChain(selected.chainId)
    if (chain) {
      showTaskChainDetails(chain)
    }
  }
}

function getChainStatusIcon(status: string): string {
  switch (status) {
    case "pending":
      return "clock"
    case "running":
      return "loading~spin"
    case "completed":
      return "check"
    case "failed":
      return "error"
    default:
      return "circle-outline"
  }
}

async function showTaskChainDetails(chain: any) {
  const actions = ["Execute", "Delete", "Duplicate", "Export"]

  if (chain.status === "running") {
    actions.unshift("Cancel")
  }

  const action = await vscode.window.showQuickPick(actions, {
    placeHolder: `Task Chain: ${chain.name} (${chain.status})`,
  })

  switch (action) {
    case "Execute":
      if (chain.status === "pending") {
        executeTaskChainById(chain.id)
      } else {
        vscode.window.showWarningMessage("Task chain is not in pending state")
      }
      break
    case "Cancel":
      cancelTaskChainById(chain.id)
      break
    case "Delete":
      const confirm = await vscode.window.showWarningMessage(
        `Are you sure you want to delete "${chain.name}"?`,
        "Delete",
        "Cancel",
      )
      if (confirm === "Delete") {
        taskManager.deleteTaskChain(chain.id)
        vscode.window.showInformationMessage(`Deleted task chain "${chain.name}"`)
        chainTaskViewProvider.refresh()
      }
      break
    case "Duplicate":
      const newName = await vscode.window.showInputBox({
        prompt: "Enter name for duplicated task chain",
        value: `${chain.name} (Copy)`,
      })
      if (newName) {
        const taskDescriptions = chain.tasks.map((t: any) => t.description)
        taskManager.createTaskChain(newName, taskDescriptions, chain.tasks[0]?.context)
        vscode.window.showInformationMessage(`Duplicated task chain as "${newName}"`)
        chainTaskViewProvider.refresh()
      }
      break
    case "Export":
      exportTaskChain(chain)
      break
  }
}

async function cancelTaskChain() {
  const runningChains = taskManager.getActiveTaskChains()

  if (runningChains.length === 0) {
    vscode.window.showInformationMessage("No running task chains to cancel")
    return
  }

  const items = runningChains.map((chain) => ({
    label: chain.name,
    description: "Running",
    chainId: chain.id,
  }))

  const selected = await vscode.window.showQuickPick(items, {
    placeHolder: "Select a task chain to cancel",
  })

  if (selected) {
    cancelTaskChainById(selected.chainId)
  }
}

function cancelTaskChainById(chainId: string) {
  const success = taskManager.cancelTaskChain(chainId)
  if (success) {
    vscode.window.showInformationMessage("Task chain cancelled")
    statusBarManager.updateStatusBar()
    chainTaskViewProvider.refresh()
  } else {
    vscode.window.showErrorMessage("Failed to cancel task chain")
  }
}

function exportTaskChain(chain: any) {
  const exportData = {
    name: chain.name,
    tasks: chain.tasks.map((t: any) => ({
      description: t.description,
      type: t.type,
    })),
    createdAt: chain.createdAt,
    status: chain.status,
    results: chain.results,
  }

  const exportContent = JSON.stringify(exportData, null, 2)

  vscode.workspace
    .openTextDocument({
      content: exportContent,
      language: "json",
    })
    .then((doc) => {
      vscode.window.showTextDocument(doc)
    })
}

async function showMainMenu() {
  await quickPickManager.showMainMenu()
}

async function switchProvider() {
  const newProvider = await quickPickManager.showProviderSelection()
  if (newProvider) {
    const config = vscode.workspace.getConfiguration("pyr-dev")
    await config.update("defaultProvider", newProvider, vscode.ConfigurationTarget.Global)

    statusBarManager.updateStatusBar()
    vscode.window.showInformationMessage(`Switched to ${newProvider === "azure" ? "Azure OpenAI" : "Google Gemini"}`)
  }
}

async function toggleRealTimeAssistance() {
  const config = vscode.workspace.getConfiguration("pyr-dev")
  const currentState = config.get("realTimeAssistance", true)

  await config.update("realTimeAssistance", !currentState, vscode.ConfigurationTarget.Global)
  realTimeProvider.setEnabled(!currentState)

  vscode.window.showInformationMessage(`Real-time assistance ${!currentState ? "enabled" : "disabled"}`)
}

async function applyQuickFix(uri: vscode.Uri, range: vscode.Range, diagnostic: vscode.Diagnostic) {
  const document = await vscode.workspace.openTextDocument(uri)
  const code = document.getText(range)

  try {
    const fix = await pyrAgent.generateQuickFix(code, diagnostic.message, document.languageId)

    if (fix) {
      const edit = new vscode.WorkspaceEdit()
      edit.replace(uri, range, fix)
      await vscode.workspace.applyEdit(edit)

      vscode.window.showInformationMessage("Quick fix applied successfully")
    }
  } catch (error) {
    vscode.window.showErrorMessage(`Quick fix failed: ${error}`)
  }
}

async function refactorCode(uri: vscode.Uri, range: vscode.Range) {
  const document = await vscode.workspace.openTextDocument(uri)
  const code = document.getText(range)

  try {
    const refactored = await pyrAgent.refactorCode(code, document.languageId)

    if (refactored) {
      const edit = new vscode.WorkspaceEdit()
      edit.replace(uri, range, refactored)
      await vscode.workspace.applyEdit(edit)

      vscode.window.showInformationMessage("Code refactored successfully")
    }
  } catch (error) {
    vscode.window.showErrorMessage(`Refactoring failed: ${error}`)
  }
}

async function optimizeCode(uri: vscode.Uri, range: vscode.Range) {
  const document = await vscode.workspace.openTextDocument(uri)
  const code = document.getText(range)

  try {
    const optimized = await pyrAgent.optimizeCode(code, document.languageId)

    if (optimized) {
      const edit = new vscode.WorkspaceEdit()
      edit.replace(uri, range, optimized)
      await vscode.workspace.applyEdit(edit)

      vscode.window.showInformationMessage("Code optimized successfully")
    }
  } catch (error) {
    vscode.window.showErrorMessage(`Optimization failed: ${error}`)
  }
}

async function addComments(uri: vscode.Uri, range: vscode.Range) {
  const document = await vscode.workspace.openTextDocument(uri)
  const code = document.getText(range)

  try {
    const commented = await pyrAgent.addComments(code, document.languageId)

    if (commented) {
      const edit = new vscode.WorkspaceEdit()
      edit.replace(uri, range, commented)
      await vscode.workspace.applyEdit(edit)

      vscode.window.showInformationMessage("Comments added successfully")
    }
  } catch (error) {
    vscode.window.showErrorMessage(`Adding comments failed: ${error}`)
  }
}

export function deactivate() {
  console.log("Pyr Dev extension is now deactivated")
  statusBarManager?.dispose()
  realTimeProvider?.dispose()
}
