/* ============================================================
   RECEIPTS.JS
   Extracted from the standalone Receipts.html.
   Loaded by the Receipts.html partial template via:
       <script src="{% static 'Receipts.js' %}"></script>
       <script>initReceipts();</script>

   CHANGES FROM ORIGINAL:
   1. Removed document.addEventListener('DOMContentLoaded', ...)
      All setup code now lives inside initReceipts() which is
      called directly by the partial template after this script
      loads. Everything else is identical to the original.
   ============================================================ */

console.log('Receipts module loaded');

/* ---- Global State ---- */
let currentPage     = 1;
const pageSize      = 25;
let allReceipts     = [];
let filteredReceipts = [];
let customers       = [];
let salesOrders     = [];
let paymentModes    = [];
let receiptToDelete = null;


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
function initReceipts() {
    console.log('DOM loaded, initializing...');

    /* Initialize date picker */
    flatpickr('#receiptDate', {
        dateFormat: 'd/m/Y',
        allowInput: true
    });

    /* Set up event listeners */
    document.getElementById('btnNewReceipt')          .addEventListener('click', openNewReceiptModal);
    document.getElementById('btnAddPaymentMode')      .addEventListener('click', openPaymentModeModal);
    document.getElementById('btnSearch')              .addEventListener('click', searchReceipts);
    document.getElementById('btnClear')               .addEventListener('click', clearSearch);

    /* Payment Mode Modal */
    document.getElementById('closePaymentModeModal')   .addEventListener('click', closePaymentModeModal);
    document.getElementById('btnClosePaymentModeModal').addEventListener('click', closePaymentModeModal);
    document.getElementById('btnSavePaymentMode')      .addEventListener('click', saveNewPaymentMode);

    /* Receipt Modal */
    document.getElementById('closeReceiptModal')   .addEventListener('click', closeReceiptModal);
    document.getElementById('btnCloseReceiptModal').addEventListener('click', closeReceiptModal);
    document.getElementById('btnGenerateId')       .addEventListener('click', generateTransactionId);
    document.getElementById('btnSaveReceipt')      .addEventListener('click', saveReceipt);

    /* Initialize Select2 */
    initializeSelect2();

    /* Load data */
    loadCustomers();
    loadSalesOrders();
    loadPaymentModes();
    loadReceipts();

    /* Close modals when clicking outside */
    window.addEventListener('click', function (event) {
        const receiptModal     = document.getElementById('receiptModal');
        const paymentModeModal = document.getElementById('paymentModeModal');
        const deleteModal      = document.getElementById('deleteConfirmModal');

        if (event.target === receiptModal)     closeReceiptModal();
        if (event.target === paymentModeModal) closePaymentModeModal();
        if (event.target === deleteModal)      closeDeleteModal();
    });

    console.log('Initialization complete');
}


function initializeSelect2() {
    $('#customerName').select2({
        placeholder: 'Select Customer',
        allowClear: true,
        dropdownParent: $('#receiptModal'),
        width: '100%'
    }).on('change', customerChanged);

    $('#soId').select2({
        placeholder: 'Select SO ID',
        allowClear: true,
        dropdownParent: $('#receiptModal'),
        width: '100%'
    }).on('change', soChanged);

    $('#paymentMode').select2({
        placeholder: 'Select Payment Mode',
        allowClear: true,
        dropdownParent: $('#receiptModal'),
        width: '100%'
    });
}


/* ============================================================
   LOAD DATA FUNCTIONS
   ============================================================ */
async function loadCustomers() {
    try {
        const response = await fetch('/api/customers/', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCSRFToken()
            },
            credentials: 'same-origin'
        });
        const result = await response.json();
        if (result.success) {
            customers = result.data;
            populateCustomerDropdown();
        }
    } catch (error) {
        console.error('Error loading customers:', error);
    }
}

