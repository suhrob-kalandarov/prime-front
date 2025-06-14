// API Configuration
const API_BASE_URL = "http://16.171.152.61"

// Global variables
let allCategories = []
let allProducts = []
let allUsers = []
const uploadedFiles = []
let currentTab = "dashboard"
let isRefreshing = false
const bootstrap = window.bootstrap

// Initialize admin panel
document.addEventListener("DOMContentLoaded", () => {
    checkAuth()
    initializeAdminPanel()
    loadDashboardData()
})

// Check authentication
function checkAuth() {
    const token = localStorage.getItem("accessToken")
    if (!token) {
        window.location.href = "login.html"
        return
    }
}

// Initialize admin panel
function initializeAdminPanel() {
    setupSidebar()
    setupForms()
    setupEventListeners()
    setupFileUploads()
    addAnimations()
}

// Setup sidebar
function setupSidebar() {
    const sidebarToggle = document.getElementById("sidebar-toggle")
    const sidebar = document.getElementById("sidebar")
    const navLinks = document.querySelectorAll(".sidebar-nav .nav-link")

    sidebarToggle.addEventListener("click", () => {
        sidebar.classList.toggle("show")
    })

    navLinks.forEach((link) => {
        link.addEventListener("click", (e) => {
            e.preventDefault()
            const tab = link.dataset.tab
            switchTab(tab)

            // Update active state
            navLinks.forEach((l) => l.classList.remove("active"))
            link.classList.add("active")

            // Update page title
            const titles = {
                dashboard: "Dashboard",
                categories: "Kategoriyalar",
                products: "Mahsulotlar",
                users: "Foydalanuvchilar",
                attachments: "Fayllar",
            }

            const subtitles = {
                dashboard: "Boshqaruv paneli",
                categories: "Kategoriyalarni boshqarish",
                products: "Mahsulotlarni boshqarish",
                users: "Foydalanuvchilarni boshqarish",
                attachments: "Fayllarni boshqarish",
            }

            document.getElementById("page-title").textContent = titles[tab]
            document.getElementById("page-subtitle").textContent = subtitles[tab]

            currentTab = tab
        })
    })
}

// Setup forms
function setupForms() {
    // Category form
    document.getElementById("category-form").addEventListener("submit", handleCategorySubmit)

    // Product form
    document.getElementById("product-form").addEventListener("submit", handleProductSubmit)

    // Upload form
    document.getElementById("upload-form").addEventListener("submit", handleFileUpload)
}

// Setup event listeners
function setupEventListeners() {
    // Refresh data button
    window.refreshData = () => {
        loadDashboardData()
        showNotification("success", "Ma'lumotlar yangilandi")
    }

    // Fullscreen toggle
    window.toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen()
        } else {
            document.exitFullscreen()
        }
    }

    // Make functions available globally
    window.editCategory = editCategory
    window.updateCategory = updateCategory
    window.deleteCategory = deleteCategory
    window.editProduct = editProduct
    window.updateProduct = updateProduct
    window.deleteProduct = deleteProduct
    window.removePreview = removePreview
    window.logout = logout
}

// Setup file uploads
function setupFileUploads() {
    // Category image upload
    setupFileUpload("category-upload", "category-image", "category-preview", false)

    // Product images upload
    setupFileUpload("product-upload", "product-images", "product-preview", true)

    // Files upload
    setupFileUpload("files-upload", "upload-files", "files-preview", true)
}

// Setup file upload
function setupFileUpload(areaId, inputId, previewId, multiple) {
    const uploadArea = document.getElementById(areaId)
    const fileInput = document.getElementById(inputId)
    const preview = document.getElementById(previewId)

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
        fileInput.files = files
        handleFilePreview(files, preview, multiple)
    })

    fileInput.addEventListener("change", (e) => {
        handleFilePreview(e.target.files, preview, multiple)
    })
}

// Handle file preview
function handleFilePreview(files, preview, multiple) {
    if (!multiple && files.length > 1) {
        showNotification("warning", "Faqat bitta fayl tanlash mumkin")
        return
    }

    preview.innerHTML = ""

    Array.from(files).forEach((file, index) => {
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
        }
    })
}

// Remove preview
function removePreview(button) {
    button.parentElement.remove()
}

