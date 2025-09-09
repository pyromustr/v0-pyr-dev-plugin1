import { BaseAgent, type AgentContext, type AgentTask } from "./baseAgent"
import type { LLMProvider, LLMMessage } from "../providers/llmProvider"
import type { CodeAnalyzer, CodeIssue } from "../analyzer/codeAnalyzer"
import { PromptTemplates } from "../utils/promptTemplates"

export class PyrDevAgent extends BaseAgent {
  private codeAnalyzer: CodeAnalyzer

  constructor(llmProvider: LLMProvider, codeAnalyzer: CodeAnalyzer) {
    super(llmProvider)
    this.codeAnalyzer = codeAnalyzer
  }

  protected initializeCapabilities(): void {
    // Code Analysis Capability
    this.capabilities.set("analyze", {
      name: "Code Analysis",
      description: "Analyze code for issues, bugs, and improvements",
      execute: async (context: AgentContext) => {
        if (!context.code) {
          throw new Error("No code provided for analysis")
        }

        const prompt = PromptTemplates.formatPrompt(PromptTemplates.CODE_ANALYSIS_PROMPT, {
          language: context.language || "unknown",
          code: context.code,
        })

        const messages: LLMMessage[] = [
          { role: "system", content: PromptTemplates.SYSTEM_PROMPT },
          { role: "user", content: prompt },
        ]

        const response = await this.llmProvider.generateResponse(messages)
        return {
          analysis: response.content,
          staticAnalysis: await this.codeAnalyzer.analyzeCode(context.code, context.language || "javascript"),
        }
      },
    })

    // Code Fixing Capability
    this.capabilities.set("fix", {
      name: "Code Fixing",
      description: "Fix identified issues in code",
      execute: async (context: AgentContext, parameters?: { issues: string[] }) => {
        if (!context.code) {
          throw new Error("No code provided for fixing")
        }

        const issues = parameters?.issues || []
        const prompt = PromptTemplates.formatPrompt(PromptTemplates.CODE_FIX_PROMPT, {
          code: context.code,
          issues: issues.join("\n"),
        })

        const messages: LLMMessage[] = [
          { role: "system", content: PromptTemplates.SYSTEM_PROMPT },
          { role: "user", content: prompt },
        ]

        const response = await this.llmProvider.generateResponse(messages)
        return response.content
      },
    })

    // Code Generation Capability
    this.capabilities.set("generate", {
      name: "Code Generation",
      description: "Generate code from natural language description",
      execute: async (context: AgentContext, parameters?: { description: string }) => {
        const description = parameters?.description || "Generate code"
        const language = context.language || "javascript"

        const prompt = PromptTemplates.formatPrompt(PromptTemplates.CODE_GENERATION_PROMPT, {
          language,
          description,
        })

        const messages: LLMMessage[] = [
          { role: "system", content: PromptTemplates.SYSTEM_PROMPT },
          { role: "user", content: prompt },
        ]

        const response = await this.llmProvider.generateResponse(messages)
        return response.content
      },
    })

    // Code Explanation Capability
    this.capabilities.set("explain", {
      name: "Code Explanation",
      description: "Explain code functionality and structure",
      execute: async (context: AgentContext) => {
        if (!context.code) {
          throw new Error("No code provided for explanation")
        }

        const prompt = PromptTemplates.formatPrompt(PromptTemplates.CODE_EXPLANATION_PROMPT, {
          language: context.language || "unknown",
          code: context.code,
        })

        const messages: LLMMessage[] = [
          { role: "system", content: PromptTemplates.SYSTEM_PROMPT },
          { role: "user", content: prompt },
        ]

        const response = await this.llmProvider.generateResponse(messages)
        return response.content
      },
    })

    // Chain Task Capability
    this.capabilities.set("chain", {
      name: "Chain Task Execution",
      description: "Execute a sequence of related tasks",
      execute: async (context: AgentContext, parameters?: { tasks: string[]; currentTask: string }) => {
        const { tasks = [], currentTask = "" } = parameters || {}
        const previousContext = context.previousResults ? JSON.stringify(context.previousResults) : "None"

        const prompt = PromptTemplates.formatPrompt(PromptTemplates.CHAIN_TASK_PROMPT, {
          currentTask,
          previousContext,
          request: context.code || "No specific request",
        })

        const messages: LLMMessage[] = [
          { role: "system", content: PromptTemplates.SYSTEM_PROMPT },
          ...this.conversationHistory,
        ]

        const response = await this.llmProvider.generateResponse(messages)
        return response.content
      },
    })
  }

  // High-level methods used by extension.ts
  async processQuery(query: string, context?: AgentContext): Promise<string> {
    this.addToConversation("user", query)

    const messages: LLMMessage[] = [
      { role: "system", content: PromptTemplates.SYSTEM_PROMPT },
      ...this.conversationHistory,
    ]

    // Add context if provided
    if (context?.code) {
      messages.push({
        role: "user",
        content: `Context - Language: ${context.language}, Code: ${context.code}`,
      })
    }

    const response = await this.llmProvider.generateResponse(messages)
    this.addToConversation("assistant", response.content)

    return response.content
  }

  async analyzeAndFix(code: string, language: string): Promise<CodeIssue[]> {
    const context: AgentContext = { code, language }

    // First analyze the code
    const analysisResult = await this.executeTask({
      id: `analyze-${Date.now()}`,
      type: "analyze",
      description: "Analyze code for issues",
      context,
      status: "pending",
      createdAt: new Date(),
    })

    // Extract issues from static analysis
    return analysisResult.staticAnalysis || []
  }

