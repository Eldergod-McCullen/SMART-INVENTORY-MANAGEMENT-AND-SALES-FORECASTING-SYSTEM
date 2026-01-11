console.log('Inventory.js loaded');

// Global variables
let currentPage = 1;
const pageSize = 25;
let allItems = [];
let filteredItems = [];

// CSRF Token helper
function getCSRFToken() {
    const cookies = document.cookie.split(';');
    for (let cookie of cookies) {
        const [name, value] = cookie.trim().split('=');
        if (name === 'csrftoken') return value;
    }
    return null;
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded, initializing inventory...');
    loadInventoryItems();
    
    // Search functionality
    document.getElementById('searchItems')?.addEventListener('click', searchItems);
    document.getElementById('clearSearch')?.addEventListener('click', clearSearch);
});

// Load all inventory items
async function loadInventoryItems() {
    showProcessing();
    try {
        const response = await fetch('/api/inventory/all/', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCSRFToken()
            },
            credentials: 'same-origin'
        });
        
        const result = await response.json();
        if (result.success) {
            allItems = result.data;
            filteredItems = [...result.data];
            renderItemTable();
        } else {
            alert('Error loading inventory: ' + result.message);
        }
    } catch (error) {
        console.error('Error loading inventory:', error);
        alert('Failed to load inventory items');
    } finally {
        hideProcessing();
    }
}

// Render inventory table
function renderItemTable() {
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const pageItems = filteredItems.slice(startIndex, endIndex);
    const tableBody = document.getElementById('tableBody');
    
    tableBody.innerHTML = '';
    
    if (pageItems.length === 0) {
        document.getElementById('tableContainer').style.display = 'none';
        document.getElementById('noData').style.display = 'block';
        document.getElementById('pagination').innerHTML = '';
        return;
    }
    
    document.getElementById('tableContainer').style.display = 'block';
    document.getElementById('noData').style.display = 'none';
    
    pageItems.forEach((item, index) => {
        const row = document.createElement('tr');
        
        // Add color coding for low stock
        if (item.reorderRequired === 'YES') {
            row.classList.add('reorder-needed');
        } else if (item.remainingQty < item.reorderLevel * 1.5) {
            row.classList.add('low-stock');
        }
        
        row.innerHTML = `
            <td>${item.id}</td>
            <td>${item.type}</td>
            <td>${item.category}</td>
            <td>${item.subcategory}</td>
            <td>${item.name}</td>
            <td>${item.purchasedQty}</td>
            <td>${item.soldQty}</td>
            <td>${item.remainingQty}</td>
            <td class="col-reorder-level">${item.reorderLevel}</td>
            <td>
                <span class="reorder-flag ${item.reorderRequired === 'YES' ? 'reorder-yes' : 'reorder-no'}">
                    ${item.reorderRequired}
                </span>
            </td>
            <td class="action-cell">
                <button class="action-btn edit-btn" data-item-id="${item.id}">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="action-btn delete-btn" data-item-id="${item.id}">
                    <i class="fas fa-trash"></i>
                </button>
                <button class="action-btn update-btn" style="display:none;" data-item-id="${item.id}">
                    <i class="fas fa-save"></i>
                </button>
                <button class="action-btn cancel-btn" style="display:none;" data-item-id="${item.id}">
                    <i class="fas fa-times"></i>
                </button>
            </td>
        `;
        
        // Event listeners
        row.querySelector('.edit-btn').addEventListener('click', function() {
            editItem(this);
        });
        row.querySelector('.delete-btn').addEventListener('click', function() {
            deleteItem(this.getAttribute('data-item-id'));
        });
        row.querySelector('.update-btn').addEventListener('click', function() {
            updateItem(this);
        });
        row.querySelector('.cancel-btn').addEventListener('click', function() {
            cancelEdit(this);
        });
        
        tableBody.appendChild(row);
    });
    
    renderPagination();
}

// Edit reorder level
function editItem(button) {
    const row = button.closest('tr');
    const reorderCell = row.querySelector('.col-reorder-level');
    const originalValue = reorderCell.textContent;
    
    // Store original value
    row.setAttribute('data-original-reorder', originalValue);
    
    // Make editable
    reorderCell.innerHTML = `<input type="number" class="editable" min="0" value="${originalValue}">`;
    
    // Show/hide buttons
    const actionCell = row.querySelector('.action-cell');
    actionCell.querySelector('.edit-btn').style.display = 'none';
    actionCell.querySelector('.delete-btn').style.display = 'none';
    actionCell.querySelector('.update-btn').style.display = 'inline-block';
    actionCell.querySelector('.cancel-btn').style.display = 'inline-block';
}

// Cancel edit
function cancelEdit(button) {
    loadInventoryItems(); // Reload to reset
}

