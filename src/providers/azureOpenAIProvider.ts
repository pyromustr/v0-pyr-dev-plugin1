import * as vscode from "vscode"
import { OpenAI } from "openai"
import type { LLMProvider, LLMMessage, LLMResponse, LLMOptions } from "./llmProvider"

export class AzureOpenAIProvider implements LLMProvider {
  private client: OpenAI | null = null

  private getClient(): OpenAI {
    if (!this.client) {
      const config = vscode.workspace.getConfiguration("pyr-dev")
      const apiKey = config.get<string>("azureOpenAI.apiKey")
      const endpoint = config.get<string>("azureOpenAI.endpoint")

      if (!apiKey || !endpoint) {
        throw new Error("Azure OpenAI API key and endpoint must be configured")
      }

      this.client = new OpenAI({
        apiKey: apiKey,
        baseURL: `${endpoint}/openai/deployments`,
        defaultQuery: { "api-version": "2024-02-15-preview" },
        defaultHeaders: {
          "api-key": apiKey,
        },
      })
    }

    return this.client
  }

  async generateResponse(messages: LLMMessage[], options: LLMOptions = {}): Promise<LLMResponse> {
    const client = this.getClient()
    const config = vscode.workspace.getConfiguration("pyr-dev")
    const deploymentName = config.get<string>("azureOpenAI.deploymentName", "gpt-4")
    const maxTokens = options.maxTokens || config.get<number>("maxTokens", 4000)

    try {
      const response = await client.chat.completions.create({
        model: deploymentName,
        messages: messages.map((msg) => ({
          role: msg.role,
          content: msg.content,
        })),
        max_tokens: maxTokens,
        temperature: options.temperature || 0.7,
        top_p: options.topP || 1,
        stream: false,
      })

      const choice = response.choices[0]
      if (!choice?.message?.content) {
        throw new Error("No response content received from Azure OpenAI")
      }

      return {
        content: choice.message.content,
        usage: response.usage
          ? {
              promptTokens: response.usage.prompt_tokens,
              completionTokens: response.usage.completion_tokens,
              totalTokens: response.usage.total_tokens,
            }
          : undefined,
      }
    } catch (error: any) {
      console.error("Azure OpenAI API Error:", error)
      throw new Error(`Azure OpenAI Error: ${error.message || "Unknown error"}`)
    }
  }

  async *generateStreamResponse(messages: LLMMessage[], options: LLMOptions = {}): AsyncIterable<string> {
    const client = this.getClient()
    const config = vscode.workspace.getConfiguration("pyr-dev")
    const deploymentName = config.get<string>("azureOpenAI.deploymentName", "gpt-4")
    const maxTokens = options.maxTokens || config.get<number>("maxTokens", 4000)

    try {
      const stream = await client.chat.completions.create({
        model: deploymentName,
        messages: messages.map((msg) => ({
          role: msg.role,
          content: msg.content,
        })),
        max_tokens: maxTokens,
        temperature: options.temperature || 0.7,
        top_p: options.topP || 1,
        stream: true,
      })

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content
        if (content) {
          yield content
        }
      }
    } catch (error: any) {
      console.error("Azure OpenAI Stream Error:", error)
      throw new Error(`Azure OpenAI Stream Error: ${error.message || "Unknown error"}`)
    }
  }

  isConfigured(): boolean {
    const config = vscode.workspace.getConfiguration("pyr-dev")
    const apiKey = config.get<string>("azureOpenAI.apiKey")
    const endpoint = config.get<string>("azureOpenAI.endpoint")
    return !!(apiKey && endpoint)
  }

  getProviderName(): string {
    return "Azure OpenAI"
  }
}
