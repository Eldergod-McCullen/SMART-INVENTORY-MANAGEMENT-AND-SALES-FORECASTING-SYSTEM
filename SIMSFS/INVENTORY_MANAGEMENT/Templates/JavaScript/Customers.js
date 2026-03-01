/* ============================================================
   CUSTOMERS.JS
   Static JavaScript for the Customers module.
   Called by the partial template Customers.html via:
       <script src="{% static 'js/Customers.js' %}"></script>
       <script>initCustomers();</script>

   CHANGES FROM ORIGINAL:
   1. Removed document.addEventListener('DOMContentLoaded', ...)
      entirely. It never fires on dynamically injected content.
      All setup code now lives inside initCustomers() which is
      called directly by the partial template.

   2. Renamed getCSRFToken() → custGetCSRFToken() to avoid
      collision with the same function name defined in other
      modules (Inventory.js, Inventory-items.js, etc.) that
      are loaded into the same global scope through Index.html.
   ============================================================ */

console.log('Customers.js loaded');

/* ---- Global State ---- */
let custCurrentPage       = 1;
const custPageSize        = 25;
let custAllCustomers      = [];
let custFilteredCustomers = [];
let custCounties          = [];
let custTowns             = [];


/* ---- CSRF Helper ---- */
function custGetCSRFToken() {
    /* Try the meta tag placed in the partial template first */
    const metaTag = document.querySelector('meta[name="csrf-token"]');
    if (metaTag) return metaTag.getAttribute('content');

    /* Fallback: read from cookie */
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
function initCustomers() {
    console.log('✅ Customers module initialised');

    /* Load data from the API */
    loadCounties();
    loadTowns();
    loadCustomers();

    /* Initialise Select2 dropdowns inside the modal */
    $('#custCustomerState').select2({ placeholder: 'Select County', allowClear: true });
    $('#custCustomerCity') .select2({ placeholder: 'Select Town',   allowClear: true });
}


/* ============================================================
   DATA LOADING
   ============================================================ */
async function loadCounties() {
    try {
        const res    = await fetch('/api/customers/counties/', {
            headers: { 'Content-Type': 'application/json', 'X-CSRFToken': custGetCSRFToken() },
            credentials: 'same-origin'
        });
        const result = await res.json();
        if (result.success) {
            custCounties = result.data;
            populateCountyDropdown();
        }
    } catch (err) { console.error('Error loading counties:', err); }
}

async function loadTowns() {
    try {
        const res    = await fetch('/api/customers/towns/', {
            headers: { 'Content-Type': 'application/json', 'X-CSRFToken': custGetCSRFToken() },
            credentials: 'same-origin'
        });
        const result = await res.json();
        if (result.success) {
            custTowns = result.data;
            populateTownDropdown();
        }
    } catch (err) { console.error('Error loading towns:', err); }
}

async function loadCustomers() {
    showCustProcessing();
    try {
        const res    = await fetch('/api/customers/', {
            headers: { 'Content-Type': 'application/json', 'X-CSRFToken': custGetCSRFToken() },
            credentials: 'same-origin'
        });
        const result = await res.json();
        if (result.success) {
            custAllCustomers      = result.data;
            custFilteredCustomers = [...result.data];
            custCurrentPage       = 1;
            renderCustomerTable();
        } else {
            alert('Error loading customers: ' + result.message);
        }
    } catch (err) {
        console.error('Error loading customers:', err);
        alert('Failed to load customers. Please try again.');
    } finally {
        hideCustProcessing();
    }
}


/* ============================================================
   DROPDOWN POPULATION
   ============================================================ */
function populateCountyDropdown() {
    const sel = $('#custCustomerState');
    sel.empty().append(new Option('Select County', '', true, true));
    custCounties.forEach(county => { if (county) sel.append(new Option(county, county)); });
    sel.trigger('change');
}

function populateTownDropdown() {
    const sel = $('#custCustomerCity');
    sel.empty().append(new Option('Select Town', '', true, true));
    custTowns.forEach(town => { if (town) sel.append(new Option(town, town)); });
    sel.trigger('change');
}


/* ============================================================
   TABLE RENDERING
   ============================================================ */
function renderCustomerTable() {
    const start         = (custCurrentPage - 1) * custPageSize;
    const pageCustomers = custFilteredCustomers.slice(start, start + custPageSize);
    const tbody         = document.getElementById('custTableBody');

    tbody.innerHTML = '';

    if (pageCustomers.length === 0) {
        document.getElementById('custTableContainer').style.display = 'none';
        document.getElementById('custNoData').style.display         = 'block';
        document.getElementById('custPagination').innerHTML         = '';
        return;
    }

    document.getElementById('custTableContainer').style.display = 'block';
    document.getElementById('custNoData').style.display         = 'none';

    pageCustomers.forEach(customer => {
        const row = document.createElement('tr');
        row.setAttribute('data-customer-id', customer.id);

        row.innerHTML = `
            <td class="col-id">${customer.id}</td>
            <td class="col-name">${customer.name}</td>
            <td class="col-contact">${customer.contact || ''}</td>
            <td class="col-email">${customer.email || ''}</td>
            <td class="col-state">${customer.state}</td>
            <td class="col-city">${customer.city}</td>
            <td class="col-sales">${parseFloat(customer.sales).toFixed(2)}</td>
            <td class="col-receipts">${parseFloat(customer.receipts).toFixed(2)}</td>
            <td class="col-balance">${parseFloat(customer.balance).toFixed(2)}</td>
            <td class="action-cell">
                <button class="action-btn edit-btn"><i class="fas fa-edit"></i></button>
                <button class="action-btn delete-btn"><i class="fas fa-trash"></i></button>
                <button class="action-btn update-btn" style="display:none;"><i class="fas fa-save"></i></button>
                <button class="action-btn cancel-btn" style="display:none;"><i class="fas fa-times"></i></button>
            </td>
        `;

        row.querySelector('.edit-btn')  .addEventListener('click', function () { editCustomer(this); });
        row.querySelector('.delete-btn').addEventListener('click', function () { deleteCustomer(row.getAttribute('data-customer-id')); });
        row.querySelector('.update-btn').addEventListener('click', function () { updateCustomer(this); });
        row.querySelector('.cancel-btn').addEventListener('click', function () { cancelEdit(this); });

        tbody.appendChild(row);
    });

    renderCustPagination();
}


/* ============================================================
   PAGINATION
   ============================================================ */
function renderCustPagination() {
    const total  = Math.ceil(custFilteredCustomers.length / custPageSize);
    const pagDiv = document.getElementById('custPagination');
    pagDiv.innerHTML = '';

    if (total <= 1) return;

    const prev     = document.createElement('button');
    prev.className = 'page-btn';
    prev.innerHTML = '<i class="fas fa-chevron-left"></i>';
    prev.disabled  = custCurrentPage === 1;
    prev.onclick   = () => { if (custCurrentPage > 1) { custCurrentPage--; renderCustomerTable(); } };
    pagDiv.appendChild(prev);

    for (let i = 1; i <= total; i++) {
        const btn       = document.createElement('button');
        btn.className   = `page-btn ${i === custCurrentPage ? 'active' : ''}`;
        btn.textContent = i;
        btn.onclick     = () => { custCurrentPage = i; renderCustomerTable(); };
        pagDiv.appendChild(btn);
    }

    const next     = document.createElement('button');
    next.className = 'page-btn';
    next.innerHTML = '<i class="fas fa-chevron-right"></i>';
    next.disabled  = custCurrentPage === total;
    next.onclick   = () => { if (custCurrentPage < total) { custCurrentPage++; renderCustomerTable(); } };
    pagDiv.appendChild(next);
}


/* ============================================================
   INLINE EDIT / UPDATE / CANCEL
   ============================================================ */
function editCustomer(button) {
    const row   = button.closest('tr');
    const cells = row.querySelectorAll('td');

    /* Store originals */
    row.setAttribute('data-orig-name',    cells[1].textContent.trim());
    row.setAttribute('data-orig-contact', cells[2].textContent.trim());
    row.setAttribute('data-orig-email',   cells[3].textContent.trim());
    row.setAttribute('data-orig-state',   cells[4].textContent.trim());
    row.setAttribute('data-orig-city',    cells[5].textContent.trim());

    /* Replace cells with inputs / selects */
    cells[1].innerHTML = `<input type="text"  class="editable" value="${cells[1].textContent.trim()}">`;
    cells[2].innerHTML = `<input type="text"  class="editable" value="${cells[2].textContent.trim()}">`;
    cells[3].innerHTML = `<input type="email" class="editable" value="${cells[3].textContent.trim()}">`;

    const countyOpts = custCounties.map(c =>
        `<option value="${c}" ${c === cells[4].textContent.trim() ? 'selected' : ''}>${c}</option>`
    ).join('');
    cells[4].innerHTML = `<select class="editable" style="width:100%">${countyOpts}</select>`;

    const townOpts = custTowns.map(t =>
        `<option value="${t}" ${t === cells[5].textContent.trim() ? 'selected' : ''}>${t}</option>`
    ).join('');
    cells[5].innerHTML = `<select class="editable" style="width:100%">${townOpts}</select>`;

    const ac = cells[9];
    ac.querySelector('.edit-btn')  .style.display = 'none';
    ac.querySelector('.delete-btn').style.display = 'none';
    ac.querySelector('.update-btn').style.display = 'inline-block';
    ac.querySelector('.cancel-btn').style.display = 'inline-block';
}

function cancelEdit(button) {
    const row   = button.closest('tr');
    const cells = row.querySelectorAll('td');

    cells[1].textContent = row.getAttribute('data-orig-name');
    cells[2].textContent = row.getAttribute('data-orig-contact');
    cells[3].textContent = row.getAttribute('data-orig-email');
    cells[4].textContent = row.getAttribute('data-orig-state');
    cells[5].textContent = row.getAttribute('data-orig-city');

    const ac = cells[9];
    ac.querySelector('.edit-btn')  .style.display = 'inline-block';
    ac.querySelector('.delete-btn').style.display = 'inline-block';
    ac.querySelector('.update-btn').style.display = 'none';
    ac.querySelector('.cancel-btn').style.display = 'none';
}

async function updateCustomer(button) {
    const row  = button.closest('tr');
    const cells = row.querySelectorAll('td');

    const data = {
        id:      row.getAttribute('data-customer-id'),
        name:    cells[1].querySelector('input').value.trim(),
        contact: cells[2].querySelector('input').value.trim(),
        email:   cells[3].querySelector('input').value.trim(),
        state:   cells[4].querySelector('select').value,
        city:    cells[5].querySelector('select').value
    };

    if (!data.name || !data.state || !data.city) {
        alert('Please fill all required fields');
        return;
    }

    showCustProcessing();
    try {
        const res    = await fetch('/api/customers/update/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-CSRFToken': custGetCSRFToken() },
            credentials: 'same-origin',
            body: JSON.stringify(data)
        });
        const result = await res.json();
        if (result.success) {
            alert('✅ Customer Updated Successfully');
            await loadCustomers();
        } else {
            alert('Error: ' + result.message);
        }
    } catch (err) {
        console.error('Error updating customer:', err);
        alert('Failed to update customer');
    } finally {
        hideCustProcessing();
    }
}


