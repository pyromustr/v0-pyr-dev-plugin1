export class PromptTemplates {
  static readonly SYSTEM_PROMPT =
    `You are Pyr Dev, an advanced AI code assistant. You help developers write, debug, and improve code.

Key capabilities:
- Analyze code for bugs, performance issues, and best practices
- Generate high-quality code from natural language descriptions
- Explain complex code in simple terms
- Suggest improvements and optimizations
- Support multiple programming languages

Guidelines:
- Provide clear, concise explanations
- Include code examples when helpful
- Focus on best practices and clean code
- Be specific about potential issues and solutions
- Consider performance, security, and maintainability`

  static readonly INLINE_COMPLETION_SYSTEM =
    `You are Pyr Dev's inline code completion engine. Generate contextually appropriate code completions.

Rules:
- Only return the completion text, no explanations
- Match the existing code style and patterns
- Consider the cursor position and surrounding context
- Generate syntactically correct code
- Keep completions concise and relevant
- Don't repeat existing code`

  static readonly CODE_ANALYSIS_PROMPT = `Analyze the following code and identify:
1. Potential bugs or errors
2. Performance issues
3. Security vulnerabilities
4. Code style and best practice violations
5. Suggestions for improvement

Code Language: {language}
Code:
{code}

Provide a structured analysis with specific recommendations.`

  static readonly CODE_FIX_PROMPT = `Fix the following issues in the code:
Issues: {issues}

Original Code:
{code}

Provide the corrected code with explanations for each fix.`

  static readonly CODE_EXPLANATION_PROMPT = `Explain the following code in detail:

Language: {language}
Code:
{code}

Provide:
1. Overall purpose and functionality
2. Step-by-step breakdown
3. Key concepts and patterns used
4. Potential use cases
5. Any notable aspects or complexities`

  static readonly CODE_GENERATION_PROMPT = `Generate {language} code based on this description:
{description}

Requirements:
- Follow best practices and conventions
- Include appropriate error handling
- Add helpful comments
- Make the code production-ready
- Consider performance and maintainability`

  static readonly CHAIN_TASK_PROMPT = `You are executing a chain of tasks. Current task: {currentTask}

Previous context: {previousContext}
Current request: {request}

Execute this task and provide the result. If this task depends on previous results, use the provided context.`

  static readonly INLINE_COMPLETION_PROMPT = `Complete the code at the cursor position.

Language: {language}
Context Code:
{code}

Current Line: {currentLine}
Next Line: {nextLine}
Cursor Position: {position}

Generate only the completion text that should be inserted at the cursor position.`

  static readonly CODE_ELEMENT_EXPLANATION_PROMPT = `Explain this code element in context:

Element: {element}
Language: {language}
Line: {line}

Context:
{context}

Provide a brief, helpful explanation of what this element does and how it works in this context.`

  static readonly QUICK_FIX_PROMPT = `Fix this specific issue in the code:

Issue: {issue}
Language: {language}

Code:
{code}

Provide only the corrected code without explanations.`

  static readonly REFACTOR_PROMPT =
    `Refactor this code to improve readability, maintainability, and follow best practices:

Language: {language}
Code:
{code}

Provide the refactored code with improved structure, naming, and organization.`

  static readonly OPTIMIZE_PROMPT = `Optimize this code for better performance:

Language: {language}
Code:
{code}

Provide the optimized version focusing on performance improvements while maintaining functionality.`

  static readonly ADD_COMMENTS_PROMPT = `Add helpful comments to this code:

Language: {language}
Code:
{code}

Add appropriate comments explaining the purpose, logic, and important details. Keep comments concise and meaningful.`

  static formatPrompt(template: string, variables: Record<string, string>): string {
    let formatted = template
    for (const [key, value] of Object.entries(variables)) {
      formatted = formatted.replace(new RegExp(`{${key}}`, "g"), value)
    }
    return formatted
  }
}
