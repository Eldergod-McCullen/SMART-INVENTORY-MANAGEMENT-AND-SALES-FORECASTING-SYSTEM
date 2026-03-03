/* ============================================================
   PURCHASES.JS
   Static JavaScript for the Purchases module.
   Called by the partial template Purchases.html via:
       <script src="{% static 'js/Purchases.js' %}"></script>
       <script>initPurchases();</script>

   CHANGES FROM ORIGINAL:
   1. Removed document.addEventListener('DOMContentLoaded', ...)
      entirely. All setup code now lives inside initPurchases()
      which is called directly by the partial template.

   2. Renamed getCSRFToken()   → poGetCSRFToken()
      Renamed showProcessing() → poShowProcessing()
      Renamed hideProcessing() → poHideProcessing()
      to avoid collision with identically named functions in
      other modules sharing the global scope via Index.html.

   3. Replaced window.onclick = function() with
      window.addEventListener('click', ...) to avoid
      overwriting click handlers registered by other modules.

   4. poOpenNewPOModal() was defined twice in the original.
      The second definition (the correct one that calls
      loadNextPurchaseDetailNumber()) is the one kept.
      The first duplicate has been removed.
   ============================================================ */

console.log('Purchases.js loaded');

/* ---- Global State ---- */
let poCurrentPage        = 1;
const poPageSize         = 25;
let poAllPOs             = [];
let poFilteredPOs        = [];
let poSuppliers          = [];
let poInventoryItems     = [];
let poPMTStatuses        = [];
let poShippingStatuses   = [];
let poIsEditMode         = false;
let poCurrentPOID        = null;
let poDetailCounter      = 1;
let poNextDetailNumber   = null;   // tracks next detail number within a session