/* ============================================================
   DELETE
   ============================================================ */
async function deleteCustomer(customerId) {
    if (!confirm('Are you sure you want to delete this customer?')) return;

    showCustProcessing();
    try {
        const res    = await fetch('/api/customers/delete/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-CSRFToken': custGetCSRFToken() },
            credentials: 'same-origin',
            body: JSON.stringify({ customer_id: customerId })
        });
        const result = await res.json();
        if (result.success) {
            alert('✅ Customer Deleted Successfully');
            await loadCustomers();
        } else {
            if (result.has_balance) {
                alert('❌ Customer has an outstanding balance. Please clear all dues first.');
            } else {
                alert('Error: ' + result.message);
            }
        }
    } catch (err) {
        console.error('Error deleting customer:', err);
        alert('Failed to delete customer');
    } finally {
        hideCustProcessing();
    }
}


/* ============================================================
   MODALS — County
   ============================================================ */
function custOpenNewStateModal() {
    document.getElementById('custStateModal').style.display = 'block';
    document.getElementById('custNewState').value = '';
}

function custCloseStateModal() {
    document.getElementById('custStateModal').style.display = 'none';
}

async function custSaveNewState() {
    const name = document.getElementById('custNewState').value.trim();
    if (!name) { alert('Please enter a county name'); return; }

    showCustProcessing();
    try {
        const res    = await fetch('/api/customers/counties/add/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-CSRFToken': custGetCSRFToken() },
            credentials: 'same-origin',
            body: JSON.stringify({ county_name: name })
        });
        const result = await res.json();
        if (result.success) {
            alert('✅ County Added Successfully');
            custCloseStateModal();
            await loadCounties();
        } else {
            alert('Error: ' + result.message);
        }
    } catch (err) {
        console.error('Error saving county:', err);
        alert('Failed to add county');
    } finally {
        hideCustProcessing();
    }
}


