/* ============================================================
   INVENTORY-ITEMS.JS
   Static JavaScript for the Inventory Items module.
   Called by the partial template Inventory-items.html via:
       <script src="{% static 'js/Inventory-items.js' %}"></script>
       <script>initInventoryItems();</script>

   IMPORTANT: This file does NOT use DOMContentLoaded.
   initInventoryItems() is called directly by the partial
   template immediately after this script loads.

   All global variable names carry the `invItems` prefix to
   prevent conflicts with other modules loaded in the same
   global scope through Index.html.
   ============================================================ */

/* ---- Global State ---- */
let invItemsPage        = 1;
const invItemsPageSize  = 25;
let invItemsAll         = [];
let invItemsFiltered    = [];
let invItemsTypes       = [];
let invItemsCategories  = [];
let invItemsSubcats     = [];

/* ---- CSRF Helper ---- */
function invItemsGetCSRF() {
    /* Try meta tag first (set in the partial template) */
    const metaTag = document.querySelector('meta[name="csrf-token"]');
    if (metaTag) return metaTag.getAttribute('content');

    /* Fallback: read from cookie */
    const cookies = document.cookie.split(';');
    for (let c of cookies) {
        const [name, value] = c.trim().split('=');
        if (name === 'csrftoken') return decodeURIComponent(value);
    }
    return null;
}

/* ============================================================
   ENTRY POINT — called directly by the partial template
   ============================================================ */
function initInventoryItems() {
    console.log('✅ Inventory Items module initialised');

    /* --- Button event listeners --- */
    document.getElementById('btnAddInventoryItem')  .addEventListener('click', invItemsOpenNewItemModal);
    document.getElementById('btnAddItemType')       .addEventListener('click', invItemsOpenTypeModal);
    document.getElementById('btnAddItemCategory')   .addEventListener('click', invItemsOpenCategoryModal);
    document.getElementById('btnAddItemSubcategory').addEventListener('click', invItemsOpenSubcategoryModal);
    document.getElementById('btnSearch')            .addEventListener('click', invItemsSearch);
    document.getElementById('btnClear')             .addEventListener('click', invItemsClear);

    /* --- Item Type modal --- */
    document.getElementById('closeTypeModal')   .addEventListener('click', invItemsCloseTypeModal);
    document.getElementById('btnCloseTypeModal').addEventListener('click', invItemsCloseTypeModal);
    document.getElementById('btnSaveType')      .addEventListener('click', invItemsSaveType);

    /* --- Item Category modal --- */
    document.getElementById('closeCategoryModal')   .addEventListener('click', invItemsCloseCategoryModal);
    document.getElementById('btnCloseCategoryModal').addEventListener('click', invItemsCloseCategoryModal);
    document.getElementById('btnSaveCategory')      .addEventListener('click', invItemsSaveCategory);

    /* --- Item Subcategory modal --- */
    document.getElementById('closeSubcategoryModal')   .addEventListener('click', invItemsCloseSubcategoryModal);
    document.getElementById('btnCloseSubcategoryModal').addEventListener('click', invItemsCloseSubcategoryModal);
    document.getElementById('btnSaveSubcategory')      .addEventListener('click', invItemsSaveSubcategory);

    /* --- Inventory Item modal --- */
    document.getElementById('closeInventoryModal')   .addEventListener('click', invItemsCloseInventoryModal);
    document.getElementById('btnCloseInventoryModal').addEventListener('click', invItemsCloseInventoryModal);
    document.getElementById('btnGenerateId')         .addEventListener('click', invItemsGenerateId);
    document.getElementById('btnSaveInventoryItem')  .addEventListener('click', invItemsSaveItem);

    /* --- Initialise Select2 dropdowns --- */
    $('#itemType')       .select2();
    $('#itemCategory')   .select2();
    $('#itemSubcategory').select2();

    /* --- Load data --- */
    invItemsLoadTypes();
    invItemsLoadCategories();
    invItemsLoadSubcats();
    invItemsLoadItems();
}

