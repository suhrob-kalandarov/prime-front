// API Configuration
const API_BASE_URL = "http://localhost:8080"

// Global variables
const allFiles = []
let todayFiles = []
let weekFiles = []
let monthFiles = []
const bootstrap = window.bootstrap

// Initialize files panel
document.addEventListener("DOMContentLoaded", () => {
    checkAuth()
    initializeFilesPanel()
    loadFilesData()
})

// Check authentication
function checkAuth() {
    const token = localStorage.getItem("accessToken")
    if (!token) {
        window.location.href = "login.html"
        return
    }
}

// Initialize files panel
function initializeFilesPanel() {
    setupSidebar()
    setupFileUpload()
    setupEventListeners()
}

// Setup sidebar
function setupSidebar() {
    const sidebarToggle = document.getElementById("sidebar-toggle")
    const sidebar = document.getElementById("sidebar")

    sidebarToggle.addEventListener("click", () => {
        sidebar.classList.toggle("show")
    })
}

// Setup file upload
function setupFileUpload() {
    const uploadArea = document.getElementById("file-upload-area")
    const fileInput = document.getElementById("file-input")
    const preview = document.getElementById("file-preview")

    if (!uploadArea || !fileInput || !preview) return

    uploadArea.addEventListener("click", () => fileInput.click())

    uploadArea.addEventListener("dragover", (e) => {
        e.preventDefault()
        uploadArea.classList.add("dragover")
    })

    uploadArea.addEventListener("dragleave", () => {
        uploadArea.classList.remove("dragover")
    })

    uploadArea.addEventListener("drop", (e) => {
        e.preventDefault()
        uploadArea.classList.remove("dragover")
        const files = e.dataTransfer.files
        if (files.length > 0) {
            fileInput.files = files
            handleFilePreview(files[0], preview)
        }
    })

    fileInput.addEventListener("change", (e) => {
        if (e.target.files.length > 0) {
            handleFilePreview(e.target.files[0], preview)
        }
    })
}

// Handle file preview
function handleFilePreview(file, preview) {
    preview.innerHTML = ""

    if (file.type.startsWith("image/")) {
        const reader = new FileReader()
        reader.onload = (e) => {
            const previewItem = document.createElement("div")
            previewItem.className = "preview-item"
            previewItem.innerHTML = `
                <img src="${e.target.result}" alt="Preview">
                <button type="button" class="preview-remove" onclick="removePreview(this)">
                    <i class="fas fa-times"></i>
                </button>
            `
            preview.appendChild(previewItem)
        }
        reader.readAsDataURL(file)
    } else {
        const previewItem = document.createElement("div")
        previewItem.className = "preview-item d-flex align-items-center justify-content-center"
        previewItem.style.background = "var(--gray-100)"
        previewItem.innerHTML = `
            <div class="text-center">
                <i class="fas fa-file fa-2x text-muted mb-2"></i>
                <div class="small text-muted">${file.name}</div>
            </div>
            <button type="button" class="preview-remove" onclick="removePreview(this)">
                <i class="fas fa-times"></i>
            </button>
        `
        preview.appendChild(previewItem)
    }
}

// Remove preview
function removePreview(button) {
    button.parentElement.remove()
    document.getElementById("file-input").value = ""
}