/* ============================================================
   MODALS — Town
   ============================================================ */
function custOpenNewCityModal() {
    document.getElementById('custCityModal').style.display = 'block';
    document.getElementById('custNewCity').value = '';
}

function custCloseCityModal() {
    document.getElementById('custCityModal').style.display = 'none';
}

async function custSaveNewCity() {
    const name = document.getElementById('custNewCity').value.trim();
    if (!name) { alert('Please enter a town name'); return; }

    showCustProcessing();
    try {
        const res    = await fetch('/api/customers/towns/add/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-CSRFToken': custGetCSRFToken() },
            credentials: 'same-origin',
            body: JSON.stringify({ town_name: name })
        });
        const result = await res.json();
        if (result.success) {
            alert('✅ Town Added Successfully');
            custCloseCityModal();
            await loadTowns();
        } else {
            alert('Error: ' + result.message);
        }
    } catch (err) {
        console.error('Error saving town:', err);
        alert('Failed to add town');
    } finally {
        hideCustProcessing();
    }
}


/* ============================================================
   MODALS — Customer (Add New)
   ============================================================ */
function custOpenNewCustomerModal() {
    document.getElementById('custCustomerModal').style.display = 'block';
    document.getElementById('custCustomerId').value      = '';
    document.getElementById('custCustomerName').value    = '';
    document.getElementById('custCustomerContact').value = '';
    document.getElementById('custCustomerEmail').value   = '';
    $('#custCustomerState').val('').trigger('change');
    $('#custCustomerCity') .val('').trigger('change');
}

