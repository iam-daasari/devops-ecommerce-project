const API = '/api/products';

// Load products when page opens
window.onload = loadProducts;

// ─────────────────────────────────────
// LOAD ALL PRODUCTS FROM API
// ─────────────────────────────────────
async function loadProducts() {
    try {
        const res = await fetch(API);
        const products = await res.json();
        renderTable(products);
        updateStats(products);
    } catch (err) {
        console.error('Error loading products:', err);
    }
}

// ─────────────────────────────────────
// RENDER PRODUCTS TABLE
// ─────────────────────────────────────
function renderTable(products) {
    const container = document.getElementById('table-container');
    document.getElementById('product-count').textContent =
        products.length + ' Products';

    if (products.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="icon">🛍️</div>
                <div>No products yet. Add your first product!</div>
            </div>`;
        return;
    }

    let rows = products.map(p => {
        const stockClass =
            p.stock > 20 ? 'stock-high' :
            p.stock > 0  ? 'stock-low'  : 'stock-out';

        const stockLabel =
            p.stock > 20 ? 'In Stock'    :
            p.stock > 0  ? 'Low Stock'   : 'Out of Stock';

        return `
            <tr>
                <td>
                    <span class="product-name">${p.name}</span>
                </td>
                <td>${p.description}</td>
                <td>
                    <span class="price-tag">
                        ₹${p.price.toLocaleString()}
                    </span>
                </td>
                <td>
                    <span class="stock-badge ${stockClass}">
                        ${p.stock} — ${stockLabel}
                    </span>
                </td>
                <td>
                    <button class="delete-btn"
                        onclick="deleteProduct(${p.id})">
                        Delete
                    </button>
                </td>
            </tr>`;
    }).join('');

    container.innerHTML = `
        <table>
            <thead>
                <tr>
                    <th>Product</th>
                    <th>Description</th>
                    <th>Price</th>
                    <th>Stock</th>
                    <th>Action</th>
                </tr>
            </thead>
            <tbody>${rows}</tbody>
        </table>`;
}

// ─────────────────────────────────────
// UPDATE STATS CARDS
// ─────────────────────────────────────
function updateStats(products) {
    const total      = products.length;
    const inStock    = products.filter(p => p.stock > 0).length;
    const totalValue = products.reduce(
        (sum, p) => sum + (p.price * p.stock), 0
    );
    const totalStock = products.reduce(
        (s, p) => s + p.stock, 0
    );
    const avgPrice   = totalStock > 0
        ? totalValue / totalStock : 0;

    document.getElementById('total-products').textContent = total;
    document.getElementById('in-stock').textContent       = inStock;
    document.getElementById('total-value').textContent    =
        '₹' + Math.round(totalValue).toLocaleString();
    document.getElementById('avg-price').textContent      =
        '₹' + Math.round(avgPrice).toLocaleString();
}

// ─────────────────────────────────────
// ADD NEW PRODUCT
// ─────────────────────────────────────
async function addProduct() {
    const name        = document.getElementById('name').value.trim();
    const description = document.getElementById('description').value.trim();
    const price       = document.getElementById('price').value;
    const stock       = document.getElementById('stock').value;

    // Validation
    if (!name || !description || !price || !stock) {
        showAlert('Please fill all fields!', 'error');
        return;
    }

    const btn = document.querySelector('.submit-btn');
    btn.disabled    = true;
    btn.textContent = 'Adding...';

    try {
        const res = await fetch(API, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name,
                description,
                price: parseFloat(price),
                stock: parseInt(stock)
            })
        });

        if (res.ok) {
            showAlert('Product added successfully!', 'success');
            // Clear form
            document.getElementById('name').value        = '';
            document.getElementById('description').value = '';
            document.getElementById('price').value       = '';
            document.getElementById('stock').value       = '';
            // Reload table
            loadProducts();
        } else {
            showAlert('Error adding product!', 'error');
        }
    } catch (err) {
        showAlert('Connection error!', 'error');
    }

    btn.disabled    = false;
    btn.textContent = 'Add Product to Inventory';
}

// ─────────────────────────────────────
// DELETE PRODUCT
// ─────────────────────────────────────
async function deleteProduct(id) {
    if (!confirm('Are you sure you want to delete this product?')) {
        return;
    }
    try {
        await fetch(API + '/' + id, { method: 'DELETE' });
        loadProducts();
    } catch (err) {
        showAlert('Error deleting product!', 'error');
    }
}

// ─────────────────────────────────────
// SHOW ALERT MESSAGE
// ─────────────────────────────────────
function showAlert(message, type) {
    const alert     = document.getElementById('alert');
    alert.textContent = message;
    alert.className   = 'alert ' + type;
    setTimeout(() => {
        alert.className = 'alert';
    }, 3000);
}
