// API Configuration
const API_BASE_URL = "http://localhost:8080"

// Global variables
const allFiles = []
const todayFiles = []
const weekFiles = []
const monthFiles = []
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
    setupUpdateFileUpload()
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

// Setup update file upload
function setupUpdateFileUpload() {
    const uploadArea = document.getElementById("update-file-upload-area")
    const fileInput = document.getElementById("update-file-input")
    const preview = document.getElementById("update-file-preview")

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
    const parentForm = button.closest("form")
    if (parentForm) {
        const fileInput = parentForm.querySelector('input[type="file"]')
        if (fileInput) {
            fileInput.value = ""
        }
    }
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
    window.showAllAttachments = showAllAttachments
    window.showActiveAttachments = showActiveAttachments
    window.showInactiveAttachments = showInactiveAttachments
    window.showUnlinkedAttachments = showUnlinkedAttachments
    window.openMemoryManagement = openMemoryManagement
    window.showActivationModal = showActivationModal
    window.showReplaceImageModal = showReplaceImageModal
    window.loadRecentUploaded = loadRecentUploaded
    window.loadRecentModified = loadRecentModified
    window.loadUnlinkedImages = loadUnlinkedImages
    window.toggleAttachmentStatus = toggleAttachmentStatus
    window.showUpdateImageModal = showUpdateImageModal
    window.updateAttachment = updateAttachment
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

        await Promise.all([loadAttachmentStats(), loadRecentUploaded(), loadRecentModified(), loadUnlinkedImages()])

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
        const [total, active, inactive, unlinked] = await Promise.all([
            apiRequest("/api/v1/admin/attachments").then((data) => data?.length || 0),
            apiRequest("/api/v1/admin/attachments/active").then((data) => data?.length || 0),
            apiRequest("/api/v1/admin/attachments/inactive").then((data) => data?.length || 0),
            apiRequest("/api/v1/admin/attachments/no-linked-with-product/count"),
        ])

        animateCounter("total-attachments", total || 0)
        animateCounter("active-attachments", active || 0)
        animateCounter("inactive-attachments", inactive || 0)
        animateCounter("unlinked-attachments", unlinked || 0)
    } catch (error) {
        console.error("Error loading attachment stats:", error)
        showNotification("error", "Statistika ma'lumotlarini yuklashda xatolik")
    }
}

// Load recent uploaded files (last 7 days)
async function loadRecentUploaded() {
    try {
        // Mock data for recent uploaded - in real implementation, you would filter by date
        const mockData = [
            { id: 1, filename: "recent1.jpg", productId: 123 },
            { id: 2, filename: "recent2.png", productId: null },
        ]
        renderFilesTable("recent-uploaded-table", mockData)
    } catch (error) {
        console.error("Error loading recent uploaded:", error)
        showNotification("error", "So'nggi yuklangan fayllarni yuklashda xatolik")
    }
}

// Load recent modified files (last 7 days)
async function loadRecentModified() {
    try {
        // Mock data for recent modified - in real implementation, you would filter by date
        const mockData = [{ id: 3, filename: "modified1.jpg", productId: 456 }]
        renderFilesTable("recent-modified-table", mockData)
    } catch (error) {
        console.error("Error loading recent modified:", error)
        showNotification("error", "So'nggi o'zgartirilgan fayllarni yuklashda xatolik")
    }
}

// Load unlinked images
async function loadUnlinkedImages() {
    try {
        // Mock data for unlinked images
        const mockData = [
            { id: 4, filename: "unlinked1.jpg", productId: null },
            { id: 5, filename: "unlinked2.png", productId: null },
        ]
        renderFilesTable("unlinked-images-table", mockData)
    } catch (error) {
        console.error("Error loading unlinked images:", error)
        showNotification("error", "Bog'lanmagan rasmlarni yuklashda xatolik")
    }
}

// Load today's files
async function loadTodayFiles() {
    try {
        // Mock data for today's files - in real implementation, you would filter by date
        const mockData = [
            { id: 6, filename: "today1.jpg", productId: 789 },
            { id: 7, filename: "today2.png", productId: null },
        ]
        renderFilesTable("today-files-table", mockData)
    } catch (error) {
        console.error("Error loading today's files:", error)
        showNotification("error", "Bugungi fayllarni yuklashda xatolik")
    }
}

// Load week's files
async function loadWeekFiles() {
    try {
        // Mock data for week's files - in real implementation, you would filter by date
        const mockData = [
            { id: 8, filename: "week1.jpg", productId: 101 },
            { id: 9, filename: "week2.png", productId: null },
        ]
        renderFilesTable("week-files-table", mockData)
    } catch (error) {
        console.error("Error loading week's files:", error)
        showNotification("error", "Hafta fayllarni yuklashda xatolik")
    }
}