/* ============================================================
   DATA LOADING
   ============================================================ */
async function invItemsLoadTypes() {
    try {
        const res    = await fetch('/api/inventory-items/types/', { headers: { 'X-CSRFToken': invItemsGetCSRF() }, credentials: 'same-origin' });
        const result = await res.json();
        if (result.success) {
            invItemsTypes = result.data;
            invItemsPopulateTypes();
        }
    } catch (err) { console.error('Error loading types:', err); }
}

async function invItemsLoadCategories() {
    try {
        const res    = await fetch('/api/inventory-items/categories/', { headers: { 'X-CSRFToken': invItemsGetCSRF() }, credentials: 'same-origin' });
        const result = await res.json();
        if (result.success) {
            invItemsCategories = result.data;
            invItemsPopulateCategories();
        }
    } catch (err) { console.error('Error loading categories:', err); }
}

async function invItemsLoadSubcats() {
    try {
        const res    = await fetch('/api/inventory-items/subcategories/', { headers: { 'X-CSRFToken': invItemsGetCSRF() }, credentials: 'same-origin' });
        const result = await res.json();
        if (result.success) {
            invItemsSubcats = result.data;
            invItemsPopulateSubcats();
        }
    } catch (err) { console.error('Error loading subcategories:', err); }
}

async function invItemsLoadItems() {
    invItemsShowProcessing();
    try {
        const res    = await fetch('/api/inventory-items/', { headers: { 'X-CSRFToken': invItemsGetCSRF() }, credentials: 'same-origin' });
        const result = await res.json();
        if (result.success) {
            invItemsAll      = result.data;
            invItemsFiltered = [...result.data];
            invItemsPage     = 1;
            invItemsRenderTable();
        } else {
            alert('Error loading items: ' + result.message);
        }
    } catch (err) {
        console.error('Error loading items:', err);
        alert('Failed to load inventory items. Please try again.');
    } finally {
        invItemsHideProcessing();
    }
}

/* ============================================================
   DROPDOWN POPULATION
   ============================================================ */
function invItemsPopulateTypes() {
    const sel = $('#itemType');
    sel.empty().append(new Option('Select Item Type', '', true, true));
    invItemsTypes.forEach(t => { if (t) sel.append(new Option(t, t)); });
    sel.trigger('change');
}

function invItemsPopulateCategories() {
    const sel = $('#itemCategory');
    sel.empty().append(new Option('Select Item Category', '', true, true));
    invItemsCategories.forEach(c => { if (c) sel.append(new Option(c, c)); });
    sel.trigger('change');
}

function invItemsPopulateSubcats() {
    const sel = $('#itemSubcategory');
    sel.empty().append(new Option('Select Item Subcategory', '', true, true));
    invItemsSubcats.forEach(s => { if (s) sel.append(new Option(s, s)); });
    sel.trigger('change');
}

/* ============================================================
   TABLE RENDERING
   ============================================================ */
function invItemsRenderTable() {
    const start     = (invItemsPage - 1) * invItemsPageSize;
    const pageItems = invItemsFiltered.slice(start, start + invItemsPageSize);
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
        row.setAttribute('data-item-id', item.id);

        row.innerHTML = `
            <td class="col-id">${item.id}</td>
            <td class="col-type">${item.type}</td>
            <td class="col-category">${item.category}</td>
            <td class="col-subcategory">${item.subcategory}</td>
            <td class="col-name">${item.name}</td>
            <td class="col-purchase-price">${parseFloat(item.purchase_price).toFixed(2)}</td>
            <td class="col-sale-price">${parseFloat(item.sale_price).toFixed(2)}</td>
            <td class="action-cell">
                <button class="action-btn edit-btn"   data-item-id="${item.id}"><i class="fas fa-edit"></i></button>
                <button class="action-btn delete-btn" data-item-id="${item.id}"><i class="fas fa-trash"></i></button>
                <button class="action-btn update-btn" data-item-id="${item.id}" style="display:none;"><i class="fas fa-save"></i></button>
                <button class="action-btn cancel-btn" data-item-id="${item.id}" style="display:none;"><i class="fas fa-times"></i></button>
            </td>
        `;

        row.querySelector('.edit-btn')  .addEventListener('click', function () { invItemsEditRow(this); });
        row.querySelector('.delete-btn').addEventListener('click', function () { invItemsDelete(this.getAttribute('data-item-id')); });
        row.querySelector('.update-btn').addEventListener('click', function () { invItemsUpdate(this); });
        row.querySelector('.cancel-btn').addEventListener('click', function () { invItemsCancelEdit(this); });

        tbody.appendChild(row);
    });

    invItemsRenderPagination();
}

