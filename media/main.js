;(() => {
  const vscode = window.acquireVsCodeApi()

  // DOM elements
  const messagesContainer = document.getElementById("messagesContainer")
  const messageInput = document.getElementById("messageInput")
  const sendBtn = document.getElementById("sendBtn")
  const clearBtn = document.getElementById("clearBtn")
  const exportBtn = document.getElementById("exportBtn")
  const newSessionBtn = document.getElementById("newSessionBtn")
  const contextBtn = document.getElementById("contextBtn")
  const contextInfo = document.getElementById("contextInfo")
  const typingIndicator = document.getElementById("typingIndicator")

  let includeContext = false
  let currentContext = null

  // Event listeners
  sendBtn.addEventListener("click", sendMessage)
  clearBtn.addEventListener("click", clearChat)
  exportBtn.addEventListener("click", exportChat)
  newSessionBtn.addEventListener("click", newSession)
  contextBtn.addEventListener("click", toggleContext)

  messageInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  })

  messageInput.addEventListener("input", () => {
    autoResizeTextarea()
  })

  // Handle messages from extension
  window.addEventListener("message", (event) => {
    const message = event.data

    switch (message.type) {
      case "addMessage":
        addMessage(message.message)
        break
      case "clearMessages":
        clearMessages()
        break
      case "typing":
        showTypingIndicator(message.isTyping)
        break
      case "loadHistory":
        loadHistory(message.messages)
        break
      case "codeContext":
        updateContext(message.context)
        break
    }
  })

  function sendMessage() {
    const message = messageInput.value.trim()
    if (!message) return

    // Disable send button
    sendBtn.disabled = true

    // Send message to extension
    vscode.postMessage({
      type: "sendMessage",
      message: message,
    })

    // Clear input
    messageInput.value = ""
    autoResizeTextarea()

    // Re-enable send button after a short delay
    setTimeout(() => {
      sendBtn.disabled = false
      messageInput.focus()
    }, 500)
  }

  function addMessage(message) {
    // Remove welcome message if it exists
    const welcomeMessage = messagesContainer.querySelector(".welcome-message")
    if (welcomeMessage) {
      welcomeMessage.remove()
    }

    const messageElement = document.createElement("div")
    messageElement.className = `message ${message.role}`

    const avatar = message.role === "user" ? "👤" : "🤖"
    const timestamp = new Date(message.timestamp).toLocaleTimeString()

    messageElement.innerHTML = `
      <div class="message-avatar">${avatar}</div>
      <div class="message-content">
        <div class="message-header">
          <span class="message-role">${message.role}</span>
          <span class="message-timestamp">${timestamp}</span>
        </div>
        <div class="message-text">${formatMessageContent(message.content)}</div>
      </div>
    `

    messagesContainer.appendChild(messageElement)
    scrollToBottom()
  }

  function formatMessageContent(content) {
    // Basic markdown-like formatting
    content = content.replace(/```(\w+)?\n([\s\S]*?)```/g, (match, lang, code) => {
      return `<pre><code class="language-${lang || "text"}">${escapeHtml(code.trim())}</code></pre>`
    })

    content = content.replace(/`([^`]+)`/g, "<code>$1</code>")
    content = content.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    content = content.replace(/\*(.*?)\*/g, "<em>$1</em>")
    content = content.replace(/\n/g, "<br>")

    return content
  }

  function escapeHtml(text) {
    const div = document.createElement("div")
    div.textContent = text
    return div.innerHTML
  }

  function clearMessages() {
    messagesContainer.innerHTML = `
      <div class="welcome-message">
        <div class="welcome-icon">🤖</div>
        <h4>Welcome to Pyr Dev!</h4>
        <p>I'm your AI coding assistant. I can help you:</p>
        <ul>
          <li>Write and generate code</li>
          <li>Fix bugs and errors</li>
          <li>Explain complex code</li>
          <li>Optimize performance</li>
          <li>Review code quality</li>
        </ul>
        <p>Select some code and ask me anything!</p>
      </div>
    `
  }

  function clearChat() {
    vscode.postMessage({ type: "clearChat" })
  }

  function exportChat() {
    vscode.postMessage({ type: "exportChat" })
  }

  function newSession() {
    vscode.postMessage({ type: "newSession" })
  }

  function toggleContext() {
    includeContext = !includeContext
    contextBtn.classList.toggle("active", includeContext)

    if (includeContext) {
      vscode.postMessage({ type: "getCodeContext" })
    } else {
      contextInfo.style.display = "none"
    }
  }

  function updateContext(context) {
    currentContext = context

    if (context && includeContext) {
      const fileName = context.fileName.split("/").pop()
      const selectionText = context.selection
        ? `${context.selectionRange.end.line - context.selectionRange.start.line + 1} lines selected`
        : `${context.lineCount} lines`

      contextInfo.querySelector(".context-file").textContent = fileName
      contextInfo.querySelector(".context-language").textContent = context.language
      contextInfo.querySelector(".context-selection").textContent = selectionText
      contextInfo.style.display = "block"
    } else {
      contextInfo.style.display = "none"
    }
  }

  function showTypingIndicator(isTyping) {
    typingIndicator.style.display = isTyping ? "flex" : "none"
    if (isTyping) {
      scrollToBottom()
    }
  }

  function loadHistory(messages) {
    clearMessages()
    messages.forEach((message) => {
      addMessage(message)
    })
  }

  function scrollToBottom() {
    setTimeout(() => {
      messagesContainer.scrollTop = messagesContainer.scrollHeight
    }, 100)
  }

  function autoResizeTextarea() {
    messageInput.style.height = "auto"
    messageInput.style.height = Math.min(messageInput.scrollHeight, 120) + "px"
  }

  // Initialize
  messageInput.focus()
  vscode.postMessage({ type: "getCodeContext" })
})()
