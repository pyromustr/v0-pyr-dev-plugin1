;(() => {
  const vscode = window.acquireVsCodeApi()

  // DOM elements
  const createBtn = document.getElementById("createBtn")
  const refreshBtn = document.getElementById("refreshBtn")
  const createFirstBtn = document.getElementById("createFirstBtn")
  const chainsList = document.getElementById("chainsList")
  const statsSection = document.getElementById("statsSection")

  // Event listeners
  createBtn.addEventListener("click", () => {
    vscode.postMessage({ type: "createChain" })
  })

  refreshBtn.addEventListener("click", () => {
    vscode.postMessage({ type: "refresh" })
  })

  createFirstBtn.addEventListener("click", () => {
    vscode.postMessage({ type: "createChain" })
  })

  // Handle messages from extension
  window.addEventListener("message", (event) => {
    const message = event.data

    switch (message.type) {
      case "updateChains":
        updateChains(message.chains, message.stats)
        break
    }
  })

  function updateChains(chains, stats) {
    updateStats(stats)

    if (chains.length === 0) {
      showEmptyState()
      return
    }

    chainsList.innerHTML = ""

    chains.forEach((chain) => {
      const chainElement = createChainElement(chain)
      chainsList.appendChild(chainElement)
    })
  }

  function updateStats(stats) {
    document.getElementById("totalChains").textContent = stats.total
    document.getElementById("runningChains").textContent = stats.running
    document.getElementById("completedChains").textContent = stats.completed
  }

  function showEmptyState() {
    chainsList.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">🔗</div>
        <h4>No Task Chains</h4>
        <p>Create your first task chain to get started with automated workflows.</p>
        <button id="createFirstBtn" class="primary-button">Create Task Chain</button>
      </div>
    `

    // Re-attach event listener
    document.getElementById("createFirstBtn").addEventListener("click", () => {
      vscode.postMessage({ type: "createChain" })
    })
  }

  function createChainElement(chain) {
    const element = document.createElement("div")
    element.className = "chain-item"

    const createdDate = new Date(chain.createdAt).toLocaleDateString()
    const completedDate = chain.completedAt ? new Date(chain.completedAt).toLocaleDateString() : null

    element.innerHTML = `
      <div class="chain-status ${chain.status}"></div>
      <div class="chain-info">
        <div class="chain-name">${escapeHtml(chain.name)}</div>
        <div class="chain-meta">
          <span>${chain.taskCount} tasks</span>
          <span>•</span>
          <span>Created ${createdDate}</span>
          ${completedDate ? `<span>• Completed ${completedDate}</span>` : ""}
        </div>
        ${
          chain.status === "running"
            ? `
          <div class="progress-bar">
            <div class="progress-fill" style="width: ${chain.progress * 100}%"></div>
          </div>
        `
            : ""
        }
      </div>
      <div class="chain-actions">
        ${
          chain.status === "pending"
            ? `
          <button class="action-button" title="Execute" onclick="executeChain('${chain.id}')">
            <span class="codicon codicon-play"></span>
          </button>
        `
            : ""
        }
        ${
          chain.status === "running"
            ? `
          <button class="action-button" title="Cancel" onclick="cancelChain('${chain.id}')">
            <span class="codicon codicon-stop"></span>
          </button>
        `
            : ""
        }
        <button class="action-button" title="View Details" onclick="viewChainDetails('${chain.id}')">
          <span class="codicon codicon-eye"></span>
        </button>
        <button class="action-button" title="Duplicate" onclick="duplicateChain('${chain.id}')">
          <span class="codicon codicon-copy"></span>
        </button>
        <button class="action-button" title="Delete" onclick="deleteChain('${chain.id}')">
          <span class="codicon codicon-trash"></span>
        </button>
      </div>
    `

    return element
  }

  function escapeHtml(text) {
    const div = document.createElement("div")
    div.textContent = text
    return div.innerHTML
  }

  // Global functions for button clicks
  window.executeChain = (chainId) => {
    vscode.postMessage({ type: "executeChain", chainId })
  }

  window.cancelChain = (chainId) => {
    vscode.postMessage({ type: "cancelChain", chainId })
  }

  window.viewChainDetails = (chainId) => {
    vscode.postMessage({ type: "viewChainDetails", chainId })
  }

  window.duplicateChain = (chainId) => {
    vscode.postMessage({ type: "duplicateChain", chainId })
  }

  window.deleteChain = (chainId) => {
    vscode.postMessage({ type: "deleteChain", chainId })
  }

  // Initialize
  vscode.postMessage({ type: "refresh" })
})()