/* ============================================================
   PAGINATION
   ============================================================ */
function invItemsRenderPagination() {
    const total      = Math.ceil(invItemsFiltered.length / invItemsPageSize);
    const pagDiv     = document.getElementById('pagination');
    pagDiv.innerHTML = '';

    if (total <= 1) return;

    const prev     = document.createElement('button');
    prev.className = 'page-btn';
    prev.innerHTML = '<i class="fas fa-chevron-left"></i>';
    prev.disabled  = invItemsPage === 1;
    prev.onclick   = () => { if (invItemsPage > 1) { invItemsPage--; invItemsRenderTable(); } };
    pagDiv.appendChild(prev);

    for (let i = 1; i <= total; i++) {
        const btn       = document.createElement('button');
        btn.className   = `page-btn ${i === invItemsPage ? 'active' : ''}`;
        btn.textContent = i;
        btn.onclick     = () => { invItemsPage = i; invItemsRenderTable(); };
        pagDiv.appendChild(btn);
    }

    const next     = document.createElement('button');
    next.className = 'page-btn';
    next.innerHTML = '<i class="fas fa-chevron-right"></i>';
    next.disabled  = invItemsPage === total;
    next.onclick   = () => { if (invItemsPage < total) { invItemsPage++; invItemsRenderTable(); } };
    pagDiv.appendChild(next);
}

/* ============================================================
   INLINE EDIT / UPDATE / CANCEL
   ============================================================ */
function invItemsEditRow(button) {
    const row   = button.closest('tr');
    const cells = row.querySelectorAll('td');

    /* Store originals */
    row.setAttribute('data-orig-type',           cells[1].textContent.trim());
    row.setAttribute('data-orig-category',       cells[2].textContent.trim());
    row.setAttribute('data-orig-subcategory',    cells[3].textContent.trim());
    row.setAttribute('data-orig-name',           cells[4].textContent.trim());
    row.setAttribute('data-orig-purchase-price', cells[5].textContent.trim());
    row.setAttribute('data-orig-sale-price',     cells[6].textContent.trim());

    /* Replace cells with inputs / selects */
    cells[1].innerHTML = `<select class="editable" style="width:100%">${invItemsTypes.map(t => `<option value="${t}" ${t === cells[1].textContent.trim() ? 'selected' : ''}>${t}</option>`).join('')}</select>`;
    cells[2].innerHTML = `<select class="editable" style="width:100%">${invItemsCategories.map(c => `<option value="${c}" ${c === cells[2].textContent.trim() ? 'selected' : ''}>${c}</option>`).join('')}</select>`;
    cells[3].innerHTML = `<select class="editable" style="width:100%">${invItemsSubcats.map(s => `<option value="${s}" ${s === cells[3].textContent.trim() ? 'selected' : ''}>${s}</option>`).join('')}</select>`;
    cells[4].innerHTML = `<input type="text"   class="editable" value="${cells[4].textContent.trim()}">`;
    cells[5].innerHTML = `<input type="number" class="editable" step="0.01" value="${parseFloat(cells[5].textContent)}">`;
    cells[6].innerHTML = `<input type="number" class="editable" step="0.01" value="${parseFloat(cells[6].textContent)}">`;

    const ac = cells[7];
    ac.querySelector('.edit-btn')  .style.display = 'none';
    ac.querySelector('.delete-btn').style.display = 'none';
    ac.querySelector('.update-btn').style.display = 'inline-block';
    ac.querySelector('.cancel-btn').style.display = 'inline-block';
}

