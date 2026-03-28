/* ============================================================
   PAYMENTS.JS
   Extracted from the standalone Payments.html.
   Loaded by the Payments.html partial template via:
       <script src="{% static 'Payments.js' %}"></script>
       <script>initPayments();</script>

   CHANGES FROM ORIGINAL:
   1. Removed document.addEventListener('DOMContentLoaded', ...)
      All setup code now lives inside initPayments() which is
      called directly by the partial template after this script
      loads. Everything else is identical to the original.
   ============================================================ */

console.log('Payments module loaded');

/* ---- Global State ---- */
let currentPage     = 1;
const pageSize      = 25;
let allPayments     = [];
let filteredPayments = [];
let suppliers       = [];
let purchaseOrders  = [];
let paymentModes    = [];
let paymentToDelete = null;


/* ---- CSRF Helpers ---- */
function getCSRFToken() {
    const metaTag = document.querySelector('meta[name="csrf-token"]');
    if (metaTag) return metaTag.getAttribute('content');

    const cookieToken = getCookie('csrftoken');
    if (cookieToken) return cookieToken;

    return null;
}

function getCookie(name) {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
            if (cookie.substring(0, name.length + 1) === (name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}


/* ============================================================
   ENTRY POINT — called directly by the partial template
   ============================================================ */
function initPayments() {
    console.log('DOM loaded, initializing...');

    /* Initialize date picker */
    flatpickr('#paymentDate', {
        dateFormat: 'd/m/Y',
        allowInput: true
    });

    /* Set up event listeners */
    document.getElementById('btnNewPayment')          .addEventListener('click', openNewPaymentModal);
    document.getElementById('btnAddPaymentMode')      .addEventListener('click', openPaymentModeModal);
    document.getElementById('btnSearch')              .addEventListener('click', searchPayments);
    document.getElementById('btnClear')               .addEventListener('click', clearSearch);

    /* Payment Mode Modal */
    document.getElementById('closePaymentModeModal')   .addEventListener('click', closePaymentModeModal);
    document.getElementById('btnClosePaymentModeModal').addEventListener('click', closePaymentModeModal);
    document.getElementById('btnSavePaymentMode')      .addEventListener('click', saveNewPaymentMode);

    /* Payment Modal */
    document.getElementById('closePaymentModal')   .addEventListener('click', closePaymentModal);
    document.getElementById('btnClosePaymentModal').addEventListener('click', closePaymentModal);
    document.getElementById('btnGenerateId')       .addEventListener('click', generateTransactionId);
    document.getElementById('btnSavePayment')      .addEventListener('click', savePayment);

    /* Initialize Select2 */
    initializeSelect2();

    /* Load data */
    loadSuppliers();
    loadPurchaseOrders();
    loadPaymentModes();
    loadPayments();

    /* Close modals when clicking outside */
    window.addEventListener('click', function (event) {
        const paymentModal     = document.getElementById('paymentModal');
        const paymentModeModal = document.getElementById('paymentModeModal');
        const deleteModal      = document.getElementById('deleteConfirmModal');

        if (event.target === paymentModal)     closePaymentModal();
        if (event.target === paymentModeModal) closePaymentModeModal();
        if (event.target === deleteModal)      closeDeleteModal();
    });

    console.log('Initialization complete');
}


function initializeSelect2() {
    $('#supplierName').select2({
        placeholder: 'Select Supplier',
        allowClear: true,
        dropdownParent: $('#paymentModal'),
        width: '100%'
    }).on('change', supplierChanged);

    $('#poId').select2({
        placeholder: 'Select PO ID',
        allowClear: true,
        dropdownParent: $('#paymentModal'),
        width: '100%'
    }).on('change', poChanged);

    $('#paymentMode').select2({
        placeholder: 'Select Payment Mode',
        allowClear: true,
        dropdownParent: $('#paymentModal'),
        width: '100%'
    });
}


/* ============================================================
   LOAD DATA FUNCTIONS
   ============================================================ */
async function loadSuppliers() {
    try {
        const response = await fetch('/api/suppliers/', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCSRFToken()
            },
            credentials: 'same-origin'
        });
        const result = await response.json();
        if (result.success) {
            suppliers = result.data;
            populateSupplierDropdown();
        }
    } catch (error) {
        console.error('Error loading suppliers:', error);
    }
}

