// API Configuration
const API_BASE_URL = "http://localhost:8080"

// Global variables
let inactiveImages = []
let selectedImages = []
let imageToDelete = null
const bootstrap = window.bootstrap

// Initialize memory management panel
document.addEventListener("DOMContentLoaded", () => {
    checkAuth()
    initializeMemoryManagement()
    loadMemoryData()
})

// Check authentication
function checkAuth() {
    const token = localStorage.getItem("accessToken")
    if (!token) {
        window.location.href = "login.html"
        return
    }
}

// Initialize memory management
function initializeMemoryManagement() {
    setupSidebar()
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

// Setup event listeners
function setupEventListeners() {
    window.refreshData = refreshData
    window.loadInactiveImages = loadInactiveImages
    window.viewImage = viewImage
    window.deleteImage = deleteImage
    window.confirmDelete = confirmDelete
    window.toggleSelectAll = toggleSelectAll
    window.bulkDeleteInactive = bulkDeleteInactive
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

// Load memory data
async function loadMemoryData() {
    try {
        showLoading()

        await Promise.all([loadMemoryStats(), loadInactiveImages()])

        hideLoading()
    } catch (error) {
        console.error("Error loading memory data:", error)
        showNotification("error", "Xotira ma'lumotlarini yuklashda xatolik")
        hideLoading()
    }
}

// Load memory statistics (placeholder values for now)
async function loadMemoryStats() {
    try {
        // These are placeholder values since the APIs don't exist yet
        animateCounter("used-memory-size", 1250) // MB
        animateCounter("total-images-count", 450)
        animateCounter("deleted-images-size", 0) // MB
        animateCounter("deleted-images-count", 0)
    } catch (error) {
        console.error("Error loading memory stats:", error)
    }
}

// Load inactive images
async function loadInactiveImages() {
    try {
        const data = await apiRequest("/api/v1/admin/attachments/inactive")
        inactiveImages = data || []
        renderInactiveImagesTable()
    } catch (error) {
        console.error("Error loading inactive images:", error)
        showNotification("error", "Nofaol rasmlarni yuklashda xatolik")
    }
}

// Render inactive images table
function renderInactiveImagesTable() {
    const tbody = document.getElementById("inactive-images-table")
    if (!tbody) return

    if (inactiveImages.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">Nofaol rasmlar mavjud emas</td></tr>'
        return
    }

    tbody.innerHTML = inactiveImages
        .map(
            (image) => `
        <tr class="fade-in">
            <td>
                <input type="checkbox" class="image-checkbox" value="${image.id}" onchange="updateSelectedImages()">
            </td>
            <td>${image.id}</td>
            <td class="text-truncate" style="max-width: 150px;" title="${image.filename || image.name}">${image.filename || image.name || "N/A"}</td>
            <td>
                ${image.productId ? `<span class="badge bg-primary">${image.productId}</span>` : '<span class="badge bg-secondary">NO-LINKED</span>'}
            </td>
            <td>
                <button class="action-btn edit" onclick="viewImage(${image.id})" title="Ko'rish">
                    <i class="fas fa-eye"></i>
                </button>
                <button class="action-btn delete" onclick="deleteImage(${image.id})" title="O'chirish">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        </tr>
    `,
        )
        .join("")
}

// View image details
async function viewImage(imageId) {
    try {
        const image = await apiRequest(`/api/v1/admin/attachment/${imageId}`)

        if (!image) {
            showNotification("error", "Rasm ma'lumotlari topilmadi")
            return
        }

        // Create and show view modal (reuse from files.html)
        showNotification("info", `Rasm ID: ${imageId} ko'rish funksiyasi`)
    } catch (error) {
        console.error("Error viewing image:", error)
        showNotification("error", "Rasm ma'lumotlarini yuklashda xatolik")
    }
}

// Delete image
function deleteImage(imageId) {
    const image = inactiveImages.find((img) => img.id === imageId)
    if (!image) return

    imageToDelete = imageId

    // Show image info in modal
    document.getElementById("delete-image-info").innerHTML = `
        <div class="row">
            <div class="col-4">
                <strong>ID:</strong>
            </div>
            <div class="col-8">${image.id}</div>
        </div>
        <div class="row">
            <div class="col-4">
                <strong>Nomi:</strong>
            </div>
            <div class="col-8">${image.filename || image.name || "N/A"}</div>
        </div>
        <div class="row">
            <div class="col-4">
                <strong>Hajmi:</strong>
            </div>
            <div class="col-8">${formatFileSize(image.size || 0)}</div>
        </div>
    `

    const modal = new bootstrap.Modal(document.getElementById("deleteConfirmModal"))
    modal.show()
}

// Confirm delete
async function confirmDelete() {
    if (!imageToDelete) return

    try {
        await apiRequest(`/api/v1/admin/attachment/delete-from-base/${imageToDelete}`, {
            method: "POST",
        })

        showNotification("success", "Rasm muvaffaqiyatli o'chirildi")

        const modal = bootstrap.Modal.getInstance(document.getElementById("deleteConfirmModal"))
        modal.hide()

        // Refresh data
        loadMemoryData()
        imageToDelete = null
    } catch (error) {
        console.error("Error deleting image:", error)
        showNotification("error", "Rasmni o'chirishda xatolik")
    }
}

// Toggle select all
function toggleSelectAll() {
    const selectAll = document.getElementById("select-all")
    const checkboxes = document.querySelectorAll(".image-checkbox")

    checkboxes.forEach((checkbox) => {
        checkbox.checked = selectAll.checked
    })

    updateSelectedImages()
}

// Update selected images
function updateSelectedImages() {
    const checkboxes = document.querySelectorAll(".image-checkbox:checked")
    selectedImages = Array.from(checkboxes).map((cb) => Number.parseInt(cb.value))

    // Update select all checkbox
    const selectAll = document.getElementById("select-all")
    const allCheckboxes = document.querySelectorAll(".image-checkbox")
    selectAll.checked = selectedImages.length === allCheckboxes.length
}

// Bulk delete inactive images
function bulkDeleteInactive() {
    if (selectedImages.length === 0) {
        showNotification("warning", "Iltimos, o'chirish uchun rasmlarni tanlang")
        return
    }

    if (confirm(`${selectedImages.length} ta rasmni o'chirishni xohlaysizmi? Bu amal qaytarib bo'lmaydi.`)) {
        // Implementation for bulk delete
        showNotification("info", `${selectedImages.length} ta rasm o'chirish funksiyasi ishlab chiqilmoqda`)
    }
}

// Format file size
function formatFileSize(bytes) {
    if (bytes === 0) return "0 B"
    const k = 1024
    const sizes = ["B", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
}

// Refresh data
function refreshData() {
    loadMemoryData()
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
