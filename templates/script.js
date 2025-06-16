
    // ======================================================
    // API CONFIGURATION
    // ======================================================
    const API_BASE_URL = 'http://16.171.152.61';

    // Axios instance with authentication interceptors
    const api = axios.create({
    baseURL: API_BASE_URL,
    timeout: 10000,
    headers: {
    'Content-Type': 'application/json'
}
});

    // Request interceptor to add auth token
    api.interceptors.request.use(
    (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
    config.headers.Authorization = `Bearer ${token}`;
}
    return config;
},
    (error) => {
    return Promise.reject(error);
}
    );

    // Response interceptor to handle token refresh
    api.interceptors.response.use(
    (response) => response,
    async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
    originalRequest._retry = true;

    const refreshToken = localStorage.getItem('refreshToken');
    if (refreshToken) {
    try {
    const response = await axios.post(`${API_BASE_URL}/api/v1/auth/refresh/${refreshToken}`, {});

    const { accessToken } = response.data;
    localStorage.setItem('accessToken', accessToken);

    return api(originalRequest);
} catch (refreshError) {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    // Redirect to login or show auth modal
}
}
}

    return Promise.reject(error);
}
    );

    // ======================================================
    // GLOBAL VARIABLES
    // ======================================================
    let currentSlide = 0;
    let slideInterval;
    let cart = JSON.parse(localStorage.getItem('cart')) || [];
    let wishlist = JSON.parse(localStorage.getItem('wishlist')) || [];
    let allCategories = [];
    let allProducts = [];
    let currentProduct = null;
    let currentCategory = null;

    // ======================================================
    // INITIALIZATION
    // ======================================================
    document.addEventListener('DOMContentLoaded', function() {
    initializeHeroSlider();
    initializeScrollEffects();
    initializeDropdowns();
    initializeAuthModal();
    initializeFeaturedTabs();
    initializeNewsletterForm();
    initializeProductModal();
    loadCategories();
    loadProducts();
    updateCartBadge();
    updateWishlistBadge();
    initializeSearch();

    // Check if we're on a category page
    const urlParams = new URLSearchParams(window.location.search);
    const categoryId = urlParams.get('category');
    if (categoryId) {
    loadCategoryPage(categoryId);
}
});

    // ======================================================
    // API FUNCTIONS
    // ======================================================
    async function loadCategories() {
    try {
    const response = await api.get('/api/v1/categories');
    allCategories = response.data;
    renderCategories();
    renderCategoryDropdown();
    renderFooterCategories();
    renderDetailedCategories();
} catch (error) {
    console.error('Kategoriyalarni yuklashda xatolik:', error);
    showNotification('error', 'Xatolik', 'Kategoriyalarni yuklashda xatolik yuz berdi');
}
}

    async function loadProducts() {
    try {
    const response = await api.get('/api/v1/products');
    allProducts = response.data;
    renderFeaturedProducts();
} catch (error) {
    console.error('Mahsulotlarni yuklashda xatolik:', error);
    showNotification('error', 'Xatolik', 'Mahsulotlarni yuklashda xatolik yuz berdi');
}
}

    async function loadProductsByCategory(categoryId) {
    try {
    const response = await api.get(`/api/v1/products/by-category/${categoryId}`);
    return response.data;
} catch (error) {
    console.error('Kategoriya mahsulotlarini yuklashda xatolik:', error);
    showNotification('error', 'Xatolik', 'Kategoriya mahsulotlarini yuklashda xatolik yuz berdi');
    return [];
}
}

    async function loadProductDetails(productId) {
    try {
    // In a real API, you might have a specific endpoint for product details
    // For now, we'll find the product in our existing products array
    const product = allProducts.find(p => p.id === productId);
    if (product) {
    currentProduct = product;
    return product;
} else {
    throw new Error('Mahsulot topilmadi');
}
} catch (error) {
    console.error('Mahsulot ma\'lumotlarini yuklashda xatolik:', error);
    showNotification('error', 'Xatolik', 'Mahsulot ma\'lumotlarini yuklashda xatolik yuz berdi');
    return null;
}
}

    // ======================================================
    // CATEGORY PAGE FUNCTIONS
    // ======================================================
    async function loadCategoryPage(categoryId) {
    const category = allCategories.find(c => c.id === parseInt(categoryId));
    if (!category) {
    showNotification('error', 'Xatolik', 'Kategoriya topilmadi');
    return;
}

    currentCategory = category;
    document.title = `${category.name} - Just Online Store`;

    // Load products for this category
    const products = await loadProductsByCategory(categoryId);

    // Create category page HTML
    const mainContent = document.querySelector('main') || document.body;

    // Hide other sections
    const sectionsToHide = document.querySelectorAll('.section-padding:not(.footer)');
    sectionsToHide.forEach(section => {
    section.style.display = 'none';
});

    // Hide hero section
    const heroSection = document.querySelector('.hero-section');
    if (heroSection) {
    heroSection.style.display = 'none';
}

    // Create category page container
    const categoryPageContainer = document.createElement('div');
    categoryPageContainer.id = 'category-page';
    categoryPageContainer.innerHTML = `
        <div class="category-header">
            <div class="container-fluid">
                <h1 class="category-title">${category.name}</h1>
                <p class="category-description">Eng sifatli ${category.name} mahsulotlari</p>
            </div>
        </div>
        <div class="container-fluid">
            <div class="row">
                <div class="col-lg-3">
                    <div class="category-filters">
                        <h3 class="filter-title">Filtrlar</h3>
                        <div class="filter-group">
                            <label class="filter-label">Narx</label>
                            <div class="price-inputs">
                                <input type="number" class="price-input" placeholder="Min" id="price-min">
                                <span>-</span>
                                <input type="number" class="price-input" placeholder="Max" id="price-max">
                            </div>
                        </div>
                        <div class="filter-group">
                            <label class="filter-label">Saralash</label>
                            <select class="sort-select" id="sort-select">
                                <option value="default">Standart</option>
                                <option value="price-asc">Narx: Arzondan qimmatga</option>
                                <option value="price-desc">Narx: Qimmatdan arzonga</option>
                                <option value="name-asc">Nom: A-Z</option>
                                <option value="name-desc">Nom: Z-A</option>
                            </select>
                        </div>
                        <button class="btn btn-primary w-100 mt-3" id="apply-filters">Qo'llash</button>
                    </div>
                </div>
                <div class="col-lg-9">
                    <div class="category-products-count">
                        <span>${products.length} mahsulot topildi</span>
                    </div>
                    <div class="row" id="category-products-grid">
                        ${products.length === 0 ? `
                            <div class="col-12">
                                <div class="no-products">
                                    <i class="fas fa-box-open"></i>
                                    <h3>Mahsulotlar topilmadi</h3>
                                    <p>Ushbu kategoriyada hozircha mahsulotlar mavjud emas.</p>
                                </div>
                            </div>
                        ` : ''}
                    </div>
                </div>
            </div>
        </div>
    `;

    // Insert category page before footer
    const footer = document.querySelector('.footer');
    document.body.insertBefore(categoryPageContainer, footer);

    // Render products
    if (products.length > 0) {
    renderProductGrid('category-products-grid', products);
}

    // Initialize filters
    document.getElementById('apply-filters').addEventListener('click', () => {
    const minPrice = document.getElementById('price-min').value;
    const maxPrice = document.getElementById('price-max').value;
    const sortValue = document.getElementById('sort-select').value;

    let filteredProducts = [...products];

    // Apply price filter
    if (minPrice) {
    filteredProducts = filteredProducts.filter(p => p.price >= parseInt(minPrice));
}

    if (maxPrice) {
    filteredProducts = filteredProducts.filter(p => p.price <= parseInt(maxPrice));
}

    // Apply sorting
    switch (sortValue) {
    case 'price-asc':
    filteredProducts.sort((a, b) => a.price - b.price);
    break;
    case 'price-desc':
    filteredProducts.sort((a, b) => b.price - a.price);
    break;
    case 'name-asc':
    filteredProducts.sort((a, b) => a.name.localeCompare(b.name));
    break;
    case 'name-desc':
    filteredProducts.sort((a, b) => b.name.localeCompare(a.name));
    break;
}

    // Update products count
    document.querySelector('.category-products-count span').textContent = `${filteredProducts.length} mahsulot topildi`;

    // Render filtered products
    renderProductGrid('category-products-grid', filteredProducts);
});
}

    // ======================================================
    // PRODUCT MODAL FUNCTIONS
    // ======================================================
    function initializeProductModal() {
    const productModal = document.getElementById('productModal');
    const quantityInput = document.getElementById('product-quantity');
    const decreaseBtn = document.getElementById('decrease-quantity');
    const increaseBtn = document.getElementById('increase-quantity');
    const addToCartBtn = document.getElementById('modal-add-to-cart');
    const addToWishlistBtn = document.getElementById('modal-add-to-wishlist');

    // Initialize quantity buttons
    decreaseBtn.addEventListener('click', () => {
    const currentValue = parseInt(quantityInput.value);
    if (currentValue > 1) {
    quantityInput.value = currentValue - 1;
}
});

    increaseBtn.addEventListener('click', () => {
    const currentValue = parseInt(quantityInput.value);
    const maxAmount = currentProduct ? currentProduct.amount : 1;
    if (currentValue < maxAmount) {
    quantityInput.value = currentValue + 1;
}
});

    // Add to cart button
    addToCartBtn.addEventListener('click', () => {
    if (!currentProduct) return;

    const quantity = parseInt(quantityInput.value);
    const existingIndex = cart.findIndex(item => item.id === currentProduct.id);

    if (existingIndex > -1) {
    cart[existingIndex].quantity = quantity;
    showNotification('success', 'Savatga qo\'shildi', `"${currentProduct.name}" savatdagi miqdori yangilandi`);
} else {
    const mainImage = currentProduct.attachmentIds && currentProduct.attachmentIds.length > 0
    ? `${API_BASE_URL}/api/v1/attachment/${currentProduct.attachmentIds[0]}`
    : '/placeholder.svg?height=100&width=100';

    cart.push({
    id: currentProduct.id,
    name: currentProduct.name,
    price: currentProduct.price,
    image: mainImage,
    quantity: quantity,
    maxAmount: currentProduct.amount
});
    showNotification('success', 'Savatga qo\'shildi', `"${currentProduct.name}" savatga qo'shildi`);
}

    localStorage.setItem('cart', JSON.stringify(cart));
    updateCartBadge();
    updateCartDropdown();

    // Close modal
    bootstrap.Modal.getInstance(productModal).hide();
});

    // Add to wishlist button
    addToWishlistBtn.addEventListener('click', () => {
    if (!currentProduct) return;

    const existingIndex = wishlist.findIndex(item => item.id === currentProduct.id);

    if (existingIndex > -1) {
    wishlist.splice(existingIndex, 1);
    showNotification('info', 'Sevimlilardan olib tashlandi', `"${currentProduct.name}" sevimlilardan olib tashlandi`);
    addToWishlistBtn.innerHTML = '<i class="far fa-heart me-2"></i>Sevimlilarga qo\'shish';
} else {
    const mainImage = currentProduct.attachmentIds && currentProduct.attachmentIds.length > 0
    ? `${API_BASE_URL}/api/v1/attachment/${currentProduct.attachmentIds[0]}`
    : '/placeholder.svg?height=100&width=100';

    wishlist.push({
    id: currentProduct.id,
    name: currentProduct.name,
    price: currentProduct.price,
    image: mainImage
});
    showNotification('success', 'Sevimlilarga qo\'shildi', `"${currentProduct.name}" sevimlilarga qo'shildi`);
    addToWishlistBtn.innerHTML = '<i class="fas fa-heart me-2"></i>Sevimlilardan olib tashlash';
}

    localStorage.setItem('wishlist', JSON.stringify(wishlist));
    updateWishlistBadge();
    updateWishlistDropdown();
});

    // Handle thumbnail clicks
    document.addEventListener('click', (e) => {
    if (e.target.closest('.product-modal-thumbnail')) {
    const thumbnail = e.target.closest('.product-modal-thumbnail');
    const imgSrc = thumbnail.querySelector('img').src;
    document.getElementById('modal-main-img').src = imgSrc;

    // Update active state
    document.querySelectorAll('.product-modal-thumbnail').forEach(thumb => {
    thumb.classList.remove('active');
});
    thumbnail.classList.add('active');
}
});
}

    async function openProductModal(productId) {
    const product = await loadProductDetails(productId);
    if (!product) return;

    const productModal = document.getElementById('productModal');
    const modalInstance = new bootstrap.Modal(productModal);

    // Reset quantity
    document.getElementById('product-quantity').value = 1;

    // Set product details
    document.getElementById('modal-product-title').textContent = product.name;

    // Find category
    const category = allCategories.find(c => c.id === product.categoryId);
    document.getElementById('modal-product-category').textContent = category ? category.name : 'Kategoriya';

    document.getElementById('modal-product-price').textContent = formatPrice(product.price) + ' So\'m';
    document.getElementById('modal-product-description').textContent = product.description || 'Mahsulot tavsifi mavjud emas.';
    document.getElementById('modal-product-amount').textContent = product.amount;

    // Update stock badge
    const stockBadge = document.querySelector('.product-modal-stock .badge');
    if (product.amount > 0) {
    stockBadge.className = 'badge bg-success';
    stockBadge.textContent = 'Mavjud';
} else {
    stockBadge.className = 'badge bg-danger';
    stockBadge.textContent = 'Mavjud emas';
}

    // Set main image
    const mainImage = product.attachmentIds && product.attachmentIds.length > 0
    ? `${API_BASE_URL}/api/v1/attachment/${product.attachmentIds[0]}`
    : '/placeholder.svg?height=400&width=400';
    document.getElementById('modal-main-img').src = mainImage;

    // Generate thumbnails
    const thumbnailsContainer = document.getElementById('modal-thumbnails');
    if (product.attachmentIds && product.attachmentIds.length > 0) {
    const thumbnailsHTML = product.attachmentIds.map((attachmentId, index) => `
            <div class="product-modal-thumbnail ${index === 0 ? 'active' : ''}">
                <img src="${API_BASE_URL}/api/v1/attachment/${attachmentId}" alt="${product.name}">
            </div>
        `).join('');
    thumbnailsContainer.innerHTML = thumbnailsHTML;
} else {
    thumbnailsContainer.innerHTML = `
            <div class="product-modal-thumbnail active">
                <img src="/placeholder.svg?height=70&width=70" alt="${product.name}">
            </div>
        `;
}

    // Update wishlist button
    const addToWishlistBtn = document.getElementById('modal-add-to-wishlist');
    const isInWishlist = wishlist.some(item => item.id === product.id);
    if (isInWishlist) {
    addToWishlistBtn.innerHTML = '<i class="fas fa-heart me-2"></i>Sevimlilardan olib tashlash';
} else {
    addToWishlistBtn.innerHTML = '<i class="far fa-heart me-2"></i>Sevimlilarga qo\'shish';
}

    // Show modal
    modalInstance.show();
}

    // ======================================================
    // HERO SLIDER
    // ======================================================
    function initializeHeroSlider() {
    const slides = document.querySelectorAll('.hero-slide');
    const dots = document.querySelectorAll('.hero-dot');
    const prevBtn = document.getElementById('hero-prev');
    const nextBtn = document.getElementById('hero-next');

    function showSlide(index) {
    slides.forEach((slide, i) => {
    slide.classList.toggle('active', i === index);
});
    dots.forEach((dot, i) => {
    dot.classList.toggle('active', i === index);
});
    currentSlide = index;
}

    function nextSlide() {
    currentSlide = (currentSlide + 1) % slides.length;
    showSlide(currentSlide);
}

    function prevSlide() {
    currentSlide = (currentSlide - 1 + slides.length) % slides.length;
    showSlide(currentSlide);
}

    // Auto-play
    slideInterval = setInterval(nextSlide, 5000);

    // Event listeners
    nextBtn.addEventListener('click', () => {
    clearInterval(slideInterval);
    nextSlide();
    slideInterval = setInterval(nextSlide, 5000);
});

    prevBtn.addEventListener('click', () => {
    clearInterval(slideInterval);
    prevSlide();
    slideInterval = setInterval(nextSlide, 5000);
});

    dots.forEach((dot, index) => {
    dot.addEventListener('click', () => {
    clearInterval(slideInterval);
    showSlide(index);
    slideInterval = setInterval(nextSlide, 5000);
});
});

    // Pause on hover
    const heroSection = document.querySelector('.hero-section');
    if (heroSection) {
    heroSection.addEventListener('mouseenter', () => clearInterval(slideInterval));
    heroSection.addEventListener('mouseleave', () => {
    slideInterval = setInterval(nextSlide, 5000);
});
}
}

    // ======================================================
    // SCROLL EFFECTS
    // ======================================================
    function initializeScrollEffects() {
    const header = document.getElementById('main-header');
    const backToTop = document.getElementById('back-to-top');

    window.addEventListener('scroll', () => {
    // Header scroll effect
    if (window.scrollY > 100) {
    header.classList.add('scrolled');
    backToTop.classList.add('show');
} else {
    header.classList.remove('scrolled');
    backToTop.classList.remove('show');
}
});

    // Back to top functionality
    backToTop.addEventListener('click', () => {
    window.scrollTo({
    top: 0,
    behavior: 'smooth'
});
});
}

    // ======================================================
    // DROPDOWN FUNCTIONALITY
    // ======================================================
    function initializeDropdowns() {
    const cartToggle = document.getElementById('cart-toggle');
    const cartDropdown = document.getElementById('cart-dropdown');
    const wishlistToggle = document.getElementById('wishlist-toggle');
    const wishlistDropdown = document.getElementById('wishlist-dropdown');

    // Cart dropdown
    cartToggle.addEventListener('click', (e) => {
    e.stopPropagation();
    cartDropdown.classList.toggle('show');
    wishlistDropdown.classList.remove('show');
});

    // Wishlist dropdown
    wishlistToggle.addEventListener('click', (e) => {
    e.stopPropagation();
    wishlistDropdown.classList.toggle('show');
    cartDropdown.classList.remove('show');
});

    // Close dropdowns when clicking outside
    document.addEventListener('click', () => {
    cartDropdown.classList.remove('show');
    wishlistDropdown.classList.remove('show');
});

    // Prevent dropdown from closing when clicking inside
    cartDropdown.addEventListener('click', (e) => e.stopPropagation());
    wishlistDropdown.addEventListener('click', (e) => e.stopPropagation());
}

    // ======================================================
    // AUTH MODAL
    // ======================================================
    function initializeAuthModal() {
    const authButton = document.getElementById('auth-button');
    const authModal = new bootstrap.Modal(document.getElementById('authModal'));
    const authTabs = document.querySelectorAll('.auth-tab');
    const authForms = document.querySelectorAll('.auth-form');

    authButton.addEventListener('click', () => {
    authModal.show();
});

    authTabs.forEach(tab => {
    tab.addEventListener('click', () => {
    const targetTab = tab.getAttribute('data-tab');

    authTabs.forEach(t => t.classList.remove('active'));
    authForms.forEach(f => f.classList.remove('active'));

    tab.classList.add('active');
    document.getElementById(`${targetTab}-form`).classList.add('active');
});
});

    // Handle form submissions
    document.getElementById('login-form').addEventListener('submit', handleLogin);
    document.getElementById('register-form').addEventListener('submit', handleRegister);
}

    async function handleLogin(e) {
    e.preventDefault();
    const formData = new FormData(e.target);

    try {
    const response = await api.post('/api/v1/auth/login', {
    email: formData.get('email'),
    password: formData.get('password')
});

    const { accessToken, refreshToken } = response.data;
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);

    bootstrap.Modal.getInstance(document.getElementById('authModal')).hide();
    showNotification('success', 'Muvaffaqiyat', 'Tizimga muvaffaqiyatli kirdingiz');
} catch (error) {
    showNotification('error', 'Xatolik', 'Login yoki parol noto\'g\'ri');
}
}

    async function handleRegister(e) {
    e.preventDefault();
    const formData = new FormData(e.target);

    const password = formData.get('password');
    const confirmPassword = formData.get('confirmPassword');

    if (password !== confirmPassword) {
    showNotification('error', 'Xatolik', 'Parollar mos kelmaydi');
    return;
}

    try {
    const response = await api.post('/api/v1/auth/register', {
    firstName: formData.get('firstName'),
    lastName: formData.get('lastName'),
    email: formData.get('email'),
    phone: formData.get('phone'),
    password: password,
    confirmPassword: confirmPassword
});

    bootstrap.Modal.getInstance(document.getElementById('authModal')).hide();
    showNotification('success', 'Muvaffaqiyat', 'Ro\'yxatdan muvaffaqiyatli o\'tdingiz. Email orqali tasdiqlang.');
} catch (error) {
    showNotification('error', 'Xatolik', 'Ro\'yxatdan o\'tishda xatolik yuz berdi');
}
}

    // ======================================================
    // FEATURED TABS
    // ======================================================
    function initializeFeaturedTabs() {
    const tabs = document.querySelectorAll('.featured-tab');
    const contents = document.querySelectorAll('.featured-content');

    tabs.forEach(tab => {
    tab.addEventListener('click', () => {
    const targetTab = tab.getAttribute('data-tab');

    tabs.forEach(t => t.classList.remove('active'));
    contents.forEach(c => c.classList.remove('active'));

    tab.classList.add('active');
    document.getElementById(`${targetTab}-products`).classList.add('active');
});
});
}

    // ======================================================
    // NEWSLETTER
    // ======================================================
    function initializeNewsletterForm() {
    const form = document.getElementById('newsletter-form');

    form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = form.querySelector('input[type="email"]').value;

    try {
    // Since there's no newsletter endpoint in the API spec, we'll simulate success
    showNotification('success', 'Muvaffaqiyat', 'Yangiliklar ro\'yxatiga muvaffaqiyatli qo\'shildingiz');
    form.reset();
} catch (error) {
    showNotification('error', 'Xatolik', 'Obuna bo\'lishda xatolik yuz berdi');
}
});
}

    // ======================================================
    // SEARCH FUNCTIONALITY
    // ======================================================
    function initializeSearch() {
    const searchInputs = document.querySelectorAll('.search-input');
    const searchButtons = document.querySelectorAll('.search-button');

    searchInputs.forEach((input, index) => {
    input.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
    performSearch(input.value);
}
});
});

    searchButtons.forEach((button, index) => {
    button.addEventListener('click', () => {
    const input = searchInputs[index];
    performSearch(input.value);
});
});
}

    function performSearch(query) {
    if (query.trim()) {
    window.location.href = `catalog.html?search=${encodeURIComponent(query)}`;
}
}

    // ======================================================
    // RENDER FUNCTIONS
    // ======================================================
    function renderCategories() {
    const categoriesGrid = document.getElementById('categories-grid');
    if (!categoriesGrid) return;

    if (!allCategories || allCategories.length === 0) {
    categoriesGrid.innerHTML = '<div class="col-12 text-center"><p>Kategoriyalar yuklanmoqda...</p></div>';
    return;
}

    const categoriesHTML = allCategories.slice(0, 6).map(category => {
    const categoryImage = category.attachmentId
    ? `${API_BASE_URL}/api/v1/attachment/${category.attachmentId}`
    : '/placeholder.svg?height=250&width=250';

    return `
        <div class="col-lg-2 col-md-4 col-6 mb-4">
            <div class="category-card" onclick="goToCategory(${category.id})">
                <img src="${categoryImage}" alt="${category.name}" class="category-img">
                <div class="category-overlay">
                    <h3 class="category-title">${category.name}</h3>
                    <button class="category-btn">Ko'rish</button>
                </div>
            </div>
        </div>
    `;
}).join('');

    categoriesGrid.innerHTML = categoriesHTML;
}

    function renderCategoryDropdown() {
    const dropdown = document.getElementById('category-dropdown-menu');
    if (!dropdown) return;

    if (!allCategories || allCategories.length === 0) return;

    const categoriesHTML = allCategories.map(category => `
    <li><a class="dropdown-item" href="?category=${category.id}">
        <i class="fas fa-tag me-2"></i>${category.name}
    </a></li>
`).join('');

    dropdown.innerHTML = categoriesHTML + '<li><hr class="dropdown-divider"></li><li><a class="dropdown-item" href="catalog.html"><i class="fas fa-list me-2"></i>Barcha kategoriyalar</a></li>';
}

    function renderFooterCategories() {
    const footerCategories = document.getElementById('footer-categories');
    if (!footerCategories) return;

    if (!allCategories || allCategories.length === 0) return;

    const categoriesHTML = allCategories.slice(0, 5).map(category => `
    <li><a href="?category=${category.id}">${category.name}</a></li>
`).join('');

    footerCategories.innerHTML = categoriesHTML;
}

    function renderDetailedCategories() {
    const grid = document.getElementById('detailed-categories-grid');
    if (!grid) return;

    if (!allCategories || allCategories.length === 0) return;

    const categoriesHTML = allCategories.map(category => {
    const categoryImage = category.attachmentId
    ? `${API_BASE_URL}/api/v1/attachment/${category.attachmentId}`
    : '/placeholder.svg?height=200&width=400';

    return `
        <div class="col-lg-4 col-md-6 mb-4">
            <div class="detailed-category-card" onclick="goToCategory(${category.id})">
                <img src="${categoryImage}" alt="${category.name}" class="detailed-category-img">
                <div class="detailed-category-content">
                    <h3 class="detailed-category-title">${category.name}</h3>
                    <p class="detailed-category-desc">Bu kategoriyada eng sifatli mahsulotlarni topasiz</p>
                    <div class="detailed-category-stats">
                        <span class="category-count">${Math.floor(Math.random() * 100) + 10} mahsulot</span>
                        <div class="category-popularity">
                            <i class="fas fa-star popularity-star"></i>
                            <i class="fas fa-star popularity-star"></i>
                            <i class="fas fa-star popularity-star"></i>
                            <i class="fas fa-star popularity-star"></i>
                            <i class="fas fa-star popularity-star"></i>
                        </div>
                    </div>
                    <button class="btn-outline-custom">Ko'rish</button>
                </div>
            </div>
        </div>
    `;
}).join('');

    grid.innerHTML = categoriesHTML;
}

    function renderFeaturedProducts() {
    if (!allProducts || allProducts.length === 0) return;

    // Render new products
    const newProductsGrid = document.getElementById('new-products-grid');
    if (newProductsGrid) {
    const newProducts = allProducts.slice(0, 8);
    renderProductGrid('new-products-grid', newProducts);
}

    // Render popular products (simulate by shuffling)
    const popularProductsGrid = document.getElementById('popular-products-grid');
    if (popularProductsGrid) {
    const popularProducts = [...allProducts].sort(() => 0.5 - Math.random()).slice(0, 8);
    renderProductGrid('popular-products-grid', popularProducts);
}

    // Render sale products (simulate by taking random products)
    const saleProductsGrid = document.getElementById('sale-products-grid');
    if (saleProductsGrid) {
    const saleProducts = [...allProducts].sort(() => 0.5 - Math.random()).slice(0, 8);
    renderProductGrid('sale-products-grid', saleProducts);
}
}

    function renderProductGrid(gridId, products) {
    const grid = document.getElementById(gridId);
    if (!grid) return;

    const productsHTML = products.map(product => {
    const mainImage = product.attachmentIds && product.attachmentIds.length > 0
    ? `${API_BASE_URL}/api/v1/attachment/${product.attachmentIds[0]}`
    : '/placeholder.svg?height=250&width=250';

    const isInCart = cart.some(item => item.id === product.id);
    const isInWishlist = wishlist.some(item => item.id === product.id);

    // Find category name
    const category = allCategories.find(cat => cat.id === product.categoryId);
    const categoryName = category ? category.name : 'Kategoriya';

    return `
        <div class="col-lg-3 col-md-4 col-6 mb-4">
            <div class="product-card">
                <div class="product-badge new">Yangi</div>
                <div class="product-img-container">
                    <img src="${mainImage}" alt="${product.name}" class="product-img" onclick="openProductModal(${product.id})">
                    <div class="product-actions">
                        <button class="product-action" onclick="openProductModal(${product.id})" title="Tezkor ko'rish">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="product-action ${isInWishlist ? 'active' : ''}" onclick="toggleWishlist(${product.id})" title="Sevimlilar">
                            <i class="fas fa-heart"></i>
                        </button>
                    </div>
                </div>
                <div class="product-content">
                    <div class="product-category">${categoryName}</div>
                    <h3 class="product-title">
                        <a href="#" onclick="openProductModal(${product.id}); return false;">${product.name}</a>
                    </h3>
                    <div class="product-price">
                        <span class="new-price">${formatPrice(product.price)} So'm</span>
                    </div>
                    <div class="product-rating">
                        <i class="fas fa-star rating-star"></i>
                        <i class="fas fa-star rating-star"></i>
                        <i class="fas fa-star rating-star"></i>
                        <i class="fas fa-star rating-star"></i>
                        <i class="fas fa-star rating-star"></i>
                        <span class="rating-count">(${Math.floor(Math.random() * 100) + 1})</span>
                    </div>
                    <button class="add-to-cart ${isInCart ? 'in-cart' : ''}" onclick="toggleCart(${product.id})" ${product.amount === 0 ? 'disabled' : ''}>
                        ${isInCart ? 'Savatdan olib tashlash' : 'Savatga qo\'shish'}
                    </button>
                </div>
            </div>
        </div>
    `;
}).join('');

    grid.innerHTML = productsHTML;
}

    // ======================================================
    // CART & WISHLIST FUNCTIONS
    // ======================================================
    function toggleCart(productId) {
    const product = allProducts.find(p => p.id === productId);
    if (!product || product.amount === 0) return;

    const existingIndex = cart.findIndex(item => item.id === productId);

    if (existingIndex > -1) {
    cart.splice(existingIndex, 1);
    showNotification('info', 'Savatdan olib tashlandi', `"${product.name}" savatdan olib tashlandi`);
} else {
    const mainImage = product.attachmentIds && product.attachmentIds.length > 0
    ? `${API_BASE_URL}/api/v1/attachment/${product.attachmentIds[0]}`
    : '/placeholder.svg?height=100&width=100';

    cart.push({
    id: product.id,
    name: product.name,
    price: product.price,
    image: mainImage,
    quantity: 1,
    maxAmount: product.amount
});
    showNotification('success', 'Savatga qo\'shildi', `"${product.name}" savatga qo'shildi`);
}

    localStorage.setItem('cart', JSON.stringify(cart));
    updateCartBadge();
    updateCartDropdown();

    // Re-render products to update button states
    if (document.getElementById('category-products-grid')) {
    const categoryId = currentCategory ? currentCategory.id : null;
    if (categoryId) {
    loadProductsByCategory(categoryId).then(products => {
    renderProductGrid('category-products-grid', products);
});
}
} else {
    renderFeaturedProducts();
}
}

    function toggleWishlist(productId) {
    const product = allProducts.find(p => p.id === productId);
    if (!product) return;

    const existingIndex = wishlist.findIndex(item => item.id === productId);

    if (existingIndex > -1) {
    wishlist.splice(existingIndex, 1);
    showNotification('info', 'Sevimlilardan olib tashlandi', `"${product.name}" sevimlilardan olib tashlandi`);
} else {
    const mainImage = product.attachmentIds && product.attachmentIds.length > 0
    ? `${API_BASE_URL}/api/v1/attachment/${product.attachmentIds[0]}`
    : '/placeholder.svg?height=100&width=100';

    wishlist.push({
    id: product.id,
    name: product.name,
    price: product.price,
    image: mainImage
});
    showNotification('success', 'Sevimlilarga qo\'shildi', `"${product.name}" sevimlilarga qo'shildi`);
}

    localStorage.setItem('wishlist', JSON.stringify(wishlist));
    updateWishlistBadge();
    updateWishlistDropdown();

    // Re-render products to update button states
    if (document.getElementById('category-products-grid')) {
    const categoryId = currentCategory ? currentCategory.id : null;
    if (categoryId) {
    loadProductsByCategory(categoryId).then(products => {
    renderProductGrid('category-products-grid', products);
});
}
} else {
    renderFeaturedProducts();
}
}

    function updateCartBadge() {
    const badge = document.getElementById('cart-count');
    badge.textContent = cart.length;
}

    function updateWishlistBadge() {
    const badge = document.getElementById('wishlist-count');
    badge.textContent = wishlist.length;
}

    function updateCartDropdown() {
    const cartItems = document.getElementById('cart-items');
    const cartFooter = document.getElementById('cart-footer');
    const cartTotal = document.getElementById('cart-total');

    if (cart.length === 0) {
    cartItems.innerHTML = `
        <div class="empty-state">
            <i class="fas fa-shopping-cart"></i>
            <p>Savat bo'sh</p>
        </div>
    `;
    cartFooter.style.display = 'none';
} else {
    const itemsHTML = cart.map(item => `
        <div class="dropdown-item-custom">
            <img src="${item.image}" alt="${item.name}" class="item-image">
            <div class="item-details">
                <div class="item-name">${item.name}</div>
                <div class="item-price">${formatPrice(item.price)} So'm</div>
                <div class="item-quantity">Miqdor: ${item.quantity}</div>
            </div>
            <button class="item-remove" onclick="removeFromCart(${item.id})">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `).join('');

    cartItems.innerHTML = itemsHTML;

    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    cartTotal.textContent = formatPrice(total) + ' So\'m';
    cartFooter.style.display = 'block';
}
}

    function updateWishlistDropdown() {
    const wishlistItems = document.getElementById('wishlist-items');
    const wishlistFooter = document.getElementById('wishlist-footer');

    if (wishlist.length === 0) {
    wishlistItems.innerHTML = `
        <div class="empty-state">
            <i class="fas fa-heart"></i>
            <p>Sevimlilar ro'yxati bo'sh</p>
        </div>
    `;
    wishlistFooter.style.display = 'none';
} else {
    const itemsHTML = wishlist.map(item => `
        <div class="dropdown-item-custom">
            <img src="${item.image}" alt="${item.name}" class="item-image">
            <div class="item-details">
                <div class="item-name">${item.name}</div>
                <div class="item-price">${formatPrice(item.price)} So'm</div>
            </div>
            <button class="item-remove" onclick="removeFromWishlist(${item.id})">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `).join('');

    wishlistItems.innerHTML = itemsHTML;
    wishlistFooter.style.display = 'block';
}
}

    function removeFromCart(productId) {
    cart = cart.filter(item => item.id !== productId);
    localStorage.setItem('cart', JSON.stringify(cart));
    updateCartBadge();
    updateCartDropdown();

    // Re-render products to update button states
    if (document.getElementById('category-products-grid')) {
    const categoryId = currentCategory ? currentCategory.id : null;
    if (categoryId) {
    loadProductsByCategory(categoryId).then(products => {
    renderProductGrid('category-products-grid', products);
});
}
} else {
    renderFeaturedProducts();
}
}

    function removeFromWishlist(productId) {
    wishlist = wishlist.filter(item => item.id !== productId);
    localStorage.setItem('wishlist', JSON.stringify(wishlist));
    updateWishlistBadge();
    updateWishlistDropdown();

    // Re-render products to update button states
    if (document.getElementById('category-products-grid')) {
    const categoryId = currentCategory ? currentCategory.id : null;
    if (categoryId) {
    loadProductsByCategory(categoryId).then(products => {
    renderProductGrid('category-products-grid', products);
});
}
} else {
    renderFeaturedProducts();
}
}

    function clearCart() {
    cart = [];
    localStorage.setItem('cart', JSON.stringify(cart));
    updateCartBadge();
    updateCartDropdown();

    // Re-render products to update button states
    if (document.getElementById('category-products-grid')) {
    const categoryId = currentCategory ? currentCategory.id : null;
    if (categoryId) {
    loadProductsByCategory(categoryId).then(products => {
    renderProductGrid('category-products-grid', products);
});
}
} else {
    renderFeaturedProducts();
}

    showNotification('info', 'Savat tozalandi', 'Barcha mahsulotlar savatdan olib tashlandi');
}

    function clearWishlist() {
    wishlist = [];
    localStorage.setItem('wishlist', JSON.stringify(wishlist));
    updateWishlistBadge();
    updateWishlistDropdown();

    // Re-render products to update button states
    if (document.getElementById('category-products-grid')) {
    const categoryId = currentCategory ? currentCategory.id : null;
    if (categoryId) {
    loadProductsByCategory(categoryId).then(products => {
    renderProductGrid('category-products-grid', products);
});
}
} else {
    renderFeaturedProducts();
}

    showNotification('info', 'Sevimlilar tozalandi', 'Barcha mahsulotlar sevimlilardan olib tashlandi');
}

    // ======================================================
    // UTILITY FUNCTIONS
    // ======================================================
    function formatPrice(price) {
    return new Intl.NumberFormat('uz-UZ').format(price);
}

    function goToCategory(categoryId) {
    window.location.href = `?category=${categoryId}`;
}

    function showNotification(type, title, message) {
    const notification = document.createElement('div');
    notification.className = `alert alert-${type === 'success' ? 'success' : type === 'error' ? 'danger' : 'info'} alert-dismissible fade show position-fixed`;
    notification.style.cssText = 'top: 20px; right: 20px; z-index: 9999; max-width: 300px;';

    notification.innerHTML = `
    <strong>${title}</strong> ${message}
    <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
`;

    document.body.appendChild(notification);

    setTimeout(() => {
    if (notification.parentNode) {
    notification.remove();
}
}, 5000);
}

    // Make functions available globally
    window.goToCategory = goToCategory;
    window.openProductModal = openProductModal;
    window.toggleCart = toggleCart;
    window.toggleWishlist = toggleWishlist;
    window.removeFromCart = removeFromCart;
    window.removeFromWishlist = removeFromWishlist;
    window.clearCart = clearCart;
    window.clearWishlist = clearWishlist;

    // Initialize dropdowns on page load
    document.addEventListener('DOMContentLoaded', function() {
    updateCartDropdown();
    updateWishlistDropdown();
});