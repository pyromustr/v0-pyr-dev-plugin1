import type { AgentTask, AgentContext } from "./baseAgent"

export interface TaskChain {
  id: string
  name: string
  tasks: AgentTask[]
  status: "pending" | "running" | "completed" | "failed"
  createdAt: Date
  completedAt?: Date
  results: any[]
}

export class TaskManager {
  private taskChains: Map<string, TaskChain> = new Map()
  private activeTasks: Map<string, AgentTask> = new Map()

  createTaskChain(name: string, taskDescriptions: string[], initialContext?: AgentContext): TaskChain {
    const chainId = `chain-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

    const tasks: AgentTask[] = taskDescriptions.map((description, index) => ({
      id: `${chainId}-task-${index}`,
      type: this.inferTaskType(description),
      description,
      context: initialContext || {},
      status: "pending",
      createdAt: new Date(),
    }))

    const taskChain: TaskChain = {
      id: chainId,
      name,
      tasks,
      status: "pending",
      createdAt: new Date(),
      results: [],
    }

    this.taskChains.set(chainId, taskChain)
    return taskChain
  }

  private inferTaskType(description: string): string {
    const lowerDesc = description.toLowerCase()

    if (lowerDesc.includes("analyze") || lowerDesc.includes("check") || lowerDesc.includes("review")) {
      return "analyze"
    } else if (lowerDesc.includes("fix") || lowerDesc.includes("correct") || lowerDesc.includes("repair")) {
      return "fix"
    } else if (lowerDesc.includes("generate") || lowerDesc.includes("create") || lowerDesc.includes("write")) {
      return "generate"
    } else if (lowerDesc.includes("explain") || lowerDesc.includes("describe") || lowerDesc.includes("clarify")) {
      return "explain"
    } else {
      return "general"
    }
  }

  async executeTaskChain(chainId: string, agent: any): Promise<any[]> {
    const chain = this.taskChains.get(chainId)
    if (!chain) {
      throw new Error(`Task chain ${chainId} not found`)
    }

    chain.status = "running"
    const results: any[] = []

    try {
      for (let i = 0; i < chain.tasks.length; i++) {
        const task = chain.tasks[i]

        // Add previous results to task context
        task.context = {
          ...task.context,
          previousResults: results,
        }

        this.activeTasks.set(task.id, task)

        try {
          const result = await agent.executeTask(task)
          results.push(result)
          chain.results.push(result)
        } finally {
          this.activeTasks.delete(task.id)
        }
      }

      chain.status = "completed"
      chain.completedAt = new Date()

      return results
    } catch (error) {
      chain.status = "failed"
      chain.completedAt = new Date()
      throw error
    }
  }

  getTaskChain(chainId: string): TaskChain | undefined {
    return this.taskChains.get(chainId)
  }

  getAllTaskChains(): TaskChain[] {
    return Array.from(this.taskChains.values()).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
  }

  getActiveTaskChains(): TaskChain[] {
    return this.getAllTaskChains().filter((chain) => chain.status === "running")
  }

  getCompletedTaskChains(): TaskChain[] {
    return this.getAllTaskChains().filter((chain) => chain.status === "completed")
  }

  cancelTaskChain(chainId: string): boolean {
    const chain = this.taskChains.get(chainId)
    if (!chain || chain.status !== "running") {
      return false
    }

    // Cancel all active tasks in the chain
    chain.tasks.forEach((task) => {
      if (task.status === "running") {
        task.status = "failed"
        task.error = "Cancelled by user"
        task.completedAt = new Date()
      }
    })

    chain.status = "failed"
    chain.completedAt = new Date()

    return true
  }

  deleteTaskChain(chainId: string): boolean {
    return this.taskChains.delete(chainId)
  }

  getTaskChainStats(): {
    total: number
    pending: number
    running: number
    completed: number
    failed: number
  } {
    const chains = this.getAllTaskChains()

    return {
      total: chains.length,
      pending: chains.filter((c) => c.status === "pending").length,
      running: chains.filter((c) => c.status === "running").length,
      completed: chains.filter((c) => c.status === "completed").length,
      failed: chains.filter((c) => c.status === "failed").length,
    }
  }

  // Utility methods for task management
  pauseTask(taskId: string): boolean {
    const task = this.activeTasks.get(taskId)
    if (task && task.status === "running") {
      // Note: Actual pausing would require more complex implementation
      // This is a placeholder for the interface
      return true
    }
    return false
  }

  resumeTask(taskId: string): boolean {
    const task = this.activeTasks.get(taskId)
    if (task) {
      // Note: Actual resuming would require more complex implementation
      // This is a placeholder for the interface
      return true
    }
    return false
  }

  getTaskProgress(chainId: string): number {
    const chain = this.taskChains.get(chainId)
    if (!chain) {
      return 0
    }

    const completedTasks = chain.tasks.filter((t) => t.status === "completed").length
    return completedTasks / chain.tasks.length
  }
}
