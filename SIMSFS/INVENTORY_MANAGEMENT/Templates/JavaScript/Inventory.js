/* ============================================================
   INVENTORY.JS
   Static JavaScript for the Inventory module.
   Called by the partial template Inventory.html via:
       <script src="{% static 'js/Inventory.js' %}"></script>
       <script>initInventory();</script>

   CHANGES FROM ORIGINAL:
   1. Removed document.addEventListener('DOMContentLoaded', ...)
      entirely. All setup code now lives inside initInventory()
      which is called directly by the partial template.

   2. Renamed global variables with inv prefix to prevent
      collision with the same names in other modules sharing
      the same global scope through Index.html:
        currentPage  → invCurrentPage
        allItems     → invAllItems
        filteredItems→ invFiltered
        itemToDelete → invItemToDelete

   3. Renamed getCSRFToken() → invGetCSRFToken() to avoid
      collision with the same function in other modules.

   4. Renamed showProcessing() → invShowProcessing() and
      hideProcessing() → invHideProcessing() for same reason.

   5. The searchCriteria change listener and window.onclick
      were moved inside initInventory() so they are attached
      after the DOM is injected, not before.

   6. window.onclick replaced with window.addEventListener
      to avoid overwriting any existing onclick handler set
      by other modules already loaded in Index.html.
   ============================================================ */

console.log('Inventory.js loaded');

/* ---- Global State ---- */
let invCurrentPage  = 1;
const invPageSize   = 25;
let invAllItems     = [];
let invFiltered     = [];
let invItemToDelete = null;


/* ---- CSRF Helper ---- */
function invGetCSRFToken() {
    const metaTag = document.querySelector('meta[name="csrf-token"]');
    if (metaTag) return metaTag.getAttribute('content');

    const cookies = document.cookie.split(';');
    for (let cookie of cookies) {
        const [name, value] = cookie.trim().split('=');
        if (name === 'csrftoken') return decodeURIComponent(value);
    }
    return null;
}


/* ============================================================
   ENTRY POINT — called directly by the partial template
   ============================================================ */
function initInventory() {
    console.log('✅ Inventory module initialised');

    /* Load data */
    invLoadItems();

    /* Search criteria helper text */
    const criteriaSelect = document.getElementById('searchCriteria');
    if (criteriaSelect) {
        criteriaSelect.addEventListener('change', function () {
            const helper = document.getElementById('searchHelper');
            if (helper) {
                helper.style.display = (this.value === 'Reorder Required') ? 'inline' : 'none';
            }
        });
    }

    /* Close delete modal when clicking outside it */
    window.addEventListener('click', function (event) {
        const modal = document.getElementById('deleteConfirmModal');
        if (modal && event.target === modal) {
            invCloseDeleteModal();
            invItemToDelete = null;
        }
    });
}


/* ============================================================
   DATA LOADING
   ============================================================ */
async function invLoadItems() {
    invShowProcessing();
    try {
        const res    = await fetch('/api/inventory/all/', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': invGetCSRFToken()
            },
            credentials: 'same-origin'
        });
        const result = await res.json();
        if (result.success) {
            invAllItems     = result.data;
            invFiltered     = [...result.data];
            invCurrentPage  = 1;
            invRenderTable();
        } else {
            alert('Error loading inventory: ' + result.message);
        }
    } catch (err) {
        console.error('Error loading inventory:', err);
        alert('Failed to load inventory items. Please try again.');
    } finally {
        invHideProcessing();
    }
}


/* ============================================================
   TABLE RENDERING
   ============================================================ */