  async applyFixes(code: string, issues: CodeIssue[]): Promise<string> {
    const context: AgentContext = { code }
    const issueDescriptions = issues.map((issue) => `${issue.severity}: ${issue.message} (Line ${issue.line})`)

    const fixResult = await this.executeTask(
      {
        id: `fix-${Date.now()}`,
        type: "fix",
        description: "Fix code issues",
        context,
        status: "pending",
        createdAt: new Date(),
      },
      { issues: issueDescriptions },
    )

    return fixResult
  }

  async explainCode(code: string, language: string): Promise<string> {
    const context: AgentContext = { code, language }

    const explanationResult = await this.executeTask({
      id: `explain-${Date.now()}`,
      type: "explain",
      description: "Explain code",
      context,
      status: "pending",
      createdAt: new Date(),
    })

    return explanationResult
  }

  async generateCode(description: string, language: string): Promise<string> {
    const context: AgentContext = { language }

    const generationResult = await this.executeTask(
      {
        id: `generate-${Date.now()}`,
        type: "generate",
        description: "Generate code",
        context,
        status: "pending",
        createdAt: new Date(),
      },
      { description },
    )

    return generationResult
  }

  async executeChainedTasks(taskDescriptions: string[], initialContext?: AgentContext): Promise<any[]> {
    const tasks: AgentTask[] = taskDescriptions.map((desc, index) => ({
      id: `chain-${Date.now()}-${index}`,
      type: "chain",
      description: desc,
      context: initialContext || {},
      status: "pending",
      createdAt: new Date(),
    }))

    return await this.executeChainTasks(tasks)
  }

  // Real-time assistance methods for inline completion and code actions
  async generateInlineCompletion(context: {
    code: string
    language: string
    currentLine: string
    nextLine?: string
    position: { line: number; character: number }
  }): Promise<string> {
    const prompt = PromptTemplates.formatPrompt(PromptTemplates.INLINE_COMPLETION_PROMPT, {
      language: context.language,
      code: context.code,
      currentLine: context.currentLine,
      nextLine: context.nextLine || "",
      position: `Line ${context.position.line + 1}, Column ${context.position.character + 1}`,
    })

    const messages: LLMMessage[] = [
      { role: "system", content: PromptTemplates.INLINE_COMPLETION_SYSTEM },
      { role: "user", content: prompt },
    ]

    const response = await this.llmProvider.generateResponse(messages)
    return response.content.trim()
  }

  async explainCodeElement(context: {
    element: string
    context: string
    language: string
    line: string
  }): Promise<string> {
    const prompt = PromptTemplates.formatPrompt(PromptTemplates.CODE_ELEMENT_EXPLANATION_PROMPT, {
      element: context.element,
      context: context.context,
      language: context.language,
      line: context.line,
    })

    const messages: LLMMessage[] = [
      { role: "system", content: PromptTemplates.SYSTEM_PROMPT },
      { role: "user", content: prompt },
    ]

    const response = await this.llmProvider.generateResponse(messages)
    return response.content
  }

  async analyzeCode(code: string, language: string): Promise<{ issues: CodeIssue[] }> {
    const staticAnalysis = await this.codeAnalyzer.analyzeCode(code, language)
    return { issues: staticAnalysis }
  }

  async generateQuickFix(code: string, issue: string, language: string): Promise<string> {
    const prompt = PromptTemplates.formatPrompt(PromptTemplates.QUICK_FIX_PROMPT, {
      code,
      issue,
      language,
    })

    const messages: LLMMessage[] = [
      { role: "system", content: PromptTemplates.SYSTEM_PROMPT },
      { role: "user", content: prompt },
    ]

    const response = await this.llmProvider.generateResponse(messages)
    return response.content
  }

  async refactorCode(code: string, language: string): Promise<string> {
    const prompt = PromptTemplates.formatPrompt(PromptTemplates.REFACTOR_PROMPT, {
      code,
      language,
    })

    const messages: LLMMessage[] = [
      { role: "system", content: PromptTemplates.SYSTEM_PROMPT },
      { role: "user", content: prompt },
    ]

    const response = await this.llmProvider.generateResponse(messages)
    return response.content
  }

  async optimizeCode(code: string, language: string): Promise<string> {
    const prompt = PromptTemplates.formatPrompt(PromptTemplates.OPTIMIZE_PROMPT, {
      code,
      language,
    })

    const messages: LLMMessage[] = [
      { role: "system", content: PromptTemplates.SYSTEM_PROMPT },
      { role: "user", content: prompt },
    ]

    const response = await this.llmProvider.generateResponse(messages)
    return response.content
  }

  async addComments(code: string, language: string): Promise<string> {
    const prompt = PromptTemplates.formatPrompt(PromptTemplates.ADD_COMMENTS_PROMPT, {
      code,
      language,
    })

    const messages: LLMMessage[] = [
      { role: "system", content: PromptTemplates.SYSTEM_PROMPT },
      { role: "user", content: prompt },
    ]

    const response = await this.llmProvider.generateResponse(messages)
    return response.content
  }

  // Utility methods
  getTaskHistory(): AgentTask[] {
    return [...this.taskQueue]
  }

  getConversationHistory(): LLMMessage[] {
    return [...this.conversationHistory]
  }

  async streamResponse(query: string, context?: AgentContext): AsyncIterable<string> {
    const messages: LLMMessage[] = [
      { role: "system", content: PromptTemplates.SYSTEM_PROMPT },
      ...this.conversationHistory,
      { role: "user", content: query },
    ]

    if (context?.code) {
      messages.push({
        role: "user",
        content: `Context - Language: ${context.language}, Code: ${context.code}`,
      })
    }

    return this.llmProvider.generateStreamResponse(messages)
  }
}