// Switch tab
function switchTab(tabName) {
    // Hide all tabs
    document.querySelectorAll(".tab-content").forEach((tab) => {
        tab.classList.remove("active")
    })

    // Show selected tab
    document.getElementById(`${tabName}-tab`).classList.add("active")

    // Load tab-specific data
    switch (tabName) {
        case "categories":
            loadAllCategories()
            break
        case "products":
            loadAllProducts()
            loadCategoriesForSelect()
            break
        case "users":
            loadUsers()
            break
        case "attachments":
            loadAttachments()
            break
    }
}

// API request with token
async function apiRequest(url, options = {}) {
    const token = localStorage.getItem("accessToken")

    if (!token && !isRefreshing) {
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

        if (response.status === 401 && !isRefreshing) {
            // Try to refresh token
            const refreshed = await refreshToken()
            if (refreshed) {
                // Retry the request with new token
                return apiRequest(url, options)
            } else {
                // Redirect to login if refresh failed
                window.location.href = "login.html"
                return null
            }
        }

        if (!response.ok) {
            const errorText = await response.text()
            throw new Error(`API request failed: ${response.status} - ${errorText}`)
        }

        // For attachment GET requests, return the response directly
        if (url.startsWith("/api/v1/attachment/") && !options.method) {
            return response
        }

        // For other requests, parse JSON if content type is JSON
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

// Refresh token
async function refreshToken() {
    isRefreshing = true
    const refreshTokenValue = localStorage.getItem("refreshToken")

    if (!refreshTokenValue) {
        isRefreshing = false
        return false
    }

    try {
        const response = await fetch(`${API_BASE_URL}/api/v1/auth/refresh/${refreshTokenValue}`, {
            method: "POST",
        })

        if (!response.ok) {
            throw new Error("Token refresh failed")
        }

        const data = await response.json()
        localStorage.setItem("accessToken", data.accessToken)
        isRefreshing = false
        return true
    } catch (error) {
        console.error("Token refresh error:", error)
        localStorage.removeItem("accessToken")
        localStorage.removeItem("refreshToken")
        isRefreshing = false
        return false
    }
}

// Dashboard Functions
async function loadDashboardData() {
    try {
        showLoading()

        await Promise.all([loadActiveCategories(), loadActiveProducts(), loadUsers()])

        updateDashboardStats()
        updateRecentItems()

        hideLoading()
    } catch (error) {
        console.error("Error loading dashboard data:", error)
        showNotification("error", "Dashboard ma'lumotlarini yuklashda xatolik")
        hideLoading()
    }
}

// Update dashboard stats
function updateDashboardStats() {
    // Animate counters
    animateCounter("total-categories", allCategories.length)
    animateCounter("total-products", allProducts.length)
    animateCounter("total-users", allUsers.length)
    animateCounter("total-attachments", uploadedFiles.length)
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

// Update recent items
function updateRecentItems() {
    // Recent categories
    const recentCategories = document.getElementById("recent-categories")
    if (recentCategories) {
        const latestCategories = allCategories.slice(-5).reverse()

        recentCategories.innerHTML =
            latestCategories.length > 0
                ? latestCategories
                    .map(
                        (cat) => `
              <div class="recent-item">
                  <div class="recent-icon category">
                      <i class="fas fa-tag"></i>
                  </div>
                  <div class="recent-content">
                      <div class="recent-title">${cat.name}</div>
                      <div class="recent-meta">ID: ${cat.id}</div>
                  </div>
              </div>
          `,
                    )
                    .join("")
                : '<div class="loading-state"><p>Kategoriyalar mavjud emas</p></div>'
    }

    // Recent products
    const recentProducts = document.getElementById("recent-products")
    if (recentProducts) {
        const latestProducts = allProducts.slice(-5).reverse()

        recentProducts.innerHTML =
            latestProducts.length > 0
                ? latestProducts
                    .map(
                        (prod) => `
              <div class="recent-item">
                  <div class="recent-icon product">
                      <i class="fas fa-box-open"></i>
                  </div>
                  <div class="recent-content">
                      <div class="recent-title">${prod.name}</div>
                      <div class="recent-meta">
                          <span class="recent-price">${formatPrice(prod.price)} so'm</span>
                      </div>
                  </div>
              </div>
          `,
                    )
                    .join("")
                : '<div class="loading-state"><p>Mahsulotlar mavjud emas</p></div>'
    }
}

// Load active categories (for dashboard and public)
async function loadActiveCategories() {
    try {
        const data = await apiRequest("/api/v1/admin/categories/all-active")
        if (data) {
            allCategories = data || []
        }
    } catch (error) {
        console.error("Error loading active categories:", error)
        showNotification("error", "Faol kategoriyalarni yuklashda xatolik")
    }
}

// Load all categories (active + inactive for admin)
async function loadAllCategories() {
    try {
        const data = await apiRequest("/api/v1/admin/categories/all")
        allCategories = data || []
        renderCategoriesTable()
    } catch (error) {
        console.error("Error loading all categories:", error)
        showNotification("error", "Kategoriyalarni yuklashda xatolik")
    }
}

// Load active products (for dashboard and public)
async function loadActiveProducts() {
    try {
        const data = await apiRequest("/api/v1/admin/products/all-active")
        if (data) {
            allProducts = data || []
        }
    } catch (error) {
        console.error("Error loading active products:", error)
        showNotification("error", "Faol mahsulotlarni yuklashda xatolik")
    }
}

// Load all products (for admin)
async function loadAllProducts() {
    try {
        const data = await apiRequest("/api/v1/admin/products/all")
        if (data) {
            allProducts = data || []
            renderProductsTable()
        }
    } catch (error) {
        console.error("Error loading all products:", error)
        showNotification("error", "Mahsulotlarni yuklashda xatolik")
    }
}

// Load users (placeholder - no API provided)
async function loadUsers() {
    try {
        // Since no user API is provided, we'll use placeholder data
        allUsers = []
        renderUsersTable()
    } catch (error) {
        console.error("Error loading users:", error)
        showNotification("error", "Foydalanuvchilarni yuklashda xatolik")
    }
}

// Load categories for select
async function loadCategoriesForSelect() {
    const categorySelect = document.getElementById("product-category")
    if (!categorySelect) return

    // Load active categories for product creation
    await loadActiveCategories()

    categorySelect.innerHTML =
        '<option value="">Kategoriyani tanlang</option>' +
        allCategories.map((cat) => `<option value="${cat.id}">${cat.name}</option>`).join("")
}

// Render categories table
function renderCategoriesTable() {
    const tbody = document.getElementById("categories-table")
    if (!tbody) return

    tbody.innerHTML = allCategories
        .map(
            (category) => `
        <tr class="fade-in">
            <td>${category.id}</td>
            <td>
                ${
                category.attachmentId
                    ? `<img src="${API_BASE_URL}/api/v1/attachment/${category.attachmentId}" class="image-preview" alt="${category.name}" onerror="this.src='/placeholder.svg?height=50&width=50'">`
                    : '<i class="fas fa-image text-muted"></i>'
            }
            </td>
            <td>${category.name}</td>
            <td>
                <span class="status-badge ${category.active ? "active" : "inactive"}">
                    ${category.active ? "Faol" : "Nofaol"}
                </span>
            </td>
            <td>
                <button class="action-btn edit" onclick="editCategory(${category.id})" title="Tahrirlash">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="action-btn delete" onclick="deleteCategory(${category.id})" title="O\'chirish">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        </tr>
    `,
        )
        .join("")
}

// Render products table
function renderProductsTable() {
    const tbody = document.getElementById("products-table")
    if (!tbody) return

    tbody.innerHTML = allProducts
        .map((product) => {
            const category = allCategories.find((c) => c.id === product.categoryId)
            const categoryName = category ? category.name : "N/A"

            return `
            <tr class="fade-in">
                <td>${product.id}</td>
                <td>
                    ${
                product.attachmentIds && product.attachmentIds.length > 0
                    ? `<img src="${API_BASE_URL}/api/v1/attachment/${product.attachmentIds[0]}" class="image-preview" alt="${product.name}" onerror="this.src='/placeholder.svg?height=50&width=50'">`
                    : '<i class="fas fa-image text-muted"></i>'
            }
                </td>
                <td>${product.name}</td>
                <td>${formatPrice(product.price)} so'm</td>
                <td>
                    <span class="status-badge ${product.amount < 5 ? "inactive" : "active"}">
                        ${product.amount}
                    </span>
                </td>
                <td>${categoryName}</td>
                <td>
                    <button class="action-btn edit" onclick="editProduct(${product.id})" title="Tahrirlash">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="action-btn delete" onclick="deleteProduct(${product.id})" title="O\'chirish">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `
        })
        .join("")
}

// Render users table
function renderUsersTable() {
    const tbody = document.getElementById("users-table")
    if (!tbody) return

    tbody.innerHTML =
        allUsers.length > 0
            ? allUsers
                .map(
                    (user) => `
          <tr class="fade-in">
              <td>${user.id}</td>
              <td>${user.firstName || ""} ${user.lastName || ""}</td>
              <td>${user.email}</td>
              <td>${user.phoneNumber || "N/A"}</td>
              <td>
                  <span class="status-badge ${user.active ? "active" : "inactive"}">
                      ${user.active ? "Faol" : "Nofaol"}
                  </span>
              </td>
              <td>
                  <button class="action-btn edit" onclick="editUser(${user.id})" title="Tahrirlash">
                      <i class="fas fa-edit"></i>
                  </button>
                  <button class="action-btn delete" onclick="deleteUser(${user.id})" title="O\'chirish">
                      <i class="fas fa-trash"></i>
                  </button>
              </td>
          </tr>
      `,
                )
                .join("")
            : '<tr><td colspan="6" class="text-center text-muted">Foydalanuvchilar mavjud emas</td></tr>'
}

// Handle category submit
async function handleCategorySubmit(e) {
    e.preventDefault()

    const name = document.getElementById("category-name").value
    const active = document.getElementById("category-active").checked
    const imageFile = document.getElementById("category-image").files[0]

    try {
        showButtonLoading("category-form")

        let attachmentId = null

        // Upload image if provided
        if (imageFile) {
            const formData = new FormData()
            formData.append("file", imageFile)

            const uploadResponse = await fetch(`${API_BASE_URL}/api/v1/attachment/upload-one`, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
                },
                body: formData,
            })

            if (!uploadResponse.ok) {
                throw new Error("Failed to upload image")
            }

            const attachmentData = await uploadResponse.json()
            attachmentId = attachmentData.id
        }

        // Create category
        const categoryData = {
            name,
            active,
            attachmentId,
        }

        await apiRequest("/api/v1/admin/category", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(categoryData),
        })

        showNotification("success", "Kategoriya muvaffaqiyatli qo'shildi")
        document.getElementById("category-form").reset()
        document.getElementById("category-preview").innerHTML = ""
        loadAllCategories()
        loadDashboardData()
    } catch (error) {
        console.error("Error creating category:", error)
        showNotification("error", "Kategoriya qo'shishda xatolik")
    } finally {
        hideButtonLoading("category-form")
    }
}

