/* ============================================================
   SALES.JS
   Static JavaScript for the Sales module.
   Called by the partial template Sales.html via:
       <script src="{% static 'js/Sales.js' %}"></script>
       <script>initSales();</script>

   CHANGES FROM ORIGINAL:
   1. Removed document.addEventListener('DOMContentLoaded', ...)
      entirely. All setup code now lives inside initSales()
      which is called directly by the partial template.

   2. Renamed getCSRFToken()   → soGetCSRFToken()
      Renamed showProcessing() → soShowProcessing()
      Renamed hideProcessing() → soHideProcessing()
      to avoid collision with identically named functions in
      other modules sharing the global scope via Index.html.

   3. Replaced window.onclick = function() with
      window.addEventListener('click', ...) to avoid
      overwriting click handlers registered by other modules.

   4. BUG FIX — window.onclick backdrop handler (lines 1722-1736
      in the original): the variables `pmtModal` and `shipModal`
      were never defined in that scope. They have been replaced
      with the correctly named `soReceiptStatusModal` and
      `soShippingStatusModal`. Additionally, `soReceiptStatusModal()`
      was called instead of `soCloseReceiptStatusModal()` — fixed.

   5. BUG FIX — soSaveNewShippingStatus() was POSTing to
      '/api/purchases/shipping-statuses/add/' instead of
      '/api/sales/shipping-statuses/add/'. Fixed.

   6. Renamed renderSOTable()       → soRenderTable()
      Renamed renderSOPagination()  → soRenderPagination()
      Renamed loadSalesOrders()     → soLoadSalesOrders()
      Renamed loadCustomers()       → soLoadCustomers()
      Renamed loadInventoryItems()  → soLoadInventoryItems()
      Renamed loadReceiptStatuses() → soLoadReceiptStatuses()
      Renamed loadShippingStatuses()→ soLoadShippingStatuses()
      Renamed loadNextSalesDetailNumber() → soLoadNextDetailNumber()
      Renamed populateCustomerDropdown()  → soPopulateCustomerDropdown()
      Renamed updateAllItemRowsWithHeaderData() →
              soUpdateAllItemRowsWithHeaderData()
      All renamed to prevent collisions with same-named functions
      in other modules sharing the global scope via Index.html.
   ============================================================ */

console.log('Sales.js loaded');

/* ---- Global State ---- */
let soCurrentPage       = 1;
const soPageSize        = 25;
let soAllSOs            = [];
let soFilteredSOs       = [];
let soCustomers         = [];
let soInventoryItems    = [];
let soReceiptStatuses   = [];
let soShippingStatuses  = [];
let soIsEditMode        = false;
let soCurrentSOID       = null;
let soDetailCounter     = 1;
let soNextDetailNumber  = null;   // tracks next detail number within a session