async function loadPurchaseOrders() {
    try {
        const response = await fetch('/api/purchases/', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCSRFToken()
            },
            credentials: 'same-origin'
        });
        const result = await response.json();
        if (result.success) purchaseOrders = result.data;
    } catch (error) {
        console.error('Error loading purchase orders:', error);
    }
}

async function loadPaymentModes() {
    try {
        const response = await fetch('/api/payments/payment-modes/', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCSRFToken()
            },
            credentials: 'same-origin'
        });
        const result = await response.json();
        if (result.success) {
            paymentModes = result.data;
            populatePaymentModeDropdown();
        }
    } catch (error) {
        console.error('Error loading payment modes:', error);
    }
}

async function loadPayments() {
    showProcessing();
    try {
        const response = await fetch('/api/payments/', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCSRFToken()
            },
            credentials: 'same-origin'
        });
        const result = await response.json();
        if (result.success) {
            allPayments      = result.data;
            filteredPayments = [...result.data];
            renderPaymentTable();
        } else {
            alert('Error loading payments: ' + result.message);
        }
    } catch (error) {
        console.error('Error loading payments:', error);
        alert('Failed to load payments');
    } finally {
        hideProcessing();
    }
}


/* ============================================================
   POPULATE DROPDOWNS
   ============================================================ */
function populateSupplierDropdown() {
    const supplierSelect = $('#supplierName');
    supplierSelect.empty();
    supplierSelect.append(new Option('Select Supplier', '', true, true));
    suppliers.forEach(supplier => {
        supplierSelect.append(new Option(supplier.name, supplier.name));
    });
    supplierSelect.trigger('change');
}

function populatePaymentModeDropdown() {
    const modeSelect = $('#paymentMode');
    modeSelect.empty();
    modeSelect.append(new Option('Select Payment Mode', '', true, true));
    paymentModes.forEach(mode => {
        modeSelect.append(new Option(mode, mode));
    });
    modeSelect.trigger('change');
}


/* ============================================================
   DROPDOWN CHANGE EVENTS
   ============================================================ */
function supplierChanged() {
    const supplierName = $('#supplierName').val();

    if (!supplierName) {
        $('#supplierId').val('');
        $('#county').val('');
        $('#town').val('');
        $('#poId').empty().append(new Option('Select PO ID', '', true, true)).trigger('change');
        document.getElementById('balanceInfo').style.display = 'none';
        return;
    }

    const supplier = suppliers.find(s => s.name === supplierName);

    if (supplier) {
        $('#supplierId').val(supplier.id);
        $('#county').val(supplier.state || '');
        $('#town').val(supplier.city || '');

        const supplierPOs = purchaseOrders.filter(po =>
            po.supplier_name === supplierName &&
            parseFloat(po.balance_left) > 0
        );

        const poSelect = $('#poId');
        poSelect.empty();
        poSelect.append(new Option('Select PO ID', '', true, true));

        if (supplierPOs.length === 0) {
            poSelect.append(new Option('No outstanding POs', '', false, false));
        } else {
            supplierPOs.forEach(po => {
                const balance = parseFloat(po.balance_left).toFixed(2);
                poSelect.append(new Option(`${po.po_id} (Balance: ${balance})`, po.po_id));
            });
        }

        poSelect.trigger('change');
        document.getElementById('balanceInfo').style.display = 'none';
    }
}

function poChanged() {
    const poId = $('#poId').val();
    const po   = purchaseOrders.find(p => p.po_id === poId);

    if (po) {
        $('#billNumber').val(po.bill_number);

        const totalAmount = parseFloat(po.total_amount);
        const amountPaid  = parseFloat(po.amount_paid);
        const balance     = totalAmount - amountPaid;

        document.getElementById('poTotalAmount').textContent = totalAmount.toFixed(2);
        document.getElementById('poAmountPaid').textContent  = amountPaid.toFixed(2);
        document.getElementById('poBalance').textContent     = balance.toFixed(2);

        document.getElementById('balanceInfo').style.display = 'block';
    } else {
        $('#billNumber').val('');
        document.getElementById('balanceInfo').style.display = 'none';
    }
}


/* ============================================================
   RENDER PAYMENT TABLE
   ============================================================ */