function invItemsCancelEdit(button) {
    const row   = button.closest('tr');
    const cells = row.querySelectorAll('td');

    cells[1].textContent = row.getAttribute('data-orig-type');
    cells[2].textContent = row.getAttribute('data-orig-category');
    cells[3].textContent = row.getAttribute('data-orig-subcategory');
    cells[4].textContent = row.getAttribute('data-orig-name');
    cells[5].textContent = row.getAttribute('data-orig-purchase-price');
    cells[6].textContent = row.getAttribute('data-orig-sale-price');

    const ac = cells[7];
    ac.querySelector('.edit-btn')  .style.display = 'inline-block';
    ac.querySelector('.delete-btn').style.display = 'inline-block';
    ac.querySelector('.update-btn').style.display = 'none';
    ac.querySelector('.cancel-btn').style.display = 'none';
}

async function invItemsUpdate(button) {
    const row    = button.closest('tr');
    const cells  = row.querySelectorAll('td');
    const itemId = row.getAttribute('data-item-id');

    const data = {
        item_id:          itemId,
        item_type:        cells[1].querySelector('select').value,
        item_category:    cells[2].querySelector('select').value,
        item_subcategory: cells[3].querySelector('select').value,
        item_name:        cells[4].querySelector('input').value.trim(),
        purchase_price:   parseFloat(cells[5].querySelector('input').value) || 0,
        sale_price:       parseFloat(cells[6].querySelector('input').value) || 0
    };

    if (!data.item_type || !data.item_category || !data.item_subcategory) { alert('Please select all dropdown fields'); return; }
    if (!data.item_name)         { alert('Please enter Item Name');          return; }
    if (data.purchase_price <= 0 || data.sale_price <= 0) { alert('Please enter valid prices'); return; }

    invItemsShowProcessing();
    try {
        const res    = await fetch('/api/inventory-items/update/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-CSRFToken': invItemsGetCSRF() },
            credentials: 'same-origin',
            body: JSON.stringify(data)
        });
        const result = await res.json();
        if (result.success) {
            alert('✅ Inventory Item Updated Successfully');
            await invItemsLoadItems();
        } else {
            alert('Error: ' + result.message);
        }
    } catch (err) {
        console.error('Error updating item:', err);
        alert('Error updating inventory item');
    } finally {
        invItemsHideProcessing();
    }
}

/* ============================================================
   DELETE
   ============================================================ */
async function invItemsDelete(itemId) {
    if (!itemId) { alert('⚠️ No item ID provided'); return; }

    /* Check inventory stock before attempting deletion */
    try {
        const invRes    = await fetch('/api/inventory/all/', { headers: { 'X-CSRFToken': invItemsGetCSRF() }, credentials: 'same-origin' });
        const invResult = await invRes.json();

        if (invResult.success) {
            const invItem = invResult.data.find(i => i.id === itemId);
            if (invItem) {
                if (invItem.remainingQty > 0) {
                    alert(`❌ Cannot delete "${invItem.name}" — it still has ${invItem.remainingQty} units in stock.\n\nPlease sell or adjust inventory first.`);
                    return;
                }
                if (invItem.purchasedQty > 0 || invItem.soldQty > 0) {
                    alert(`❌ Cannot delete "${invItem.name}" — it has existing transaction history.\n\nPurchased: ${invItem.purchasedQty}  |  Sold: ${invItem.soldQty}`);
                    return;
                }
            }
        }
    } catch (err) {
        console.error('Error checking inventory:', err);
        /* Backend will also validate — allow deletion attempt to continue */
    }

    if (!confirm(`⚠️ DELETE CONFIRMATION\n\nItem ID: ${itemId}\n\nThis removes the item from both the Inventory Items table and the Inventory table.\n\nThis action CANNOT be undone.\n\nClick OK to proceed.`)) return;

    invItemsShowProcessing();
    try {
        const res    = await fetch('/api/inventory-items/delete/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-CSRFToken': invItemsGetCSRF() },
            credentials: 'same-origin',
            body: JSON.stringify({ item_id: itemId })
        });
        const result = await res.json();
        if (result.success) {
            alert(result.message || `✅ Item ${itemId} deleted successfully from both tables.`);
            await invItemsLoadItems();
        } else {
            alert(result.message || '❌ Unable to delete item');
        }
    } catch (err) {
        console.error('Error deleting item:', err);
        alert(`❌ Failed to delete item.\n\nError: ${err.message || 'Unknown error'}`);
    } finally {
        invItemsHideProcessing();
    }
}

