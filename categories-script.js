// API Configuration
const API_BASE_URL = "http://localhost:8080"

// Global variables
let allCategories = []
let filteredCategories = []
const bootstrap = window.bootstrap

// Initialize categories panel
document.addEventListener("DOMContentLoaded", () => {
    checkAuth()
    initializeCategoriesPanel()
    loadCategoriesData()
})

// Check authentication
function checkAuth() {
    const token = localStorage.getItem("accessToken")
    if (!token) {
        window.location.href = "login.html"
        return
    }
}

// Initialize categories panel
function initializeCategoriesPanel() {
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
    const searchInput = document.getElementById("search-input")
    if (searchInput) {
        searchInput.addEventListener("keypress", (e) => {
            if (e.key === "Enter") {
                searchCategories()
            }
        })
    }
}

// Setup event listeners
function setupEventListeners() {
    // Make functions available globally
    window.showAddCategoryModal = showAddCategoryModal
    window.showEditCategoryModal = showEditCategoryModal
    window.showViewCategoryModal = showViewCategoryModal
    window.saveCategory = saveCategory
    window.deleteCategory = deleteCategory
    window.activateCategory = activateCategory
    window.deactivateCategory = deactivateCategory
    window.loadCategories = loadCategories
    window.filterCategories = filterCategories
    window.searchCategories = searchCategories
    window.clearSearch = clearSearch
    window.refreshData = refreshData
    window.toggleFullscreen = toggleFullscreen
    window.logout = logout
    window.showActiveCategoriesModal = showActiveCategoriesModal
    window.showInactiveCategoriesModal = showInactiveCategoriesModal

    // Setup attachment selection change
    const attachmentSelect = document.getElementById("category-attachment")
    if (attachmentSelect) {
        attachmentSelect.addEventListener("change", updateImagePreview)
    }
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

// Load categories data
async function loadCategoriesData() {
    try {
        showLoading()

        await Promise.all([loadCategoryStats(), loadCategories(), loadAttachments()])

        hideLoading()
    } catch (error) {
        console.error("Error loading categories data:", error)
        showNotification("error", "Kategoriyalar ma'lumotlarini yuklashda xatolik")
        hideLoading()
    }
}

// Load category statistics
async function loadCategoryStats() {
    try {
        const [activeCategories, inactiveCategories] = await Promise.all([
            apiRequest("/api/v1/admin/categories/active"),
            apiRequest("/api/v1/admin/categories/inactive"),
        ])

        const totalCategories = (activeCategories?.length || 0) + (inactiveCategories?.length || 0)
        const categoriesWithImages = [...(activeCategories || []), ...(inactiveCategories || [])].filter(
            (cat) => cat.attachmentId,
        ).length

        animateCounter("total-categories", totalCategories)
        animateCounter("active-categories", activeCategories?.length || 0)
        animateCounter("inactive-categories", inactiveCategories?.length || 0)
        animateCounter("categories-with-images", categoriesWithImages)
    } catch (error) {
        console.error("Error loading category stats:", error)
        showNotification("error", "Statistika ma'lumotlarini yuklashda xatolik")
    }
}

// Load categories
async function loadCategories() {
    try {
        const [activeCategories, inactiveCategories] = await Promise.all([
            apiRequest("/api/v1/admin/categories/active"),
            apiRequest("/api/v1/admin/categories/inactive"),
        ])

        allCategories = [...(activeCategories || []), ...(inactiveCategories || [])]
        filteredCategories = [...allCategories]
        renderCategoriesTable(filteredCategories)
    } catch (error) {
        console.error("Error loading categories:", error)
        showNotification("error", "Kategoriyalarni yuklashda xatolik")
    }
}

// Load attachments for dropdown
async function loadAttachments() {
    try {
        const attachments = await apiRequest("/api/v1/admin/attachments/active")
        const attachmentSelect = document.getElementById("category-attachment")

        if (attachmentSelect && attachments) {
            attachmentSelect.innerHTML = '<option value="">Rasmni tanlang</option>'
            attachments.forEach((attachment) => {
                const option = document.createElement("option")
                option.value = attachment.id
                option.textContent = attachment.filename || attachment.name || `Attachment ${attachment.id}`
                attachmentSelect.appendChild(option)
            })
        }
    } catch (error) {
        console.error("Error loading attachments:", error)
    }
}

// Render categories table
function renderCategoriesTable(categories) {
    const tbody = document.getElementById("categories-table")
    if (!tbody) return

    if (categories.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted">Ma\'lumotlar mavjud emas</td></tr>'
        return
    }

    tbody.innerHTML = categories
        .map(
            (category) => `
        <tr class="fade-in">
            <td>${category.id}</td>
            <td>
                ${
                category.attachmentId
                    ? `<img src="${API_BASE_URL}/api/v1/attachment/${category.attachmentId}" 
                           class="rounded" 
                           style="width: 40px; height: 40px; object-fit: cover;"
                           onerror="this.src='/placeholder.svg?height=40&width=40'">`
                    : '<i class="fas fa-image text-muted"></i>'
            }
            </td>
            <td class="fw-bold">${category.name}</td>
            <td>
                <span class="status-badge ${category.active ? "active" : "inactive"}">
                    ${category.active ? "FAOL" : "NOFAOL"}
                </span>
            </td>
            <td>${formatDate(category.createdAt)}</td>
            <td>
                <button class="action-btn edit" onclick="showViewCategoryModal(${category.id})" title="Ko\'rish">
                    <i class="fas fa-eye"></i>
                </button>
                <button class="action-btn edit" onclick="showEditCategoryModal(${category.id})" title="Tahrirlash">
                    <i class="fas fa-edit"></i>
                </button>
                ${
                category.active
                    ? `<button class="action-btn delete" onclick="deactivateCategory(${category.id})" title="Nofaollashtirish">
                       <i class="fas fa-pause"></i>
                     </button>`
                    : `<button class="action-btn edit" onclick="activateCategory(${category.id})" title="Faollashtirish">
                       <i class="fas fa-play"></i>
                     </button>`
            }
            </td>
        </tr>
    `,
        )
        .join("")
}

// Show add category modal
function showAddCategoryModal() {
    document.getElementById("categoryModalTitle").textContent = "Kategoriya qo'shish"
    document.getElementById("save-btn-text").textContent = "Saqlash"
    document.getElementById("category-form").reset()
    document.getElementById("category-id").value = ""
    document.getElementById("category-active").checked = true
    updateImagePreview()

    const modal = new bootstrap.Modal(document.getElementById("categoryModal"))
    modal.show()
}

// Show edit category modal
async function showEditCategoryModal(categoryId) {
    try {
        const category = await apiRequest(`/api/v1/admin/category/${categoryId}`)

        if (!category) {
            showNotification("error", "Kategoriya ma'lumotlari topilmadi")
            return
        }

        document.getElementById("categoryModalTitle").textContent = "Kategoriyani tahrirlash"
        document.getElementById("save-btn-text").textContent = "Yangilash"
        document.getElementById("category-id").value = category.id
        document.getElementById("category-name").value = category.name
        document.getElementById("category-attachment").value = category.attachment?.id || ""
        document.getElementById("category-active").checked = category.active
        updateImagePreview()

        const modal = new bootstrap.Modal(document.getElementById("categoryModal"))
        modal.show()
    } catch (error) {
        console.error("Error loading category for edit:", error)
        showNotification("error", "Kategoriya ma'lumotlarini yuklashda xatolik")
    }
}

// Show view category modal
async function showViewCategoryModal(categoryId) {
    try {
        const category = await apiRequest(`/api/v1/admin/category/${categoryId}`)

        if (!category) {
            showNotification("error", "Kategoriya ma'lumotlari topilmadi")
            return
        }

        // Populate view modal
        document.getElementById("view-category-id").textContent = category.id
        document.getElementById("view-category-name").textContent = category.name
        document.getElementById("view-category-status").innerHTML = `
      <span class="status-badge ${category.active ? "active" : "inactive"}">
          ${category.active ? "FAOL" : "NOFAOL"}
      </span>
    `
        document.getElementById("view-category-attachment-id").textContent = category.attachment?.id || "-"
        document.getElementById("view-category-created-at").textContent = formatDate(category.createdAt)
        document.getElementById("view-category-created-by").textContent = category.createdBy || "-"
        document.getElementById("view-category-updated-at").textContent = formatDate(category.updatedAt)
        document.getElementById("view-category-updated-by").textContent = category.updatedBy || "-"

        // Show category image
        const imageContainer = document.getElementById("view-category-image")
        if (category.attachment?.id) {
            imageContainer.innerHTML = `
        <img src="${API_BASE_URL}/api/v1/attachment/${category.attachment.id}" 
             class="img-fluid rounded" 
             alt="${category.name}"
             style="max-height: 300px; object-fit: contain;"
             onerror="this.src='/placeholder.svg?height=300&width=300'">
      `
        } else {
            imageContainer.innerHTML = `
        <div class="d-flex align-items-center justify-content-center bg-light rounded" style="height: 200px;">
            <div class="text-center">
                <i class="fas fa-image fa-3x text-muted mb-3"></i>
                <div class="text-muted">Rasm mavjud emas</div>
            </div>
        </div>
      `
        }

        const modal = new bootstrap.Modal(document.getElementById("viewCategoryModal"))
        modal.show()
    } catch (error) {
        console.error("Error viewing category:", error)
        showNotification("error", "Kategoriya ma'lumotlarini yuklashda xatolik")
    }
}

// Save category
async function saveCategory() {
    try {
        const categoryId = document.getElementById("category-id").value
        const name = document.getElementById("category-name").value.trim()
        const attachmentId = document.getElementById("category-attachment").value
        const active = document.getElementById("category-active").checked

        if (!name) {
            showNotification("warning", "Kategoriya nomini kiriting")
            return
        }

        const categoryData = {
            name: name,
            attachmentId: attachmentId ? Number.parseInt(attachmentId) : null,
            active: active,
        }

        let response
        if (categoryId) {
            // Update existing category
            response = await fetch(`${API_BASE_URL}/api/v1/admin/category/${categoryId}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
                },
                body: JSON.stringify(categoryData),
            })
        } else {
            // Create new category
            response = await fetch(`${API_BASE_URL}/api/v1/admin/category`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
                },
                body: JSON.stringify(categoryData),
            })
        }

        if (!response.ok) {
            throw new Error("Failed to save category")
        }

        const result = await response.json()

        if (result.success) {
            showNotification("success", result.message || "Kategoriya muvaffaqiyatli saqlandi")

            const modal = bootstrap.Modal.getInstance(document.getElementById("categoryModal"))
            modal.hide()

            // Refresh data
            loadCategoriesData()
        } else {
            showNotification("error", result.message || "Kategoriyani saqlashda xatolik")
        }
    } catch (error) {
        console.error("Error saving category:", error)
        showNotification("error", "Kategoriyani saqlashda xatolik")
    }
}

// Activate category
async function activateCategory(categoryId) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/v1/admin/category/activate/${categoryId}`, {
            method: "PUT",
            headers: {
                Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
            },
        })

        if (!response.ok) {
            throw new Error("Failed to activate category")
        }

        const result = await response.json()

        if (result.success) {
            showNotification("success", result.message || "Kategoriya muvaffaqiyatli faollashtirildi")
            loadCategoriesData()
        } else {
            showNotification("error", result.message || "Kategoriyani faollashtirish xatolik")
        }
    } catch (error) {
        console.error("Error activating category:", error)
        showNotification("error", "Kategoriyani faollashtirish xatolik")
    }
}

// Deactivate category
async function deactivateCategory(categoryId) {
    if (!confirm("Kategoriyani nofaollashtirish xohlaysizmi?")) {
        return
    }

    try {
        const response = await fetch(`${API_BASE_URL}/api/v1/admin/category/deactivate/${categoryId}`, {
            method: "DELETE",
            headers: {
                Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
            },
        })

        if (!response.ok) {
            throw new Error("Failed to deactivate category")
        }

        const result = await response.json()

        if (result.success) {
            showNotification("success", result.message || "Kategoriya muvaffaqiyatli nofaollashtirildi")
            loadCategoriesData()
        } else {
            showNotification("error", result.message || "Kategoriyani nofaollashtirish xatolik")
        }
    } catch (error) {
        console.error("Error deactivating category:", error)
        showNotification("error", "Kategoriyani nofaollashtirish xatolik")
    }
}

// Filter categories
function filterCategories() {
    const statusFilter = document.getElementById("status-filter").value

    if (statusFilter === "all") {
        filteredCategories = [...allCategories]
    } else if (statusFilter === "active") {
        filteredCategories = allCategories.filter((cat) => cat.active)
    } else if (statusFilter === "inactive") {
        filteredCategories = allCategories.filter((cat) => !cat.active)
    }

    renderCategoriesTable(filteredCategories)
}

// Search categories
function searchCategories() {
    const searchTerm = document.getElementById("search-input").value.trim().toLowerCase()

    if (!searchTerm) {
        filteredCategories = [...allCategories]
    } else {
        filteredCategories = allCategories.filter((category) => category.name.toLowerCase().includes(searchTerm))
    }

    // Apply status filter as well
    filterCategories()
}

// Clear search
function clearSearch() {
    document.getElementById("search-input").value = ""
    filteredCategories = [...allCategories]
    filterCategories()
}

// Show active categories modal
async function showActiveCategoriesModal() {
    try {
        const activeCategories = await apiRequest("/api/v1/admin/categories/active")
        showCategoriesListModal("Faol kategoriyalar", activeCategories || [])
    } catch (error) {
        console.error("Error loading active categories:", error)
        showNotification("error", "Faol kategoriyalarni yuklashda xatolik")
    }
}

// Show inactive categories modal
async function showInactiveCategoriesModal() {
    try {
        const inactiveCategories = await apiRequest("/api/v1/admin/categories/inactive")
        showCategoriesListModal("Nofaol kategoriyalar", inactiveCategories || [])
    } catch (error) {
        console.error("Error loading inactive categories:", error)
        showNotification("error", "Nofaol kategoriyalarni yuklashda xatolik")
    }
}

// Show categories list modal
function showCategoriesListModal(title, categories) {
    document.getElementById("categoriesListModalTitle").textContent = title

    const tbody = document.getElementById("categories-list-table")
    if (categories.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">Ma\'lumotlar mavjud emas</td></tr>'
    } else {
        tbody.innerHTML = categories
            .map(
                (category) => `
          <tr>
              <td>${category.id}</td>
              <td>
                  ${
                    category.attachmentId
                        ? `<img src="${API_BASE_URL}/api/v1/attachment/${category.attachmentId}" 
                             class="rounded" 
                             style="width: 40px; height: 40px; object-fit: cover;"
                             onerror="this.src='/placeholder.svg?height=40&width=40'">`
                        : '<i class="fas fa-image text-muted"></i>'
                }
              </td>
              <td class="fw-bold">${category.name}</td>
              <td>
                  <span class="status-badge ${category.active ? "active" : "inactive"}">
                      ${category.active ? "FAOL" : "NOFAOL"}
                  </span>
              </td>
              <td>
                  <button class="action-btn edit" onclick="showViewCategoryModal(${category.id})" title="Ko\'rish">
                      <i class="fas fa-eye"></i>
                  </button>
                  <button class="action-btn edit" onclick="showEditCategoryModal(${category.id})" title="Tahrirlash">
                      <i class="fas fa-edit"></i>
                  </button>
                  ${
                    category.active
                        ? `<button class="action-btn delete" onclick="deactivateCategory(${category.id})" title="Nofaollashtirish">
                         <i class="fas fa-pause"></i>
                       </button>`
                        : `<button class="action-btn edit" onclick="activateCategory(${category.id})" title="Faollashtirish">
                         <i class="fas fa-play"></i>
                       </button>`
                }
              </td>
          </tr>
      `,
            )
            .join("")
    }

    const modal = new bootstrap.Modal(document.getElementById("categoriesListModal"))
    modal.show()
}

// Update image preview
function updateImagePreview() {
    const attachmentId = document.getElementById("category-attachment").value
    const previewContainer = document.getElementById("category-image-preview")

    if (attachmentId) {
        previewContainer.innerHTML = `
      <img src="${API_BASE_URL}/api/v1/attachment/${attachmentId}" 
           class="img-fluid rounded" 
           alt="Category Image"
           style="max-height: 200px; object-fit: contain;"
           onerror="this.src='/placeholder.svg?height=200&width=200'">
    `
    } else {
        previewContainer.innerHTML = `
      <div class="d-flex align-items-center justify-content-center bg-light rounded" style="height: 200px;">
          <div class="text-center">
              <i class="fas fa-image fa-3x text-muted mb-3"></i>
              <div class="text-muted">Rasm tanlanmagan</div>
          </div>
      </div>
    `
    }
}

// Format date
function formatDate(dateString) {
    if (!dateString) return "-"

    try {
        const date = new Date(dateString)
        return (
            date.toLocaleDateString("uz-UZ") +
            " " +
            date.toLocaleTimeString("uz-UZ", {
                hour: "2-digit",
                minute: "2-digit",
            })
        )
    } catch (error) {
        return "-"
    }
}

// Refresh data
function refreshData() {
    loadCategoriesData()
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