function renderPaymentTable() {
    const startIndex  = (currentPage - 1) * pageSize;
    const endIndex    = startIndex + pageSize;
    const pagePayments = filteredPayments.slice(startIndex, endIndex);
    const tableBody   = document.getElementById('tableBody');

    tableBody.innerHTML = '';

    if (pagePayments.length === 0) {
        document.getElementById('tableContainer').style.display = 'none';
        document.getElementById('noData').style.display         = 'block';
        document.getElementById('pagination').innerHTML         = '';
        return;
    }

    document.getElementById('tableContainer').style.display = 'block';
    document.getElementById('noData').style.display         = 'none';

    pagePayments.forEach((payment) => {
        const row = document.createElement('tr');
        row.setAttribute('data-payment-id', payment.transaction_id);

        row.innerHTML = `
            <td>${payment.transaction_id}</td>
            <td>${payment.date}</td>
            <td>${payment.supplier_id}</td>
            <td>${payment.supplier_name}</td>
            <td>${payment.county || ''}</td>
            <td>${payment.town || ''}</td>
            <td>${payment.po_id}</td>
            <td>${payment.bill_number}</td>
            <td>${payment.payment_mode}</td>
            <td>${parseFloat(payment.amount_paid).toFixed(2)}</td>
            <td class="action-cell">
                <button class="action-btn delete-btn"
                        onclick="openDeleteModal('${payment.transaction_id}')">
                    <i class="fas fa-trash"></i> Delete
                </button>
            </td>
        `;
        tableBody.appendChild(row);
    });

    renderPagination();
}


/* ============================================================
   PAGINATION
   ============================================================ */
function renderPagination() {
    const totalPages   = Math.ceil(filteredPayments.length / pageSize);
    const paginationDiv = document.getElementById('pagination');
    paginationDiv.innerHTML = '';

    if (totalPages <= 1) return;

    const prevBtn     = document.createElement('button');
    prevBtn.className = 'page-btn';
    prevBtn.innerHTML = '<i class="fas fa-chevron-left"></i>';
    prevBtn.disabled  = currentPage === 1;
    prevBtn.onclick   = () => { if (currentPage > 1) { currentPage--; renderPaymentTable(); } };
    paginationDiv.appendChild(prevBtn);

    for (let i = 1; i <= totalPages; i++) {
        const pageBtn       = document.createElement('button');
        pageBtn.className   = `page-btn ${i === currentPage ? 'active' : ''}`;
        pageBtn.textContent = i;
        pageBtn.onclick     = () => { currentPage = i; renderPaymentTable(); };
        paginationDiv.appendChild(pageBtn);
    }

    const nextBtn     = document.createElement('button');
    nextBtn.className = 'page-btn';
    nextBtn.innerHTML = '<i class="fas fa-chevron-right"></i>';
    nextBtn.disabled  = currentPage === totalPages;
    nextBtn.onclick   = () => { if (currentPage < totalPages) { currentPage++; renderPaymentTable(); } };
    paginationDiv.appendChild(nextBtn);
}


/* ============================================================
   DELETE MODAL FUNCTIONS
   ============================================================ */
function openDeleteModal(transactionId) {
    const payment = allPayments.find(p => p.transaction_id === transactionId);
    if (!payment) {
        alert('Payment not found');
        return;
    }

    paymentToDelete = { ...payment };

    const relatedPO     = purchaseOrders.find(po => po.po_id === payment.po_id);
    const poTotalAmount = relatedPO ? parseFloat(relatedPO.total_amount).toFixed(2) : '0.00';

    document.getElementById('deleteTransactionId').textContent = payment.transaction_id;
    document.getElementById('deletePaymentDate').textContent   = payment.date;
    document.getElementById('deleteSupplierName').textContent  = payment.supplier_name;
    document.getElementById('deletePOID').textContent         = payment.po_id;
    document.getElementById('deleteBillNumber').textContent    = payment.bill_number;
    document.getElementById('deletePaymentMode').textContent   = payment.payment_mode;
    document.getElementById('deletePOAmount').textContent      = poTotalAmount;
    document.getElementById('deleteAmountPaid').textContent    = parseFloat(payment.amount_paid).toFixed(2);

    document.getElementById('deleteConfirmModal').style.display = 'block';
}

