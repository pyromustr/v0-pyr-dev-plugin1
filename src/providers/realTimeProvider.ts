import * as vscode from "vscode"
import type { PyrDevAgent } from "../agent/pyrDevAgent"

export class RealTimeCodeProvider
  implements vscode.InlineCompletionItemProvider, vscode.HoverProvider, vscode.CodeActionProvider
{
  private diagnosticCollection: vscode.DiagnosticCollection
  private agent: PyrDevAgent
  private isEnabled = true
  private completionCache = new Map<string, { completion: string; timestamp: number }>()
  private readonly CACHE_DURATION = 5000 // 5 seconds

  constructor(agent: PyrDevAgent) {
    this.agent = agent
    this.diagnosticCollection = vscode.languages.createDiagnosticCollection("pyr-dev")
  }

  // Inline completion provider (GitHub Copilot style)
  async provideInlineCompletionItems(
    document: vscode.TextDocument,
    position: vscode.Position,
    context: vscode.InlineCompletionContext,
    token: vscode.CancellationToken,
  ): Promise<vscode.InlineCompletionItem[]> {
    if (!this.isEnabled || token.isCancellationRequested) {
      return []
    }

    try {
      const line = document.lineAt(position.line)
      const textBeforeCursor = line.text.substring(0, position.character)
      const textAfterCursor = line.text.substring(position.character)

      // Get surrounding context (5 lines before and after)
      const startLine = Math.max(0, position.line - 5)
      const endLine = Math.min(document.lineCount - 1, position.line + 5)
      const contextRange = new vscode.Range(startLine, 0, endLine, document.lineAt(endLine).text.length)
      const contextCode = document.getText(contextRange)

      // Check cache first
      const cacheKey = `${document.uri.toString()}-${position.line}-${position.character}-${textBeforeCursor}`
      const cached = this.completionCache.get(cacheKey)
      if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
        return [new vscode.InlineCompletionItem(cached.completion)]
      }

      // Generate completion
      const completion = await this.agent.generateInlineCompletion({
        code: contextCode,
        language: document.languageId,
        currentLine: textBeforeCursor,
        nextLine: textAfterCursor,
        position: { line: position.line, character: position.character },
      })

      if (completion && completion.trim()) {
        // Cache the result
        this.completionCache.set(cacheKey, { completion, timestamp: Date.now() })

        return [new vscode.InlineCompletionItem(completion)]
      }
    } catch (error) {
      console.error("[v0] Inline completion error:", error)
    }

    return []
  }

  // Hover provider for code explanations
  async provideHover(
    document: vscode.TextDocument,
    position: vscode.Position,
    token: vscode.CancellationToken,
  ): Promise<vscode.Hover | undefined> {
    if (!this.isEnabled || token.isCancellationRequested) {
      return undefined
    }

    try {
      const wordRange = document.getWordRangeAtPosition(position)
      if (!wordRange) return undefined

      const word = document.getText(wordRange)
      const line = document.lineAt(position.line)

      // Get context around the hovered word
      const startLine = Math.max(0, position.line - 3)
      const endLine = Math.min(document.lineCount - 1, position.line + 3)
      const contextRange = new vscode.Range(startLine, 0, endLine, document.lineAt(endLine).text.length)
      const contextCode = document.getText(contextRange)

      const explanation = await this.agent.explainCodeElement({
        element: word,
        context: contextCode,
        language: document.languageId,
        line: line.text,
      })

      if (explanation) {
        const markdown = new vscode.MarkdownString()
        markdown.appendMarkdown(`**Pyr Dev Explanation**\n\n${explanation}`)
        markdown.isTrusted = true
        return new vscode.Hover(markdown, wordRange)
      }
    } catch (error) {
      console.error("[v0] Hover provider error:", error)
    }

    return undefined
  }

  // Code action provider for quick fixes
  async provideCodeActions(
    document: vscode.TextDocument,
    range: vscode.Range | vscode.Selection,
    context: vscode.CodeActionContext,
    token: vscode.CancellationToken,
  ): Promise<vscode.CodeAction[]> {
    if (!this.isEnabled || token.isCancellationRequested) {
      return []
    }

    const actions: vscode.CodeAction[] = []

    try {
      const selectedText = document.getText(range)

      // Quick fix actions
      if (context.diagnostics.length > 0) {
        for (const diagnostic of context.diagnostics) {
          if (diagnostic.source === "pyr-dev") {
            const fixAction = new vscode.CodeAction(`Fix: ${diagnostic.message}`, vscode.CodeActionKind.QuickFix)
            fixAction.command = {
              command: "pyr-dev.applyQuickFix",
              title: "Apply Quick Fix",
              arguments: [document.uri, range, diagnostic],
            }
            actions.push(fixAction)
          }
        }
      }

      // Refactor actions
      if (selectedText.trim()) {
        const refactorAction = new vscode.CodeAction("Refactor with Pyr Dev", vscode.CodeActionKind.Refactor)
        refactorAction.command = {
          command: "pyr-dev.refactorCode",
          title: "Refactor Code",
          arguments: [document.uri, range],
        }
        actions.push(refactorAction)

        // Optimize action
        const optimizeAction = new vscode.CodeAction("Optimize with Pyr Dev", vscode.CodeActionKind.RefactorRewrite)
        optimizeAction.command = {
          command: "pyr-dev.optimizeCode",
          title: "Optimize Code",
          arguments: [document.uri, range],
        }
        actions.push(optimizeAction)

        // Add comments action
        const commentAction = new vscode.CodeAction("Add Comments with Pyr Dev", vscode.CodeActionKind.RefactorRewrite)
        commentAction.command = {
          command: "pyr-dev.addComments",
          title: "Add Comments",
          arguments: [document.uri, range],
        }
        actions.push(commentAction)
      }
    } catch (error) {
      console.error("[v0] Code actions error:", error)
    }

    return actions
  }

  // Real-time diagnostics
  async analyzeDocument(document: vscode.TextDocument): Promise<void> {
    if (!this.isEnabled) return

    try {
      const code = document.getText()
      const analysis = await this.agent.analyzeCode(code, document.languageId)

      const diagnostics: vscode.Diagnostic[] = []

      for (const issue of analysis.issues) {
        const diagnostic = new vscode.Diagnostic(
          new vscode.Range(
            issue.line - 1,
            issue.column || 0,
            issue.line - 1,
            (issue.column || 0) + (issue.length || 1),
          ),
          issue.message,
          this.getSeverity(issue.severity),
        )

        diagnostic.source = "pyr-dev"
        diagnostic.code = issue.code
        diagnostics.push(diagnostic)
      }

      this.diagnosticCollection.set(document.uri, diagnostics)
    } catch (error) {
      console.error("[v0] Document analysis error:", error)
    }
  }

  private getSeverity(severity: string): vscode.DiagnosticSeverity {
    switch (severity.toLowerCase()) {
      case "error":
        return vscode.DiagnosticSeverity.Error
      case "warning":
        return vscode.DiagnosticSeverity.Warning
      case "info":
        return vscode.DiagnosticSeverity.Information
      default:
        return vscode.DiagnosticSeverity.Hint
    }
  }

  // Enable/disable real-time features
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled
    if (!enabled) {
      this.diagnosticCollection.clear()
      this.completionCache.clear()
    }
  }

  // Clear cache
  clearCache(): void {
    this.completionCache.clear()
  }

  // Dispose resources
  dispose(): void {
    this.diagnosticCollection.dispose()
    this.completionCache.clear()
  }
}