/* ============================================================
   MODALS — Item Type
   ============================================================ */
function invItemsOpenTypeModal() {
    document.getElementById('typeModal').style.display = 'block';
    document.getElementById('newType').value = '';
}

function invItemsCloseTypeModal() {
    document.getElementById('typeModal').style.display = 'none';
}

async function invItemsSaveType() {
    const name = document.getElementById('newType').value.trim();
    if (!name) { alert('Please enter an item type'); return; }

    invItemsShowProcessing();
    try {
        const res    = await fetch('/api/inventory-items/types/add/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-CSRFToken': invItemsGetCSRF() },
            credentials: 'same-origin',
            body: JSON.stringify({ type_name: name })
        });
        const result = await res.json();
        if (result.success) {
            alert('✅ Item Type Added Successfully');
            invItemsCloseTypeModal();
            await invItemsLoadTypes();
        } else {
            alert('Error: ' + result.message);
        }
    } catch (err) {
        console.error('Error saving type:', err);
        alert('Error adding item type');
    } finally {
        invItemsHideProcessing();
    }
}

/* ============================================================
   MODALS — Item Category
   ============================================================ */
function invItemsOpenCategoryModal() {
    document.getElementById('categoryModal').style.display = 'block';
    document.getElementById('newCategory').value = '';
}

function invItemsCloseCategoryModal() {
    document.getElementById('categoryModal').style.display = 'none';
}

async function invItemsSaveCategory() {
    const name = document.getElementById('newCategory').value.trim();
    if (!name) { alert('Please enter an item category'); return; }

    invItemsShowProcessing();
    try {
        const res    = await fetch('/api/inventory-items/categories/add/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-CSRFToken': invItemsGetCSRF() },
            credentials: 'same-origin',
            body: JSON.stringify({ category_name: name })
        });
        const result = await res.json();
        if (result.success) {
            alert('✅ Item Category Added Successfully');
            invItemsCloseCategoryModal();
            await invItemsLoadCategories();
        } else {
            alert('Error: ' + result.message);
        }
    } catch (err) {
        console.error('Error saving category:', err);
        alert('Error adding item category');
    } finally {
        invItemsHideProcessing();
    }
}

/* ============================================================
   MODALS — Item Subcategory
   ============================================================ */
function invItemsOpenSubcategoryModal() {
    document.getElementById('subcategoryModal').style.display = 'block';
    document.getElementById('newSubcategory').value = '';
}

function invItemsCloseSubcategoryModal() {
    document.getElementById('subcategoryModal').style.display = 'none';
}

async function invItemsSaveSubcategory() {
    const name = document.getElementById('newSubcategory').value.trim();
    if (!name) { alert('Please enter an item subcategory'); return; }

    invItemsShowProcessing();
    try {
        const res    = await fetch('/api/inventory-items/subcategories/add/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-CSRFToken': invItemsGetCSRF() },
            credentials: 'same-origin',
            body: JSON.stringify({ subcategory_name: name })
        });
        const result = await res.json();
        if (result.success) {
            alert('✅ Item Subcategory Added Successfully');
            invItemsCloseSubcategoryModal();
            await invItemsLoadSubcats();
        } else {
            alert('Error: ' + result.message);
        }
    } catch (err) {
        console.error('Error saving subcategory:', err);
        alert('Error adding item subcategory');
    } finally {
        invItemsHideProcessing();
    }
}

