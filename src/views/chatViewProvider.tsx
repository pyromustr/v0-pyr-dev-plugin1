import * as vscode from "vscode"
import type { PyrDevAgent } from "../agent/pyrDevAgent"

export class ChatViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = "pyr-dev.chatView"

  private _view?: vscode.WebviewView
  private _agent: PyrDevAgent

  constructor(
    private readonly _extensionUri: vscode.Uri,
    agent: PyrDevAgent,
  ) {
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
        case "sendMessage":
          await this.handleSendMessage(data.message)
          break
        case "clearChat":
          this.clearChat()
          break
        case "exportChat":
          this.exportChat()
          break
        case "newSession":
          this.createNewSession()
          break
        case "loadSession":
          this.loadSession(data.sessionId)
          break
        case "deleteSession":
          this.deleteSession(data.sessionId)
          break
        case "getCodeContext":
          this.sendCodeContext()
          break
      }
    })

    // Load initial conversation history
    this.loadConversationHistory()
  }

  private async handleSendMessage(message: string) {
    if (!this._view) return

    // Add user message to chat
    this.addMessage("user", message)

    // Get current editor context
    const editor = vscode.window.activeTextEditor
    const context = editor
      ? {
          code: editor.document.getText(),
          language: editor.document.languageId,
          selection: editor.selection ? editor.document.getText(editor.selection) : undefined,
          filePath: editor.document.fileName,
        }
      : undefined

    try {
      // Show typing indicator
      this._view.webview.postMessage({
        type: "typing",
        isTyping: true,
      })

      // Get response from agent
      const response = await this._agent.processQuery(message, context)

      // Hide typing indicator and add response
      this._view.webview.postMessage({
        type: "typing",
        isTyping: false,
      })

      this.addMessage("assistant", response)
    } catch (error: any) {
      this._view.webview.postMessage({
        type: "typing",
        isTyping: false,
      })

      this.addMessage("assistant", `Error: ${error.message}`)
      vscode.window.showErrorMessage(`Pyr Dev Error: ${error.message}`)
    }
  }

  public addMessage(role: "user" | "assistant", content: string) {
    if (!this._view) return

    this._view.webview.postMessage({
      type: "addMessage",
      message: {
        role,
        content,
        timestamp: new Date().toISOString(),
      },
    })
  }

  private clearChat() {
    if (!this._view) return

    this._agent.clearConversation()
    this._view.webview.postMessage({
      type: "clearMessages",
    })
  }

  private exportChat() {
    const history = this._agent.getConversationHistory()
    if (history.length === 0) {
      vscode.window.showInformationMessage("No conversation to export")
      return
    }

    const exportContent = history.map((msg) => `**${msg.role.toUpperCase()}**: ${msg.content}`).join("\n\n---\n\n")

    vscode.workspace
      .openTextDocument({
        content: exportContent,
        language: "markdown",
      })
      .then((doc) => {
        vscode.window.showTextDocument(doc)
      })
  }

  private createNewSession() {
    // Implementation would depend on AgentMemory integration
    this.clearChat()
    vscode.window.showInformationMessage("New chat session created")
  }

  private loadSession(sessionId: string) {
    // Implementation would depend on AgentMemory integration
    vscode.window.showInformationMessage(`Loading session: ${sessionId}`)
  }

  private deleteSession(sessionId: string) {
    // Implementation would depend on AgentMemory integration
    vscode.window.showInformationMessage(`Deleted session: ${sessionId}`)
  }

  private sendCodeContext() {
    const editor = vscode.window.activeTextEditor
    if (!editor) {
      this._view?.webview.postMessage({
        type: "codeContext",
        context: null,
      })
      return
    }

    const context = {
      fileName: editor.document.fileName,
      language: editor.document.languageId,
      lineCount: editor.document.lineCount,
      selection: editor.selection ? editor.document.getText(editor.selection) : null,
      selectionRange: editor.selection
        ? {
            start: { line: editor.selection.start.line, character: editor.selection.start.character },
            end: { line: editor.selection.end.line, character: editor.selection.end.character },
          }
        : null,
    }

    this._view?.webview.postMessage({
      type: "codeContext",
      context,
    })
  }

  private loadConversationHistory() {
    const history = this._agent.getConversationHistory()
    if (history.length > 0) {
      this._view?.webview.postMessage({
        type: "loadHistory",
        messages: history.map((msg) => ({
          role: msg.role,
          content: msg.content,
          timestamp: new Date().toISOString(),
        })),
      })
    }
  }

  private _getHtmlForWebview(webview: vscode.Webview) {
    const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, "media", "main.js"))
    const styleResetUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, "media", "reset.css"))
    const styleVSCodeUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, "media", "vscode.css"))
    const styleMainUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, "media", "main.css"))

    const nonce = getNonce()

    return `<!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource}; script-src 'nonce-${nonce}';">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <link href="${styleResetUri}" rel="stylesheet">
        <link href="${styleVSCodeUri}" rel="stylesheet">
        <link href="${styleMainUri}" rel="stylesheet">
        <title>Pyr Dev Chat</title>
      </head>
      <body>
        <div class="chat-container">
          <div class="chat-header">
            <h3>Pyr Dev AI Assistant</h3>
            <div class="header-actions">
              <button id="newSessionBtn" class="icon-button" title="New Session">
                <span class="codicon codicon-add"></span>
              </button>
              <button id="exportBtn" class="icon-button" title="Export Chat">
                <span class="codicon codicon-export"></span>
              </button>
              <button id="clearBtn" class="icon-button" title="Clear Chat">
                <span class="codicon codicon-clear-all"></span>
              </button>
            </div>
          </div>
          
          <div class="context-info" id="contextInfo" style="display: none;">
            <div class="context-content">
              <span class="context-file"></span>
              <span class="context-language"></span>
              <span class="context-selection"></span>
            </div>
          </div>
          
          <div class="messages-container" id="messagesContainer">
            <div class="welcome-message">
              <div class="welcome-icon">🤖</div>
              <h4>Welcome to Pyr Dev!</h4>
              <p>I'm your AI coding assistant. I can help you:</p>
              <ul>
                <li>Write and generate code</li>
                <li>Fix bugs and errors</li>
                <li>Explain complex code</li>
                <li>Optimize performance</li>
                <li>Review code quality</li>
              </ul>
              <p>Select some code and ask me anything!</p>
            </div>
          </div>
          
          <div class="typing-indicator" id="typingIndicator" style="display: none;">
            <div class="typing-dots">
              <span></span>
              <span></span>
              <span></span>
            </div>
            <span>Pyr Dev is thinking...</span>
          </div>
          
          <div class="input-container">
            <div class="input-wrapper">
              <textarea 
                id="messageInput" 
                placeholder="Ask Pyr Dev anything about your code..."
                rows="1"
              ></textarea>
              <button id="sendBtn" class="send-button" title="Send Message">
                <span class="codicon codicon-send"></span>
              </button>
            </div>
            <div class="input-actions">
              <button id="contextBtn" class="action-button" title="Include Current File Context">
                <span class="codicon codicon-file-code"></span>
                Include Context
              </button>
            </div>
          </div>
        </div>
        
        <script nonce="${nonce}" src="${scriptUri}"></script>
      </body>
      </html>`
  }
}

function getNonce() {
  let text = ""
  const possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length))
  }
  return text
}