async function loadSalesOrders() {
    try {
        const response = await fetch('/api/sales/', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCSRFToken()
            },
            credentials: 'same-origin'
        });
        const result = await response.json();
        if (result.success) salesOrders = result.data;
    } catch (error) {
        console.error('Error loading sales orders:', error);
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

async function loadReceipts() {
    showProcessing();
    try {
        const response = await fetch('/api/receipts/', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCSRFToken()
            },
            credentials: 'same-origin'
        });

        const result = await response.json();

        if (result.success) {
            /* Validate and clean data */
            allReceipts = (result.data || []).filter(receipt => {
                if (!receipt.transaction_id) {
                    console.warn('Receipt missing transaction_id:', receipt);
                    return false;
                }
                return true;
            });

            filteredReceipts = [...allReceipts];
            console.log('Loaded receipts:', allReceipts.length);
            renderReceiptTable();
        } else {
            alert('Error loading receipts: ' + result.message);
            allReceipts      = [];
            filteredReceipts = [];
            renderReceiptTable();
        }
    } catch (error) {
        console.error('Error loading receipts:', error);
        alert('Failed to load receipts');
        allReceipts      = [];
        filteredReceipts = [];
        renderReceiptTable();
    } finally {
        hideProcessing();
    }
}


/* ============================================================
   POPULATE DROPDOWNS
   ============================================================ */