/* ---- CSRF Helper ---- */
function poGetCSRFToken() {
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
function initPurchases() {
    console.log('✅ Purchases module initialised');

    poLoadSuppliers();
    poLoadInventoryItems();
    poLoadPMTStatuses();
    poLoadShippingStatuses();
    poLoadPurchaseOrders();
    poLoadNextPurchaseDetailNumber();
    poInitializeDatePicker();

    /* Header field change listeners — update item rows when
       PO Date, PO ID, or Bill Number changes              */
    document.getElementById('poPODate')   .addEventListener('change', poUpdateAllItemRowsWithHeaderData);
    document.getElementById('poPOID')     .addEventListener('change', poUpdateAllItemRowsWithHeaderData);
    document.getElementById('poBillNum')  .addEventListener('change', poUpdateAllItemRowsWithHeaderData);

    /* Close modals when clicking the backdrop */
    window.addEventListener('click', function(event) {
        const poModal   = document.getElementById('poNewPOModal');
        const pmtModal  = document.getElementById('poPMTStatusModal');
        const shipModal = document.getElementById('poShippingStatusModal');

        if (event.target === poModal)   poCloseNewPOModal();
        if (event.target === pmtModal)  poClosePMTStatusModal();
        if (event.target === shipModal) poCloseShippingStatusModal();
    });
}


/* ---- Flatpickr date picker ---- */
function poInitializeDatePicker() {
    flatpickr('#poPODate', {
        dateFormat: 'd/m/Y',
        allowInput: true
    });
}


/* ============================================================
   DATA LOADING
   ============================================================ */
async function poLoadSuppliers() {
    try {
        const res    = await fetch('/api/suppliers/', {
            headers: { 'Content-Type': 'application/json', 'X-CSRFToken': poGetCSRFToken() },
            credentials: 'same-origin'
        });
        const result = await res.json();
        if (result.success) {
            poSuppliers = result.data;
            poPopulateSupplierDropdown();
        }
    } catch (err) { console.error('Error loading suppliers:', err); }
}

async function poLoadInventoryItems() {
    try {
        const res    = await fetch('/api/inventory-items/', {
            headers: { 'Content-Type': 'application/json', 'X-CSRFToken': poGetCSRFToken() },
            credentials: 'same-origin'
        });
        const result = await res.json();
        if (result.success) poInventoryItems = result.data;
    } catch (err) { console.error('Error loading inventory items:', err); }
}

async function poLoadPMTStatuses() {
    try {
        const res    = await fetch('/api/purchases/payment-statuses/', {
            headers: { 'Content-Type': 'application/json', 'X-CSRFToken': poGetCSRFToken() },
            credentials: 'same-origin'
        });
        const result = await res.json();
        if (result.success) poPMTStatuses = result.data;
    } catch (err) { console.error('Error loading payment statuses:', err); }
}

async function poLoadShippingStatuses() {
    try {
        const res    = await fetch('/api/purchases/shipping-statuses/', {
            headers: { 'Content-Type': 'application/json', 'X-CSRFToken': poGetCSRFToken() },
            credentials: 'same-origin'
        });
        const result = await res.json();
        if (result.success) poShippingStatuses = result.data;
    } catch (err) { console.error('Error loading shipping statuses:', err); }
}

async function poLoadPurchaseOrders() {
    poShowProcessing();
    try {
        const res    = await fetch('/api/purchases/', {
            headers: { 'Content-Type': 'application/json', 'X-CSRFToken': poGetCSRFToken() },
            credentials: 'same-origin'
        });
        const result = await res.json();
        if (result.success) {
            poAllPOs      = result.data;
            poFilteredPOs = [...result.data];
            poRenderTable();
        } else {
            alert('Error loading purchase orders: ' + result.message);
        }
    } catch (err) {
        console.error('Error loading purchase orders:', err);
        alert('Failed to load purchase orders');
    } finally {
        poHideProcessing();
    }
}

async function poLoadNextPurchaseDetailNumber() {
    try {
        const res    = await fetch('/api/purchases/get-next-detail-number/', {
            headers: { 'Content-Type': 'application/json', 'X-CSRFToken': poGetCSRFToken() },
            credentials: 'same-origin'
        });
        const result = await res.json();
        if (result.success) {
            poNextDetailNumber = result.next_number;
            console.log(`📊 Loaded next Purchase Detail number: ${poNextDetailNumber}`);
        }
    } catch (err) {
        console.error('Error loading next detail number:', err);
        poNextDetailNumber = 1;
    }
}


/* ============================================================
   SUPPLIER DROPDOWN
   ============================================================ */
function poPopulateSupplierDropdown() {
    const sel = $('#poSupplierName');
    sel.empty().append(new Option('Select Supplier', '', true, true));
    poSuppliers.forEach(supplier => {
        if (supplier) sel.append(new Option(supplier.name, supplier.name));
    });

    sel.select2({
        placeholder: 'Select Supplier',
        allowClear: true,
        dropdownParent: $('#poNewPOModal')
    });

    sel.on('change', function () { poSupplierChanged(); });
}

function poSupplierChanged() {
    const supplierName = $('#poSupplierName').val();
    const supplier     = poSuppliers.find(s => s.name === supplierName);

    if (supplier) {
        document.getElementById('poSupplierID').value = supplier.id;
        document.getElementById('poCounty').value     = supplier.state;
        document.getElementById('poTown').value       = supplier.city;
        poUpdateAllItemRowsWithHeaderData();
    } else {
        document.getElementById('poSupplierID').value = '';
        document.getElementById('poCounty').value     = '';
        document.getElementById('poTown').value       = '';
    }
}


/* ============================================================
   TABLE RENDERING
   ============================================================ */
function poRenderTable() {
    const start   = (poCurrentPage - 1) * poPageSize;
    const pagePOs = poFilteredPOs.slice(start, start + poPageSize);
    const tbody   = document.getElementById('poTableBody');

    tbody.innerHTML = '';

    if (pagePOs.length === 0) {
        document.getElementById('poTableContainer').style.display = 'none';
        document.getElementById('poNoData').style.display         = 'block';
        document.getElementById('poPagination').innerHTML         = '';
        return;
    }

    document.getElementById('poTableContainer').style.display = 'block';
    document.getElementById('poNoData').style.display         = 'none';

    pagePOs.forEach(po => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${po.po_id}</td>
            <td>${po.date}</td>
            <td>${po.supplier_id}</td>
            <td>${po.supplier_name}</td>
            <td>${po.bill_number}</td>
            <td>${po.county || ''}</td>
            <td>${po.town || ''}</td>
            <td>${parseFloat(po.total_amount).toFixed(2)}</td>
            <td>${parseFloat(po.amount_paid).toFixed(2)}</td>
            <td>${parseFloat(po.balance_left).toFixed(2)}</td>
            <td>${po.payment_status || ''}</td>
            <td>${po.shipping_status || ''}</td>
            <td class="action-cell">
                <button class="action-btn view-btn" onclick="poViewPO('${po.po_id}')">
                    <i class="fas fa-eye"></i> View
                </button>
            </td>
        `;
        tbody.appendChild(row);
    });

    poRenderPagination();
}

function poRenderPagination() {
    const total  = Math.ceil(poFilteredPOs.length / poPageSize);
    const pagDiv = document.getElementById('poPagination');
    pagDiv.innerHTML = '';

    if (total <= 1) return;

    const prev     = document.createElement('button');
    prev.className = 'page-btn';
    prev.innerHTML = '<i class="fas fa-chevron-left"></i>';
    prev.disabled  = poCurrentPage === 1;
    prev.onclick   = () => { if (poCurrentPage > 1) { poCurrentPage--; poRenderTable(); } };
    pagDiv.appendChild(prev);

    for (let i = 1; i <= total; i++) {
        const btn       = document.createElement('button');
        btn.className   = `page-btn ${i === poCurrentPage ? 'active' : ''}`;
        btn.textContent = i;
        btn.onclick     = () => { poCurrentPage = i; poRenderTable(); };
        pagDiv.appendChild(btn);
    }

    const next     = document.createElement('button');
    next.className = 'page-btn';
    next.innerHTML = '<i class="fas fa-chevron-right"></i>';
    next.disabled  = poCurrentPage === total;
    next.onclick   = () => { if (poCurrentPage < total) { poCurrentPage++; poRenderTable(); } };
    pagDiv.appendChild(next);
}


/* ============================================================
   NEW / EDIT PO MODAL
   ============================================================ */
function poOpenNewPOModal() {
    poIsEditMode  = false;
    poCurrentPOID = null;

    document.getElementById('poModalTitle').textContent        = 'Create New Purchase Order';
    document.getElementById('poSaveBtn').textContent           = 'Save PO';
    document.getElementById('poGenerateBtn').style.display     = 'inline-block';

    /* Clear header fields */
    document.getElementById('poPOID').value      = '';
    document.getElementById('poPODate').value    = '';
    document.getElementById('poSupplierID').value = '';
    document.getElementById('poCounty').value    = '';
    document.getElementById('poTown').value      = '';
    document.getElementById('poBillNum').value   = '';
    $('#poSupplierName').val('').trigger('change');

    /* Clear items table */
    document.getElementById('poItemsTableBody').innerHTML = '';

    /* Reload next detail number so it stays current */
    poLoadNextPurchaseDetailNumber();

    document.getElementById('poNewPOModal').style.display = 'block';
}

function poCloseNewPOModal() {
    document.getElementById('poNewPOModal').style.display = 'none';
}

async function poGeneratePOID() {
    poShowProcessing();
    try {
        const res    = await fetch('/api/purchases/generate-po-id/', {
            headers: { 'Content-Type': 'application/json', 'X-CSRFToken': poGetCSRFToken() },
            credentials: 'same-origin'
        });
        const result = await res.json();
        if (result.success) {
            document.getElementById('poPOID').value    = result.po_id;
            document.getElementById('poBillNum').value = result.bill_number;
            poUpdateAllItemRowsWithHeaderData();
        } else {
            alert('Error generating PO ID: ' + result.message);
        }
    } catch (err) {
        console.error('Error generating PO ID:', err);
        alert('Failed to generate PO ID');
    } finally {
        poHideProcessing();
    }
}


/* ============================================================
   ITEM ROWS — Add / Remove / Existing
   ============================================================ */
async function poAddItemRow() {
    const poID       = document.getElementById('poPOID').value;
    const poDate     = document.getElementById('poPODate').value;
    const supplierID = document.getElementById('poSupplierID').value;
    const supplierName = $('#poSupplierName').val();
    const county     = document.getElementById('poCounty').value;
    const town       = document.getElementById('poTown').value;
    const billNum    = document.getElementById('poBillNum').value;

    if (!poID || !poDate || !supplierName) {
        alert('Please fill PO ID, Date, and Supplier Name first');
        return;
    }

    /* Scan existing rows to keep poNextDetailNumber consistent */
    const existingDetailIDs = new Set();
    $('#poItemsTableBody tr').each(function () {
        const detailID = $(this).attr('data-detail-id');
        if (detailID) {
            existingDetailIDs.add(detailID);
            const num = parseInt(detailID.substring(2));
            if (num >= poNextDetailNumber) poNextDetailNumber = num + 1;
        }
    });

    /* Generate unique Detail ID */
    let detailID = `PD${poNextDetailNumber.toString().padStart(5, '0')}`;
    while (existingDetailIDs.has(detailID)) {
        poNextDetailNumber++;
        detailID = `PD${poNextDetailNumber.toString().padStart(5, '0')}`;
    }
    poNextDetailNumber++;

    console.log(`🆕 Generated Purchase Detail ID: ${detailID}`);

    const tbody = document.getElementById('poItemsTableBody');
    const row   = document.createElement('tr');
    row.setAttribute('data-detail-id', detailID);

    let itemOptions = '<option value="">Select Item</option>';
    poInventoryItems.forEach(item => {
        itemOptions += `<option value="${item.name}"
            data-item-id="${item.id}"
            data-type="${item.type}"
            data-category="${item.category}"
            data-subcategory="${item.subcategory}"
            data-purchase-price="${item.purchase_price}">${item.name}</option>`;
    });

    row.innerHTML = `
        <td><input type="text" class="readonly" value="${poDate}" readonly></td>
        <td><input type="text" class="readonly" value="${poID}" readonly></td>
        <td><input type="text" class="readonly" value="${detailID}" readonly></td>
        <td><input type="text" class="readonly" value="${supplierID}" readonly></td>
        <td><input type="text" class="readonly" value="${supplierName}" readonly></td>
        <td><input type="text" class="readonly" value="${county}" readonly></td>
        <td><input type="text" class="readonly" value="${town}" readonly></td>
        <td><input type="text" class="readonly" value="${billNum}" readonly></td>
        <td><input type="text" class="readonly item-id" value="" readonly></td>
        <td><input type="text" class="readonly item-type" value="" readonly></td>
        <td><input type="text" class="readonly item-category" value="" readonly></td>
        <td><input type="text" class="readonly item-subcategory" value="" readonly></td>
        <td><select class="item-name-select" style="min-width: 200px;">${itemOptions}</select></td>
        <td><input type="number" class="qty-input" min="1" value="1"></td>
        <td><input type="text" class="readonly unit-cost" value="0.00" readonly></td>
        <td><input type="text" class="readonly cost-excl-tax" value="0.00" readonly></td>
        <td><input type="number" class="tax-rate-input" step="0.01" min="0" value="0"></td>
        <td><input type="text" class="readonly total-tax" value="0.00" readonly></td>
        <td><input type="text" class="readonly cost-incl-tax" value="0.00" readonly></td>
        <td><input type="text" class="readonly shipping-fees" value="0.00" readonly></td>
        <td><input type="text" class="readonly total-price" value="0.00" readonly></td>
        <td>
            <button class="remove-item-btn" onclick="poRemoveItemRow(this)">
                <i class="fas fa-trash"></i>
            </button>
        </td>
    `;

    tbody.appendChild(row);

    $(row).find('.item-name-select').select2({
        placeholder: 'Select Item',
        allowClear: true,
        dropdownParent: $('#poNewPOModal')
    }).on('change', function () { poItemChanged(this); });

    $(row).find('.qty-input, .tax-rate-input').on('input', function () {
        poCalculateRowTotals(row);
    });
}

async function poAddExistingItemRow(detail) {
    const tbody = document.getElementById('poItemsTableBody');
    const row   = document.createElement('tr');
    row.setAttribute('data-detail-id', detail.detail_id);
    row.setAttribute('data-original-qty', detail.quantity_purchased);

    let itemOptions = '<option value="">Select Item</option>';
    poInventoryItems.forEach(item => {
        const sel = item.name === detail.item_name ? 'selected' : '';
        itemOptions += `<option value="${item.name}"
            data-item-id="${item.id}"
            data-type="${item.type}"
            data-category="${item.category}"
            data-subcategory="${item.subcategory}"
            data-purchase-price="${item.purchase_price}" ${sel}>${item.name}</option>`;
    });

    row.innerHTML = `
        <td><input type="text" class="readonly" value="${detail.date}" readonly></td>
        <td><input type="text" class="readonly" value="${detail.po_id}" readonly></td>
        <td><input type="text" class="readonly" value="${detail.detail_id}" readonly></td>
        <td><input type="text" class="readonly" value="${detail.supplier_id}" readonly></td>
        <td><input type="text" class="readonly" value="${detail.supplier_name}" readonly></td>
        <td><input type="text" class="readonly" value="${detail.county || ''}" readonly></td>
        <td><input type="text" class="readonly" value="${detail.town || ''}" readonly></td>
        <td><input type="text" class="readonly" value="${detail.bill_number}" readonly></td>
        <td><input type="text" class="readonly item-id" value="${detail.item_id}" readonly></td>
        <td><input type="text" class="readonly item-type" value="${detail.item_type}" readonly></td>
        <td><input type="text" class="readonly item-category" value="${detail.item_category}" readonly></td>
        <td><input type="text" class="readonly item-subcategory" value="${detail.item_subcategory}" readonly></td>
        <td><select class="item-name-select" style="min-width: 200px;">${itemOptions}</select></td>
        <td><input type="number" class="qty-input" min="1" value="${detail.quantity_purchased}"></td>
        <td><input type="text" class="readonly unit-cost" value="${parseFloat(detail.unit_cost).toFixed(2)}" readonly></td>
        <td><input type="text" class="readonly cost-excl-tax" value="${parseFloat(detail.cost_excluding_tax).toFixed(2)}" readonly></td>
        <td><input type="number" class="tax-rate-input" step="0.01" min="0" value="${parseFloat(detail.tax_rate)}"></td>
        <td><input type="text" class="readonly total-tax" value="${parseFloat(detail.total_tax).toFixed(2)}" readonly></td>
        <td><input type="text" class="readonly cost-incl-tax" value="${parseFloat(detail.cost_including_tax).toFixed(2)}" readonly></td>
        <td><input type="text" class="readonly shipping-fees" value="${parseFloat(detail.shipping_fees).toFixed(2)}" readonly></td>
        <td><input type="text" class="readonly total-price" value="${parseFloat(detail.total_purchase_price).toFixed(2)}" readonly></td>
        <td>
            <button class="remove-item-btn" onclick="poDeleteItemRow(this, '${detail.detail_id}')">
                <i class="fas fa-trash"></i>
            </button>
        </td>
    `;

    tbody.appendChild(row);

    $(row).find('.item-name-select').select2({
        placeholder: 'Select Item',
        allowClear: true,
        dropdownParent: $('#poNewPOModal')
    }).on('change', function () { poItemChanged(this); });

    $(row).find('.qty-input, .tax-rate-input').on('input', function () {
        poCalculateRowTotals(row);
    });
}

function poRemoveItemRow(button) {
    if (confirm('Are you sure you want to remove this item?')) {
        button.closest('tr').remove();
    }
}

async function poDeleteItemRow(button, detailID) {
    if (!confirm('Are you sure you want to delete this item? This will update inventory quantities.')) return;

    poShowProcessing();
    try {
        const res    = await fetch('/api/purchases/delete-detail/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-CSRFToken': poGetCSRFToken() },
            credentials: 'same-origin',
            body: JSON.stringify({ detail_id: detailID })
        });
        const result = await res.json();
        if (result.success) {
            button.closest('tr').remove();
            alert('✅ Item deleted successfully');
        } else {
            alert('Error: ' + result.message);
        }
    } catch (err) {
        console.error('Error deleting item:', err);
        alert('Failed to delete item');
    } finally {
        poHideProcessing();
    }
}


/* ============================================================
   ITEM CALCULATIONS
   ============================================================ */
function poItemChanged(selectElement) {
    const row            = selectElement.closest('tr');
    const selectedOption = selectElement.options[selectElement.selectedIndex];

    if (selectedOption.value) {
        $(row).find('.item-id')         .val(selectedOption.getAttribute('data-item-id'));
        $(row).find('.item-type')       .val(selectedOption.getAttribute('data-type'));
        $(row).find('.item-category')   .val(selectedOption.getAttribute('data-category'));
        $(row).find('.item-subcategory').val(selectedOption.getAttribute('data-subcategory'));
        $(row).find('.unit-cost')       .val((parseFloat(selectedOption.getAttribute('data-purchase-price')) || 0).toFixed(2));
    } else {
        $(row).find('.item-id, .item-type, .item-category, .item-subcategory').val('');
        $(row).find('.unit-cost').val('0.00');
    }

    poCalculateRowTotals(row);
}

function poCalculateRowTotals(row) {
    const qty         = parseFloat($(row).find('.qty-input').val())       || 0;
    const unitCost    = parseFloat($(row).find('.unit-cost').val())        || 0;
    const taxRate     = parseFloat($(row).find('.tax-rate-input').val())   || 0;

    const costExclTax  = qty * unitCost;
    const totalTax     = costExclTax * (taxRate / 100);
    const costInclTax  = costExclTax + totalTax;
    const shippingFees = costInclTax * 0.01;
    const totalPrice   = costInclTax + shippingFees;

    $(row).find('.cost-excl-tax') .val(costExclTax.toFixed(2));
    $(row).find('.total-tax')     .val(totalTax.toFixed(2));
    $(row).find('.cost-incl-tax') .val(costInclTax.toFixed(2));
    $(row).find('.shipping-fees') .val(shippingFees.toFixed(2));
    $(row).find('.total-price')   .val(totalPrice.toFixed(2));
}

function poUpdateAllItemRowsWithHeaderData() {
    const poID         = document.getElementById('poPOID').value;
    const poDate       = document.getElementById('poPODate').value;
    const supplierID   = document.getElementById('poSupplierID').value;
    const supplierName = $('#poSupplierName').val();
    const county       = document.getElementById('poCounty').value;
    const town         = document.getElementById('poTown').value;
    const billNum      = document.getElementById('poBillNum').value;

    $('#poItemsTableBody tr').each(function () {
        const inputs = $(this).find('input');
        inputs.eq(0).val(poDate);
        inputs.eq(1).val(poID);
        inputs.eq(3).val(supplierID);
        inputs.eq(4).val(supplierName);
        inputs.eq(5).val(county);
        inputs.eq(6).val(town);
        inputs.eq(7).val(billNum);
    });
}


/* ============================================================
   SAVE PO
   ============================================================ */
async function poSaveNewPO() {
    const poID         = document.getElementById('poPOID').value.trim();
    const poDate       = document.getElementById('poPODate').value.trim();
    const supplierName = $('#poSupplierName').val();
    const supplierID   = document.getElementById('poSupplierID').value.trim();
    const county       = document.getElementById('poCounty').value.trim();
    const town         = document.getElementById('poTown').value.trim();
    const billNum      = document.getElementById('poBillNum').value.trim();

    if (!poID || !poDate || !supplierName || !billNum) {
        alert('Please fill all required fields in PO Information');
        return;
    }

    const items    = [];
    let hasError   = false;

    $('#poItemsTableBody tr').each(function () {
        const detailID       = $(this).attr('data-detail-id');
        const itemName       = $(this).find('.item-name-select').val();
        const itemID         = $(this).find('.item-id').val();
        const itemType       = $(this).find('.item-type').val();
        const itemCategory   = $(this).find('.item-category').val();
        const itemSubcategory = $(this).find('.item-subcategory').val();
        const qty            = parseInt($(this).find('.qty-input').val())       || 0;
        const unitCost       = parseFloat($(this).find('.unit-cost').val())      || 0;
        const taxRate        = parseFloat($(this).find('.tax-rate-input').val()) || 0;
        const costExclTax    = parseFloat($(this).find('.cost-excl-tax').val())  || 0;
        const totalTax       = parseFloat($(this).find('.total-tax').val())      || 0;
        const costInclTax    = parseFloat($(this).find('.cost-incl-tax').val())  || 0;
        const shippingFees   = parseFloat($(this).find('.shipping-fees').val())  || 0;
        const totalPrice     = parseFloat($(this).find('.total-price').val())    || 0;

        if (!itemName || qty <= 0) {
            alert('Please fill all item details correctly');
            hasError = true;
            return false;
        }

        items.push({
            detail_id:           detailID,
            date:                poDate,
            po_id:               poID,
            supplier_id:         supplierID,
            supplier_name:       supplierName,
            county:              county,
            town:                town,
            bill_number:         billNum,
            item_id:             itemID,
            item_type:           itemType,
            item_category:       itemCategory,
            item_subcategory:    itemSubcategory,
            item_name:           itemName,
            quantity_purchased:  qty,
            unit_cost:           unitCost,
            tax_rate:            taxRate,
            cost_excluding_tax:  costExclTax,
            total_tax:           totalTax,
            cost_including_tax:  costInclTax,
            shipping_fees:       shippingFees,
            total_purchase_price: totalPrice
        });
    });

    if (hasError) return;
    if (items.length === 0) { alert('Please add at least one item'); return; }

    const poData = {
        po_id:         poID,
        date:          poDate,
        supplier_id:   supplierID,
        supplier_name: supplierName,
        county:        county,
        town:          town,
        bill_number:   billNum,
        items:         items
    };

    poShowProcessing();
    try {
        const url    = poIsEditMode ? '/api/purchases/update/' : '/api/purchases/add/';
        const res    = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-CSRFToken': poGetCSRFToken() },
            credentials: 'same-origin',
            body: JSON.stringify(poData)
        });
        const result = await res.json();
        if (result.success) {
            alert(poIsEditMode ? '✅ Purchase Order Updated Successfully' : '✅ Purchase Order Saved Successfully');
            poCloseNewPOModal();
            await poLoadPurchaseOrders();
        } else {
            alert('Error: ' + result.message);
        }
    } catch (err) {
        console.error('Error saving PO:', err);
        alert('Failed to save purchase order');
    } finally {
        poHideProcessing();
    }
}


/* ============================================================
   VIEW / EDIT PO
   ============================================================ */
async function poViewPO(poID) {
    poShowProcessing();
    try {
        const res    = await fetch(`/api/purchases/details/${poID}/`, {
            headers: { 'Content-Type': 'application/json', 'X-CSRFToken': poGetCSRFToken() },
            credentials: 'same-origin'
        });
        const result = await res.json();
        if (result.success) {
            poIsEditMode  = true;
            poCurrentPOID = poID;

            document.getElementById('poModalTitle').textContent    = 'Update Purchase Order';
            document.getElementById('poSaveBtn').textContent       = 'Update PO';
            document.getElementById('poGenerateBtn').style.display = 'none';

            const po = result.data.purchase_order;
            document.getElementById('poPOID').value      = po.po_id;
            document.getElementById('poPODate').value    = po.date;
            document.getElementById('poSupplierID').value = po.supplier_id;
            document.getElementById('poCounty').value    = po.county || '';
            document.getElementById('poTown').value      = po.town   || '';
            document.getElementById('poBillNum').value   = po.bill_number;
            $('#poSupplierName').val(po.supplier_name).trigger('change');

            document.getElementById('poItemsTableBody').innerHTML = '';
            for (const detail of result.data.purchase_details) {
                await poAddExistingItemRow(detail);
            }

            document.getElementById('poNewPOModal').style.display = 'block';
        } else {
            alert('Error loading PO details: ' + result.message);
        }
    } catch (err) {
        console.error('Error loading PO:', err);
        alert('Failed to load purchase order');
    } finally {
        poHideProcessing();
    }
}


/* ============================================================
   SEARCH
   ============================================================ */
function poSearchPOs() {
    poShowProcessing();
    const criteria = document.getElementById('poSearchCriteria').value;
    const query    = document.getElementById('poSearchInput').value.toLowerCase().trim();

    if (!query) {
        poFilteredPOs = [...poAllPOs];
    } else {
        poFilteredPOs = poAllPOs.filter(po => {
            switch (criteria) {
                case 'PO ID':           return po.po_id.toLowerCase().includes(query);
                case 'Supplier Name':   return po.supplier_name.toLowerCase().includes(query);
                case 'Bill Num':        return po.bill_number.toLowerCase().includes(query);
                case 'Payment Status':  return po.payment_status  && po.payment_status.toLowerCase().includes(query);
                case 'Shipping Status': return po.shipping_status && po.shipping_status.toLowerCase().includes(query);
                default:
                    return (
                        po.po_id.toLowerCase().includes(query) ||
                        po.supplier_name.toLowerCase().includes(query) ||
                        po.bill_number.toLowerCase().includes(query) ||
                        (po.payment_status  && po.payment_status.toLowerCase().includes(query))  ||
                        (po.shipping_status && po.shipping_status.toLowerCase().includes(query))
                    );
            }
        });
    }

    poCurrentPage = 1;
    poRenderTable();
    if (poFilteredPOs.length === 0 && query) alert('No matching data found');
    poHideProcessing();
}

function poClearSearch() {
    poShowProcessing();
    document.getElementById('poSearchInput').value    = '';
    document.getElementById('poSearchCriteria').value = 'all';
    poFilteredPOs = [...poAllPOs];
    poCurrentPage = 1;
    poRenderTable();
    poHideProcessing();
}


/* ============================================================
   PAYMENT STATUS MODAL
   ============================================================ */
function poOpenPMTStatusModal() {
    document.getElementById('poPMTStatusModal').style.display = 'block';
    document.getElementById('poNewPMTStatus').value           = '';
}

function poClosePMTStatusModal() {
    document.getElementById('poPMTStatusModal').style.display = 'none';
}

async function poSaveNewPMTStatus() {
    const name = document.getElementById('poNewPMTStatus').value.trim();
    if (!name) { alert('Please enter a payment status'); return; }

    poShowProcessing();
    try {
        const res    = await fetch('/api/purchases/payment-statuses/add/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-CSRFToken': poGetCSRFToken() },
            credentials: 'same-origin',
            body: JSON.stringify({ status_name: name })
        });
        const result = await res.json();
        if (result.success) {
            alert('✅ Payment Status Added Successfully');
            poClosePMTStatusModal();
            await poLoadPMTStatuses();
        } else {
            alert('Error: ' + result.message);
        }
    } catch (err) {
        console.error('Error saving payment status:', err);
        alert('Failed to add payment status');
    } finally {
        poHideProcessing();
    }
}


/* ============================================================
   SHIPPING STATUS MODAL
   ============================================================ */
function poOpenShippingStatusModal() {
    document.getElementById('poShippingStatusModal').style.display = 'block';
    document.getElementById('poNewShippingStatus').value           = '';
}

function poCloseShippingStatusModal() {
    document.getElementById('poShippingStatusModal').style.display = 'none';
}

async function poSaveNewShippingStatus() {
    const name = document.getElementById('poNewShippingStatus').value.trim();
    if (!name) { alert('Please enter a shipping status'); return; }

    poShowProcessing();
    try {
        const res    = await fetch('/api/purchases/shipping-statuses/add/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-CSRFToken': poGetCSRFToken() },
            credentials: 'same-origin',
            body: JSON.stringify({ status_name: name })
        });
        const result = await res.json();
        if (result.success) {
            alert('✅ Shipping Status Added Successfully');
            poCloseShippingStatusModal();
            await poLoadShippingStatuses();
        } else {
            alert('Error: ' + result.message);
        }
    } catch (err) {
        console.error('Error saving shipping status:', err);
        alert('Failed to add shipping status');
    } finally {
        poHideProcessing();
    }
}


/* ============================================================
   PROCESSING OVERLAY
   ============================================================ */
function poShowProcessing() {
    const el = document.getElementById('poProcessingOverlay');
    if (el) el.style.display = 'flex';
}

function poHideProcessing() {
    const el = document.getElementById('poProcessingOverlay');
    if (el) el.style.display = 'none';
}

console.log('✅ Purchases.js complete');