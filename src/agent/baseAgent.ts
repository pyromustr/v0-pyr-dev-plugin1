import type { LLMProvider, LLMMessage } from "../providers/llmProvider"

export interface AgentContext {
  code?: string
  language?: string
  selection?: string
  filePath?: string
  projectContext?: string
  previousResults?: any[]
}

export interface AgentTask {
  id: string
  type: string
  description: string
  context: AgentContext
  status: "pending" | "running" | "completed" | "failed"
  result?: any
  error?: string
  createdAt: Date
  completedAt?: Date
}

export interface AgentCapability {
  name: string
  description: string
  execute(context: AgentContext, parameters?: any): Promise<any>
}

export abstract class BaseAgent {
  protected llmProvider: LLMProvider
  protected capabilities: Map<string, AgentCapability> = new Map()
  protected conversationHistory: LLMMessage[] = []
  protected taskQueue: AgentTask[] = []

  constructor(llmProvider: LLMProvider) {
    this.llmProvider = llmProvider
    this.initializeCapabilities()
  }

  protected abstract initializeCapabilities(): void

  async executeTask(task: AgentTask): Promise<any> {
    task.status = "running"

    try {
      const capability = this.capabilities.get(task.type)
      if (!capability) {
        throw new Error(`Unknown task type: ${task.type}`)
      }

      const result = await capability.execute(task.context)
      task.result = result
      task.status = "completed"
      task.completedAt = new Date()

      return result
    } catch (error: any) {
      task.status = "failed"
      task.error = error.message
      task.completedAt = new Date()
      throw error
    }
  }

  async executeChainTasks(tasks: AgentTask[]): Promise<any[]> {
    const results: any[] = []
    let context: AgentContext = {}

    for (const task of tasks) {
      // Merge previous results into context
      task.context = { ...task.context, previousResults: results }

      const result = await this.executeTask(task)
      results.push(result)

      // Update context for next task
      context = { ...context, ...task.context }
    }

    return results
  }

  addToConversation(role: "user" | "assistant", content: string): void {
    this.conversationHistory.push({ role, content })

    // Keep conversation history manageable (last 20 messages)
    if (this.conversationHistory.length > 20) {
      this.conversationHistory = this.conversationHistory.slice(-20)
    }
  }

  clearConversation(): void {
    this.conversationHistory = []
  }

  getCapabilities(): string[] {
    return Array.from(this.capabilities.keys())
  }

  hasCapability(name: string): boolean {
    return this.capabilities.has(name)
  }
}
