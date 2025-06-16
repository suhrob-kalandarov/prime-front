// API Configuration
const API_BASE_URL = "http://localhost:8080"

// DOM Elements
const loginForm = document.getElementById("login-form")
const emailInput = document.getElementById("email")
const passwordInput = document.getElementById("password")
const loginBtn = document.getElementById("login-btn")
const errorMessage = document.getElementById("error-message")
const successMessage = document.getElementById("success-message")

// Check if already logged in
document.addEventListener("DOMContentLoaded", () => {
    const token = localStorage.getItem("accessToken")
    if (token) {
        window.location.href = "admin.html"
    }

    // Add input animations
    addInputAnimations()

    // Add floating animation to shapes
    addFloatingAnimation()
})

// Login form submission
loginForm.addEventListener("submit", async (e) => {
    e.preventDefault()

    const email = emailInput.value.trim()
    const password = passwordInput.value

    if (!email || !password) {
        showError("Iltimos, email va parolni kiriting")
        return
    }

    if (!isValidEmail(email)) {
        showError("Email manzil noto'g'ri formatda")
        return
    }

    try {
        setLoading(true)
        hideMessages()

        const response = await fetch(`${API_BASE_URL}/api/v1/auth/login`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                email: email,
                password: password,
            }),
        })

        const data = await response.json()

        if (!response.ok) {
            throw new Error(data.message || "Login failed")
        }

        if (data.accessToken) {
            // Save tokens
            localStorage.setItem("accessToken", data.accessToken)
            localStorage.setItem("refreshToken", data.refreshToken || "")

            showSuccess("Muvaffaqiyatli kirildi! Admin panelga yo'naltirilmoqda...")

            // Add success animation
            loginBtn.style.background = "linear-gradient(135deg, #48bb78, #38a169)"

            // Redirect to admin panel
            setTimeout(() => {
                window.location.href = "admin.html"
            }, 1500)
        } else {
            showError(data.message || "Login xatoligi yuz berdi")
        }
    } catch (error) {
        console.error("Login error:", error)

        let message = "Serverga ulanishda xatolik"

        if (error.message === "Account not active") {
            message = "Hisob faol emas"
        } else if (error.message === "Invalid email or password") {
            message = "Email yoki parol noto'g'ri"
        } else if (error.message === "User not found") {
            message = "Foydalanuvchi topilmadi"
        } else if (error.message === "Login failed") {
            message = "Login xatoligi yuz berdi"
        }

        showError(message)

        // Add shake animation to form
        const loginCard = document.querySelector(".login-card")
        loginCard.style.animation = "shake 0.5s ease-in-out"
        setTimeout(() => {
            loginCard.style.animation = ""
        }, 500)
    } finally {
        setLoading(false)
    }
})

// Toggle password visibility
function togglePassword() {
    const type = passwordInput.type === "password" ? "text" : "password"
    passwordInput.type = type

    const icon = document.querySelector(".password-toggle i")
    if (type === "password") {
        icon.classList.remove("fa-eye-slash")
        icon.classList.add("fa-eye")
    } else {
        icon.classList.remove("fa-eye")
        icon.classList.add("fa-eye-slash")
    }
}

// Show error message
function showError(message) {
    errorMessage.textContent = message
    errorMessage.style.display = "block"
    successMessage.style.display = "none"

    // Auto hide after 5 seconds
    setTimeout(() => {
        errorMessage.style.display = "none"
    }, 5000)
}

// Show success message
function showSuccess(message) {
    successMessage.textContent = message
    successMessage.style.display = "block"
    errorMessage.style.display = "none"
}

// Hide all messages
function hideMessages() {
    errorMessage.style.display = "none"
    successMessage.style.display = "none"
}

