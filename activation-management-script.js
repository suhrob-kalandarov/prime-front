// API Configuration
const API_BASE_URL = "http://localhost:8080"

// Global variables
let allAttachments = []
let filteredAttachments = []
const bootstrap = window.bootstrap

// Initialize activation management panel
document.addEventListener("DOMContentLoaded", () => {
    checkAuth()
    initializeActivationManagement()
    loadActivationData()
})

// Check authentication
function checkAuth() {
    const token = localStorage.getItem("accessToken")
    if (!token) {
        window.location.href = "login.html"
        return
    }
}

// Initialize activation management
function initializeActivationManagement() {
    setupSidebar()
    setupEventListeners()
    setupSearchInput()
}

// Setup sidebar
function setupSidebar() {
    const sidebarToggle = document.getElementById("sidebar-toggle")
    const sidebar = document.getElementById("sidebar")

    sidebarToggle.addEventListener("click", () => {
        sidebar.classList.toggle("show")
    })
}

// Setup search input
function setupSearchInput() {
    const searchInput = document.getElementById("search-product-id")
    if (searchInput) {
        searchInput.addEventListener("keypress", (e) => {
            if (e.key === "Enter") {
                searchByProductId()
            }
        })
    }
}

// Setup event listeners
function setupEventListeners() {
    window.refreshData = refreshData
    window.loadAllAttachments = loadAllAttachments
    window.viewAttachment = viewAttachment
    window.activateAttachment = activateAttachment
    window.deactivateAttachment = deactivateAttachment
    window.searchByProductId = searchByProductId
    window.clearSearch = clearSearch
    window.logout = logout
}

// API request with token
async function apiRequest(url, options = {}) {
    const token = localStorage.getItem("accessToken")

    if (!token) {
        window.location.href = "login.html"
        return null
    }

    const headers = {
        ...options.headers,
        Authorization: `Bearer ${token}`,
    }

    try {
        const response = await fetch(`${API_BASE_URL}${url}`, {
            ...options,
            headers,
        })

        if (response.status === 401) {
            window.location.href = "login.html"
            return null
        }

        if (!response.ok) {
            throw new Error(`API request failed: ${response.status}`)
        }

        const contentType = response.headers.get("content-type")
        if (contentType && contentType.includes("application/json")) {
            return await response.json()
        } else {
            return await response.text()
        }
    } catch (error) {
        console.error("API request error:", error)
        throw error
    }
}

// Load activation data
async function loadActivationData() {
    try {
        showLoading()

        await Promise.all([loadActivationStats(), loadAllAttachments()])

        hideLoading()
    } catch (error) {
        console.error("Error loading activation data:", error)
        showNotification("error", "Faollashtirish ma'lumotlarini yuklashda xatolik")
        hideLoading()
    }
}

// Load activation statistics
async function loadActivationStats() {
    try {
        const [active, inactive, linked, unlinked] = await Promise.all([
            apiRequest("/api/v1/admin/attachments/active").then((data) => data?.length || 0),
            apiRequest("/api/v1/admin/attachments/inactive").then((data) => data?.length || 0),
            apiRequest("/api/v1/admin/attachments/linked-with-product/count"),
            apiRequest("/api/v1/admin/attachments/no-linked-with-product/count"),
        ])

        animateCounter("total-active-attachments", active || 0)
        animateCounter("total-inactive-attachments", inactive || 0)
        animateCounter("total-linked-attachments", linked || 0)
        animateCounter("total-unlinked-attachments", unlinked || 0)
    } catch (error) {
        console.error("Error loading activation stats:", error)
        showNotification("error", "Statistika ma'lumotlarini yuklashda xatolik")
    }
}

// Load all attachments
async function loadAllAttachments() {
    try {
        const data = await apiRequest("/api/v1/admin/attachments")
        allAttachments = data || []
        filteredAttachments = [...allAttachments]
        renderAttachmentsTable()
    } catch (error) {
        console.error("Error loading attachments:", error)
        showNotification("error", "Rasmlarni yuklashda xatolik")
    }
}