function invRenderTable() {
    const start     = (invCurrentPage - 1) * invPageSize;
    const pageItems = invFiltered.slice(start, start + invPageSize);
    const tbody     = document.getElementById('tableBody');

    tbody.innerHTML = '';

    if (pageItems.length === 0) {
        document.getElementById('tableContainer').style.display = 'none';
        document.getElementById('noData').style.display         = 'block';
        document.getElementById('pagination').innerHTML         = '';
        return;
    }

    document.getElementById('tableContainer').style.display = 'block';
    document.getElementById('noData').style.display         = 'none';

    pageItems.forEach(item => {
        const row = document.createElement('tr');

        /* Row colour coding */
        if (item.reorderRequired === 'YES') {
            row.classList.add('reorder-needed');
        } else if (item.remainingQty < item.reorderLevel + 2) {
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
                <button class="action-btn edit-btn"   data-item-id="${item.id}"><i class="fas fa-edit"></i></button>
                <button class="action-btn delete-btn" data-item-id="${item.id}"
                        data-item-name="${item.name}" data-item-qty="${item.remainingQty}">
                    <i class="fas fa-trash"></i>
                </button>
                <button class="action-btn update-btn" data-item-id="${item.id}" style="display:none;"><i class="fas fa-save"></i></button>
                <button class="action-btn cancel-btn" data-item-id="${item.id}" style="display:none;"><i class="fas fa-times"></i></button>
            </td>
        `;

        row.querySelector('.edit-btn')  .addEventListener('click', function () { invEditItem(this); });
        row.querySelector('.delete-btn').addEventListener('click', function () { invOpenDeleteModal(this); });
        row.querySelector('.update-btn').addEventListener('click', function () { invUpdateItem(this); });
        row.querySelector('.cancel-btn').addEventListener('click', function () { invCancelEdit(this); });

        tbody.appendChild(row);
    });

    invRenderPagination();
}


/* ============================================================
   PAGINATION
   ============================================================ */
function invRenderPagination() {
    const total  = Math.ceil(invFiltered.length / invPageSize);
    const pagDiv = document.getElementById('pagination');
    pagDiv.innerHTML = '';

    if (total <= 1) return;

    const prev     = document.createElement('button');
    prev.className = 'page-btn';
    prev.innerHTML = '<i class="fas fa-chevron-left"></i>';
    prev.disabled  = invCurrentPage === 1;
    prev.onclick   = () => { if (invCurrentPage > 1) { invCurrentPage--; invRenderTable(); } };
    pagDiv.appendChild(prev);

    for (let i = 1; i <= total; i++) {
        const btn       = document.createElement('button');
        btn.className   = `page-btn ${i === invCurrentPage ? 'active' : ''}`;
        btn.textContent = i;
        btn.onclick     = () => { invCurrentPage = i; invRenderTable(); };
        pagDiv.appendChild(btn);
    }

    const next     = document.createElement('button');
    next.className = 'page-btn';
    next.innerHTML = '<i class="fas fa-chevron-right"></i>';
    next.disabled  = invCurrentPage === total;
    next.onclick   = () => { if (invCurrentPage < total) { invCurrentPage++; invRenderTable(); } };
    pagDiv.appendChild(next);
}


/* ============================================================
   INLINE EDIT — Reorder Level only
   ============================================================ */
function invEditItem(button) {
    const row         = button.closest('tr');
    const reorderCell = row.querySelector('.col-reorder-level');
    const original    = reorderCell.textContent.trim();

    row.setAttribute('data-orig-reorder', original);
    reorderCell.innerHTML = `<input type="number" class="editable" min="0" value="${original}">`;

    const ac = row.querySelector('.action-cell');
    ac.querySelector('.edit-btn')  .style.display = 'none';
    ac.querySelector('.delete-btn').style.display = 'none';
    ac.querySelector('.update-btn').style.display = 'inline-block';
    ac.querySelector('.cancel-btn').style.display = 'inline-block';
}

function invCancelEdit() {
    /* Reload to cleanly reset the row back to its saved state */
    invLoadItems();
}

async function invUpdateItem(button) {
    const row            = button.closest('tr');
    const itemId         = button.getAttribute('data-item-id');
    const reorderCell    = row.querySelector('.col-reorder-level');
    const newReorderLevel = parseInt(reorderCell.querySelector('input').value) || 0;

    if (newReorderLevel < 0) {
        alert('Reorder level must be a non-negative number');
        return;
    }

    invShowProcessing();
    try {
        const res    = await fetch('/api/inventory/update-reorder/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': invGetCSRFToken()
            },
            credentials: 'same-origin',
            body: JSON.stringify({ item_id: itemId, reorder_level: newReorderLevel })
        });
        const result = await res.json();
        if (result.success) {
            alert('✅ Reorder level updated successfully');
            await invLoadItems();
        } else {
            alert('Error: ' + result.message);
        }
    } catch (err) {
        console.error('Error updating reorder level:', err);
        alert('Failed to update reorder level');
    } finally {
        invHideProcessing();
    }
}


/* ============================================================
   DELETE — confirmation modal flow
   ============================================================ */
function invOpenDeleteModal(button) {
    const itemId  = button.getAttribute('data-item-id');
    const itemName = button.getAttribute('data-item-name');
    const itemQty  = parseInt(button.getAttribute('data-item-qty')) || 0;

    invItemToDelete = { id: itemId, name: itemName, qty: itemQty };
    console.log('Item selected for deletion:', invItemToDelete);

    document.getElementById('deleteItemId').textContent   = itemId;
    document.getElementById('deleteItemName').textContent = itemName;
    document.getElementById('deleteItemQty').textContent  = itemQty;

    /* Colour the qty red if stock remains, green if zero */
    const qtyEl = document.getElementById('deleteItemQty');
    qtyEl.style.color = itemQty > 0 ? '#bb1300' : '#1e8348';

    document.getElementById('deleteConfirmModal').style.display = 'block';
}

function invCloseDeleteModal() {
    document.getElementById('deleteConfirmModal').style.display = 'none';
}

async function invConfirmDelete() {
    if (!invItemToDelete || !invItemToDelete.id) {
        console.error('No item data available for deletion');
        invCloseDeleteModal();
        alert('⚠️ No item selected for deletion. Please try again.');
        invItemToDelete = null;
        return;
    }

    /* Store locally before any async operations */
    const { id: itemId, name: itemName, qty: itemQty } = invItemToDelete;

    /* Frontend stock check */
    if (itemQty > 0) {
        invCloseDeleteModal();
        invItemToDelete = null;
        alert(`❌ Cannot delete "${itemName}" — it still has ${itemQty} units in stock.\n\nPlease sell or adjust inventory first.`);
        return;
    }

    invCloseDeleteModal();

    if (!confirm(`⚠️ FINAL CONFIRMATION\n\nAre you absolutely sure you want to delete this item?\n\nItem ID: ${itemId}\nItem Name: ${itemName}\n\nThis will delete the item from BOTH:\n• Inventory table\n• Inventory Items table\n\nThis action CANNOT be undone.`)) {
        invItemToDelete = null;
        return;
    }

    invShowProcessing();
    try {
        const res    = await fetch('/api/inventory/delete/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': invGetCSRFToken()
            },
            credentials: 'same-origin',
            body: JSON.stringify({ item_id: itemId })
        });
        const result = await res.json();
        if (result.success) {
            alert(result.message || `✅ Item deleted successfully!\n\nItem: ${itemName}\nID: ${itemId}\n\nDeleted from both tables.`);
            await invLoadItems();
        } else {
            alert(result.message || '❌ Error: Unable to delete item');
        }
    } catch (err) {
        console.error('Error deleting item:', err);
        alert(`❌ Failed to delete item.\n\nError: ${err.message || 'Unknown error'}`);
    } finally {
        invHideProcessing();
        invItemToDelete = null;
    }
}


/* ============================================================
   SEARCH
   ============================================================ */
function searchItems() {
    const criteria = document.getElementById('searchCriteria').value;
    const query    = document.getElementById('searchInput').value.toLowerCase().trim();

    if (criteria === 'Reorder Required') {
        if (!query) {
            invFiltered = [...invAllItems];
        } else if (query === 'yes' || query === 'y') {
            invFiltered = invAllItems.filter(item => item.reorderRequired === 'YES');
        } else if (query === 'no' || query === 'n') {
            invFiltered = invAllItems.filter(item => item.reorderRequired === 'NO');
        } else {
            invFiltered = [];
        }
    } else if (!query) {
        invFiltered = [...invAllItems];
    } else {
        invFiltered = invAllItems.filter(item => {
            switch (criteria) {
                case 'Item Type':        return item.type.toLowerCase().includes(query);
                case 'Item Category':    return item.category.toLowerCase().includes(query);
                case 'Item Subcategory': return item.subcategory.toLowerCase().includes(query);
                case 'Item Name':        return item.name.toLowerCase().includes(query);
                default:
                    return (
                        item.type.toLowerCase().includes(query) ||
                        item.category.toLowerCase().includes(query) ||
                        item.subcategory.toLowerCase().includes(query) ||
                        item.name.toLowerCase().includes(query)
                    );
            }
        });
    }

    invCurrentPage = 1;
    invRenderTable();

    if (invFiltered.length === 0 && (query || criteria === 'Reorder Required')) {
        alert('No matching items found');
    }
}

function clearSearch() {
    document.getElementById('searchInput').value    = '';
    document.getElementById('searchCriteria').value = 'all';
    const helper = document.getElementById('searchHelper');
    if (helper) helper.style.display = 'none';
    invFiltered    = [...invAllItems];
    invCurrentPage = 1;
    invRenderTable();
}


/* ============================================================
   PROCESSING OVERLAY
   ============================================================ */
function invShowProcessing() {
    const el = document.getElementById('processingOverlay');
    if (el) el.style.display = 'flex';
}

function invHideProcessing() {
    const el = document.getElementById('processingOverlay');
    if (el) el.style.display = 'none';
}