// Handle product submit
async function handleProductSubmit(e) {
    e.preventDefault()

    const name = document.getElementById("product-name").value
    const description = document.getElementById("product-description").value
    const price = Number.parseFloat(document.getElementById("product-price").value)
    const amount = Number.parseInt(document.getElementById("product-amount").value)
    const categoryId = Number.parseInt(document.getElementById("product-category").value)
    const imageFiles = document.getElementById("product-images").files

    try {
        showButtonLoading("product-form")

        let attachmentIds = []

        // Upload images if provided
        if (imageFiles.length > 0) {
            const formData = new FormData()
            Array.from(imageFiles).forEach((file) => {
                formData.append("files", file)
            })

            const uploadResponse = await fetch(`${API_BASE_URL}/api/v1/attachment/upload`, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
                },
                body: formData,
            })

            if (!uploadResponse.ok) {
                throw new Error("Failed to upload images")
            }

            const attachmentData = await uploadResponse.json()
            attachmentIds = attachmentData.map((att) => att.id)
        }

        // Create product
        const productData = {
            name,
            description,
            price,
            amount,
            active: true,
            status: "AVAILABLE",
            categoryId,
            attachmentIds,
        }

        await apiRequest("/api/v1/admin/product", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(productData),
        })

        showNotification("success", "Mahsulot muvaffaqiyatli qo'shildi")
        document.getElementById("product-form").reset()
        document.getElementById("product-preview").innerHTML = ""
        loadAllProducts()
        loadDashboardData()
    } catch (error) {
        console.error("Error creating product:", error)
        showNotification("error", "Mahsulot qo'shishda xatolik")
    } finally {
        hideButtonLoading("product-form")
    }
}