// Search by product ID
function searchByProductId() {
    const searchInput = document.getElementById("search-product-id")
    const productId = searchInput.value.trim()

    if (!productId) {
        filteredAttachments = [...allAttachments]
    } else {
        filteredAttachments = allAttachments.filter((attachment) => {
            return attachment.productId && attachment.productId.toString().includes(productId)
        })
    }

    renderAttachmentsTable()

    if (productId && filteredAttachments.length === 0) {
        showNotification("info", "Berilgan Product ID bo'yicha rasmlar topilmadi")
    }
}

// Clear search
function clearSearch() {
    document.getElementById("search-product-id").value = ""
    filteredAttachments = [...allAttachments]
    renderAttachmentsTable()
    showNotification("success", "Qidiruv tozalandi")
}

// Render attachments table
function renderAttachmentsTable() {
    const tbody = document.getElementById("attachments-table")
    if (!tbody) return

    if (filteredAttachments.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">Ma\'lumotlar mavjud emas</td></tr>'
        return
    }

    tbody.innerHTML = filteredAttachments
        .map(
            (attachment) => `
        <tr class="fade-in">
            <td>${attachment.id}</td>
            <td class="text-truncate" style="max-width: 150px;" title="${attachment.filename || attachment.name}">${attachment.filename || attachment.name || "N/A"}</td>
            <td>
                ${attachment.productId ? `<span class="badge bg-primary">${attachment.productId}</span>` : '<span class="badge bg-secondary">NO-LINKED</span>'}
            </td>
            <td>
                <span class="status-badge ${attachment.active ? "active" : "inactive"}">
                    ${attachment.active ? "FAOL" : "NOFAOL"}
                </span>
            </td>
            <td>
                <button class="action-btn edit" onclick="viewAttachment(${attachment.id})" title="Ko'rish">
                    <i class="fas fa-eye"></i>
                </button>
                ${
                attachment.active
                    ? `<button class="action-btn delete" onclick="deactivateAttachment(${attachment.id})" title="Nofaollashtirish">
                         <i class="fas fa-pause"></i>
                       </button>`
                    : `<button class="action-btn edit" onclick="activateAttachment(${attachment.id})" title="Faollashtirish">
                         <i class="fas fa-play"></i>
                       </button>`
            }
            </td>
        </tr>
    `,
        )
        .join("")
}

// View attachment details
async function viewAttachment(attachmentId) {
    try {
        const attachment = await apiRequest(`/api/v1/admin/attachment/${attachmentId}`)

        if (!attachment) {
            showNotification("error", "Rasm ma'lumotlari topilmadi")
            return
        }

        // Ma'lumotlarni to'ldiramiz
        document.getElementById("file-detail-id").textContent = attachment.id || "-"
        document.getElementById("file-detail-name").textContent = attachment.filename || "-"
        document.getElementById("file-detail-content-type").textContent = attachment.contentType || "-"
        document.getElementById("file-detail-url").textContent = attachment.url || "-"
        document.getElementById("file-detail-status").innerHTML = `
            <span class="status-badge ${attachment.active ? "active" : "inactive"}">
                ${attachment.active ? "FAOL" : "NOFAOL"}
            </span>
        `
        document.getElementById("file-detail-created-at").textContent = attachment.createdAt || "-"
        document.getElementById("file-detail-created-by").textContent = attachment.createdBy || "-"
        document.getElementById("file-detail-updated-at").textContent = attachment.updatedAt || "-"
        document.getElementById("file-detail-updated-by").textContent = attachment.updatedBy || "-"

        // Fayl preview ni ko'rsatamiz
        const previewContainer = document.getElementById("file-preview-container")
        if (attachment.contentType && attachment.contentType.startsWith("image/")) {
            previewContainer.innerHTML = `
                <img src="${API_BASE_URL}/api/v1/attachment/${attachment.id}" 
                     class="img-fluid rounded" 
                     alt="${attachment.filename}"
                     style="max-height: 300px; object-fit: contain;"
                     onerror="this.src='/placeholder.svg?height=300&width=300'">
            `
        } else {
            previewContainer.innerHTML = `
                <div class="d-flex align-items-center justify-content-center bg-light rounded" style="height: 200px;">
                    <div class="text-center">
                        <i class="fas fa-file fa-3x text-muted mb-3"></i>
                        <div class="text-muted">${attachment.filename}</div>
                    </div>
                </div>
            `
        }

        const modal = new bootstrap.Modal(document.getElementById("viewFileModal"))
        modal.show()
    } catch (error) {
        console.error("Error viewing attachment:", error)
        showNotification("error", "Rasm ma'lumotlarini yuklashda xatolik")
    }
}