function closeDeleteModal() {
    document.getElementById('deleteConfirmModal').style.display = 'none';
    paymentToDelete = null;
}

async function confirmDelete() {
    if (!paymentToDelete) {
        closeDeleteModal();
        return;
    }

    showProcessing();
    closeDeleteModal();

    try {
        const response = await fetch('/api/payments/delete/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCSRFToken()
            },
            credentials: 'same-origin',
            body: JSON.stringify({
                transaction_id: paymentToDelete.transaction_id
            })
        });

        const result = await response.json();

        if (result.success) {
            alert('✅ Payment Deleted Successfully!\n\n' +
                  'Transaction ID: ' + paymentToDelete.transaction_id + '\n' +
                  'Amount: ' + parseFloat(paymentToDelete.amount_paid).toFixed(2) + '\n\n' +
                  'Purchase Order balance and payment status have been updated accordingly.');
            await loadPayments();
            await loadPurchaseOrders();
        } else {
            alert('❌ Error: ' + result.message);
        }
    } catch (error) {
        console.error('Error deleting payment:', error);
        alert('❌ Failed to delete payment. Please try again.');
    } finally {
        hideProcessing();
        paymentToDelete = null;
    }
}


/* ============================================================
   MODAL FUNCTIONS
   ============================================================ */
function openNewPaymentModal() {
    document.getElementById('modalTitle').textContent        = 'Record New Payment';
    document.getElementById('btnSavePayment').textContent    = 'Save Payment';

    document.getElementById('transactionId').value = '';
    document.getElementById('paymentDate').value   = '';
    $('#supplierName').val('').trigger('change');
    document.getElementById('supplierId').value = '';
    document.getElementById('county').value     = '';
    document.getElementById('town').value       = '';
    $('#poId').empty().append(new Option('Select PO ID', '', true, true)).trigger('change');
    document.getElementById('billNumber').value = '';
    $('#paymentMode').val('').trigger('change');
    document.getElementById('amountPaid').value = '';
    document.getElementById('balanceInfo').style.display = 'none';

    document.getElementById('transactionId').readOnly = true;
    document.getElementById('paymentDate').disabled   = false;
    $('#supplierName').prop('disabled', false).trigger('change');
    $('#poId').prop('disabled', false);
    $('#paymentMode').prop('disabled', false);
    document.getElementById('amountPaid').disabled = false;

    document.getElementById('paymentModal').style.display = 'block';
}

function closePaymentModal() {
    document.getElementById('paymentModal').style.display = 'none';
}

function openPaymentModeModal() {
    document.getElementById('newPaymentMode').value = '';
    document.getElementById('paymentModeModal').style.display = 'block';
}

function closePaymentModeModal() {
    document.getElementById('paymentModeModal').style.display = 'none';
}


/* ============================================================
   GENERATE TRANSACTION ID
   ============================================================ */
async function generateTransactionId() {
    showProcessing();
    try {
        const response = await fetch('/api/payments/generate-transaction-id/', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCSRFToken()
            },
            credentials: 'same-origin'
        });
        const result = await response.json();
        if (result.success) {
            document.getElementById('transactionId').value = result.transaction_id;
        } else {
            alert('Error generating Transaction ID: ' + result.message);
        }
    } catch (error) {
        console.error('Error generating Transaction ID:', error);
        alert('Failed to generate Transaction ID');
    } finally {
        hideProcessing();
    }
}


/* ============================================================
   SAVE PAYMENT MODE
   ============================================================ */
async function saveNewPaymentMode() {
    const modeName = document.getElementById('newPaymentMode').value.trim();

    if (!modeName) {
        alert('Please enter a payment mode');
        return;
    }

    showProcessing();
    try {
        const response = await fetch('/api/payments/payment-modes/add/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCSRFToken()
            },
            credentials: 'same-origin',
            body: JSON.stringify({ mode_name: modeName })
        });
        const result = await response.json();
        if (result.success) {
            alert('Payment Mode Added Successfully');
            closePaymentModeModal();
            await loadPaymentModes();
        } else {
            alert('Error: ' + result.message);
        }
    } catch (error) {
        console.error('Error saving payment mode:', error);
        alert('Failed to add payment mode');
    } finally {
        hideProcessing();
    }
}


/* ============================================================
   SAVE PAYMENT
   ============================================================ */