// Handle file upload
async function handleFileUpload(e) {
    e.preventDefault()

    const files = document.getElementById("upload-files").files

    if (files.length === 0) {
        showNotification("warning", "Iltimos, fayllarni tanlang")
        return
    }

    try {
        showButtonLoading("upload-form")

        const formData = new FormData()
        Array.from(files).forEach((file) => {
            formData.append("files", file)
        })

        const uploadResponse = await fetch(`${API_BASE_URL}/api/v1/attachment/upload`, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
            },
            body: formData,
        })

        if (!uploadResponse.ok) {
            throw new Error("Failed to upload files")
        }

        const attachmentData = await uploadResponse.json()
        uploadedFiles.push(...attachmentData)

        showNotification("success", "Fayllar muvaffaqiyatli yuklandi")
        document.getElementById("upload-form").reset()
        document.getElementById("files-preview").innerHTML = ""
        loadAttachments()
        updateDashboardStats()
    } catch (error) {
        console.error("Error uploading files:", error)
        showNotification("error", "Fayllarni yuklashda xatolik")
    } finally {
        hideButtonLoading("upload-form")
    }
}

// Edit category
function editCategory(categoryId) {
    const category = allCategories.find((c) => c.id === categoryId)
    if (!category) return

    document.getElementById("edit-category-id").value = category.id
    document.getElementById("edit-category-name").value = category.name
    document.getElementById("edit-category-active").checked = category.active

    const modal = new bootstrap.Modal(document.getElementById("editCategoryModal"))
    modal.show()
}