// Activate attachment
async function activateAttachment(attachmentId) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/v1/admin/attachment/activate/${attachmentId}`, {
            method: "PUT",
            headers: {
                Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
                "Content-Type": "application/json",
            },
        })

        if (!response.ok) {
            throw new Error("Failed to activate attachment")
        }

        const result = await response.json()
        showNotification("success", "Rasm muvaffaqiyatli faollashtirildi")

        // Refresh data
        loadActivationData()
    } catch (error) {
        console.error("Error activating attachment:", error)
        showNotification("error", "Rasmni faollashtirish xatolik")
    }
}

// Deactivate attachment
async function deactivateAttachment(attachmentId) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/v1/admin/attachment/deactivate/${attachmentId}`, {
            method: "PUT",
            headers: {
                Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
                "Content-Type": "application/json",
            },
        })

        if (!response.ok) {
            throw new Error("Failed to deactivate attachment")
        }

        const result = await response.json()
        showNotification("success", "Rasm muvaffaqiyatli nofaollashtirildi")

        // Refresh data
        loadActivationData()
    } catch (error) {
        console.error("Error deactivating attachment:", error)
        showNotification("error", "Rasmni nofaollashtirish xatolik")
    }
}

// Refresh data
function refreshData() {
    loadActivationData()
    showNotification("success", "Ma'lumotlar yangilandi")
}

// Animate counter
function animateCounter(elementId, targetValue) {
    const element = document.getElementById(elementId)
    if (!element) return

    const startValue = 0
    const duration = 1000
    const startTime = performance.now()

    function updateCounter(currentTime) {
        const elapsed = currentTime - startTime
        const progress = Math.min(elapsed / duration, 1)

        const currentValue = Math.floor(startValue + (targetValue - startValue) * progress)
        element.textContent = currentValue

        if (progress < 1) {
            requestAnimationFrame(updateCounter)
        }
    }

    requestAnimationFrame(updateCounter)
}

// Show loading
function showLoading() {
    const overlay = document.createElement("div")
    overlay.id = "loading-overlay"
    overlay.innerHTML = `
        <div class="loading-spinner"></div>
        <p>Yuklanmoqda...</p>
    `
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(255, 255, 255, 0.9);
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        z-index: 9999;
        backdrop-filter: blur(5px);
    `
    document.body.appendChild(overlay)
}

// Hide loading
function hideLoading() {
    const overlay = document.getElementById("loading-overlay")
    if (overlay) {
        overlay.remove()
    }
}

// Show notification
function showNotification(type, message) {
    const notification = document.createElement("div")
    notification.className = `alert alert-${type === "success" ? "success" : type === "error" ? "danger" : type === "warning" ? "warning" : "info"} alert-dismissible fade show position-fixed`
    notification.style.cssText = "top: 20px; right: 20px; z-index: 10000; max-width: 350px; animation: slideIn 0.3s ease;"

    notification.innerHTML = `
        <i class="fas fa-${type === "success" ? "check-circle" : type === "error" ? "exclamation-circle" : type === "warning" ? "exclamation-triangle" : "info-circle"} me-2"></i>
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `

    document.body.appendChild(notification)

    setTimeout(() => {
        if (notification.parentNode) {
            notification.remove()
        }
    }, 5000)
}

// Logout function
function logout() {
    if (confirm("Chiqishni xohlaysizmi?")) {
        localStorage.removeItem("accessToken")
        localStorage.removeItem("refreshToken")
        showNotification("success", "Muvaffaqiyatli chiqildi")
        setTimeout(() => {
            window.location.href = "login.html"
        }, 1000)
    }
}