// Load month's files
async function loadMonthFiles() {
    try {
        // Mock data for month's files - in real implementation, you would filter by date
        const mockData = [
            { id: 10, filename: "month1.jpg", productId: 202 },
            { id: 11, filename: "month2.png", productId: null },
        ]
        renderFilesTable("month-files-table", mockData)
    } catch (error) {
        console.error("Error loading month's files:", error)
        showNotification("error", "Oy fayllarni yuklashda xatolik")
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
            <td class="text-truncate" style="max-width: 100px;" title="${file.filename || file.name}">${file.filename || file.name || "N/A"}</td>
            <td>
                ${file.productId ? `<span class="badge bg-primary">${file.productId}</span>` : '<span class="badge bg-secondary">NO-LINKED</span>'}
            </td>
            <td>
                <button class="action-btn edit" onclick="viewFile(${file.id})" title="Ko\'rish">
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

        const response = await fetch(`${API_BASE_URL}/api/v1/admin/attachment`, {
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

        // Avval barcha modallarni yopamiz va tozalaymiz
        const existingModals = document.querySelectorAll('.modal.show')
        existingModals.forEach(modal => {
            const modalInstance = bootstrap.Modal.getInstance(modal)
            if (modalInstance) {
                modalInstance.hide()
            }
        })

        // Backdrop larni tozalaymiz
        setTimeout(() => {
            const backdrops = document.querySelectorAll('.modal-backdrop')
            backdrops.forEach(backdrop => backdrop.remove())

            document.body.classList.remove('modal-open')
            document.body.style.overflow = ''
            document.body.style.paddingRight = ''
        }, 200)

        // Ma'lumotlarni to'ldiramiz
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

        // Fayl preview ni ko'rsatamiz
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

        // Yangi modal ni ko'rsatamiz
        setTimeout(() => {
            const modal = new bootstrap.Modal(document.getElementById("viewFileModal"), {
                backdrop: true,
                keyboard: true,
                focus: true
            })
            modal.show()
        }, 300)

    } catch (error) {
        console.error("Error viewing file:", error)
        showNotification("error", "Fayl ma'lumotlarini yuklashda xatolik")
    }
}

// Show all attachments
async function showAllAttachments() {
    try {
        const data = await apiRequest("/api/v1/admin/attachments")
        showAttachmentsModal("Barcha rasmlar", data || [])
    } catch (error) {
        console.error("Error loading all attachments:", error)
        showNotification("error", "Barcha rasmlarni yuklashda xatolik")
    }
}

// Show active attachments
async function showActiveAttachments() {
    try {
        const data = await apiRequest("/api/v1/admin/attachments/active")
        showAttachmentsModal("Faol rasmlar", data || [])
    } catch (error) {
        console.error("Error loading active attachments:", error)
        showNotification("error", "Faol rasmlarni yuklashda xatolik")
    }
}

// Show inactive attachments
async function showInactiveAttachments() {
    try {
        const data = await apiRequest("/api/v1/admin/attachments/inactive")
        showAttachmentsModal("Nofaol rasmlar", data || [])
    } catch (error) {
        console.error("Error loading inactive attachments:", error)
        showNotification("error", "Nofaol rasmlarni yuklashda xatolik")
    }
}

// Show unlinked attachments
async function showUnlinkedAttachments() {
    try {
        // This would need a specific API endpoint for unlinked attachments
        showNotification("info", "Bog'lanmagan rasmlar funksiyasi ishlab chiqilmoqda")
    } catch (error) {
        console.error("Error loading unlinked attachments:", error)
        showNotification("error", "Bog'lanmagan rasmlarni yuklashda xatolik")
    }
}

// Show attachments modal funksiyasini to'liq o'zgartiramiz
function showAttachmentsModal(title, attachments) {
    // Avval barcha ochiq modallarni yopamiz
    const existingModals = document.querySelectorAll('.modal.show')
    existingModals.forEach(modal => {
        const modalInstance = bootstrap.Modal.getInstance(modal)
        if (modalInstance) {
            modalInstance.hide()
        }
    })

    // Eski modallarni o'chiramiz
    const existingModal = document.getElementById("attachmentsModal")
    if (existingModal) {
        existingModal.remove()
    }

    // Backdrop larni tozalaymiz
    const backdrops = document.querySelectorAll('.modal-backdrop')
    backdrops.forEach(backdrop => backdrop.remove())

    // Body dan modal classlarni olib tashlaymiz
    document.body.classList.remove('modal-open')
    document.body.style.overflow = ''
    document.body.style.paddingRight = ''

    // Yangi modal yaratamiz
    const modalHtml = `
    <div class="modal fade" id="attachmentsModal" tabindex="-1" data-bs-backdrop="true" data-bs-keyboard="true">
        <div class="modal-dialog modal-xl modal-dialog-centered">
            <div class="modal-content modern-modal">
                <div class="modal-header">
                    <h5 class="modal-title">${title}</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div class="modal-body">
                    <div class="table-container">
                        <table class="modern-table">
                            <thead>
                            <tr>
                                <th>ID</th>
                                <th>Nomi</th>
                                <th>Product ID</th>
                                <th>Amallar</th>
                            </tr>
                            </thead>
                            <tbody>
                            ${
        attachments.length > 0
            ? attachments
                .map(
                    (attachment) => `
                                <tr>
                                    <td>${attachment.id}</td>
                                    <td class="text-truncate" style="max-width: 200px;" title="${attachment.filename || attachment.name}">${attachment.filename || attachment.name || "N/A"}</td>
                                    <td>
                                        ${attachment.productId ? `<span class="badge bg-primary">${attachment.productId}</span>` : '<span class="badge bg-secondary">NO-LINKED</span>'}
                                    </td>
                                    <td>
                                        <button class="action-btn edit" onclick="viewFileFromModal(${attachment.id})" title="Ko\'rish">
                                            <i class="fas fa-eye"></i>
                                        </button>
                                    </td>
                                </tr>
                            `,
                )
                .join("")
            : '<tr><td colspan="4" class="text-center text-muted">Ma\'lumotlar mavjud emas</td></tr>'
    }
                            </tbody>
                        </table>
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Yopish</button>
                </div>
            </div>
        </div>
    </div>
  `

    // Modal ni body ga qo'shamiz
    document.body.insertAdjacentHTML("beforeend", modalHtml)

    // Modal ni ko'rsatamiz
    setTimeout(() => {
        const modal = new bootstrap.Modal(document.getElementById("attachmentsModal"), {
            backdrop: true,
            keyboard: true,
            focus: true
        })
        modal.show()
    }, 100)
}

// Show activation modal
async function showActivationModal() {
    try {
        // Avval barcha modallarni yopamiz
        const existingModals = document.querySelectorAll('.modal.show')
        existingModals.forEach(modal => {
            const modalInstance = bootstrap.Modal.getInstance(modal)
            if (modalInstance) {
                modalInstance.hide()
            }
        })

        // Backdrop larni tozalaymiz
        const backdrops = document.querySelectorAll('.modal-backdrop')
        backdrops.forEach(backdrop => backdrop.remove())

        document.body.classList.remove('modal-open')
        document.body.style.overflow = ''
        document.body.style.paddingRight = ''

        const data = await apiRequest("/api/v1/admin/attachments")

        // Activation table ni to'ldiramiz
        const tbody = document.getElementById("activation-table")
        if (tbody && data) {
            tbody.innerHTML =
                data.length > 0
                    ? data
                        .map(
                            (attachment) => `
                    <tr>
                        <td>${attachment.id}</td>
                        <td class="text-truncate" style="max-width: 200px;" title="${attachment.filename || attachment.name}">${attachment.filename || attachment.name || "N/A"}</td>
                        <td>
                            ${attachment.productId ? `<span class="badge bg-primary">${attachment.productId}</span>` : '<span class="badge bg-secondary">NO-LINKED</span>'}
                        </td>
                        <td>
                            <span class="status-badge ${attachment.active ? "active" : "inactive"}">
                                ${attachment.active ? "FAOL" : "NOFAOL"}
                            </span>
                        </td>
                        <td>
                            <button class="action-btn edit" onclick="viewFileFromActivationModal(${attachment.id})" title="Ko\'rish">
                                <i class="fas fa-eye"></i>
                            </button>
                            <button class="action-btn ${attachment.active ? "delete" : "edit"}" onclick="toggleAttachmentStatus(${attachment.id}, ${!attachment.active})" title="${attachment.active ? "Nofaollashtirish" : "Faollashtirish"}">
                                <i class="fas fa-${attachment.active ? "pause" : "play"}"></i>
                            </button>
                        </td>
                    </tr>
                `,
                        )
                        .join("")
                    : '<tr><td colspan="5" class="text-center text-muted">Ma\'lumotlar mavjud emas</td></tr>'
        }

        setTimeout(() => {
            const modal = new bootstrap.Modal(document.getElementById("activationModal"), {
                backdrop: true,
                keyboard: true,
                focus: true
            })
            modal.show()
        }, 200)

    } catch (error) {
        console.error("Error loading activation modal:", error)
        showNotification("error", "Faollashtirish modalini yuklashda xatolik")
    }
}

// Show replace image modal
async function showReplaceImageModal() {
    try {
        // Avval barcha modallarni yopamiz
        const existingModals = document.querySelectorAll('.modal.show')
        existingModals.forEach(modal => {
            const modalInstance = bootstrap.Modal.getInstance(modal)
            if (modalInstance) {
                modalInstance.hide()
            }
        })

        // Backdrop larni tozalaymiz
        const backdrops = document.querySelectorAll('.modal-backdrop')
        backdrops.forEach(backdrop => backdrop.remove())

        document.body.classList.remove('modal-open')
        document.body.style.overflow = ''
        document.body.style.paddingRight = ''

        const data = await apiRequest("/api/v1/admin/attachments/active")

        // Replace image table ni to'ldiramiz
        const tbody = document.getElementById("replace-image-table")
        if (tbody && data) {
            tbody.innerHTML =
                data.length > 0
                    ? data
                        .map(
                            (attachment) => `
                    <tr>
                        <td>${attachment.id}</td>
                        <td class="text-truncate" style="max-width: 200px;" title="${attachment.filename || attachment.name}">${attachment.filename || attachment.name || "N/A"}</td>
                        <td>
                            ${attachment.productId ? `<span class="badge bg-primary">${attachment.productId}</span>` : '<span class="badge bg-secondary">NO-LINKED</span>'}
                        </td>
                        <td>
                            <button class="action-btn edit" onclick="viewFileFromReplaceModal(${attachment.id})" title="Ko\'rish">
                                <i class="fas fa-eye"></i>
                            </button>
                            <button class="action-btn edit" onclick="showUpdateImageModalFromReplace(${attachment.id})" title="Yangilash">
                                <i class="fas fa-edit"></i>
                            </button>
                        </td>
                    </tr>
                `,
                        )
                        .join("")
                    : '<tr><td colspan="4" class="text-center text-muted">Ma\'lumotlar mavjud emas</td></tr>'
        }

        setTimeout(() => {
            const modal = new bootstrap.Modal(document.getElementById("replaceImageModal"), {
                backdrop: true,
                keyboard: true,
                focus: true
            })
            modal.show()
        }, 200)

    } catch (error) {
        console.error("Error loading replace image modal:", error)
        showNotification("error", "Rasm almashtirish modalini yuklashda xatolik")
    }
}

// Toggle attachment status
async function toggleAttachmentStatus(attachmentId, newStatus) {
    try {
        // This would need an API endpoint to toggle status
        showNotification("info", `Attachment ${attachmentId} holati ${newStatus ? "faollashtirildi" : "nofaollashtirildi"}`)

        // Refresh the activation modal
        showActivationModal()
    } catch (error) {
        console.error("Error toggling attachment status:", error)
        showNotification("error", "Attachment holatini o'zgartirishda xatolik")
    }
}

// Show update image modal
async function showUpdateImageModal(attachmentId) {
    try {
        const attachment = await apiRequest(`/api/v1/admin/attachment/${attachmentId}`)

        if (!attachment) {
            showNotification("error", "Attachment ma'lumotlari topilmadi")
            return
        }

        // Populate update form
        document.getElementById("update-attachment-id").value = attachment.id
        document.getElementById("update-attachment-id-display").value = attachment.id
        document.getElementById("update-attachment-name").value = attachment.filename || attachment.name || "N/A"

        // Show current image
        const currentImagePreview = document.getElementById("current-image-preview")
        if (attachment.contentType && attachment.contentType.startsWith("image/")) {
            currentImagePreview.innerHTML = `
                <img src="${API_BASE_URL}/api/v1/attachment/${attachment.id}" 
                     class="img-fluid rounded" 
                     alt="${attachment.filename}"
                     style="max-height: 200px; object-fit: contain;"
                     onerror="this.src='/placeholder.svg?height=200&width=200'">
            `
        } else {
            currentImagePreview.innerHTML = `
                <div class="d-flex align-items-center justify-content-center bg-light rounded" style="height: 200px;">
                    <div class="text-center">
                        <i class="fas fa-file fa-3x text-muted mb-3"></i>
                        <div class="text-muted">${attachment.filename}</div>
                    </div>
                </div>
            `
        }

        // Clear previous preview
        document.getElementById("update-file-preview").innerHTML = ""
        document.getElementById("update-file-input").value = ""

        const modal = new bootstrap.Modal(document.getElementById("updateImageModal"))
        modal.show()
    } catch (error) {
        console.error("Error showing update image modal:", error)
        showNotification("error", "Yangilash modalini ko'rsatishda xatolik")
    }
}

// Update attachment
async function updateAttachment() {
    const attachmentId = document.getElementById("update-attachment-id").value
    const fileInput = document.getElementById("update-file-input")
    const file = fileInput.files[0]

    if (!file) {
        showNotification("warning", "Iltimos, yangi fayl tanlang")
        return
    }

    try {
        const formData = new FormData()
        formData.append("file", file)

        const response = await fetch(`${API_BASE_URL}/api/v1/admin/attachment/${attachmentId}`, {
            method: "PUT",
            headers: {
                Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
            },
            body: formData,
        })

        if (!response.ok) {
            throw new Error("Failed to update attachment")
        }

        const result = await response.json()

        showNotification("success", "Attachment muvaffaqiyatli yangilandi")

        const modal = bootstrap.Modal.getInstance(document.getElementById("updateImageModal"))
        modal.hide()

        // Refresh data
        loadFilesData()
        showReplaceImageModal() // Refresh the replace modal if it's open
    } catch (error) {
        console.error("Error updating attachment:", error)
        showNotification("error", "Attachmentni yangilashda xatolik")
    }
}

// Open memory management page
function openMemoryManagement() {
    window.location.href = "memory-management.html"
}

// Clear memory
function clearMemory() {
    if (confirm("Xotira tozalashni xohlaysizmi? Bu amal qaytarib bo'lmaydi.")) {
        showNotification("info", "Xotira tozalash funksiyasi ishlab chiqilmoqda")
    }
}

// Toggle activation
function toggleActivation() {
    showActivationModal()
}

// Update files
function updateFiles() {
    loadFilesData()
    showNotification("success", "Fayllar ma'lumotlari yangilandi")
}

// Yangi funksiya - modal ichidan file ko'rish uchun
window.viewFileFromModal = async function(fileId) {
    try {
        // Avval attachments modalini yopamiz
        const attachmentsModal = bootstrap.Modal.getInstance(document.getElementById("attachmentsModal"))
        if (attachmentsModal) {
            attachmentsModal.hide()
        }

        // Biroz kutamiz
        setTimeout(async () => {
            await viewFile(fileId)
        }, 300)

    } catch (error) {
        console.error("Error viewing file from modal:", error)
        showNotification("error", "Fayl ma'lumotlarini yuklashda xatolik")
    }
}

// Activation modal dan file ko'rish uchun yangi funksiya
window.viewFileFromActivationModal = async function(fileId) {
    try {
        // Avval activation modalini yopamiz
        const activationModal = bootstrap.Modal.getInstance(document.getElementById("activationModal"))
        if (activationModal) {
            activationModal.hide()
        }

        // Biroz kutamiz
        setTimeout(async () => {
            await viewFile(fileId)
        }, 300)

    } catch (error) {
        console.error("Error viewing file from activation modal:", error)
        showNotification("error", "Fayl ma'lumotlarini yuklashda xatolik")
    }
}

// Replace modal dan file ko'rish uchun yangi funksiya
window.viewFileFromReplaceModal = async function(fileId) {
    try {
        // Avval replace modalini yopamiz
        const replaceModal = bootstrap.Modal.getInstance(document.getElementById("replaceImageModal"))
        if (replaceModal) {
            replaceModal.hide()
        }

        // Biroz kutamiz
        setTimeout(async () => {
            await viewFile(fileId)
        }, 300)

    } catch (error) {
        console.error("Error viewing file from replace modal:", error)
        showNotification("error", "Fayl ma'lumotlarini yuklashda xatolik")
    }
}

// Replace modal dan update modal ochish uchun yangi funksiya
window.showUpdateImageModalFromReplace = async function(attachmentId) {
    try {
        // Avval replace modalini yopamiz
        const replaceModal = bootstrap.Modal.getInstance(document.getElementById("replaceImageModal"))
        if (replaceModal) {
            replaceModal.hide()
        }

        // Biroz kutamiz
        setTimeout(async () => {
            await showUpdateImageModal(attachmentId)
        }, 300)

    } catch (error) {
        console.error("Error showing update modal from replace:", error)
        showNotification("error", "Yangilash modalini ko'rsatishda xatolik")
    }
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