// Update category
async function updateCategory() {
    const id = document.getElementById("edit-category-id").value
    const name = document.getElementById("edit-category-name").value
    const active = document.getElementById("edit-category-active").checked

    try {
        await apiRequest(`/api/v1/admin/category/${id}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ name, active }),
        })

        showNotification("success", "Kategoriya muvaffaqiyatli yangilandi")
        const modal = bootstrap.Modal.getInstance(document.getElementById("editCategoryModal"))
        modal.hide()
        loadAllCategories()
        loadDashboardData()
    } catch (error) {
        console.error("Error updating category:", error)
        showNotification("error", "Kategoriyani yangilashda xatolik")
    }
}

// Delete category
async function deleteCategory(categoryId) {
    if (!confirm("Kategoriyani o'chirishni xohlaysizmi?")) return

    try {
        await apiRequest(`/api/v1/admin/category/deactivate/${categoryId}`, {
            method: "DELETE",
        })

        showNotification("success", "Kategoriya muvaffaqiyatli o'chirildi")
        loadAllCategories()
        loadDashboardData()
    } catch (error) {
        console.error("Error deleting category:", error)
        showNotification("error", "Kategoriyani o'chirishda xatolik")
    }
}

// Edit product
function editProduct(productId) {
    const product = allProducts.find((p) => p.id === productId)
    if (!product) return

    // Create edit product modal dynamically
    const modalHtml = `
    <div class="modal fade" id="editProductModal" tabindex="-1">
        <div class="modal-dialog modal-dialog-centered modal-lg">
            <div class="modal-content modern-modal">
                <div class="modal-header">
                    <h5 class="modal-title">Mahsulotni tahrirlash</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                </div>
                <div class="modal-body">
                    <form id="edit-product-form" class="modern-form">
                        <input type="hidden" id="edit-product-id" value="${product.id}">
                        <div class="form-group">
                            <label class="form-label">Mahsulot nomi</label>
                            <input type="text" class="form-control" id="edit-product-name" value="${product.name}" required>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Tavsif</label>
                            <textarea class="form-control" id="edit-product-description" rows="3">${product.description || ""}</textarea>
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label class="form-label">Narx (so'm)</label>
                                <input type="number" class="form-control" id="edit-product-price" value="${product.price}" required>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Miqdor</label>
                                <input type="number" class="form-control" id="edit-product-amount" value="${product.amount}" required>
                            </div>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Kategoriya</label>
                            <select class="form-control" id="edit-product-category" required>
                                <option value="">Kategoriyani tanlang</option>
                                ${allCategories
        .map(
            (cat) =>
                `<option value="${cat.id}" ${cat.id === product.categoryId ? "selected" : ""}>${cat.name}</option>`,
        )
        .join("")}
                            </select>
                        </div>
                    </form>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Bekor qilish</button>
                    <button type="button" class="btn btn-primary" onclick="updateProduct()">Saqlash</button>
                </div>
            </div>
        </div>
    </div>
  `

    // Remove existing modal if any
    const existingModal = document.getElementById("editProductModal")
    if (existingModal) {
        existingModal.remove()
    }

    // Add modal to body
    document.body.insertAdjacentHTML("beforeend", modalHtml)

    const modal = new bootstrap.Modal(document.getElementById("editProductModal"))
    modal.show()
}

// Update product
async function updateProduct() {
    const id = document.getElementById("edit-product-id").value
    const name = document.getElementById("edit-product-name").value
    const description = document.getElementById("edit-product-description").value
    const price = Number.parseFloat(document.getElementById("edit-product-price").value)
    const amount = Number.parseInt(document.getElementById("edit-product-amount").value)
    const categoryId = Number.parseInt(document.getElementById("edit-product-category").value)

    try {
        const productData = {
            name,
            description,
            price,
            amount,
            categoryId,
        }

        await apiRequest(`/api/v1/admin/product/${id}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(productData),
        })

        showNotification("success", "Mahsulot muvaffaqiyatli yangilandi")
        const modal = bootstrap.Modal.getInstance(document.getElementById("editProductModal"))
        modal.hide()
        loadAllProducts()
        loadDashboardData()
    } catch (error) {
        console.error("Error updating product:", error)
        showNotification("error", "Mahsulotni yangilashda xatolik")
    }
}