function populateCustomerDropdown() {
    const customerSelect = $('#customerName');
    customerSelect.empty();
    customerSelect.append(new Option('Select Customer', '', true, true));
    customers.forEach(customer => {
        customerSelect.append(new Option(customer.name, customer.name));
    });
    customerSelect.trigger('change');
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
function customerChanged() {
    const customerName = $('#customerName').val();

    if (!customerName) {
        $('#customerId').val('');
        $('#county').val('');
        $('#town').val('');
        $('#soId').empty().append(new Option('Select SO ID', '', true, true)).trigger('change');
        document.getElementById('balanceInfo').style.display = 'none';
        return;
    }

    const customer = customers.find(c => c.name === customerName);

    if (customer) {
        $('#customerId').val(customer.id);
        $('#county').val(customer.state || '');
        $('#town').val(customer.city || '');

        const customerSOs = salesOrders.filter(so =>
            so.customer_name === customerName &&
            parseFloat(so.balance_left) > 0
        );

        const soSelect = $('#soId');
        soSelect.empty();
        soSelect.append(new Option('Select SO ID', '', true, true));

        if (customerSOs.length === 0) {
            soSelect.append(new Option('No outstanding SOs', '', false, false));
        } else {
            customerSOs.forEach(so => {
                const balance = parseFloat(so.balance_left).toFixed(2);
                soSelect.append(new Option(`${so.so_id} (Balance: ${balance})`, so.so_id));
            });
        }

        soSelect.trigger('change');
        document.getElementById('balanceInfo').style.display = 'none';
    }
}

function soChanged() {
    const soId = $('#soId').val();
    const so   = salesOrders.find(s => s.so_id === soId);

    if (so) {
        $('#invoiceNumber').val(so.invoice_number);

        const totalAmount    = parseFloat(so.total_amount);
        const amountReceived = parseFloat(so.amount_received);
        const balance        = totalAmount - amountReceived;

        document.getElementById('soTotalAmount').textContent   = totalAmount.toFixed(2);
        document.getElementById('soAmountReceived').textContent = amountReceived.toFixed(2);
        document.getElementById('soBalance').textContent        = balance.toFixed(2);

        document.getElementById('balanceInfo').style.display = 'block';
    } else {
        $('#invoiceNumber').val('');
        document.getElementById('balanceInfo').style.display = 'none';
    }
}


/* ============================================================
   RENDER RECEIPT TABLE
   ============================================================ */
function renderReceiptTable() {
    const startIndex  = (currentPage - 1) * pageSize;
    const endIndex    = startIndex + pageSize;
    const pageReceipts = filteredReceipts.slice(startIndex, endIndex);
    const tableBody   = document.getElementById('tableBody');

    tableBody.innerHTML = '';

    if (pageReceipts.length === 0) {
        document.getElementById('tableContainer').style.display = 'none';
        document.getElementById('noData').style.display         = 'block';
        document.getElementById('pagination').innerHTML         = '';
        return;
    }

    document.getElementById('tableContainer').style.display = 'block';
    document.getElementById('noData').style.display         = 'none';

    pageReceipts.forEach((receipt) => {
        const row = document.createElement('tr');
        row.setAttribute('data-receipt-id', receipt.transaction_id);

        /* Validate all parameters before passing to delete function */
        const transactionId  = receipt.transaction_id  || '';
        const date           = receipt.date            || '';
        const customerName   = receipt.customer_name   || '';
        const soId           = receipt.so_id           || '';
        const invoiceNumber  = receipt.invoice_number  || '';
        const paymentMode    = receipt.payment_mode    || '';
        const amountReceived = parseFloat(receipt.amount_received) || 0;

        /* Escape quotes in parameters to prevent JavaScript errors */
        const escapedCustomerName = customerName.replace(/'/g, "\\'");
        const escapedPaymentMode  = paymentMode.replace(/'/g, "\\'");

        row.innerHTML = `
            <td>${transactionId}</td>
            <td>${date}</td>
            <td>${receipt.customer_id || ''}</td>
            <td>${customerName}</td>
            <td>${receipt.county || ''}</td>
            <td>${receipt.town   || ''}</td>
            <td>${soId}</td>
            <td>${invoiceNumber}</td>
            <td>${paymentMode}</td>
            <td>${amountReceived.toFixed(2)}</td>
            <td class="action-cell">
                <button class="action-btn delete-btn"
                        onclick="openDeleteModal('${transactionId}', '${date}', '${escapedCustomerName}', '${soId}', '${invoiceNumber}', '${escapedPaymentMode}', ${amountReceived})"
                        title="Delete this receipt">
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
    const totalPages    = Math.ceil(filteredReceipts.length / pageSize);
    const paginationDiv = document.getElementById('pagination');
    paginationDiv.innerHTML = '';

    if (totalPages <= 1) return;

    const prevBtn     = document.createElement('button');
    prevBtn.className = 'page-btn';
    prevBtn.innerHTML = '<i class="fas fa-chevron-left"></i>';
    prevBtn.disabled  = currentPage === 1;
    prevBtn.onclick   = () => { if (currentPage > 1) { currentPage--; renderReceiptTable(); } };
    paginationDiv.appendChild(prevBtn);

    for (let i = 1; i <= totalPages; i++) {
        const pageBtn       = document.createElement('button');
        pageBtn.className   = `page-btn ${i === currentPage ? 'active' : ''}`;
        pageBtn.textContent = i;
        pageBtn.onclick     = () => { currentPage = i; renderReceiptTable(); };
        paginationDiv.appendChild(pageBtn);
    }

    const nextBtn     = document.createElement('button');
    nextBtn.className = 'page-btn';
    nextBtn.innerHTML = '<i class="fas fa-chevron-right"></i>';
    nextBtn.disabled  = currentPage === totalPages;
    nextBtn.onclick   = () => { if (currentPage < totalPages) { currentPage++; renderReceiptTable(); } };
    paginationDiv.appendChild(nextBtn);
}


/* ============================================================
   MODAL FUNCTIONS
   ============================================================ */
function openNewReceiptModal() {
    document.getElementById('modalTitle').textContent     = 'Record New Receipt';
    document.getElementById('btnSaveReceipt').textContent = 'Save Receipt';

    document.getElementById('transactionId').value  = '';
    document.getElementById('receiptDate').value    = '';
    $('#customerName').val('').trigger('change');
    document.getElementById('customerId').value     = '';
    document.getElementById('county').value         = '';
    document.getElementById('town').value           = '';
    $('#soId').empty().append(new Option('Select SO ID', '', true, true)).trigger('change');
    document.getElementById('invoiceNumber').value  = '';
    $('#paymentMode').val('').trigger('change');
    document.getElementById('amountReceived').value = '';
    document.getElementById('balanceInfo').style.display = 'none';

    document.getElementById('receiptModal').style.display = 'block';
}

function closeReceiptModal() {
    document.getElementById('receiptModal').style.display = 'none';
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
        const response = await fetch('/api/receipts/generate-transaction-id/', {
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
   SAVE RECEIPT
   ============================================================ */
async function saveReceipt() {
    const receiptData = {
        transaction_id:  document.getElementById('transactionId').value.trim(),
        receipt_date:    document.getElementById('receiptDate').value.trim(),
        customer_id:     document.getElementById('customerId').value.trim(),
        customer_name:   $('#customerName').val(),
        county:          document.getElementById('county').value.trim(),
        town:            document.getElementById('town').value.trim(),
        so_id:           $('#soId').val(),
        invoice_number:  document.getElementById('invoiceNumber').value.trim(),
        payment_mode:    $('#paymentMode').val(),
        amount_received: parseFloat(document.getElementById('amountReceived').value) || 0
    };

    /* DEBUG */
    console.log('=== RECEIPT DATA DEBUG ===');
    console.log('Transaction ID:', receiptData.transaction_id);
    console.log('Receipt Date:',   receiptData.receipt_date);
    console.log('Customer ID:',    receiptData.customer_id);
    console.log('Customer Name:',  receiptData.customer_name);
    console.log('County:',         receiptData.county);
    console.log('Town:',           receiptData.town);
    console.log('SO ID:',          receiptData.so_id);
    console.log('Invoice Number:', receiptData.invoice_number);
    console.log('Payment Mode:',   receiptData.payment_mode);
    console.log('Amount Received:',receiptData.amount_received);
    console.log('========================');

    if (!receiptData.transaction_id)  { alert('Please generate a Transaction ID');              return; }
    if (!receiptData.receipt_date)    { alert('Please select receipt date');                    return; }
    if (!receiptData.customer_name)   { alert('Please select a customer');                      return; }
    if (!receiptData.so_id)           { alert('Please select a Sales Order');                   return; }
    if (!receiptData.payment_mode)    { alert('Please select payment mode');                    return; }
    if (isNaN(receiptData.amount_received) || receiptData.amount_received <= 0) {
        alert('Please enter a valid amount (must be greater than 0)');
        return;
    }

    const soBalance = parseFloat(document.getElementById('soBalance').textContent || 0);
    if (receiptData.amount_received > soBalance) {
        alert(`Amount received (${receiptData.amount_received.toFixed(2)}) exceeds SO Balance (${soBalance.toFixed(2)})`);
        return;
    }

    showProcessing();

    try {
        const response = await fetch('/api/receipts/add/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCSRFToken()
            },
            credentials: 'same-origin',
            body: JSON.stringify(receiptData)
        });

        const result = await response.json();

        if (result.success) {
            alert('Receipt Recorded Successfully!\n\n' +
                  'Receipt Status: ' + result.status_info.receipt_status + '\n' +
                  'Shipping Status: ' + result.status_info.shipping_status);
            closeReceiptModal();
            await loadReceipts();
            await loadSalesOrders();
        } else {
            alert('Error: ' + result.message);
        }
    } catch (error) {
        console.error('Error saving receipt:', error);
        alert('Failed to save receipt. Please try again.');
    } finally {
        hideProcessing();
    }
}


/* ============================================================
   OPEN DELETE CONFIRMATION MODAL
   ============================================================ */
function openDeleteModal(transactionId, receiptDate, customerName, soId,
                          invoiceNumber, paymentMode, amountReceived) {
    console.log('🔍 Opening delete modal for:', transactionId);

    if (!transactionId) {
        alert('Invalid transaction ID');
        return;
    }

    const receipt = allReceipts.find(r => r.transaction_id === transactionId);

    if (!receipt) {
        alert('Receipt not found in local data. Please refresh the page and try again.');
        console.error('Receipt not found:', transactionId);
        console.log('Available receipts:', allReceipts.map(r => r.transaction_id));
        return;
    }

    const so           = salesOrders.find(s => s.so_id === soId);
    const soTotalAmount = so ? parseFloat(so.total_amount).toFixed(2) : '0.00';

    const validatedAmount = parseFloat(amountReceived);
    if (isNaN(validatedAmount) || validatedAmount <= 0) {
        alert('Invalid receipt amount');
        console.error('Invalid amount:', amountReceived);
        return;
    }

    receiptToDelete = {
        transaction_id:  transactionId,
        so_id:           soId,
        amount_received: validatedAmount
    };

    console.log('Receipt to delete:', receiptToDelete);

    document.getElementById('deleteTransactionId').textContent = transactionId  || 'N/A';
    document.getElementById('deleteReceiptDate').textContent   = receiptDate    || 'N/A';
    document.getElementById('deleteCustomerName').textContent  = customerName   || 'N/A';
    document.getElementById('deleteSOID').textContent         = soId           || 'N/A';
    document.getElementById('deleteInvoiceNumber').textContent = invoiceNumber  || 'N/A';
    document.getElementById('deletePaymentMode').textContent   = paymentMode    || 'N/A';
    document.getElementById('deleteSOAmount').textContent      = soTotalAmount;
    document.getElementById('deleteAmountReceived').textContent = validatedAmount.toFixed(2);

    document.getElementById('deleteConfirmModal').style.display = 'block';
}


/* ============================================================
   CLOSE DELETE MODAL
   ============================================================ */
function closeDeleteModal() {
    document.getElementById('deleteConfirmModal').style.display = 'none';
    receiptToDelete = null;
}


/* ============================================================
   CONFIRM DELETE
   ============================================================ */
async function confirmDelete() {
    if (!receiptToDelete) {
        alert('No receipt selected for deletion');
        closeDeleteModal();
        return;
    }

    if (!receiptToDelete.transaction_id) {
        alert('Invalid receipt data');
        closeDeleteModal();
        return;
    }

    /* Copy the data to local variable BEFORE closing modal */
    const receiptData = {
        transaction_id:  receiptToDelete.transaction_id,
        so_id:           receiptToDelete.so_id,
        amount_received: receiptToDelete.amount_received
    };

    console.log('Attempting to delete receipt:', receiptData);

    /* Close modal and show processing */
    closeDeleteModal();
    showProcessing();

    try {
        const response = await fetch('/api/receipts/delete/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCSRFToken()
            },
            credentials: 'same-origin',
            body: JSON.stringify({
                transaction_id: receiptData.transaction_id
            })
        });

        console.log('Delete response status:', response.status);

        /* Handle non-JSON responses */
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            throw new Error('Server returned non-JSON response');
        }

        const result = await response.json();
        console.log('Delete response data:', result);

        if (result.success) {
            alert('Receipt Deleted Successfully!\n\n' +
                  'Transaction ID: ' + receiptData.transaction_id + '\n' +
                  'Amount: ' + parseFloat(receiptData.amount_received).toFixed(2) + '\n\n' +
                  'Sales Order statuses have been updated accordingly.\n\n' +
                  'New Receipt Status: '  + (result.status_info?.receipt_status  || 'N/A') + '\n' +
                  'New Shipping Status: ' + (result.status_info?.shipping_status || 'N/A'));
            await loadReceipts();
            await loadSalesOrders();
        } else {
            alert('Error: ' + (result.message || 'Unknown error occurred'));
        }
    } catch (error) {
        console.error('Error deleting receipt:', error);
        alert('Failed to delete receipt. Please try again.\n\nError: ' + error.message);
    } finally {
        hideProcessing();
        receiptToDelete = null;
    }
}


/* ============================================================
   SEARCH FUNCTIONS
   ============================================================ */
function searchReceipts() {
    const criteria = document.getElementById('searchCriteria').value;
    const query    = document.getElementById('searchInput').value.toLowerCase().trim();

    if (!query) {
        filteredReceipts = [...allReceipts];
    } else {
        filteredReceipts = allReceipts.filter(receipt => {
            if (criteria === 'all') {
                return (
                    receipt.transaction_id.toLowerCase().includes(query) ||
                    receipt.customer_name.toLowerCase().includes(query)  ||
                    receipt.so_id.toLowerCase().includes(query)          ||
                    receipt.invoice_number.toLowerCase().includes(query) ||
                    receipt.payment_mode.toLowerCase().includes(query)
                );
            } else if (criteria === 'Transaction ID') {
                return receipt.transaction_id.toLowerCase().includes(query);
            } else if (criteria === 'Customer Name') {
                return receipt.customer_name.toLowerCase().includes(query);
            } else if (criteria === 'SO ID') {
                return receipt.so_id.toLowerCase().includes(query);
            } else if (criteria === 'Invoice Number') {
                return receipt.invoice_number.toLowerCase().includes(query);
            } else if (criteria === 'Payment Mode') {
                return receipt.payment_mode.toLowerCase().includes(query);
            }
            return true;
        });
    }

    currentPage = 1;
    renderReceiptTable();

    if (filteredReceipts.length === 0) {
        alert('No matching data found');
    }
}

function clearSearch() {
    document.getElementById('searchInput').value    = '';
    document.getElementById('searchCriteria').value = 'all';
    filteredReceipts = [...allReceipts];
    currentPage      = 1;
    renderReceiptTable();
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

console.log('Receipts.js complete');