// Set loading state
function setLoading(isLoading) {
    if (isLoading) {
        loginBtn.classList.add("loading")
        loginBtn.disabled = true
        document.querySelector(".btn-text").textContent = "Tekshirilmoqda..."
    } else {
        loginBtn.classList.remove("loading")
        loginBtn.disabled = false
        document.querySelector(".btn-text").textContent = "Kirish"
        loginBtn.style.background = "linear-gradient(135deg, #667eea, #764ba2)"
    }
}

// Validate email format
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
}

// Add input animations
function addInputAnimations() {
    const inputs = document.querySelectorAll(".form-control")

    inputs.forEach((input) => {
        input.addEventListener("focus", function () {
            this.parentElement.style.transform = "scale(1.02)"
        })

        input.addEventListener("blur", function () {
            this.parentElement.style.transform = "scale(1)"
        })

        // Add typing effect
        input.addEventListener("input", function () {
            if (this.value.length > 0) {
                this.style.borderColor = "#667eea"
            } else {
                this.style.borderColor = "#e2e8f0"
            }
        })
    })
}

// Add floating animation to shapes
function addFloatingAnimation() {
    const shapes = document.querySelectorAll(".shape")

    shapes.forEach((shape, index) => {
        // Random animation duration and delay
        const duration = 4 + Math.random() * 4 // 4-8 seconds
        const delay = Math.random() * 2 // 0-2 seconds delay

        shape.style.animationDuration = `${duration}s`
        shape.style.animationDelay = `${delay}s`

        // Add random movement
        setInterval(
            () => {
                const randomX = Math.random() * 20 - 10 // -10 to 10
                const randomY = Math.random() * 20 - 10 // -10 to 10

                shape.style.transform = `translate(${randomX}px, ${randomY}px)`
            },
            3000 + index * 1000,
        )
    })
}

// Show forgot password (placeholder)
function showForgotPassword() {
    alert("Parolni tiklash funksiyasi hozircha mavjud emas. Admin bilan bog'laning.")
}

// Add keyboard shortcuts
document.addEventListener("keydown", (e) => {
    // Enter key to submit
    if (e.key === "Enter" && !loginBtn.disabled) {
        loginForm.dispatchEvent(new Event("submit"))
    }

    // Escape key to clear form
    if (e.key === "Escape") {
        emailInput.value = ""
        passwordInput.value = ""
        hideMessages()
        emailInput.focus()
    }
})

// Add CSS for shake animation
const style = document.createElement("style")
style.textContent = `
    @keyframes shake {
        0%, 100% { transform: translateX(0); }
        10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
        20%, 40%, 60%, 80% { transform: translateX(5px); }
    }
`
document.head.appendChild(style)

// Add particle effect on successful login
function addParticleEffect() {
    const particles = []
    const colors = ["#667eea", "#764ba2", "#f093fb", "#f5576c"]

    for (let i = 0; i < 50; i++) {
        const particle = document.createElement("div")
        particle.style.cssText = `
            position: fixed;
            width: 6px;
            height: 6px;
            background: ${colors[Math.floor(Math.random() * colors.length)]};
            border-radius: 50%;
            pointer-events: none;
            z-index: 9999;
            left: 50%;
            top: 50%;
        `

        document.body.appendChild(particle)
        particles.push(particle)

        // Animate particle
        const angle = (Math.PI * 2 * i) / 50
        const velocity = 5 + Math.random() * 5

        let x = 0,
            y = 0
        const animate = () => {
            x += Math.cos(angle) * velocity
            y += Math.sin(angle) * velocity

            particle.style.transform = `translate(${x}px, ${y}px)`
            particle.style.opacity = Math.max(0, 1 - Math.sqrt(x * x + y * y) / 200)

            if (particle.style.opacity > 0) {
                requestAnimationFrame(animate)
            } else {
                particle.remove()
            }
        }

        requestAnimationFrame(animate)
    }
}

// Add success particle effect to success message
const originalShowSuccess = showSuccess
showSuccess = (message) => {
    originalShowSuccess(message)
    addParticleEffect()
}
