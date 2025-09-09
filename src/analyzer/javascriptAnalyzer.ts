import { LanguageAnalyzer } from "./languageAnalyzer"
import type { CodeIssue, CodeMetrics } from "./codeAnalyzer"

export class JavaScriptAnalyzer extends LanguageAnalyzer {
  async analyzeSyntax(code: string): Promise<CodeIssue[]> {
    const issues: CodeIssue[] = []
    const lines = code.split("\n")

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim()
      const lineNumber = i + 1

      // Check for missing semicolons
      if (
        line.length > 0 &&
        !line.endsWith(";") &&
        !line.endsWith("{") &&
        !line.endsWith("}") &&
        !line.startsWith("//") &&
        !line.startsWith("/*") &&
        !line.includes("if") &&
        !line.includes("for") &&
        !line.includes("while") &&
        !line.includes("function") &&
        !line.includes("class")
      ) {
        issues.push(
          this.createIssue(
            "warning",
            "Missing semicolon",
            lineNumber,
            line.length,
            "style",
            "missing-semicolon",
            "Add semicolon at the end of the statement",
            true,
          ),
        )
      }

      // Check for var usage (prefer let/const)
      if (line.includes("var ")) {
        issues.push(
          this.createIssue(
            "warning",
            "Use 'let' or 'const' instead of 'var'",
            lineNumber,
            line.indexOf("var"),
            "style",
            "no-var",
            "Replace 'var' with 'let' or 'const' for better scoping",
            true,
          ),
        )
      }

      // Check for == usage (prefer ===)
      if (line.includes("==") && !line.includes("===") && !line.includes("!==")) {
        issues.push(
          this.createIssue(
            "warning",
            "Use strict equality (===) instead of loose equality (==)",
            lineNumber,
            line.indexOf("=="),
            "logic",
            "strict-equality",
            "Use === or !== for strict comparison",
            true,
          ),
        )
      }

      // Check for console.log in production code
      if (line.includes("console.log")) {
        issues.push(
          this.createIssue(
            "info",
            "Console.log statement found",
            lineNumber,
            line.indexOf("console.log"),
            "style",
            "no-console",
            "Remove console.log statements from production code",
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
      const line = lines[i].trim()
      const lineNumber = i + 1

      // Check for inefficient array operations
      if (line.includes(".forEach(") && line.includes("push(")) {
        issues.push(
          this.createIssue(
            "warning",
            "Consider using map() instead of forEach() with push()",
            lineNumber,
            0,
            "performance",
            "inefficient-array-ops",
            "Use array.map() for transformations instead of forEach() with push()",
          ),
        )
      }

      // Check for repeated DOM queries
      if (line.includes("document.getElementById") || line.includes("document.querySelector")) {
        const nextLines = lines.slice(i + 1, i + 5)
        if (nextLines.some((l) => l.includes("document.getElementById") || l.includes("document.querySelector"))) {
          issues.push(
            this.createIssue(
              "warning",
              "Repeated DOM queries detected",
              lineNumber,
              0,
              "performance",
              "repeated-dom-queries",
              "Cache DOM elements in variables to avoid repeated queries",
            ),
          )
        }
      }

      // Check for synchronous operations that could be async
      if (line.includes("JSON.parse") && line.includes("localStorage.getItem")) {
        issues.push(
          this.createIssue(
            "info",
            "Consider using async operations for large data parsing",
            lineNumber,
            0,
            "performance",
            "sync-operations",
            "Use Web Workers for heavy JSON parsing operations",
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
      const line = lines[i].trim()
      const lineNumber = i + 1

      // Check for innerHTML usage
      if (line.includes(".innerHTML") && line.includes("=")) {
        issues.push(
          this.createIssue(
            "warning",
            "Using innerHTML can lead to XSS vulnerabilities",
            lineNumber,
            line.indexOf(".innerHTML"),
            "security",
            "no-inner-html",
            "Use textContent or createElement() for safer DOM manipulation",
          ),
        )
      }

      // Check for eval usage
      if (line.includes("eval(")) {
        issues.push(
          this.createIssue(
            "error",
            "eval() usage is dangerous and should be avoided",
            lineNumber,
            line.indexOf("eval("),
            "security",
            "no-eval",
            "Avoid using eval() as it can execute arbitrary code",
          ),
        )
      }

      // Check for document.write usage
      if (line.includes("document.write")) {
        issues.push(
          this.createIssue(
            "warning",
            "document.write() can be dangerous and is deprecated",
            lineNumber,
            line.indexOf("document.write"),
            "security",
            "no-document-write",
            "Use modern DOM manipulation methods instead",
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

      // Check for function naming convention
      const functionMatch = line.match(/function\s+([a-zA-Z_][a-zA-Z0-9_]*)/)
      if (functionMatch) {
        const functionName = functionMatch[1]
        if (functionName[0] === functionName[0].toUpperCase() && !line.includes("constructor")) {
          issues.push(
            this.createIssue(
              "warning",
              "Function names should start with lowercase letter",
              lineNumber,
              line.indexOf(functionName),
              "style",
              "function-naming",
              "Use camelCase for function names",
            ),
          )
        }
      }

      // Check for variable naming convention
      const varMatch = line.match(/(let|const|var)\s+([a-zA-Z_][a-zA-Z0-9_]*)/g)
      if (varMatch) {
        varMatch.forEach((match) => {
          const varName = match.split(/\s+/)[1]
          if (varName.includes("_") && !varName.toUpperCase() === varName) {
            issues.push(
              this.createIssue(
                "info",
                "Consider using camelCase instead of snake_case",
                lineNumber,
                line.indexOf(varName),
                "style",
                "variable-naming",
                "Use camelCase for variable names in JavaScript",
              ),
            )
          }
        })
      }

      // Check for proper spacing around operators
      if (line.includes("=") && !line.includes("==") && !line.includes("===")) {
        if (!/\s=\s/.test(line) && line.includes("=")) {
          issues.push(
            this.createIssue(
              "info",
              "Add spaces around assignment operators",
              lineNumber,
              line.indexOf("="),
              "style",
              "operator-spacing",
              "Add spaces before and after operators for better readability",
              true,
            ),
          )
        }
      }
    }

    return issues
  }

  async calculateMetrics(code: string): Promise<CodeMetrics> {
    const baseMetrics = await super.calculateMetrics(code)

    // JavaScript-specific metrics
    const functionCount = (code.match(/function\s+/g) || []).length
    const arrowFunctionCount = (code.match(/=>\s*{?/g) || []).length
    const totalFunctions = functionCount + arrowFunctionCount

    // Adjust complexity based on JavaScript patterns
    let adjustedComplexity = baseMetrics.cyclomaticComplexity

    // Callbacks and promises add complexity
    const callbackCount = (code.match(/\.then\(|\.catch\(|callback\(/g) || []).length
    adjustedComplexity += callbackCount * 0.5

    return {
      ...baseMetrics,
      cyclomaticComplexity: Math.round(adjustedComplexity),
    }
  }

  async generateSuggestions(issues: CodeIssue[], metrics: CodeMetrics): Promise<string[]> {
    const suggestions = await super.generateSuggestions(issues, metrics)

    const securityIssues = issues.filter((i) => i.category === "security")
    if (securityIssues.length > 0) {
      suggestions.push("Consider using a security linter like ESLint with security plugins")
    }

    const performanceIssues = issues.filter((i) => i.category === "performance")
    if (performanceIssues.length > 3) {
      suggestions.push("Consider using performance profiling tools to identify bottlenecks")
    }

    const styleIssues = issues.filter((i) => i.category === "style")
    if (styleIssues.length > 10) {
      suggestions.push("Use Prettier and ESLint to automatically format and fix style issues")
    }

    return suggestions
  }
}

export class TypeScriptAnalyzer extends JavaScriptAnalyzer {
  async analyzeSyntax(code: string): Promise<CodeIssue[]> {
    const issues = await super.analyzeSyntax(code)
    const lines = code.split("\n")

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim()
      const lineNumber = i + 1

      // Check for any type usage
      if (line.includes(": any")) {
        issues.push(
          this.createIssue(
            "warning",
            "Avoid using 'any' type - use specific types instead",
            lineNumber,
            line.indexOf(": any"),
            "style",
            "no-any",
            "Define specific types or interfaces for better type safety",
          ),
        )
      }

      // Check for missing return type annotations
      const functionMatch = line.match(/function\s+[a-zA-Z_][a-zA-Z0-9_]*\s*$$[^)]*$$\s*{/)
      if (functionMatch && !line.includes("):")) {
        issues.push(
          this.createIssue(
            "info",
            "Consider adding return type annotation",
            lineNumber,
            0,
            "style",
            "return-type",
            "Add explicit return type for better code documentation",
          ),
        )
      }
    }

    return issues
  }

  async generateSuggestions(issues: CodeIssue[], metrics: CodeMetrics): Promise<string[]> {
    const suggestions = await super.generateSuggestions(issues, metrics)

    const anyTypeIssues = issues.filter((i) => i.rule === "no-any")
    if (anyTypeIssues.length > 0) {
      suggestions.push("Enable strict TypeScript compiler options for better type checking")
    }

    return suggestions
  }
}
