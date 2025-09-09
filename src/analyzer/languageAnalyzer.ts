import type { CodeIssue, CodeMetrics } from "./codeAnalyzer"

export abstract class LanguageAnalyzer {
  abstract analyzeSyntax(code: string): Promise<CodeIssue[]>
  abstract analyzePerformance(code: string): Promise<CodeIssue[]>
  abstract analyzeSecurity(code: string): Promise<CodeIssue[]>
  abstract analyzeStyle(code: string): Promise<CodeIssue[]>
  abstract calculateMetrics(code: string): Promise<CodeMetrics>
  abstract generateSuggestions(issues: CodeIssue[], metrics: CodeMetrics): Promise<string[]>

  protected createIssue(
    severity: "error" | "warning" | "info" | "hint",
    message: string,
    line: number,
    column: number,
    category: "syntax" | "logic" | "performance" | "security" | "style" | "maintainability",
    rule?: string,
    suggestion?: string,
    fixable = false,
  ): CodeIssue {
    return {
      id: `${category}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      severity,
      message,
      line,
      column,
      category,
      rule,
      suggestion,
      fixable,
    }
  }

  protected countLines(code: string): number {
    return code.split("\n").filter((line) => line.trim().length > 0).length
  }

  protected calculateCyclomaticComplexity(code: string): number {
    // Basic cyclomatic complexity calculation
    const complexityKeywords = [
      "if",
      "else",
      "elif",
      "while",
      "for",
      "foreach",
      "do",
      "switch",
      "case",
      "catch",
      "except",
      "and",
      "or",
      "&&",
      "||",
      "?",
      "try",
    ]

    let complexity = 1 // Base complexity

    for (const keyword of complexityKeywords) {
      const regex = new RegExp(`\\b${keyword}\\b`, "gi")
      const matches = code.match(regex)
      if (matches) {
        complexity += matches.length
      }
    }

    return complexity
  }

  protected calculateMaintainabilityIndex(code: string, cyclomaticComplexity: number): number {
    const linesOfCode = this.countLines(code)
    const halsteadVolume = this.calculateHalsteadVolume(code)

    // Simplified maintainability index calculation
    const mi = Math.max(
      0,
      171 - 5.2 * Math.log(halsteadVolume) - 0.23 * cyclomaticComplexity - 16.2 * Math.log(linesOfCode),
    )

    return Math.round(mi)
  }

  private calculateHalsteadVolume(code: string): number {
    // Simplified Halstead volume calculation
    const operators = code.match(/[+\-*/%=<>!&|^~?:;,(){}[\]]/g) || []
    const operands = code.match(/\b[a-zA-Z_][a-zA-Z0-9_]*\b/g) || []

    const uniqueOperators = new Set(operators).size
    const uniqueOperands = new Set(operands).size
    const totalOperators = operators.length
    const totalOperands = operands.length

    const vocabulary = uniqueOperators + uniqueOperands
    const length = totalOperators + totalOperands

    return length * Math.log2(vocabulary || 1)
  }

  protected findDuplicatedLines(code: string): number {
    const lines = code
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
    const lineCount = new Map<string, number>()

    for (const line of lines) {
      lineCount.set(line, (lineCount.get(line) || 0) + 1)
    }

    let duplicatedLines = 0
    for (const [line, count] of lineCount.entries()) {
      if (count > 1) {
        duplicatedLines += count - 1
      }
    }

    return duplicatedLines
  }
}

export class GenericAnalyzer extends LanguageAnalyzer {
  async analyzeSyntax(code: string): Promise<CodeIssue[]> {
    const issues: CodeIssue[] = []
    const lines = code.split("\n")

    // Basic syntax checks
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      const lineNumber = i + 1

      // Check for unmatched brackets
      const openBrackets = (line.match(/[({[]/g) || []).length
      const closeBrackets = (line.match(/[)}\]]/g) || []).length

      if (openBrackets !== closeBrackets) {
        issues.push(
          this.createIssue("warning", "Potential unmatched brackets", lineNumber, 0, "syntax", "unmatched-brackets"),
        )
      }

      // Check for very long lines
      if (line.length > 120) {
        issues.push(
          this.createIssue(
            "info",
            "Line too long (>120 characters)",
            lineNumber,
            0,
            "style",
            "line-length",
            "Consider breaking this line into multiple lines",
          ),
        )
      }
    }

    return issues
  }

  async analyzePerformance(code: string): Promise<CodeIssue[]> {
    const issues: CodeIssue[] = []
    const lines = code.split("\n")

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].toLowerCase()
      const lineNumber = i + 1

      // Check for nested loops
      if (line.includes("for") && lines.slice(i + 1, i + 10).some((l) => l.toLowerCase().includes("for"))) {
        issues.push(
          this.createIssue(
            "warning",
            "Nested loops detected - consider optimization",
            lineNumber,
            0,
            "performance",
            "nested-loops",
            "Consider using more efficient algorithms or data structures",
          ),
        )
      }
    }

    return issues
  }

  async analyzeSecurity(code: string): Promise<CodeIssue[]> {
    const issues: CodeIssue[] = []
    const lines = code.split("\n")

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].toLowerCase()
      const lineNumber = i + 1

      // Check for potential security issues
      if (line.includes("eval(") || line.includes("exec(")) {
        issues.push(
          this.createIssue(
            "error",
            "Use of eval() or exec() can be dangerous",
            lineNumber,
            0,
            "security",
            "dangerous-eval",
            "Avoid using eval() or exec() with user input",
          ),
        )
      }

      if (line.includes("password") && line.includes("=")) {
        issues.push(
          this.createIssue(
            "warning",
            "Potential hardcoded password",
            lineNumber,
            0,
            "security",
            "hardcoded-password",
            "Use environment variables or secure storage for passwords",
          ),
        )
      }
    }

    return issues
  }

  async analyzeStyle(code: string): Promise<CodeIssue[]> {
    const issues: CodeIssue[] = []
    const lines = code.split("\n")

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      const lineNumber = i + 1

      // Check for trailing whitespace
      if (line.endsWith(" ") || line.endsWith("\t")) {
        issues.push(
          this.createIssue(
            "info",
            "Trailing whitespace",
            lineNumber,
            line.length,
            "style",
            "trailing-whitespace",
            "Remove trailing whitespace",
            true,
          ),
        )
      }

      // Check for mixed tabs and spaces
      if (line.includes("\t") && line.includes("  ")) {
        issues.push(
          this.createIssue(
            "warning",
            "Mixed tabs and spaces for indentation",
            lineNumber,
            0,
            "style",
            "mixed-indentation",
            "Use consistent indentation (either tabs or spaces)",
          ),
        )
      }
    }

    return issues
  }

  async calculateMetrics(code: string): Promise<CodeMetrics> {
    const linesOfCode = this.countLines(code)
    const cyclomaticComplexity = this.calculateCyclomaticComplexity(code)
    const maintainabilityIndex = this.calculateMaintainabilityIndex(code, cyclomaticComplexity)
    const duplicatedLines = this.findDuplicatedLines(code)

    // Simple heuristics for other metrics
    const codeSmells = Math.floor(cyclomaticComplexity / 5) + Math.floor(duplicatedLines / 10)
    const technicalDebt = Math.max(0, 100 - maintainabilityIndex)

    return {
      linesOfCode,
      cyclomaticComplexity,
      maintainabilityIndex,
      technicalDebt,
      duplicatedLines,
      codeSmells,
    }
  }

  async generateSuggestions(issues: CodeIssue[], metrics: CodeMetrics): Promise<string[]> {
    const suggestions: string[] = []

    if (metrics.linesOfCode > 500) {
      suggestions.push("Consider breaking this file into smaller modules")
    }

    if (issues.filter((i) => i.category === "style").length > 10) {
      suggestions.push("Use a code formatter to improve code style consistency")
    }

    return suggestions
  }
}
