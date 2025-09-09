import * as vscode from "vscode"
import type { PyrDevAgent } from "../agent/pyrDevAgent"
import { ConfigManager } from "../utils/configManager"

export class StatusBarManager {
  private statusBarItem: vscode.StatusBarItem
  private agent: PyrDevAgent
  private configManager: ConfigManager

  constructor(agent: PyrDevAgent) {
    this.agent = agent
    this.configManager = ConfigManager.getInstance()
    this.statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100)
    this.updateStatusBar()
  }

  public show() {
    this.statusBarItem.show()
  }

  public hide() {
    this.statusBarItem.hide()
  }

  public updateStatusBar() {
    const configuredProviders = this.configManager.getConfiguredProviders()
    const config = this.configManager.getConfig()

    if (configuredProviders.length === 0) {
      this.statusBarItem.text = "$(warning) Pyr Dev: Not Configured"
      this.statusBarItem.tooltip = "Click to configure Pyr Dev API keys"
      this.statusBarItem.command = "pyr-dev.openSettings"
      this.statusBarItem.backgroundColor = new vscode.ThemeColor("statusBarItem.warningBackground")
    } else {
      const activeProvider = config.defaultProvider
      const providerIcon = activeProvider === "azure" ? "$(cloud)" : "$(sparkle)"

      this.statusBarItem.text = `${providerIcon} Pyr Dev: ${activeProvider === "azure" ? "Azure" : "Gemini"}`
      this.statusBarItem.tooltip = `Pyr Dev is ready with ${activeProvider === "azure" ? "Azure OpenAI" : "Google Gemini"}\nClick to open chat`
      this.statusBarItem.command = "pyr-dev.askAgent"
      this.statusBarItem.backgroundColor = undefined
    }
  }

  public showProgress(message: string) {
    this.statusBarItem.text = `$(loading~spin) ${message}`
    this.statusBarItem.tooltip = message
  }

  public showSuccess(message: string, duration = 3000) {
    this.statusBarItem.text = `$(check) ${message}`
    this.statusBarItem.tooltip = message

    setTimeout(() => {
      this.updateStatusBar()
    }, duration)
  }

  public showError(message: string, duration = 5000) {
    this.statusBarItem.text = `$(error) ${message}`
    this.statusBarItem.tooltip = message
    this.statusBarItem.backgroundColor = new vscode.ThemeColor("statusBarItem.errorBackground")

    setTimeout(() => {
      this.updateStatusBar()
    }, duration)
  }

  public dispose() {
    this.statusBarItem.dispose()
  }
}