function custCloseCustomerModal() {
    document.getElementById('custCustomerModal').style.display = 'none';
}

async function custGenerateCustomerId() {
    showCustProcessing();
    try {
        const res    = await fetch('/api/customers/generate-id/', {
            headers: { 'Content-Type': 'application/json', 'X-CSRFToken': custGetCSRFToken() },
            credentials: 'same-origin'
        });
        const result = await res.json();
        if (result.success) {
            document.getElementById('custCustomerId').value = result.customer_id;
        } else {
            alert('Error generating ID: ' + result.message);
        }
    } catch (err) {
        console.error('Error generating customer ID:', err);
        alert('Failed to generate customer ID');
    } finally {
        hideCustProcessing();
    }
}

async function custSaveNewCustomer() {
    const data = {
        id:      document.getElementById('custCustomerId').value.trim(),
        name:    document.getElementById('custCustomerName').value.trim(),
        contact: document.getElementById('custCustomerContact').value.trim(),
        email:   document.getElementById('custCustomerEmail').value.trim(),
        state:   $('#custCustomerState').val(),
        city:    $('#custCustomerCity').val()
    };

    if (!data.id)    { alert('Please generate a Customer ID'); return; }
    if (!data.name)  { alert('Please enter Customer Name');    return; }
    if (!data.state) { alert('Please select County');          return; }
    if (!data.city)  { alert('Please select Town');            return; }

    showCustProcessing();
    try {
        const res    = await fetch('/api/customers/add/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-CSRFToken': custGetCSRFToken() },
            credentials: 'same-origin',
            body: JSON.stringify(data)
        });
        const result = await res.json();
        if (result.success) {
            alert('✅ Customer Saved Successfully');
            custCloseCustomerModal();
            await loadCustomers();
        } else {
            alert('Error: ' + result.message);
        }
    } catch (err) {
        console.error('Error saving customer:', err);
        alert('Failed to save customer');
    } finally {
        hideCustProcessing();
    }
}


/* ============================================================
   SEARCH
   ============================================================ */
function custSearchCustomers() {
    const criteria = document.getElementById('custSearchCriteria').value;
    const query    = document.getElementById('custSearchInput').value.toLowerCase().trim();

    if (!query) {
        custFilteredCustomers = [...custAllCustomers];
    } else {
        custFilteredCustomers = custAllCustomers.filter(customer => {
            switch (criteria) {
                case 'Customer Name': return customer.name.toLowerCase().includes(query);
                case 'County':        return customer.state && customer.state.toLowerCase().includes(query);
                case 'Town':          return customer.city  && customer.city.toLowerCase().includes(query);
                default:
                    return (
                        customer.name.toLowerCase().includes(query) ||
                        (customer.state && customer.state.toLowerCase().includes(query)) ||
                        (customer.city  && customer.city.toLowerCase().includes(query))
                    );
            }
        });
    }

    custCurrentPage = 1;
    renderCustomerTable();
    if (custFilteredCustomers.length === 0 && query) alert('No matching data found');
}

function custClearSearch() {
    document.getElementById('custSearchInput').value    = '';
    document.getElementById('custSearchCriteria').value = 'all';
    custFilteredCustomers = [...custAllCustomers];
    custCurrentPage       = 1;
    renderCustomerTable();
}


/* ============================================================
   PROCESSING OVERLAY
   ============================================================ */
function showCustProcessing() {
    const el = document.getElementById('custProcessingOverlay');
    if (el) el.style.display = 'flex';
}

function hideCustProcessing() {
    const el = document.getElementById('custProcessingOverlay');
    if (el) el.style.display = 'none';
}