/* ============================================================
   MODALS — Inventory Item (Add New)
   ============================================================ */
async function invItemsGenerateId() {
    invItemsShowProcessing();
    try {
        const res    = await fetch('/api/inventory-items/generate-id/', { headers: { 'X-CSRFToken': invItemsGetCSRF() }, credentials: 'same-origin' });
        const result = await res.json();
        if (result.success) {
            document.getElementById('inventoryId').value = result.item_id;
        } else {
            alert('Error generating ID: ' + result.message);
        }
    } catch (err) {
        console.error('Error generating ID:', err);
        alert('Error generating item ID');
    } finally {
        invItemsHideProcessing();
    }
}

function invItemsOpenNewItemModal() {
    document.getElementById('inventoryModal').style.display = 'block';
    document.getElementById('inventoryId').value  = '';
    document.getElementById('itemName').value     = '';
    document.getElementById('PurchasePrice').value = '';
    document.getElementById('SalePrice').value    = '';
    $('#itemType')       .val('').trigger('change');
    $('#itemCategory')   .val('').trigger('change');
    $('#itemSubcategory').val('').trigger('change');
}

function invItemsCloseInventoryModal() {
    document.getElementById('inventoryModal').style.display = 'none';
}

async function invItemsSaveItem() {
    const data = {
        item_id:          document.getElementById('inventoryId').value.trim(),
        item_type:        $('#itemType').val(),
        item_category:    $('#itemCategory').val(),
        item_subcategory: $('#itemSubcategory').val(),
        item_name:        document.getElementById('itemName').value.trim(),
        purchase_price:   parseFloat(document.getElementById('PurchasePrice').value) || 0,
        sale_price:       parseFloat(document.getElementById('SalePrice').value) || 0
    };

    if (!data.item_id)          { alert('Please generate an Item ID');          return; }
    if (!data.item_type)        { alert('Please select Item Type');              return; }
    if (!data.item_category)    { alert('Please select Item Category');          return; }
    if (!data.item_subcategory) { alert('Please select Item Subcategory');       return; }
    if (!data.item_name)        { alert('Please enter Item Name');               return; }
    if (data.purchase_price <= 0) { alert('Please enter a valid Purchase Price'); return; }
    if (data.sale_price <= 0)   { alert('Please enter a valid Sale Price');      return; }

    invItemsShowProcessing();
    try {
        const res    = await fetch('/api/inventory-items/add/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-CSRFToken': invItemsGetCSRF() },
            credentials: 'same-origin',
            body: JSON.stringify(data)
        });
        const result = await res.json();
        if (result.success) {
            alert('✅ Item Saved Successfully');
            invItemsCloseInventoryModal();
            await invItemsLoadItems();
        } else {
            alert('Error: ' + result.message);
        }
    } catch (err) {
        console.error('Error saving item:', err);
        alert('Error adding inventory item');
    } finally {
        invItemsHideProcessing();
    }
}

/* ============================================================
   SEARCH
   ============================================================ */
function invItemsSearch() {
    const criteria = document.getElementById('searchCriteria').value;
    const query    = document.getElementById('searchInput').value.toLowerCase().trim();

    if (!query) {
        invItemsFiltered = [...invItemsAll];
    } else {
        invItemsFiltered = invItemsAll.filter(item => {
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

    invItemsPage = 1;
    invItemsRenderTable();

    if (invItemsFiltered.length === 0 && query) {
        alert('No matching data found');
    }
}

function invItemsClear() {
    document.getElementById('searchInput').value    = '';
    document.getElementById('searchCriteria').value = 'all';
    invItemsFiltered = [...invItemsAll];
    invItemsPage     = 1;
    invItemsRenderTable();
}

/* ============================================================
   PROCESSING OVERLAY
   ============================================================ */
function invItemsShowProcessing() {
    const el = document.getElementById('processingOverlay');
    if (el) el.style.display = 'flex';
}

function invItemsHideProcessing() {
    const el = document.getElementById('processingOverlay');
    if (el) el.style.display = 'none';
}