// Setup event listeners
function setupEventListeners() {
    // Make functions available globally
    window.showUploadModal = showUploadModal
    window.uploadFile = uploadFile
    window.clearMemory = clearMemory
    window.toggleActivation = toggleActivation
    window.updateFiles = updateFiles
    window.viewFile = viewFile
    window.loadTodayFiles = loadTodayFiles
    window.loadWeekFiles = loadWeekFiles
    window.loadMonthFiles = loadMonthFiles
    window.refreshData = refreshData
    window.toggleFullscreen = toggleFullscreen
    window.logout = logout
    window.removePreview = removePreview
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

// Load files data
async function loadFilesData() {
    try {
        showLoading()

        await Promise.all([loadAttachmentStats(), loadTodayFiles(), loadWeekFiles(), loadMonthFiles()])

        hideLoading()
    } catch (error) {
        console.error("Error loading files data:", error)
        showNotification("error", "Fayllar ma'lumotlarini yuklashda xatolik")
        hideLoading()
    }
}

// Load attachment statistics
async function loadAttachmentStats() {
    try {
        const [total, active, inactive, deleted] = await Promise.all([
            apiRequest("/api/v1/admin/attachments/count"),
            apiRequest("/api/v1/admin/attachments/active-count"),
            apiRequest("/api/v1/admin/attachments/inactive-count"),
            apiRequest("/api/v1/admin/attachments/deleted-count"),
        ])

        animateCounter("total-attachments", total || 0)
        animateCounter("active-attachments", active || 0)
        animateCounter("inactive-attachments", inactive || 0)
        animateCounter("deleted-attachments", deleted || 0)
    } catch (error) {
        console.error("Error loading attachment stats:", error)
        showNotification("error", "Statistika ma'lumotlarini yuklashda xatolik")
    }
}

// Load today's files
async function loadTodayFiles() {
    try {
        // Since there's no specific API for date filtering, we'll simulate it
        // In real implementation, you would call an API with date parameters
        const files = await getMockFilesForPeriod("today")
        todayFiles = files
        renderFilesTable("today-files-table", files)
    } catch (error) {
        console.error("Error loading today's files:", error)
        showNotification("error", "Bugungi fayllarni yuklashda xatolik")
    }
}

// Load this week's files
async function loadWeekFiles() {
    try {
        const files = await getMockFilesForPeriod("week")
        weekFiles = files
        renderFilesTable("week-files-table", files)
    } catch (error) {
        console.error("Error loading week's files:", error)
        showNotification("error", "Bu hafta fayllarini yuklashda xatolik")
    }
}

// Load last month's files
async function loadMonthFiles() {
    try {
        const files = await getMockFilesForPeriod("month")
        monthFiles = files
        renderFilesTable("month-files-table", files)
    } catch (error) {
        console.error("Error loading month's files:", error)
        showNotification("error", "Oxirgi oy fayllarini yuklashda xatolik")
    }
}

// Mock function to simulate files for different periods
async function getMockFilesForPeriod(period) {
    // This is a mock function. In real implementation, you would call the actual API
    // with date parameters to filter files by period
    const mockFiles = [
        {
            id: 1,
            filename: "box.jpeg",
            contentType: "image/jpeg",
            url: "box.jpeg_1749999806777",
            active: true,
            createdAt: "2025-06-15 20:03:27.763663",
            createdBy: "SYSTEM",
            updatedAt: "2025-06-15 20:03:27.763663",
            updatedBy: "SYSTEM",
        },
        {
            id: 2,
            filename: "product.png",
            contentType: "image/png",
            url: "product.png_1749999806778",
            active: true,
            createdAt: "2025-06-15 19:30:15.123456",
            createdBy: "ADMIN",
            updatedAt: "2025-06-15 19:30:15.123456",
            updatedBy: "ADMIN",
        },
    ]

    // Filter based on period (mock implementation)
    switch (period) {
        case "today":
            return mockFiles.slice(0, 2)
        case "week":
            return mockFiles.slice(0, 1)
        case "month":
            return mockFiles
        default:
            return []
    }
}

// Render files table
function renderFilesTable(tableId, files) {
    const tbody = document.getElementById(tableId)
    if (!tbody) return

    if (files.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted">Ma\'lumotlar mavjud emas</td></tr>'
        return
    }

    tbody.innerHTML = files
        .map(
            (file) => `
        <tr class="fade-in">
            <td>${file.id}</td>
            <td class="text-truncate" style="max-width: 100px;" title="${file.filename}">${file.filename}</td>
            <td>
                <span class="status-badge ${file.active ? "active" : "inactive"}">
                    ${file.active ? "FAOL" : "NOFAOL"}
                </span>
            </td>
            <td>
                <button class="action-btn edit" onclick="viewFile(${file.id})" title="Ko'rish">
                    <i class="fas fa-eye"></i>
                </button>
            </td>
        </tr>
    `,
        )
        .join("")
}

// Show upload modal
function showUploadModal() {
    const modal = new bootstrap.Modal(document.getElementById("uploadModal"))
    modal.show()
}

// Upload file
async function uploadFile() {
    const fileInput = document.getElementById("file-input")
    const file = fileInput.files[0]

    if (!file) {
        showNotification("warning", "Iltimos, fayl tanlang")
        return
    }

    try {
        const formData = new FormData()
        formData.append("file", file)

        const response = await fetch(`${API_BASE_URL}/api/v1/admin/attachment/upload`, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
            },
            body: formData,
        })

        if (!response.ok) {
            throw new Error("Failed to upload file")
        }

        const result = await response.json()

        showNotification("success", "Fayl muvaffaqiyatli yuklandi")

        const modal = bootstrap.Modal.getInstance(document.getElementById("uploadModal"))
        modal.hide()

        // Reset form
        document.getElementById("upload-form").reset()
        document.getElementById("file-preview").innerHTML = ""

        // Refresh data
        loadFilesData()
    } catch (error) {
        console.error("Error uploading file:", error)
        showNotification("error", "Fayl yuklashda xatolik")
    }
}

