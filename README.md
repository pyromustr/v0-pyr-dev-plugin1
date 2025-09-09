# Pyr Dev - AI Code Assistant

Advanced AI-powered VS Code extension that helps you write, debug, and improve code using LLM agents.

## Features

- 🤖 **AI Agent System**: Intelligent code analysis and assistance
- 🔧 **Code Fixing**: Automatic detection and fixing of code issues
- 💡 **Code Explanation**: Get detailed explanations of complex code
- ⚡ **Code Generation**: Generate code from natural language descriptions
- 🔗 **Chain Tasks**: Execute complex multi-step operations
- 🎯 **Multiple LLM Support**: Azure OpenAI and Google Gemini integration

## Supported LLM Providers

- **Azure OpenAI**: GPT-4, GPT-3.5-turbo
- **Google Gemini**: Gemini Pro, Gemini Pro Vision

## Installation

1. Install the extension from VS Code Marketplace
2. Configure your API keys in settings:
   - `Pyr Dev: Azure OpenAI API Key`
   - `Pyr Dev: Gemini API Key`
3. Start using Pyr Dev commands!

## Commands

- `Pyr Dev: Ask Agent` (Ctrl+Shift+P / Cmd+Shift+P)
- `Pyr Dev: Fix Code Issues` (Ctrl+Shift+F / Cmd+Shift+F)
- `Pyr Dev: Explain Code`
- `Pyr Dev: Generate Code`
- `Pyr Dev: Open Settings`

## Configuration

Open VS Code settings and search for "Pyr Dev" to configure:

- API keys for Azure OpenAI and Gemini
- Default LLM provider
- Auto-suggest settings
- Maximum tokens limit

## Usage

1. **Ask Agent**: Select code or place cursor, then use the command to ask questions
2. **Fix Code**: Select problematic code and run fix command
3. **Explain Code**: Get detailed explanations of selected code
4. **Generate Code**: Describe what you want and let AI generate it

## Requirements

- VS Code 1.74.0 or higher
- Valid API key for at least one supported LLM provider

## License

MIT License