// Update reorder level
async function updateItem(button) {
    const row = button.closest('tr');
    const itemId = button.getAttribute('data-item-id');
    const reorderCell = row.querySelector('.col-reorder-level');
    const newReorderLevel = parseInt(reorderCell.querySelector('input').value) || 0;
    
    if (newReorderLevel < 0) {
        alert('Reorder level must be non-negative');
        return;
    }
    
    showProcessing();
    try {
        const response = await fetch('/api/inventory/update-reorder/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCSRFToken()
            },
            credentials: 'same-origin',
            body: JSON.stringify({
                item_id: itemId,
                reorder_level: newReorderLevel
            })
        });
        
        const result = await response.json();
        if (result.success) {
            alert('Reorder level updated successfully');
            await loadInventoryItems();
        } else {
            alert('Error: ' + result.message);
        }
    } catch (error) {
        console.error('Error updating item:', error);
        alert('Failed to update reorder level');
    } finally {
        hideProcessing();
    }
}

// Delete item
async function deleteItem(itemId) {
    if (!confirm('Are you sure you want to delete this inventory item?')) {
        return;
    }
    
    showProcessing();
    try {
        const response = await fetch('/api/inventory/delete/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCSRFToken()
            },
            credentials: 'same-origin',
            body: JSON.stringify({ item_id: itemId })
        });
        
        const result = await response.json();
        if (result.success) {
            alert('Item deleted successfully');
            await loadInventoryItems();
        } else {
            alert('Error: ' + result.message);
        }
    } catch (error) {
        console.error('Error deleting item:', error);
        alert('Failed to delete item');
    } finally {
        hideProcessing();
    }
}

// Search functionality
function searchItems() {
    const criteria = document.getElementById('searchCriteria').value;
    const query = document.getElementById('searchInput').value.toLowerCase().trim();
    
    if (criteria === 'Reorder Required') {
        filteredItems = allItems.filter(item => item.reorderRequired === 'YES');
    } else if (!query) {
        filteredItems = [...allItems];
    } else {
        filteredItems = allItems.filter(item => {
            if (criteria === 'all') {
                return (
                    item.type.toLowerCase().includes(query) ||
                    item.category.toLowerCase().includes(query) ||
                    item.subcategory.toLowerCase().includes(query) ||
                    item.name.toLowerCase().includes(query)
                );
            } else if (criteria === 'Item Type') {
                return item.type.toLowerCase().includes(query);
            } else if (criteria === 'Item Category') {
                return item.category.toLowerCase().includes(query);
            } else if (criteria === 'Item Subcategory') {
                return item.subcategory.toLowerCase().includes(query);
            } else if (criteria === 'Item Name') {
                return item.name.toLowerCase().includes(query);
            }
            return true;
        });
    }
    
    currentPage = 1;
    renderItemTable();
    
    if (filteredItems.length === 0) {
        alert('No matching items found');
    }
}

function clearSearch() {
    document.getElementById('searchInput').value = '';
    document.getElementById('searchCriteria').value = 'all';
    filteredItems = [...allItems];
    currentPage = 1;
    renderItemTable();
}

// Pagination
function renderPagination() {
    const totalPages = Math.ceil(filteredItems.length / pageSize);
    const paginationDiv = document.getElementById('pagination');
    paginationDiv.innerHTML = '';
    
    if (totalPages <= 1) return;
    
    // Previous button
    const prevBtn = document.createElement('button');
    prevBtn.className = 'page-btn';
    prevBtn.innerHTML = '<i class="fas fa-chevron-left"></i>';
    prevBtn.disabled = currentPage === 1;
    prevBtn.onclick = () => {
        if (currentPage > 1) {
            currentPage--;
            renderItemTable();
        }
    };
    paginationDiv.appendChild(prevBtn);
    
    // Page buttons
    for (let i = 1; i <= totalPages; i++) {
        const pageBtn = document.createElement('button');
        pageBtn.className = `page-btn ${i === currentPage ? 'active' : ''}`;
        pageBtn.textContent = i;
        pageBtn.onclick = () => {
            currentPage = i;
            renderItemTable();
        };
        paginationDiv.appendChild(pageBtn);
    }
    
    // Next button
    const nextBtn = document.createElement('button');
    nextBtn.className = 'page-btn';
    nextBtn.innerHTML = '<i class="fas fa-chevron-right"></i>';
    nextBtn.disabled = currentPage === totalPages;
    nextBtn.onclick = () => {
        if (currentPage < totalPages) {
            currentPage++;
            renderItemTable();
        }
    };
    paginationDiv.appendChild(nextBtn);
}

// Utility functions
function showProcessing() {
    document.getElementById('processingOverlay').style.display = 'flex';
}

function hideProcessing() {
    document.getElementById('processingOverlay').style.display = 'none';
}