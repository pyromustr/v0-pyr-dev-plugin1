import * as vscode from "vscode"

export interface PyrDevConfig {
  azureOpenAI: {
    apiKey: string
    endpoint: string
    deploymentName: string
  }
  gemini: {
    apiKey: string
    model: string
  }
  defaultProvider: "azure" | "gemini"
  autoSuggest: boolean
  maxTokens: number
}

export class ConfigManager {
  private static instance: ConfigManager
  private config: vscode.WorkspaceConfiguration

  private constructor() {
    this.config = vscode.workspace.getConfiguration("pyr-dev")
  }

  static getInstance(): ConfigManager {
    if (!ConfigManager.instance) {
      ConfigManager.instance = new ConfigManager()
    }
    return ConfigManager.instance
  }

  refresh(): void {
    this.config = vscode.workspace.getConfiguration("pyr-dev")
  }

  getConfig(): PyrDevConfig {
    return {
      azureOpenAI: {
        apiKey: this.config.get<string>("azureOpenAI.apiKey", ""),
        endpoint: this.config.get<string>("azureOpenAI.endpoint", ""),
        deploymentName: this.config.get<string>("azureOpenAI.deploymentName", "gpt-4"),
      },
      gemini: {
        apiKey: this.config.get<string>("gemini.apiKey", ""),
        model: this.config.get<string>("gemini.model", "gemini-pro"),
      },
      defaultProvider: this.config.get<"azure" | "gemini">("defaultProvider", "azure"),
      autoSuggest: this.config.get<boolean>("autoSuggest", true),
      maxTokens: this.config.get<number>("maxTokens", 4000),
    }
  }

  async updateConfig(key: string, value: any): Promise<void> {
    await this.config.update(key, value, vscode.ConfigurationTarget.Global)
    this.refresh()
  }

  isProviderConfigured(provider: "azure" | "gemini"): boolean {
    const config = this.getConfig()

    if (provider === "azure") {
      return !!(config.azureOpenAI.apiKey && config.azureOpenAI.endpoint)
    } else {
      return !!config.gemini.apiKey
    }
  }

  getConfiguredProviders(): ("azure" | "gemini")[] {
    const providers: ("azure" | "gemini")[] = []

    if (this.isProviderConfigured("azure")) {
      providers.push("azure")
    }

    if (this.isProviderConfigured("gemini")) {
      providers.push("gemini")
    }

    return providers
  }

  async validateConfiguration(): Promise<{ isValid: boolean; errors: string[] }> {
    const errors: string[] = []
    const configuredProviders = this.getConfiguredProviders()

    if (configuredProviders.length === 0) {
      errors.push("No LLM providers are configured. Please add API keys for Azure OpenAI or Google Gemini.")
    }

    const config = this.getConfig()

    // Validate Azure OpenAI config if provided
    if (config.azureOpenAI.apiKey || config.azureOpenAI.endpoint) {
      if (!config.azureOpenAI.apiKey) {
        errors.push("Azure OpenAI API key is missing")
      }
      if (!config.azureOpenAI.endpoint) {
        errors.push("Azure OpenAI endpoint is missing")
      }
      if (!config.azureOpenAI.endpoint.startsWith("https://")) {
        errors.push("Azure OpenAI endpoint must be a valid HTTPS URL")
      }
    }

    // Validate max tokens
    if (config.maxTokens < 100 || config.maxTokens > 32000) {
      errors.push("Max tokens must be between 100 and 32000")
    }

    return {
      isValid: errors.length === 0,
      errors,
    }
  }
}
