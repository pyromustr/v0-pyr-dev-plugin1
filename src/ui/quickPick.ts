import * as vscode from "vscode"
import type { PyrDevAgent } from "../agent/pyrDevAgent"
import type { CodeIssue } from "../analyzer/codeAnalyzer"

export class QuickPickManager {
  private agent: PyrDevAgent

  constructor(agent: PyrDevAgent) {
    this.agent = agent
  }

  async showMainMenu(): Promise<void> {
    const items: vscode.QuickPickItem[] = [
      {
        label: "$(comment-discussion) Ask Agent",
        description: "Ask Pyr Dev anything about your code",
        detail: "Open interactive chat with AI assistant",
      },
      {
        label: "$(tools) Fix Code Issues",
        description: "Analyze and fix problems in selected code",
        detail: "Automatically detect and fix bugs, performance issues, and style problems",
      },
      {
        label: "$(book) Explain Code",
        description: "Get detailed explanation of selected code",
        detail: "Understand complex code with AI-powered explanations",
      },
      {
        label: "$(add) Generate Code",
        description: "Generate code from natural language description",
        detail: "Describe what you want and let AI write the code",
      },
      {
        label: "$(gear) Settings",
        description: "Configure Pyr Dev settings",
        detail: "Set up API keys and preferences",
      },
    ]

    const selected = await vscode.window.showQuickPick(items, {
      placeHolder: "What would you like to do with Pyr Dev?",
      matchOnDescription: true,
      matchOnDetail: true,
    })

    if (!selected) return

    switch (selected.label) {
      case "$(comment-discussion) Ask Agent":
        vscode.commands.executeCommand("pyr-dev.askAgent")
        break
      case "$(tools) Fix Code Issues":
        vscode.commands.executeCommand("pyr-dev.fixCode")
        break
      case "$(book) Explain Code":
        vscode.commands.executeCommand("pyr-dev.explainCode")
        break
      case "$(add) Generate Code":
        vscode.commands.executeCommand("pyr-dev.generateCode")
        break
      case "$(gear) Settings":
        vscode.commands.executeCommand("pyr-dev.openSettings")
        break
    }
  }

  async showProviderSelection(): Promise<string | undefined> {
    const items: vscode.QuickPickItem[] = [
      {
        label: "$(cloud) Azure OpenAI",
        description: "Use Azure OpenAI (GPT-4, GPT-3.5)",
        detail: "Microsoft's Azure OpenAI service",
      },
      {
        label: "$(sparkle) Google Gemini",
        description: "Use Google Gemini Pro",
        detail: "Google's advanced AI model",
      },
    ]

    const selected = await vscode.window.showQuickPick(items, {
      placeHolder: "Select LLM Provider",
      matchOnDescription: true,
    })

    if (!selected) return undefined

    return selected.label.includes("Azure") ? "azure" : "gemini"
  }

  async showCodeIssuesFix(issues: CodeIssue[]): Promise<CodeIssue[] | undefined> {
    if (issues.length === 0) {
      vscode.window.showInformationMessage("No issues found in the code!")
      return []
    }

    const items: (vscode.QuickPickItem & { issue: CodeIssue })[] = issues.map((issue) => ({
      label: `$(${this.getSeverityIcon(issue.severity)}) Line ${issue.line}: ${issue.message}`,
      description: issue.category,
      detail: issue.suggestion || "No suggestion available",
      issue,
    }))

    const selected = await vscode.window.showQuickPick(items, {
      placeHolder: `Found ${issues.length} issue${issues.length > 1 ? "s" : ""}. Select issues to fix:`,
      canPickMany: true,
      matchOnDescription: true,
      matchOnDetail: true,
    })

    return selected?.map((item) => item.issue)
  }

  async showGenerateCodeOptions(): Promise<{ description: string; language: string } | undefined> {
    const description = await vscode.window.showInputBox({
      prompt: "Describe the code you want to generate",
      placeHolder: "e.g., Create a function that sorts an array of objects by date",
      validateInput: (value) => {
        if (!value.trim()) {
          return "Please provide a description"
        }
        return null
      },
    })

    if (!description) return undefined

    const languageItems: vscode.QuickPickItem[] = [
      { label: "JavaScript", description: "Generate JavaScript code" },
      { label: "TypeScript", description: "Generate TypeScript code" },
      { label: "Python", description: "Generate Python code" },
      { label: "Java", description: "Generate Java code" },
      { label: "C#", description: "Generate C# code" },
      { label: "C++", description: "Generate C++ code" },
      { label: "Go", description: "Generate Go code" },
      { label: "Rust", description: "Generate Rust code" },
      { label: "Auto-detect", description: "Let AI choose the best language" },
    ]

    const selectedLanguage = await vscode.window.showQuickPick(languageItems, {
      placeHolder: "Select programming language",
    })

    if (!selectedLanguage) return undefined

    const language = selectedLanguage.label === "Auto-detect" ? "auto" : selectedLanguage.label.toLowerCase()

    return { description, language }
  }

  async showTaskChainBuilder(): Promise<string[] | undefined> {
    const tasks: string[] = []

    while (true) {
      const task = await vscode.window.showInputBox({
        prompt: `Add task ${tasks.length + 1} (or press Escape to finish)`,
        placeHolder: "e.g., Analyze code for performance issues",
        value: "",
      })

      if (!task) break

      tasks.push(task)

      if (tasks.length >= 5) {
        const continueAdding = await vscode.window.showQuickPick(["Yes, add more tasks", "No, execute these tasks"], {
          placeHolder: "You have 5 tasks. Continue adding?",
        })

        if (continueAdding?.startsWith("No")) break
      }
    }

    return tasks.length > 0 ? tasks : undefined
  }

  private getSeverityIcon(severity: string): string {
    switch (severity) {
      case "error":
        return "error"
      case "warning":
        return "warning"
      case "info":
        return "info"
      case "hint":
        return "lightbulb"
      default:
        return "circle-outline"
    }
  }
}
