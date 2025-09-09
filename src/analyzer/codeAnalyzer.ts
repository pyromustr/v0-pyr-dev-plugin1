import type { LanguageAnalyzer } from "./languageAnalyzer"
import { JavaScriptAnalyzer } from "./javascriptAnalyzer"
import { TypeScriptAnalyzer } from "./typescriptAnalyzer"
import { PythonAnalyzer } from "./pythonAnalyzer"
import { JavaAnalyzer } from "./javaAnalyzer"
import { CSharpAnalyzer } from "./csharpAnalyzer"
import { CppAnalyzer } from "./cppAnalyzer"
import { GoAnalyzer } from "./goAnalyzer"
import { RustAnalyzer } from "./rustAnalyzer"
import { GenericAnalyzer } from "./genericAnalyzer"

export interface CodeIssue {
  id: string
  severity: "error" | "warning" | "info" | "hint"
  message: string
  line: number
  column: number
  endLine?: number
  endColumn?: number
  rule?: string
  category: "syntax" | "logic" | "performance" | "security" | "style" | "maintainability"
  suggestion?: string
  fixable: boolean
}

export interface CodeMetrics {
  linesOfCode: number
  cyclomaticComplexity: number
  maintainabilityIndex: number
  technicalDebt: number
  duplicatedLines: number
  codeSmells: number
  testCoverage?: number
}

export interface AnalysisResult {
  issues: CodeIssue[]
  metrics: CodeMetrics
  suggestions: string[]
  overallScore: number // 0-100
}

export interface CodeAnalyzer {
  analyzeCode(code: string, language: string, filePath?: string): Promise<AnalysisResult>
  analyzeSyntax(code: string, language: string): Promise<CodeIssue[]>
  analyzePerformance(code: string, language: string): Promise<CodeIssue[]>
  analyzeSecurity(code: string, language: string): Promise<CodeIssue[]>
  analyzeStyle(code: string, language: string): Promise<CodeIssue[]>
  calculateMetrics(code: string, language: string): Promise<CodeMetrics>
  getSupportedLanguages(): string[]
}

export class UniversalCodeAnalyzer implements CodeAnalyzer {
  private languageAnalyzers: Map<string, LanguageAnalyzer> = new Map()

  constructor() {
    this.initializeAnalyzers()
  }

  private initializeAnalyzers(): void {
    // Initialize language-specific analyzers
    this.languageAnalyzers.set("javascript", new JavaScriptAnalyzer())
    this.languageAnalyzers.set("typescript", new TypeScriptAnalyzer())
    this.languageAnalyzers.set("python", new PythonAnalyzer())
    this.languageAnalyzers.set("java", new JavaAnalyzer())
    this.languageAnalyzers.set("csharp", new CSharpAnalyzer())
    this.languageAnalyzers.set("cpp", new CppAnalyzer())
    this.languageAnalyzers.set("go", new GoAnalyzer())
    this.languageAnalyzers.set("rust", new RustAnalyzer())
  }

  async analyzeCode(code: string, language: string, filePath?: string): Promise<AnalysisResult> {
    const analyzer = this.getAnalyzer(language)

    // Run all analysis types in parallel
    const [syntaxIssues, performanceIssues, securityIssues, styleIssues, metrics] = await Promise.all([
      this.analyzeSyntax(code, language),
      this.analyzePerformance(code, language),
      this.analyzeSecurity(code, language),
      this.analyzeStyle(code, language),
      this.calculateMetrics(code, language),
    ])

    const allIssues = [...syntaxIssues, ...performanceIssues, ...securityIssues, ...styleIssues]

    // Sort issues by severity and line number
    allIssues.sort((a, b) => {
      const severityOrder = { error: 0, warning: 1, info: 2, hint: 3 }
      const severityDiff = severityOrder[a.severity] - severityOrder[b.severity]
      return severityDiff !== 0 ? severityDiff : a.line - b.line
    })

    const suggestions = await this.generateSuggestions(allIssues, metrics, language)
    const overallScore = this.calculateOverallScore(allIssues, metrics)

    return {
      issues: allIssues,
      metrics,
      suggestions,
      overallScore,
    }
  }

  async analyzeSyntax(code: string, language: string): Promise<CodeIssue[]> {
    const analyzer = this.getAnalyzer(language)
    return analyzer.analyzeSyntax(code)
  }

  async analyzePerformance(code: string, language: string): Promise<CodeIssue[]> {
    const analyzer = this.getAnalyzer(language)
    return analyzer.analyzePerformance(code)
  }

  async analyzeSecurity(code: string, language: string): Promise<CodeIssue[]> {
    const analyzer = this.getAnalyzer(language)
    return analyzer.analyzeSecurity(code)
  }

  async analyzeStyle(code: string, language: string): Promise<CodeIssue[]> {
    const analyzer = this.getAnalyzer(language)
    return analyzer.analyzeStyle(code)
  }

  async calculateMetrics(code: string, language: string): Promise<CodeMetrics> {
    const analyzer = this.getAnalyzer(language)
    return analyzer.calculateMetrics(code)
  }

  getSupportedLanguages(): string[] {
    return Array.from(this.languageAnalyzers.keys())
  }

  private getAnalyzer(language: string): LanguageAnalyzer {
    const normalizedLang = language.toLowerCase()
    const analyzer = this.languageAnalyzers.get(normalizedLang)

    if (!analyzer) {
      // Fallback to generic analyzer
      return new GenericAnalyzer()
    }

    return analyzer
  }

  private async generateSuggestions(issues: CodeIssue[], metrics: CodeMetrics, language: string): Promise<string[]> {
    const suggestions: string[] = []

    // Generate suggestions based on issues
    const errorCount = issues.filter((i) => i.severity === "error").length
    const warningCount = issues.filter((i) => i.severity === "warning").length

    if (errorCount > 0) {
      suggestions.push(`Fix ${errorCount} syntax error${errorCount > 1 ? "s" : ""} to improve code stability`)
    }

    if (warningCount > 5) {
      suggestions.push(`Address ${warningCount} warnings to improve code quality`)
    }

    // Generate suggestions based on metrics
    if (metrics.cyclomaticComplexity > 10) {
      suggestions.push("Consider breaking down complex functions to improve maintainability")
    }

    if (metrics.maintainabilityIndex < 50) {
      suggestions.push("Refactor code to improve maintainability index")
    }

    if (metrics.duplicatedLines > 20) {
      suggestions.push("Extract common code into reusable functions to reduce duplication")
    }

    // Language-specific suggestions
    const analyzer = this.getAnalyzer(language)
    const languageSpecificSuggestions = await analyzer.generateSuggestions(issues, metrics)
    suggestions.push(...languageSpecificSuggestions)

    return suggestions
  }

  private calculateOverallScore(issues: CodeIssue[], metrics: CodeMetrics): number {
    let score = 100

    // Deduct points for issues
    const errorPenalty = issues.filter((i) => i.severity === "error").length * 10
    const warningPenalty = issues.filter((i) => i.severity === "warning").length * 3
    const infoPenalty = issues.filter((i) => i.severity === "info").length * 1

    score -= errorPenalty + warningPenalty + infoPenalty

    // Adjust based on metrics
    if (metrics.cyclomaticComplexity > 15) score -= 10
    if (metrics.maintainabilityIndex < 40) score -= 15
    if (metrics.duplicatedLines > 30) score -= 10

    return Math.max(0, Math.min(100, score))
  }
}
