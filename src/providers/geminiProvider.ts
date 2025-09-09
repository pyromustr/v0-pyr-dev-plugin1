import * as vscode from "vscode"
import { GoogleGenerativeAI, type GenerativeModel, type ChatSession } from "@google/generative-ai"
import type { LLMProvider, LLMMessage, LLMResponse, LLMOptions } from "./llmProvider"

export class GeminiProvider implements LLMProvider {
  private client: GoogleGenerativeAI | null = null
  private model: GenerativeModel | null = null

  private getClient(): GoogleGenerativeAI {
    if (!this.client) {
      const config = vscode.workspace.getConfiguration("pyr-dev")
      const apiKey = config.get<string>("gemini.apiKey")

      if (!apiKey) {
        throw new Error("Google Gemini API key must be configured")
      }

      this.client = new GoogleGenerativeAI(apiKey)
    }

    return this.client
  }

  private getModel(): GenerativeModel {
    if (!this.model) {
      const client = this.getClient()
      const config = vscode.workspace.getConfiguration("pyr-dev")
      const modelName = config.get<string>("gemini.model", "gemini-pro")

      this.model = client.getGenerativeModel({ model: modelName })
    }

    return this.model
  }

  private convertMessagesToGeminiFormat(messages: LLMMessage[]): { history: any[]; message: string } {
    // Gemini expects alternating user/model messages
    const history: any[] = []
    let currentMessage = ""

    // Find system message if exists
    const systemMessage = messages.find((msg) => msg.role === "system")
    const conversationMessages = messages.filter((msg) => msg.role !== "system")

    // Convert conversation messages
    for (let i = 0; i < conversationMessages.length - 1; i++) {
      const msg = conversationMessages[i]
      if (msg.role === "user") {
        history.push({
          role: "user",
          parts: [{ text: msg.content }],
        })
      } else if (msg.role === "assistant") {
        history.push({
          role: "model",
          parts: [{ text: msg.content }],
        })
      }
    }

    // Last message becomes the current message
    const lastMessage = conversationMessages[conversationMessages.length - 1]
    if (lastMessage) {
      currentMessage = systemMessage ? `${systemMessage.content}\n\nUser: ${lastMessage.content}` : lastMessage.content
    }

    return { history, message: currentMessage }
  }

  async generateResponse(messages: LLMMessage[], options: LLMOptions = {}): Promise<LLMResponse> {
    const model = this.getModel()

    try {
      const { history, message } = this.convertMessagesToGeminiFormat(messages)

      let result
      if (history.length > 0) {
        // Use chat session for conversation
        const chat: ChatSession = model.startChat({ history })
        result = await chat.sendMessage(message)
      } else {
        // Single message generation
        result = await model.generateContent(message)
      }

      const response = result.response
      const content = response.text()

      if (!content) {
        throw new Error("No response content received from Gemini")
      }

      return {
        content: content,
        usage: {
          promptTokens: response.usageMetadata?.promptTokenCount || 0,
          completionTokens: response.usageMetadata?.candidatesTokenCount || 0,
          totalTokens: response.usageMetadata?.totalTokenCount || 0,
        },
      }
    } catch (error: any) {
      console.error("Gemini API Error:", error)
      throw new Error(`Gemini Error: ${error.message || "Unknown error"}`)
    }
  }

  async *generateStreamResponse(messages: LLMMessage[], options: LLMOptions = {}): AsyncIterable<string> {
    const model = this.getModel()

    try {
      const { history, message } = this.convertMessagesToGeminiFormat(messages)

      let result
      if (history.length > 0) {
        const chat: ChatSession = model.startChat({ history })
        result = await chat.sendMessageStream(message)
      } else {
        result = await model.generateContentStream(message)
      }

      for await (const chunk of result.stream) {
        const chunkText = chunk.text()
        if (chunkText) {
          yield chunkText
        }
      }
    } catch (error: any) {
      console.error("Gemini Stream Error:", error)
      throw new Error(`Gemini Stream Error: ${error.message || "Unknown error"}`)
    }
  }

  isConfigured(): boolean {
    const config = vscode.workspace.getConfiguration("pyr-dev")
    const apiKey = config.get<string>("gemini.apiKey")
    return !!apiKey
  }

  getProviderName(): string {
    return "Google Gemini"
  }
}
