import * as vscode from "vscode"
import type { TaskManager } from "../agent/taskManager"
import type { PyrDevAgent } from "../agent/pyrDevAgent"

export class ChainTaskViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = "pyr-dev.chainTaskView"

  private _view?: vscode.WebviewView
  private _taskManager: TaskManager
  private _agent: PyrDevAgent

  constructor(
    private readonly _extensionUri: vscode.Uri,
    taskManager: TaskManager,
    agent: PyrDevAgent,
  ) {
    this._taskManager = taskManager
    this._agent = agent
  }

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken,
  ) {
    this._view = webviewView

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this._extensionUri],
    }

    webviewView.webview.html = this._getHtmlForWebview(webviewView.webview)

    // Handle messages from the webview
    webviewView.webview.onDidReceiveMessage(async (data) => {
      switch (data.type) {
        case "createChain":
          vscode.commands.executeCommand("pyr-dev.createTaskChain")
          break
        case "executeChain":
          this.executeChain(data.chainId)
          break
        case "cancelChain":
          this.cancelChain(data.chainId)
          break
        case "deleteChain":
          this.deleteChain(data.chainId)
          break
        case "duplicateChain":
          this.duplicateChain(data.chainId)
          break
        case "viewChainDetails":
          this.viewChainDetails(data.chainId)
          break
        case "refresh":
          this.refresh()
          break
      }
    })

    // Initial load
    this.refresh()
  }

  public refresh() {
    if (!this._view) return

    const taskChains = this._taskManager.getAllTaskChains()
    const stats = this._taskManager.getTaskChainStats()

    this._view.webview.postMessage({
      type: "updateChains",
      chains: taskChains.map((chain) => ({
        id: chain.id,
        name: chain.name,
        status: chain.status,
        taskCount: chain.tasks.length,
        createdAt: chain.createdAt.toISOString(),
        completedAt: chain.completedAt?.toISOString(),
        progress: this._taskManager.getTaskProgress(chain.id),
      })),
      stats,
    })
  }

  private async executeChain(chainId: string) {
    vscode.commands.executeCommand("pyr-dev.executeTaskChain")
  }

  private async cancelChain(chainId: string) {
    const success = this._taskManager.cancelTaskChain(chainId)
    if (success) {
      vscode.window.showInformationMessage("Task chain cancelled")
      this.refresh()
    } else {
      vscode.window.showErrorMessage("Failed to cancel task chain")
    }
  }

  private async deleteChain(chainId: string) {
    const chain = this._taskManager.getTaskChain(chainId)
    if (!chain) return

    const confirm = await vscode.window.showWarningMessage(
      `Are you sure you want to delete "${chain.name}"?`,
      "Delete",
      "Cancel",
    )

    if (confirm === "Delete") {
      this._taskManager.deleteTaskChain(chainId)
      vscode.window.showInformationMessage(`Deleted task chain "${chain.name}"`)
      this.refresh()
    }
  }

  private async duplicateChain(chainId: string) {
    const chain = this._taskManager.getTaskChain(chainId)
    if (!chain) return

    const newName = await vscode.window.showInputBox({
      prompt: "Enter name for duplicated task chain",
      value: `${chain.name} (Copy)`,
    })

    if (newName) {
      const taskDescriptions = chain.tasks.map((t) => t.description)
      this._taskManager.createTaskChain(newName, taskDescriptions, chain.tasks[0]?.context)
      vscode.window.showInformationMessage(`Duplicated task chain as "${newName}"`)
      this.refresh()
    }
  }

  private async viewChainDetails(chainId: string) {
    const chain = this._taskManager.getTaskChain(chainId)
    if (!chain) return

    const details = `
**Task Chain: ${chain.name}**

**Status:** ${chain.status}
**Created:** ${chain.createdAt.toLocaleString()}
**Tasks:** ${chain.tasks.length}

**Task List:**
${chain.tasks.map((task, index) => `${index + 1}. ${task.description} (${task.status})`).join("\n")}

${chain.results.length > 0 ? `\n**Results:**\n${chain.results.map((result, index) => `${index + 1}. ${typeof result === "string" ? result.substring(0, 200) + "..." : "Completed"}`).join("\n")}` : ""}
    `.trim()

    vscode.workspace
      .openTextDocument({
        content: details,
        language: "markdown",
      })
      .then((doc) => {
        vscode.window.showTextDocument(doc)
      })
  }

  private _getHtmlForWebview(webview: vscode.Webview) {
    const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, "media", "chainTask.js"))
    const styleUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, "media", "chainTask.css"))

    const nonce = this.getNonce()

    return `<!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource}; script-src 'nonce-${nonce}';">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <link href="${styleUri}" rel="stylesheet">
        <title>Chain Tasks</title>
      </head>
      <body>
        <div class="chain-task-container">
          <div class="header">
            <h3>Task Chains</h3>
            <div class="header-actions">
              <button id="createBtn" class="icon-button" title="Create New Chain">
                <span class="codicon codicon-add"></span>
              </button>
              <button id="refreshBtn" class="icon-button" title="Refresh">
                <span class="codicon codicon-refresh"></span>
              </button>
            </div>
          </div>

          <div class="stats-section" id="statsSection">
            <div class="stat-item">
              <span class="stat-label">Total:</span>
              <span class="stat-value" id="totalChains">0</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">Running:</span>
              <span class="stat-value" id="runningChains">0</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">Completed:</span>
              <span class="stat-value" id="completedChains">0</span>
            </div>
          </div>

          <div class="chains-list" id="chainsList">
            <div class="empty-state">
              <div class="empty-icon">🔗</div>
              <h4>No Task Chains</h4>
              <p>Create your first task chain to get started with automated workflows.</p>
              <button id="createFirstBtn" class="primary-button">Create Task Chain</button>
            </div>
          </div>
        </div>
        
        <script nonce="${nonce}" src="${scriptUri}"></script>
      </body>
      </html>`
  }

  private getNonce() {
    let text = ""
    const possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"
    for (let i = 0; i < 32; i++) {
      text += possible.charAt(Math.floor(Math.random() * possible.length))
    }
    return text
  }
}
