document.addEventListener('DOMContentLoaded', () => {
    if (typeof AOS !== 'undefined') {
        AOS.init({ duration: 1000, once: true });
    }

    const searchInput = document.getElementById('searchInput');
    const searchButton = document.querySelector('.search-box button');
    const cartCount = document.getElementById('cartCount');
    const cartIcon = document.querySelector('.cart-icon');
    const productCards = document.querySelectorAll('.product-card');
    const addButtons = document.querySelectorAll('.add-to-cart');

    const cartItems = loadCart();
    let orderConfirmed = false;
    const cartOverlay = createCartOverlay();
    updateCartCount();

    const currentCategory = getCategoryFromUrl();
    const currentSearch = getSearchFromUrl();

    function searchProducts() {
        if (!searchInput) return;
        const val = searchInput.value.trim().toLowerCase();
        if (productCards.length === 0 && val) {
            window.location.href = `stoka.html?search=${encodeURIComponent(val)}`;
            return;
        }

        productCards.forEach(card => {
            const title = card.querySelector('h3')?.innerText.toLowerCase() || '';
            const matchesTitle = !val || title.includes(val);
            const matchesCategory = !currentCategory || currentCategory === 'всички' || card.getAttribute('data-category') === currentCategory;
            card.style.display = matchesTitle && matchesCategory ? 'block' : 'none';
        });
        updateNoResults();
    }

    function updateNoResults() {
        const productsGrid = document.querySelector('.products-grid');
        if (!productsGrid) return;
        const anyVisible = Array.from(productCards).some(card => card.style.display !== 'none');
        let note = productsGrid.querySelector('.no-results');
        if (!anyVisible) {
            if (!note) {
                note = document.createElement('div');
                note.className = 'no-results';
                note.innerText = 'Търсеният продукт отсъства по уважителни причини. Май някой е взел последния точно преди теб 😄';
                note.setAttribute('role', 'status');
                note.setAttribute('aria-live', 'polite');
                productsGrid.appendChild(note);
            }
        } else {
            if (note) note.remove();
        }
    }

    if (searchInput) {
        searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                searchProducts();
            }
        });
    }

    if (searchButton) {
        searchButton.addEventListener('click', (e) => {
            e.preventDefault();
            searchProducts();
        });
    }

    if (cartIcon) {
        cartIcon.addEventListener('click', (event) => {
            event.preventDefault();
            renderCartOverlay();
            toggleCartOverlay();
        });
    }

    // --- 2. КОЛИЧКА ---
    addButtons.forEach(btn => {
        const card = btn.closest('.product-card');
        if (!card) return;

        let quantityInput = card.querySelector('.quantity-input');
        if (!quantityInput) {
            quantityInput = document.createElement('input');
            quantityInput.type = 'number';
            quantityInput.min = '1';
            quantityInput.value = '1';
            quantityInput.className = 'quantity-input';
            quantityInput.placeholder = 'Брой';
            quantityInput.setAttribute('aria-label', 'Количество');
            btn.parentNode.insertBefore(quantityInput, btn);
        }

        quantityInput.addEventListener('input', () => {
            const value = parseInt(quantityInput.value, 10);
            if (Number.isNaN(value) || value < 1) {
                quantityInput.value = '1';
            }
        });

        btn.addEventListener('click', () => {
            const quantity = Math.max(1, parseInt(quantityInput.value, 10) || 1);
            const productName = card.querySelector('h3').innerText.trim();
            const productPrice = parseFloat(card.querySelector('.price').innerText.replace(/[^\d.,]/g, '').replace(',', '.')) || 0;
            const productImage = card.querySelector('img')?.src || '';

            if (!cartItems[productName]) {
                cartItems[productName] = { name: productName, quantity: 0, price: productPrice, image: productImage };
            } else if (!cartItems[productName].image) {
                cartItems[productName].image = productImage;
            }
            cartItems[productName].quantity += quantity;
            saveCart(cartItems);
            updateCartCount();
            renderCartOverlay();

            if (cartCount) {
                cartCount.innerText = Object.values(cartItems).reduce((sum, item) => sum + item.quantity, 0);
            }

            // Визуална обратна връзка
            const originalText = btn.innerText;
            btn.innerText = `Добавено (${quantity})`;
            btn.style.background = "#1b5e20";
            
            setTimeout(() => {
                btn.innerText = originalText;
                btn.style.background = "hsl(123, 46%, 34%)";
            }, 800);
        });
    });

    const initialCategory = getCategoryFromUrl();
    if (searchInput && currentSearch) {
        searchInput.value = currentSearch;
    }

    if (initialCategory) {
        filterCategory(initialCategory);
    }
    searchProducts();

    function loadCart() {
        try {
            const saved = localStorage.getItem('visVerdeCart');
            return saved ? JSON.parse(saved) : {};
        } catch (error) {
            return {};
        }
    }

    function saveCart(items) {
        try {
            localStorage.setItem('visVerdeCart', JSON.stringify(items));
        } catch (error) {
            console.warn('Не може да се запази количката:', error);
        }
    }

    function updateCartCount() {
        const total = Object.values(cartItems).reduce((sum, item) => sum + item.quantity, 0);
        if (cartCount) {
            cartCount.innerText = total;
        }
    }

    function formatPrice(value) {
        return `${value.toFixed(2)} лв`;
    }

    function createCartOverlay() {
        const overlay = document.createElement('div');
        overlay.className = 'cart-overlay';
        overlay.innerHTML = `
            <div class="cart-panel">
                <div class="cart-panel-header">
                    <h2>Вашата бъдеща радост</h2>
                    <button type="button" class="close-cart" aria-label="Затвори количката">×</button>
                </div>
                <div class="cart-panel-body"></div>
                <div class="cart-panel-footer"></div>
            </div>
        `;
        overlay.addEventListener('click', event => {
            if (event.target === overlay) {
                hideCartOverlay();
            }
        });
        document.body.appendChild(overlay);
        overlay.querySelector('.close-cart').addEventListener('click', hideCartOverlay);
        return overlay;
    }

    function renderCartOverlay() {
        const body = cartOverlay.querySelector('.cart-panel-body');
        const footer = cartOverlay.querySelector('.cart-panel-footer');
        body.innerHTML = '';
        footer.innerHTML = '';

        const items = Object.values(cartItems);
        if (items.length === 0) {
            body.innerHTML = '<div class="cart-empty">Количката е празна.</div>';
            return;
        }

        items.forEach(item => {
            const itemImage = item.image || '/photos/Logo.png';
            const itemRow = document.createElement('div');
            itemRow.className = 'cart-item';
            itemRow.innerHTML = `
                <div class="cart-item-left">
                    <img src="${itemImage}" alt="${item.name}">
                </div>
                <div class="cart-item-center">
                    <h4>${item.name}</h4>
                    <p>${formatPrice(item.price)} за бр.</p>
                    <div class="cart-item-actions">
                        <button class="cart-qty-btn decrease" data-product="${item.name}">-</button>
                        <span class="cart-item-qty">${item.quantity}</span>
                        <button class="cart-qty-btn increase" data-product="${item.name}">+</button>
                    </div>
                </div>
                <div class="cart-item-right">
                    <span class="cart-item-total">${formatPrice(item.price * item.quantity)}</span>
                    <button class="cart-remove-btn" data-product="${item.name}">Изтрий</button>
                </div>
            `;
            body.appendChild(itemRow);
        });

        body.querySelectorAll('.cart-qty-btn').forEach(button => {
            button.addEventListener('click', () => {
                const name = button.dataset.product;
                const delta = button.classList.contains('increase') ? 1 : -1;
                const item = cartItems[name];
                if (!item) return;

                item.quantity = Math.max(1, item.quantity + delta);
                if (item.quantity === 0) {
                    delete cartItems[name];
                }
                saveCart(cartItems);
                updateCartCount();
                renderCartOverlay();
            });
        });

        body.querySelectorAll('.cart-remove-btn').forEach(button => {
            button.addEventListener('click', () => {
                const name = button.dataset.product;
                delete cartItems[name];
                saveCart(cartItems);
                updateCartCount();
                renderCartOverlay();
            });
        });

        const total = items.reduce((sum, item) => sum + item.quantity * item.price, 0);
        footer.innerHTML = `
            <div class="cart-footer-summary">
                <strong>Общо:</strong>
                <span>${formatPrice(total)}</span>
            </div>
            <button type="button" class="cart-confirm-btn">Потвърди поръчката</button>
            <div class="cart-confirmation-message" aria-live="polite"></div>
        `;

        const confirmButton = footer.querySelector('.cart-confirm-btn');
        const confirmationMessage = footer.querySelector('.cart-confirmation-message');
        if (confirmButton && confirmationMessage) {
            confirmButton.addEventListener('click', () => {
                confirmationMessage.innerText = 'Поръчката Ви е потвърдена. Получавате бонус - пакет щастие! 😊';
                confirmationMessage.classList.add('visible');
                orderConfirmed = true;
            });
        }
    }

    function toggleCartOverlay() {
        cartOverlay.classList.toggle('visible');
    }

    function hideCartOverlay() {
        cartOverlay.classList.remove('visible');
        if (orderConfirmed) {
            Object.keys(cartItems).forEach(key => delete cartItems[key]);
            saveCart(cartItems);
            updateCartCount();
            orderConfirmed = false;
        }
    }
});

function getCategoryFromUrl() {
    const params = new URLSearchParams(window.location.search);
    const category = params.get('category');
    return category ? category.toLowerCase() : null;
}

function getSearchFromUrl() {
    const params = new URLSearchParams(window.location.search);
    const search = params.get('search');
    return search ? search.trim() : null;
}

// --- 3. ФИЛТЪР КАТЕГОРИИ (Глобална функция) ---
function filterCategory(cat) {
    const productCards = document.querySelectorAll('.product-card');

    productCards.forEach(card => {
        if (cat === 'всички' || card.getAttribute('data-category') === cat) {
            card.style.display = "block";
        } else {
            card.style.display = "none";
        }
    });
}