async function savePayment() {
    const paymentData = {
        transaction_id: document.getElementById('transactionId').value.trim(),
        payment_date:   document.getElementById('paymentDate').value.trim(),
        supplier_id:    document.getElementById('supplierId').value.trim(),
        supplier_name:  $('#supplierName').val(),
        county:         document.getElementById('county').value.trim(),
        town:           document.getElementById('town').value.trim(),
        po_id:          $('#poId').val(),
        bill_number:    document.getElementById('billNumber').value.trim(),
        payment_mode:   $('#paymentMode').val(),
        amount_paid:    parseFloat(document.getElementById('amountPaid').value) || 0
    };

    if (!paymentData.transaction_id) { alert('Please generate a Transaction ID'); return; }
    if (!paymentData.payment_date)   { alert('Please select payment date');        return; }
    if (!paymentData.supplier_name)  { alert('Please select a supplier');          return; }
    if (!paymentData.po_id)          { alert('Please select a Purchase Order');    return; }
    if (!paymentData.payment_mode)   { alert('Please select payment mode');        return; }

    if (isNaN(paymentData.amount_paid) || paymentData.amount_paid <= 0) {
        alert('Please enter a valid payment amount');
        return;
    }

    const poBalance = parseFloat(document.getElementById('poBalance').textContent || 0);
    if (paymentData.amount_paid > poBalance) {
        alert(`Payment amount (${paymentData.amount_paid.toFixed(2)}) exceeds PO Balance (${poBalance.toFixed(2)})`);
        return;
    }

    showProcessing();

    try {
        const response = await fetch('/api/payments/add/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCSRFToken()
            },
            credentials: 'same-origin',
            body: JSON.stringify(paymentData)
        });

        const result = await response.json();

        if (result.success) {
            alert('✅ Payment Recorded Successfully!\n\n' +
                  'Payment Status: ' + result.status_info.payment_status + '\n' +
                  'Shipping Status: ' + result.status_info.shipping_status);
            closePaymentModal();
            await loadPayments();
            await loadPurchaseOrders();
        } else {
            alert('Error: ' + result.message);
        }
    } catch (error) {
        console.error('Error saving payment:', error);
        alert('Failed to save payment. Please try again.');
    } finally {
        hideProcessing();
    }
}


/* ============================================================
   SEARCH FUNCTIONS
   ============================================================ */
function searchPayments() {
    const criteria = document.getElementById('searchCriteria').value;
    const query    = document.getElementById('searchInput').value.toLowerCase().trim();

    if (!query) {
        filteredPayments = [...allPayments];
    } else {
        filteredPayments = allPayments.filter(payment => {
            if (criteria === 'all') {
                return (
                    payment.transaction_id.toLowerCase().includes(query) ||
                    payment.supplier_name.toLowerCase().includes(query)  ||
                    payment.po_id.toLowerCase().includes(query)          ||
                    payment.bill_number.toLowerCase().includes(query)    ||
                    payment.payment_mode.toLowerCase().includes(query)
                );
            } else if (criteria === 'Transaction ID') {
                return payment.transaction_id.toLowerCase().includes(query);
            } else if (criteria === 'Supplier Name') {
                return payment.supplier_name.toLowerCase().includes(query);
            } else if (criteria === 'PO ID') {
                return payment.po_id.toLowerCase().includes(query);
            } else if (criteria === 'Bill Number') {
                return payment.bill_number.toLowerCase().includes(query);
            } else if (criteria === 'Payment Mode') {
                return payment.payment_mode.toLowerCase().includes(query);
            }
            return true;
        });
    }

    currentPage = 1;
    renderPaymentTable();

    if (filteredPayments.length === 0) {
        alert('No matching data found');
    }
}

function clearSearch() {
    document.getElementById('searchInput').value    = '';
    document.getElementById('searchCriteria').value = 'all';
    filteredPayments = [...allPayments];
    currentPage      = 1;
    renderPaymentTable();
}


/* ============================================================
   PROCESSING OVERLAY
   ============================================================ */
function showProcessing() {
    document.getElementById('processingOverlay').style.display = 'flex';
}

function hideProcessing() {
    document.getElementById('processingOverlay').style.display = 'none';
}

console.log('✅ Payments.js complete');