// View file details
async function viewFile(fileId) {
    try {
        const file = await apiRequest(`/api/v1/admin/attachment/${fileId}`)

        if (!file) {
            showNotification("error", "Fayl ma'lumotlari topilmadi")
            return
        }

        // Populate modal with file details
        document.getElementById("file-detail-id").textContent = file.id || "-"
        document.getElementById("file-detail-name").textContent = file.filename || "-"
        document.getElementById("file-detail-content-type").textContent = file.contentType || "-"
        document.getElementById("file-detail-url").textContent = file.url || "-"
        document.getElementById("file-detail-status").innerHTML = `
            <span class="status-badge ${file.active ? "active" : "inactive"}">
                ${file.active ? "FAOL" : "NOFAOL"}
            </span>
        `
        document.getElementById("file-detail-created-at").textContent = file.createdAt || "-"
        document.getElementById("file-detail-created-by").textContent = file.createdBy || "-"
        document.getElementById("file-detail-updated-at").textContent = file.updatedAt || "-"
        document.getElementById("file-detail-updated-by").textContent = file.updatedBy || "-"

        // Show file preview
        const previewContainer = document.getElementById("file-preview-container")
        if (file.contentType && file.contentType.startsWith("image/")) {
            previewContainer.innerHTML = `
                <img src="${API_BASE_URL}/api/v1/attachment/${file.id}" 
                     class="img-fluid rounded" 
                     alt="${file.filename}"
                     style="max-height: 300px; object-fit: contain;"
                     onerror="this.src='/placeholder.svg?height=300&width=300'">
            `
        } else {
            previewContainer.innerHTML = `
                <div class="d-flex align-items-center justify-content-center bg-light rounded" style="height: 200px;">
                    <div class="text-center">
                        <i class="fas fa-file fa-3x text-muted mb-3"></i>
                        <div class="text-muted">${file.filename}</div>
                    </div>
                </div>
            `
        }

        const modal = new bootstrap.Modal(document.getElementById("viewFileModal"))
        modal.show()
    } catch (error) {
        console.error("Error viewing file:", error)
        showNotification("error", "Fayl ma'lumotlarini yuklashda xatolik")
    }
}

// Clear memory
function clearMemory() {
    if (confirm("Xotira tozalashni xohlaysizmi? Bu amal qaytarib bo'lmaydi.")) {
        showNotification("info", "Xotira tozalash funksiyasi ishlab chiqilmoqda")
    }
}

// Toggle activation
function toggleActivation() {
    showNotification("info", "Faollashtirish/Nofaollashtirish funksiyasi ishlab chiqilmoqda")
}

// Update files
function updateFiles() {
    loadFilesData()
    showNotification("success", "Fayllar ma'lumotlari yangilandi")
}

// Refresh data
function refreshData() {
    loadFilesData()
    showNotification("success", "Ma'lumotlar yangilandi")
}

// Toggle fullscreen
function toggleFullscreen() {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen()
    } else {
        document.exitFullscreen()
    }
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
    notification.style.cssText = "top: 20px; right: 20px; z-index: 9999; max-width: 350px; animation: slideIn 0.3s ease;"

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
