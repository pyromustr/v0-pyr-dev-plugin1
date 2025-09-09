import { LanguageAnalyzer } from "./languageAnalyzer"
import type { CodeIssue, CodeMetrics } from "./codeAnalyzer"

export class PythonAnalyzer extends LanguageAnalyzer {
  async analyzeSyntax(code: string): Promise<CodeIssue[]> {
    const issues: CodeIssue[] = []
    const lines = code.split("\n")

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      const lineNumber = i + 1

      // Check for mixed tabs and spaces (Python is sensitive to this)
      if (line.startsWith("\t") && lines.some((l) => l.startsWith("    "))) {
        issues.push(
          this.createIssue(
            "error",
            "Mixed tabs and spaces in indentation",
            lineNumber,
            0,
            "syntax",
            "mixed-indentation",
            "Use either tabs or spaces consistently for indentation",
          ),
        )
      }

      // Check for bare except clauses
      if (line.trim() === "except:") {
        issues.push(
          this.createIssue(
            "warning",
            "Bare except clause catches all exceptions",
            lineNumber,
            line.indexOf("except:"),
            "logic",
            "bare-except",
            "Specify exception types or use 'except Exception:'",
          ),
        )
      }

      // Check for mutable default arguments
      const defMatch = line.match(/def\s+\w+\([^)]*=\s*(\[\]|\{\})/)
      if (defMatch) {
        issues.push(
          this.createIssue(
            "warning",
            "Mutable default argument detected",
            lineNumber,
            line.indexOf(defMatch[1]),
            "logic",
            "mutable-default",
            "Use None as default and create mutable object inside function",
          ),
        )
      }

      // Check for unused imports (basic check)
      const importMatch = line.match(/^import\s+(\w+)|^from\s+\w+\s+import\s+(\w+)/)
      if (importMatch) {
        const importedName = importMatch[1] || importMatch[2]
        if (importedName && !code.includes(importedName + ".") && !code.includes(importedName + "(")) {
          issues.push(
            this.createIssue(
              "info",
              `Unused import: ${importedName}`,
              lineNumber,
              0,
              "style",
              "unused-import",
              "Remove unused imports to keep code clean",
            ),
          )
        }
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

      // Check for string concatenation in loops
      if (line.includes("for ") || line.includes("while ")) {
        const loopBody = lines.slice(i + 1, i + 10)
        if (loopBody.some((l) => l.includes("+= ") && l.includes('"'))) {
          issues.push(
            this.createIssue(
              "warning",
              "String concatenation in loop can be inefficient",
              lineNumber,
              0,
              "performance",
              "string-concat-loop",
              "Use list.append() and ''.join() for better performance",
            ),
          )
        }
      }

      // Check for inefficient list operations
      if (line.includes(".append(") && line.includes("for ")) {
        issues.push(
          this.createIssue(
            "info",
            "Consider using list comprehension for better performance",
            lineNumber,
            0,
            "performance",
            "list-comprehension",
            "Use list comprehension: [expr for item in iterable]",
          ),
        )
      }

      // Check for global variable usage
      if (line.startsWith("global ")) {
        issues.push(
          this.createIssue(
            "warning",
            "Global variables can impact performance and maintainability",
            lineNumber,
            0,
            "performance",
            "global-usage",
            "Consider passing variables as parameters instead",
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

      // Check for eval usage
      if (line.includes("eval(")) {
        issues.push(
          this.createIssue(
            "error",
            "eval() usage is dangerous",
            lineNumber,
            line.indexOf("eval("),
            "security",
            "no-eval",
            "Avoid using eval() with untrusted input",
          ),
        )
      }

      // Check for exec usage
      if (line.includes("exec(")) {
        issues.push(
          this.createIssue(
            "error",
            "exec() usage can be dangerous",
            lineNumber,
            line.indexOf("exec("),
            "security",
            "no-exec",
            "Avoid using exec() with untrusted input",
          ),
        )
      }

      // Check for shell command execution
      if (line.includes("os.system(") || line.includes("subprocess.call(")) {
        issues.push(
          this.createIssue(
            "warning",
            "Shell command execution detected",
            lineNumber,
            0,
            "security",
            "shell-injection",
            "Validate and sanitize input before shell execution",
          ),
        )
      }

      // Check for pickle usage
      if (line.includes("pickle.load") || line.includes("pickle.loads")) {
        issues.push(
          this.createIssue(
            "warning",
            "Pickle deserialization can be unsafe",
            lineNumber,
            line.indexOf("pickle."),
            "security",
            "unsafe-pickle",
            "Only unpickle data from trusted sources",
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

      // Check line length (PEP 8)
      if (line.length > 79) {
        issues.push(
          this.createIssue(
            "warning",
            "Line too long (>79 characters) - PEP 8 violation",
            lineNumber,
            79,
            "style",
            "line-length",
            "Break long lines according to PEP 8 guidelines",
          ),
        )
      }

      // Check for function/class naming conventions
      const functionMatch = line.match(/def\s+([a-zA-Z_][a-zA-Z0-9_]*)/)
      if (functionMatch) {
        const functionName = functionMatch[1]
        if (!/^[a-z_][a-z0-9_]*$/.test(functionName)) {
          issues.push(
            this.createIssue(
              "warning",
              "Function name should be in snake_case",
              lineNumber,
              line.indexOf(functionName),
              "style",
              "function-naming",
              "Use snake_case for function names (PEP 8)",
            ),
          )
        }
      }

      const classMatch = line.match(/class\s+([a-zA-Z_][a-zA-Z0-9_]*)/)
      if (classMatch) {
        const className = classMatch[1]
        if (!/^[A-Z][a-zA-Z0-9]*$/.test(className)) {
          issues.push(
            this.createIssue(
              "warning",
              "Class name should be in PascalCase",
              lineNumber,
              line.indexOf(className),
              "style",
              "class-naming",
              "Use PascalCase for class names (PEP 8)",
            ),
          )
        }
      }

      // Check for proper spacing around operators
      if (line.includes("=") && !line.includes("==") && !line.includes("!=")) {
        if (!/\s=\s/.test(line) && !/^\s*\w+\s*=\s*/.test(line)) {
          issues.push(
            this.createIssue(
              "info",
              "Add spaces around assignment operators",
              lineNumber,
              line.indexOf("="),
              "style",
              "operator-spacing",
              "Add spaces around operators (PEP 8)",
            ),
          )
        }
      }
    }

    return issues
  }

  async calculateMetrics(code: string): Promise<CodeMetrics> {
    const baseMetrics = await super.calculateMetrics(code)

    // Python-specific adjustments
    const functionCount = (code.match(/def\s+/g) || []).length
    const classCount = (code.match(/class\s+/g) || []).length

    // Adjust complexity for Python patterns
    let adjustedComplexity = baseMetrics.cyclomaticComplexity

    // List comprehensions add some complexity
    const listCompCount = (code.match(/\[.*for.*in.*\]/g) || []).length
    adjustedComplexity += listCompCount * 0.5

    return {
      ...baseMetrics,
      cyclomaticComplexity: Math.round(adjustedComplexity),
    }
  }

  async generateSuggestions(issues: CodeIssue[], metrics: CodeMetrics): Promise<string[]> {
    const suggestions = await super.generateSuggestions(issues, metrics)

    const pep8Issues = issues.filter((i) => i.message.includes("PEP 8"))
    if (pep8Issues.length > 5) {
      suggestions.push("Use autopep8 or black to automatically format code according to PEP 8")
    }

    const securityIssues = issues.filter((i) => i.category === "security")
    if (securityIssues.length > 0) {
      suggestions.push("Consider using bandit for security analysis of Python code")
    }

    return suggestions
  }
}