// Delete product
async function deleteProduct(productId) {
    if (!confirm("Mahsulotni o'chirishni xohlaysizmi?")) return

    try {
        await apiRequest(`/api/v1/admin/product/deactivate/${productId}`, {
            method: "DELETE",
        })

        showNotification("success", "Mahsulot muvaffaqiyatli o'chirildi")
        loadAllProducts()
        loadDashboardData()
    } catch (error) {
        console.error("Error deleting product:", error)
        showNotification("error", "Mahsulotni o'chirishda xatolik")
    }
}

// Load attachments
function loadAttachments() {
    const container = document.getElementById("uploaded-files")
    if (!container) return

    container.innerHTML =
        uploadedFiles.length > 0
            ? uploadedFiles
                .map(
                    (file) => `
          <div class="file-item fade-in">
              <img src="${API_BASE_URL}/api/v1/attachment/${file.id}" class="file-preview" alt="File" onerror="this.src='/placeholder.svg?height=150&width=200'">
              <div class="file-info">
                  <div class="file-name">File ${file.id}</div>
                  <div class="file-size">${file.key || "Unknown"}</div>
              </div>
          </div>
      `,
                )
                .join("")
            : '<div class="text-center text-muted py-4">Hech qanday fayl yuklanmagan</div>'
}

// Format price
function formatPrice(price) {
    return new Intl.NumberFormat("uz-UZ").format(price)
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

// Show button loading
function showButtonLoading(formId) {
    const form = document.getElementById(formId)
    if (!form) return

    const button = form.querySelector(".submit-btn")
    if (!button) return

    const icon = button.querySelector("i")
    const text = button.querySelector("span")

    button.disabled = true
    if (icon) icon.className = "fas fa-spinner fa-spin"
    if (text) text.textContent = "Yuklanmoqda..."
}

// Hide button loading
function hideButtonLoading(formId) {
    const form = document.getElementById(formId)
    if (!form) return

    const button = form.querySelector(".submit-btn")
    if (!button) return

    const icon = button.querySelector("i")
    const text = button.querySelector("span")

    button.disabled = false

    if (formId === "category-form") {
        if (icon) icon.className = "fas fa-plus"
        if (text) text.textContent = "Kategoriya qo'shish"
    } else if (formId === "product-form") {
        if (icon) icon.className = "fas fa-plus"
        if (text) text.textContent = "Mahsulot qo'shish"
    } else if (formId === "upload-form") {
        if (icon) icon.className = "fas fa-upload"
        if (text) text.textContent = "Fayllarni yuklash"
    }
}

// Add animations
function addAnimations() {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                entry.target.classList.add("fade-in")
            }
        })
    })

    document.querySelectorAll(".stats-card, .dashboard-card, .form-card, .table-card").forEach((card) => {
        observer.observe(card)
    })
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