/* ---- CSRF Helper ---- */
function soGetCSRFToken() {
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
function initSales() {
    console.log('✅ Sales module initialised');

    soLoadCustomers();
    soLoadInventoryItems();
    soLoadReceiptStatuses();
    soLoadShippingStatuses();
    soLoadSalesOrders();
    soLoadNextDetailNumber();
    soInitializeDatePicker();

    /* Header field change listeners */
    document.getElementById('soSODate')    .addEventListener('change', soUpdateAllItemRowsWithHeaderData);
    document.getElementById('soSOID')      .addEventListener('change', soUpdateAllItemRowsWithHeaderData);
    document.getElementById('soInvoiceNum').addEventListener('change', soUpdateAllItemRowsWithHeaderData);

    /* Close modals when clicking the backdrop.
       FIXED: original used undefined vars pmtModal / shipModal
       and called soReceiptStatusModal() instead of soCloseReceiptStatusModal() */
    window.addEventListener('click', function (event) {
        const soModal            = document.getElementById('soNewSOModal');
        const soReceiptModal     = document.getElementById('soReceiptStatusModal');
        const soShippingModal    = document.getElementById('soShippingStatusModal');

        if (event.target === soModal)         soCloseNewSOModal();
        if (event.target === soReceiptModal)  soCloseReceiptStatusModal();
        if (event.target === soShippingModal) soCloseShippingStatusModal();
    });
}


/* ---- Flatpickr date picker ---- */
function soInitializeDatePicker() {
    flatpickr('#soSODate', {
        dateFormat: 'd/m/Y',
        allowInput: true
    });
}


/* ============================================================
   DATA LOADING
   ============================================================ */
async function soLoadCustomers() {
    try {
        const res    = await fetch('/api/customers/', {
            headers: { 'Content-Type': 'application/json', 'X-CSRFToken': soGetCSRFToken() },
            credentials: 'same-origin'
        });
        const result = await res.json();
        if (result.success) {
            soCustomers = result.data;
            soPopulateCustomerDropdown();
        }
    } catch (err) { console.error('Error loading customers:', err); }
}

async function soLoadInventoryItems() {
    try {
        const res    = await fetch('/api/inventory-items/', {
            headers: { 'Content-Type': 'application/json', 'X-CSRFToken': soGetCSRFToken() },
            credentials: 'same-origin'
        });
        const result = await res.json();
        if (result.success) soInventoryItems = result.data;
    } catch (err) { console.error('Error loading inventory items:', err); }
}

async function soLoadReceiptStatuses() {
    try {
        const res    = await fetch('/api/sales/receipt-statuses/', {
            headers: { 'Content-Type': 'application/json', 'X-CSRFToken': soGetCSRFToken() },
            credentials: 'same-origin'
        });
        const result = await res.json();
        if (result.success) soReceiptStatuses = result.data;
    } catch (err) { console.error('Error loading receipt statuses:', err); }
}

async function soLoadShippingStatuses() {
    try {
        const res    = await fetch('/api/sales/shipping-statuses/', {
            headers: { 'Content-Type': 'application/json', 'X-CSRFToken': soGetCSRFToken() },
            credentials: 'same-origin'
        });
        const result = await res.json();
        if (result.success) soShippingStatuses = result.data;
    } catch (err) { console.error('Error loading shipping statuses:', err); }
}

async function soLoadSalesOrders() {
    soShowProcessing();
    try {
        const res    = await fetch('/api/sales/', {
            headers: { 'Content-Type': 'application/json', 'X-CSRFToken': soGetCSRFToken() },
            credentials: 'same-origin'
        });
        const result = await res.json();
        if (result.success) {
            soAllSOs      = result.data;
            soFilteredSOs = [...result.data];
            soRenderTable();
        } else {
            alert('Error loading sales orders: ' + result.message);
        }
    } catch (err) {
        console.error('Error loading sales orders:', err);
        alert('Failed to load sales orders');
    } finally {
        soHideProcessing();
    }
}

async function soLoadNextDetailNumber() {
    try {
        const res    = await fetch('/api/sales/get-next-detail-number/', {
            headers: { 'Content-Type': 'application/json', 'X-CSRFToken': soGetCSRFToken() },
            credentials: 'same-origin'
        });
        const result = await res.json();
        if (result.success) {
            soNextDetailNumber = result.next_number;
            console.log(`📊 Loaded next Sales Detail number: ${soNextDetailNumber}`);
        } else {
            console.error('Failed to load next detail number');
            soNextDetailNumber = 1;
        }
    } catch (err) {
        console.error('Error loading next detail number:', err);
        soNextDetailNumber = 1;
    }
}


/* ============================================================
   CUSTOMER DROPDOWN
   ============================================================ */
function soPopulateCustomerDropdown() {
    const sel = $('#soCustomerName');
    sel.empty().append(new Option('Select Customer', '', true, true));
    soCustomers.forEach(customer => {
        if (customer) sel.append(new Option(customer.name, customer.name));
    });

    sel.select2({
        placeholder: 'Select Customer',
        allowClear: true,
        dropdownParent: $('#soNewSOModal')
    });

    sel.on('change', function () { soCustomerChanged(); });
}

function soCustomerChanged() {
    const customerName = $('#soCustomerName').val();
    const customer     = soCustomers.find(c => c.name === customerName);

    if (customer) {
        document.getElementById('soCustomerID').value = customer.id;
        document.getElementById('soCounty').value     = customer.state;
        document.getElementById('soTown').value       = customer.city;
        soUpdateAllItemRowsWithHeaderData();
    } else {
        document.getElementById('soCustomerID').value = '';
        document.getElementById('soCounty').value     = '';
        document.getElementById('soTown').value       = '';
    }
}


/* ============================================================
   TABLE RENDERING
   ============================================================ */
function soRenderTable() {
    const start   = (soCurrentPage - 1) * soPageSize;
    const pageSOs = soFilteredSOs.slice(start, start + soPageSize);
    const tbody   = document.getElementById('soTableBody');

    tbody.innerHTML = '';

    if (pageSOs.length === 0) {
        document.getElementById('soTableContainer').style.display = 'none';
        document.getElementById('soNoData').style.display         = 'block';
        document.getElementById('soPagination').innerHTML         = '';
        return;
    }

    document.getElementById('soTableContainer').style.display = 'block';
    document.getElementById('soNoData').style.display         = 'none';

    pageSOs.forEach(so => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${so.so_id}</td>
            <td>${so.date}</td>
            <td>${so.customer_id}</td>
            <td>${so.customer_name}</td>
            <td>${so.invoice_number}</td>
            <td>${so.county || ''}</td>
            <td>${so.town || ''}</td>
            <td>${parseFloat(so.total_amount).toFixed(2)}</td>
            <td>${parseFloat(so.amount_received).toFixed(2)}</td>
            <td>${parseFloat(so.balance_left).toFixed(2)}</td>
            <td>${so.receipt_status || ''}</td>
            <td>${so.shipping_status || ''}</td>
            <td class="action-cell">
                <button class="action-btn view-btn" onclick="soViewSO('${so.so_id}')">
                    <i class="fas fa-eye"></i> View
                </button>
            </td>
        `;
        tbody.appendChild(row);
    });

    soRenderPagination();
}

function soRenderPagination() {
    const total  = Math.ceil(soFilteredSOs.length / soPageSize);
    const pagDiv = document.getElementById('soPagination');
    pagDiv.innerHTML = '';

    if (total <= 1) return;

    const prev     = document.createElement('button');
    prev.className = 'page-btn';
    prev.innerHTML = '<i class="fas fa-chevron-left"></i>';
    prev.disabled  = soCurrentPage === 1;
    prev.onclick   = () => { if (soCurrentPage > 1) { soCurrentPage--; soRenderTable(); } };
    pagDiv.appendChild(prev);

    for (let i = 1; i <= total; i++) {
        const btn       = document.createElement('button');
        btn.className   = `page-btn ${i === soCurrentPage ? 'active' : ''}`;
        btn.textContent = i;
        btn.onclick     = () => { soCurrentPage = i; soRenderTable(); };
        pagDiv.appendChild(btn);
    }

    const next     = document.createElement('button');
    next.className = 'page-btn';
    next.innerHTML = '<i class="fas fa-chevron-right"></i>';
    next.disabled  = soCurrentPage === total;
    next.onclick   = () => { if (soCurrentPage < total) { soCurrentPage++; soRenderTable(); } };
    pagDiv.appendChild(next);
}


/* ============================================================
   NEW / EDIT SO MODAL
   ============================================================ */
function soOpenNewSOModal() {
    soIsEditMode  = false;
    soCurrentSOID = null;

    document.getElementById('soModalTitle').textContent        = 'Create New Sales Order';
    document.getElementById('soSaveBtn').textContent           = 'Save SO';
    document.getElementById('soGenerateBtn').style.display     = 'inline-block';

    /* Clear header fields */
    document.getElementById('soSOID').value       = '';
    document.getElementById('soSODate').value     = '';
    document.getElementById('soCustomerID').value = '';
    document.getElementById('soCounty').value     = '';
    document.getElementById('soTown').value       = '';
    document.getElementById('soInvoiceNum').value = '';
    $('#soCustomerName').val('').trigger('change');

    /* Clear items table */
    document.getElementById('soItemsTableBody').innerHTML = '';

    /* Reload next detail number so it stays current */
    soLoadNextDetailNumber();

    document.getElementById('soNewSOModal').style.display = 'block';
}

function soCloseNewSOModal() {
    document.getElementById('soNewSOModal').style.display = 'none';
}

async function soGenerateSOID() {
    soShowProcessing();
    try {
        const res    = await fetch('/api/sales/generate-so-id/', {
            headers: { 'Content-Type': 'application/json', 'X-CSRFToken': soGetCSRFToken() },
            credentials: 'same-origin'
        });
        const result = await res.json();
        if (result.success) {
            document.getElementById('soSOID').value       = result.so_id;
            document.getElementById('soInvoiceNum').value = result.invoice_number;
            soUpdateAllItemRowsWithHeaderData();
        } else {
            alert('Error generating SO ID: ' + result.message);
        }
    } catch (err) {
        console.error('Error generating SO ID:', err);
        alert('Failed to generate SO ID');
    } finally {
        soHideProcessing();
    }
}


/* ============================================================
   ITEM ROWS — Add / Remove / Existing
   ============================================================ */
async function soAddItemRow() {
    const soID         = document.getElementById('soSOID').value;
    const soDate       = document.getElementById('soSODate').value;
    const customerID   = document.getElementById('soCustomerID').value;
    const customerName = $('#soCustomerName').val();
    const county       = document.getElementById('soCounty').value;
    const town         = document.getElementById('soTown').value;
    const invoiceNum   = document.getElementById('soInvoiceNum').value;

    if (!soID || !soDate || !customerName) {
        alert('Please fill SO ID, Date, and Customer Name first');
        return;
    }

    /* Scan existing rows to keep soNextDetailNumber consistent */
    const existingDetailIDs = new Set();
    $('#soItemsTableBody tr').each(function () {
        const detailID = $(this).attr('data-detail-id');
        if (detailID) {
            existingDetailIDs.add(detailID);
            const num = parseInt(detailID.substring(2));
            if (num >= soNextDetailNumber) soNextDetailNumber = num + 1;
        }
    });

    /* Generate unique Detail ID */
    let detailID = `SD${soNextDetailNumber.toString().padStart(5, '0')}`;
    while (existingDetailIDs.has(detailID)) {
        soNextDetailNumber++;
        detailID = `SD${soNextDetailNumber.toString().padStart(5, '0')}`;
    }
    soNextDetailNumber++;

    console.log(`🆕 Generated Sales Detail ID: ${detailID}`);

    const tbody = document.getElementById('soItemsTableBody');
    const row   = document.createElement('tr');
    row.setAttribute('data-detail-id', detailID);

    let itemOptions = '<option value="">Select Item</option>';
    soInventoryItems.forEach(item => {
        itemOptions += `<option value="${item.name}"
            data-item-id="${item.id}"
            data-type="${item.type}"
            data-category="${item.category}"
            data-subcategory="${item.subcategory}"
            data-sale-price="${item.sale_price}">${item.name}</option>`;
    });

    row.innerHTML = `
        <td><input type="text" class="readonly" value="${soDate}" readonly></td>
        <td><input type="text" class="readonly" value="${soID}" readonly></td>
        <td><input type="text" class="readonly" value="${detailID}" readonly></td>
        <td><input type="text" class="readonly" value="${customerID}" readonly></td>
        <td><input type="text" class="readonly" value="${customerName}" readonly></td>
        <td><input type="text" class="readonly" value="${county}" readonly></td>
        <td><input type="text" class="readonly" value="${town}" readonly></td>
        <td><input type="text" class="readonly" value="${invoiceNum}" readonly></td>
        <td><input type="text" class="readonly item-id" value="" readonly></td>
        <td><input type="text" class="readonly item-type" value="" readonly></td>
        <td><input type="text" class="readonly item-category" value="" readonly></td>
        <td><input type="text" class="readonly item-subcategory" value="" readonly></td>
        <td><select class="item-name-select" style="min-width: 200px;">${itemOptions}</select></td>
        <td><input type="number" class="qty-input" min="1" value="1"></td>
        <td><input type="text" class="readonly unit-price" value="0.00" readonly></td>
        <td><input type="text" class="readonly price-excl-tax" value="0.00" readonly></td>
        <td><input type="number" class="tax-rate-input" step="0.01" min="0" value="0"></td>
        <td><input type="text" class="readonly total-tax" value="0.00" readonly></td>
        <td><input type="text" class="readonly price-incl-tax" value="0.00" readonly></td>
        <td><input type="text" class="readonly shipping-fees" value="0.00" readonly></td>
        <td><input type="text" class="readonly total-price" value="0.00" readonly></td>
        <td>
            <button class="remove-item-btn" onclick="soRemoveItemRow(this)">
                <i class="fas fa-trash"></i>
            </button>
        </td>
    `;

    tbody.appendChild(row);

    $(row).find('.item-name-select').select2({
        placeholder: 'Select Item',
        allowClear: true,
        dropdownParent: $('#soNewSOModal')
    }).on('change', function () { soItemChanged(this); });

    $(row).find('.qty-input, .tax-rate-input').on('input', function () {
        soCalculateRowTotals(row);
    });
}

async function soAddExistingItemRow(detail) {
    const tbody = document.getElementById('soItemsTableBody');
    const row   = document.createElement('tr');
    row.setAttribute('data-detail-id', detail.detail_id);
    row.setAttribute('data-original-qty', detail.quantity_sold);

    let itemOptions = '<option value="">Select Item</option>';
    soInventoryItems.forEach(item => {
        const sel = item.name === detail.item_name ? 'selected' : '';
        itemOptions += `<option value="${item.name}"
            data-item-id="${item.id}"
            data-type="${item.type}"
            data-category="${item.category}"
            data-subcategory="${item.subcategory}"
            data-sale-price="${item.sale_price}" ${sel}>${item.name}</option>`;
    });

    row.innerHTML = `
        <td><input type="text" class="readonly" value="${detail.date}" readonly></td>
        <td><input type="text" class="readonly" value="${detail.so_id}" readonly></td>
        <td><input type="text" class="readonly" value="${detail.detail_id}" readonly></td>
        <td><input type="text" class="readonly" value="${detail.customer_id}" readonly></td>
        <td><input type="text" class="readonly" value="${detail.customer_name}" readonly></td>
        <td><input type="text" class="readonly" value="${detail.county || ''}" readonly></td>
        <td><input type="text" class="readonly" value="${detail.town || ''}" readonly></td>
        <td><input type="text" class="readonly" value="${detail.invoice_number}" readonly></td>
        <td><input type="text" class="readonly item-id" value="${detail.item_id}" readonly></td>
        <td><input type="text" class="readonly item-type" value="${detail.item_type}" readonly></td>
        <td><input type="text" class="readonly item-category" value="${detail.item_category}" readonly></td>
        <td><input type="text" class="readonly item-subcategory" value="${detail.item_subcategory}" readonly></td>
        <td><select class="item-name-select" style="min-width: 200px;">${itemOptions}</select></td>
        <td><input type="number" class="qty-input" min="1" value="${detail.quantity_sold}"></td>
        <td><input type="text" class="readonly unit-price" value="${parseFloat(detail.unit_price).toFixed(2)}" readonly></td>
        <td><input type="text" class="readonly price-excl-tax" value="${parseFloat(detail.price_excluding_tax).toFixed(2)}" readonly></td>
        <td><input type="number" class="tax-rate-input" step="0.01" min="0" value="${parseFloat(detail.tax_rate)}"></td>
        <td><input type="text" class="readonly total-tax" value="${parseFloat(detail.total_tax).toFixed(2)}" readonly></td>
        <td><input type="text" class="readonly price-incl-tax" value="${parseFloat(detail.price_including_tax).toFixed(2)}" readonly></td>
        <td><input type="text" class="readonly shipping-fees" value="${parseFloat(detail.shipping_fees).toFixed(2)}" readonly></td>
        <td><input type="text" class="readonly total-price" value="${parseFloat(detail.total_sales_price).toFixed(2)}" readonly></td>
        <td>
            <button class="remove-item-btn" onclick="soDeleteItemRow(this, '${detail.detail_id}')">
                <i class="fas fa-trash"></i>
            </button>
        </td>
    `;

    tbody.appendChild(row);

    $(row).find('.item-name-select').select2({
        placeholder: 'Select Item',
        allowClear: true,
        dropdownParent: $('#soNewSOModal')
    }).on('change', function () { soItemChanged(this); });

    $(row).find('.qty-input, .tax-rate-input').on('input', function () {
        soCalculateRowTotals(row);
    });
}

function soRemoveItemRow(button) {
    if (confirm('Are you sure you want to remove this item?')) {
        button.closest('tr').remove();
    }
}

async function soDeleteItemRow(button, detailID) {
    if (!confirm('Are you sure you want to delete this item? This will update inventory quantities.')) return;

    soShowProcessing();
    try {
        const res    = await fetch('/api/sales/delete-detail/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-CSRFToken': soGetCSRFToken() },
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
        soHideProcessing();
    }
}


/* ============================================================
   ITEM CALCULATIONS
   ============================================================ */
function soItemChanged(selectElement) {
    const row            = selectElement.closest('tr');
    const selectedOption = selectElement.options[selectElement.selectedIndex];

    if (selectedOption.value) {
        $(row).find('.item-id')         .val(selectedOption.getAttribute('data-item-id'));
        $(row).find('.item-type')       .val(selectedOption.getAttribute('data-type'));
        $(row).find('.item-category')   .val(selectedOption.getAttribute('data-category'));
        $(row).find('.item-subcategory').val(selectedOption.getAttribute('data-subcategory'));
        $(row).find('.unit-price')      .val((parseFloat(selectedOption.getAttribute('data-sale-price')) || 0).toFixed(2));
    } else {
        $(row).find('.item-id, .item-type, .item-category, .item-subcategory').val('');
        $(row).find('.unit-price').val('0.00');
    }

    soCalculateRowTotals(row);
}

function soCalculateRowTotals(row) {
    const qty          = parseFloat($(row).find('.qty-input').val())       || 0;
    const unitPrice    = parseFloat($(row).find('.unit-price').val())       || 0;
    const taxRate      = parseFloat($(row).find('.tax-rate-input').val())   || 0;

    const priceExclTax  = qty * unitPrice;
    const totalTax      = priceExclTax * (taxRate / 100);
    const priceInclTax  = priceExclTax + totalTax;
    const shippingFees  = priceInclTax * 0.02;   // Sales shipping = 2%
    const totalPrice    = priceInclTax + shippingFees;

    $(row).find('.price-excl-tax') .val(priceExclTax.toFixed(2));
    $(row).find('.total-tax')      .val(totalTax.toFixed(2));
    $(row).find('.price-incl-tax') .val(priceInclTax.toFixed(2));
    $(row).find('.shipping-fees')  .val(shippingFees.toFixed(2));
    $(row).find('.total-price')    .val(totalPrice.toFixed(2));
}

function soUpdateAllItemRowsWithHeaderData() {
    const soID         = document.getElementById('soSOID').value;
    const soDate       = document.getElementById('soSODate').value;
    const customerID   = document.getElementById('soCustomerID').value;
    const customerName = $('#soCustomerName').val();
    const county       = document.getElementById('soCounty').value;
    const town         = document.getElementById('soTown').value;
    const invoiceNum   = document.getElementById('soInvoiceNum').value;

    $('#soItemsTableBody tr').each(function () {
        const inputs = $(this).find('input');
        inputs.eq(0).val(soDate);
        inputs.eq(1).val(soID);
        inputs.eq(3).val(customerID);
        inputs.eq(4).val(customerName);
        inputs.eq(5).val(county);
        inputs.eq(6).val(town);
        inputs.eq(7).val(invoiceNum);
    });
}


/* ============================================================
   SAVE SO
   ============================================================ */
async function soSaveNewSO() {
    const soID         = document.getElementById('soSOID').value.trim();
    const soDate       = document.getElementById('soSODate').value.trim();
    const customerName = $('#soCustomerName').val();
    const customerID   = document.getElementById('soCustomerID').value.trim();
    const county       = document.getElementById('soCounty').value.trim();
    const town         = document.getElementById('soTown').value.trim();
    const invoiceNum   = document.getElementById('soInvoiceNum').value.trim();

    if (!soID || !soDate || !customerName || !invoiceNum) {
        alert('Please fill all required fields in SO Information');
        return;
    }

    const items    = [];
    let hasError   = false;

    $('#soItemsTableBody tr').each(function () {
        const detailID        = $(this).attr('data-detail-id');
        const itemName        = $(this).find('.item-name-select').val();
        const itemID          = $(this).find('.item-id').val();
        const itemType        = $(this).find('.item-type').val();
        const itemCategory    = $(this).find('.item-category').val();
        const itemSubcategory = $(this).find('.item-subcategory').val();
        const qty             = parseInt($(this).find('.qty-input').val())         || 0;
        const unitPrice       = parseFloat($(this).find('.unit-price').val())       || 0;
        const taxRate         = parseFloat($(this).find('.tax-rate-input').val())   || 0;
        const priceExclTax    = parseFloat($(this).find('.price-excl-tax').val())   || 0;
        const totalTax        = parseFloat($(this).find('.total-tax').val())         || 0;
        const priceInclTax    = parseFloat($(this).find('.price-incl-tax').val())   || 0;
        const shippingFees    = parseFloat($(this).find('.shipping-fees').val())    || 0;
        const totalPrice      = parseFloat($(this).find('.total-price').val())      || 0;

        if (!itemName || qty <= 0) {
            alert('Please fill all item details correctly');
            hasError = true;
            return false;
        }

        items.push({
            detail_id:          detailID,
            date:               soDate,
            so_id:              soID,
            customer_id:        customerID,
            customer_name:      customerName,
            county:             county,
            town:               town,
            invoice_number:     invoiceNum,
            item_id:            itemID,
            item_type:          itemType,
            item_category:      itemCategory,
            item_subcategory:   itemSubcategory,
            item_name:          itemName,
            quantity_sold:      qty,
            unit_price:         unitPrice,
            tax_rate:           taxRate,
            price_excluding_tax: priceExclTax,
            total_tax:          totalTax,
            price_including_tax: priceInclTax,
            shipping_fees:      shippingFees,
            total_sales_price:  totalPrice
        });
    });

    if (hasError) return;
    if (items.length === 0) { alert('Please add at least one item'); return; }

    const soData = {
        so_id:         soID,
        date:          soDate,
        customer_id:   customerID,
        customer_name: customerName,
        county:        county,
        town:          town,
        invoice_number: invoiceNum,
        items:         items
    };

    soShowProcessing();
    try {
        const url    = soIsEditMode ? '/api/sales/update/' : '/api/sales/add/';
        const res    = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-CSRFToken': soGetCSRFToken() },
            credentials: 'same-origin',
            body: JSON.stringify(soData)
        });
        const result = await res.json();
        if (result.success) {
            alert(soIsEditMode ? '✅ Sales Order Updated Successfully' : '✅ Sales Order Saved Successfully');
            soCloseNewSOModal();
            await soLoadSalesOrders();
        } else {
            alert('Error: ' + result.message);
        }
    } catch (err) {
        console.error('Error saving SO:', err);
        alert('Failed to save sales order');
    } finally {
        soHideProcessing();
    }
}


/* ============================================================
   VIEW / EDIT SO
   ============================================================ */
async function soViewSO(soID) {
    soShowProcessing();
    try {
        const res    = await fetch(`/api/sales/details/${soID}/`, {
            headers: { 'Content-Type': 'application/json', 'X-CSRFToken': soGetCSRFToken() },
            credentials: 'same-origin'
        });
        const result = await res.json();
        if (result.success) {
            soIsEditMode  = true;
            soCurrentSOID = soID;

            document.getElementById('soModalTitle').textContent    = 'Update Sales Order';
            document.getElementById('soSaveBtn').textContent       = 'Update SO';
            document.getElementById('soGenerateBtn').style.display = 'none';

            const so = result.data.sales_order;
            document.getElementById('soSOID').value       = so.so_id;
            document.getElementById('soSODate').value     = so.date;
            document.getElementById('soCustomerID').value = so.customer_id;
            document.getElementById('soCounty').value     = so.county || '';
            document.getElementById('soTown').value       = so.town   || '';
            document.getElementById('soInvoiceNum').value = so.invoice_number;
            $('#soCustomerName').val(so.customer_name).trigger('change');

            document.getElementById('soItemsTableBody').innerHTML = '';
            for (const detail of result.data.sales_details) {
                await soAddExistingItemRow(detail);
            }

            document.getElementById('soNewSOModal').style.display = 'block';
        } else {
            alert('Error loading SO details: ' + result.message);
        }
    } catch (err) {
        console.error('Error loading SO:', err);
        alert('Failed to load sales order');
    } finally {
        soHideProcessing();
    }
}


/* ============================================================
   SEARCH
   ============================================================ */
function soSearchSOs() {
    soShowProcessing();
    const criteria = document.getElementById('soSearchCriteria').value;
    const query    = document.getElementById('soSearchInput').value.toLowerCase().trim();

    if (!query) {
        soFilteredSOs = [...soAllSOs];
    } else {
        soFilteredSOs = soAllSOs.filter(so => {
            switch (criteria) {
                case 'SO ID':           return so.so_id.toLowerCase().includes(query);
                case 'Customer Name':   return so.customer_name.toLowerCase().includes(query);
                case 'Invoice Num':     return so.invoice_number.toLowerCase().includes(query);
                case 'Receipt Status':  return so.receipt_status  && so.receipt_status.toLowerCase().includes(query);
                case 'Shipping Status': return so.shipping_status && so.shipping_status.toLowerCase().includes(query);
                default:
                    return (
                        so.so_id.toLowerCase().includes(query) ||
                        so.customer_name.toLowerCase().includes(query) ||
                        so.invoice_number.toLowerCase().includes(query) ||
                        (so.receipt_status  && so.receipt_status.toLowerCase().includes(query))  ||
                        (so.shipping_status && so.shipping_status.toLowerCase().includes(query))
                    );
            }
        });
    }

    soCurrentPage = 1;
    soRenderTable();
    if (soFilteredSOs.length === 0 && query) alert('No matching data found');
    soHideProcessing();
}

function soClearSearch() {
    soShowProcessing();
    document.getElementById('soSearchInput').value    = '';
    document.getElementById('soSearchCriteria').value = 'all';
    soFilteredSOs = [...soAllSOs];
    soCurrentPage = 1;
    soRenderTable();
    soHideProcessing();
}


/* ============================================================
   RECEIPT STATUS MODAL
   ============================================================ */
function soOpenReceiptStatusModal() {
    document.getElementById('soReceiptStatusModal').style.display = 'block';
    document.getElementById('soNewReceiptStatus').value           = '';
}

function soCloseReceiptStatusModal() {
    document.getElementById('soReceiptStatusModal').style.display = 'none';
}

async function soSaveNewReceiptStatus() {
    const name = document.getElementById('soNewReceiptStatus').value.trim();
    if (!name) { alert('Please enter a receipt status'); return; }

    soShowProcessing();
    try {
        const res    = await fetch('/api/sales/receipt-statuses/add/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-CSRFToken': soGetCSRFToken() },
            credentials: 'same-origin',
            body: JSON.stringify({ status_name: name })
        });
        const result = await res.json();
        if (result.success) {
            alert('✅ Receipt Status Added Successfully');
            soCloseReceiptStatusModal();
            await soLoadReceiptStatuses();
        } else {
            alert('Error: ' + result.message);
        }
    } catch (err) {
        console.error('Error saving receipt status:', err);
        alert('Failed to add receipt status');
    } finally {
        soHideProcessing();
    }
}


/* ============================================================
   SHIPPING STATUS MODAL
   ============================================================ */
function soOpenShippingStatusModal() {
    document.getElementById('soShippingStatusModal').style.display = 'block';
    document.getElementById('soNewShippingStatus').value           = '';
}

function soCloseShippingStatusModal() {
    document.getElementById('soShippingStatusModal').style.display = 'none';
}

async function soSaveNewShippingStatus() {
    const name = document.getElementById('soNewShippingStatus').value.trim();
    if (!name) { alert('Please enter a shipping status'); return; }

    soShowProcessing();
    try {
        /* BUG FIX: original used '/api/purchases/shipping-statuses/add/'
           which is the Purchases endpoint. Corrected to Sales endpoint. */
        const res    = await fetch('/api/sales/shipping-statuses/add/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-CSRFToken': soGetCSRFToken() },
            credentials: 'same-origin',
            body: JSON.stringify({ status_name: name })
        });
        const result = await res.json();
        if (result.success) {
            alert('✅ Shipping Status Added Successfully');
            soCloseShippingStatusModal();
            await soLoadShippingStatuses();
        } else {
            alert('Error: ' + result.message);
        }
    } catch (err) {
        console.error('Error saving shipping status:', err);
        alert('Failed to add shipping status');
    } finally {
        soHideProcessing();
    }
}


/* ============================================================
   PROCESSING OVERLAY
   ============================================================ */
function soShowProcessing() {
    const el = document.getElementById('soProcessingOverlay');
    if (el) el.style.display = 'flex';
}

function soHideProcessing() {
    const el = document.getElementById('soProcessingOverlay');
    if (el) el.style.display = 'none';
}

console.log('✅ Sales.js complete');