import * as vscode from "vscode"
import { AzureOpenAIProvider } from "./azureOpenAIProvider"
import { GeminiProvider } from "./geminiProvider"

export interface LLMResponse {
  content: string
  usage?: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
  }
}

export interface LLMMessage {
  role: "system" | "user" | "assistant"
  content: string
}

export interface LLMProvider {
  generateResponse(messages: LLMMessage[], options?: LLMOptions): Promise<LLMResponse>
  generateStreamResponse(messages: LLMMessage[], options?: LLMOptions): AsyncIterable<string>
  isConfigured(): boolean
  getProviderName(): string
}

export interface LLMOptions {
  maxTokens?: number
  temperature?: number
  topP?: number
  stream?: boolean
}

export class LLMProviderManager {
  private azureProvider: AzureOpenAIProvider
  private geminiProvider: GeminiProvider

  constructor() {
    this.azureProvider = new AzureOpenAIProvider()
    this.geminiProvider = new GeminiProvider()
  }

  getActiveProvider(): LLMProvider {
    const config = vscode.workspace.getConfiguration("pyr-dev")
    const defaultProvider = config.get<string>("defaultProvider", "azure")

    switch (defaultProvider) {
      case "gemini":
        if (this.geminiProvider.isConfigured()) {
          return this.geminiProvider
        }
        // Fallback to Azure if Gemini not configured
        if (this.azureProvider.isConfigured()) {
          return this.azureProvider
        }
        break
      case "azure":
      default:
        if (this.azureProvider.isConfigured()) {
          return this.azureProvider
        }
        // Fallback to Gemini if Azure not configured
        if (this.geminiProvider.isConfigured()) {
          return this.geminiProvider
        }
        break
    }

    throw new Error("No LLM provider is properly configured. Please check your API keys in settings.")
  }

  getAllProviders(): LLMProvider[] {
    return [this.azureProvider, this.geminiProvider]
  }

  getConfiguredProviders(): LLMProvider[] {
    return this.getAllProviders().filter((provider) => provider.isConfigured())
  }

  async testProvider(providerName: string): Promise<boolean> {
    try {
      const provider = providerName === "azure" ? this.azureProvider : this.geminiProvider

      if (!provider.isConfigured()) {
        return false
      }

      const response = await provider.generateResponse(
        [{ role: "user", content: "Hello, this is a test message. Please respond with 'Test successful'." }],
        { maxTokens: 50 },
      )

      return response.content.toLowerCase().includes("test successful")
    } catch (error) {
      console.error(`Provider test failed for ${providerName}:`, error)
      return false
    }
  }
}
