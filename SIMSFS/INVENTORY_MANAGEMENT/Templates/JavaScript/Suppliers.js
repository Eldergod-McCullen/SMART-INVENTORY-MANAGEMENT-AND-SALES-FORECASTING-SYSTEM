/* ============================================================
   SUPPLIERS.JS
   Static JavaScript for the Suppliers module.
   Called by the partial template Suppliers.html via:
       <script src="{% static 'js/Suppliers.js' %}"></script>
       <script>initSuppliers();</script>

   CHANGES FROM ORIGINAL:
   1. Removed document.addEventListener('DOMContentLoaded', ...)
      entirely. All setup code now lives inside initSuppliers()
      which is called directly by the partial template.

   2. Renamed getCSRFToken() → supGetCSRFToken() to avoid
      collision with the same function name in other modules
      sharing the same global scope through Index.html.

   3. Renamed showProcessing() → supShowProcessing() and
      hideProcessing() → supHideProcessing() for the same reason.

   4. Renamed renderPagination() → supRenderPagination() to
      avoid collision with the same function name in Inventory.js.

   5. Renamed cancelEdit() → supCancelEdit() to avoid collision
      with the same function name in other modules.
   ============================================================ */

console.log('Suppliers.js loaded');

/* ---- Global State ---- */
let supCurrentPage       = 1;
const supPageSize        = 25;
let supAllSuppliers      = [];
let supFilteredSuppliers = [];
let supCounties          = [];
let supTowns             = [];


/* ---- CSRF Helper ---- */
function supGetCSRFToken() {
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
function initSuppliers() {
    console.log('✅ Suppliers module initialised');

    /* Load data from the API */
    supLoadCounties();
    supLoadTowns();
    supLoadSuppliers();

    /* Initialise Select2 dropdowns inside the modal */
    $('#supSupplierState').select2({ placeholder: 'Select County', allowClear: true });
    $('#supSupplierCity') .select2({ placeholder: 'Select Town',   allowClear: true });
}


/* ============================================================
   DATA LOADING
   ============================================================ */
async function supLoadCounties() {
    try {
        const res    = await fetch('/api/suppliers/counties/', {
            headers: { 'Content-Type': 'application/json', 'X-CSRFToken': supGetCSRFToken() },
            credentials: 'same-origin'
        });
        const result = await res.json();
        if (result.success) {
            supCounties = result.data;
            supPopulateCountyDropdown();
        }
    } catch (err) { console.error('Error loading counties:', err); }
}

async function supLoadTowns() {
    try {
        const res    = await fetch('/api/suppliers/towns/', {
            headers: { 'Content-Type': 'application/json', 'X-CSRFToken': supGetCSRFToken() },
            credentials: 'same-origin'
        });
        const result = await res.json();
        if (result.success) {
            supTowns = result.data;
            supPopulateTownDropdown();
        }
    } catch (err) { console.error('Error loading towns:', err); }
}

async function supLoadSuppliers() {
    supShowProcessing();
    try {
        const res    = await fetch('/api/suppliers/', {
            headers: { 'Content-Type': 'application/json', 'X-CSRFToken': supGetCSRFToken() },
            credentials: 'same-origin'
        });
        const result = await res.json();
        if (result.success) {
            supAllSuppliers      = result.data;
            supFilteredSuppliers = [...result.data];
            supCurrentPage       = 1;
            supRenderTable();
        } else {
            alert('Error loading suppliers: ' + result.message);
        }
    } catch (err) {
        console.error('Error loading suppliers:', err);
        alert('Failed to load suppliers. Please try again.');
    } finally {
        supHideProcessing();
    }
}


/* ============================================================
   DROPDOWN POPULATION
   ============================================================ */
function supPopulateCountyDropdown() {
    const sel = $('#supSupplierState');
    sel.empty().append(new Option('Select County', '', true, true));
    supCounties.forEach(county => { if (county) sel.append(new Option(county, county)); });
    sel.trigger('change');
}

function supPopulateTownDropdown() {
    const sel = $('#supSupplierCity');
    sel.empty().append(new Option('Select Town', '', true, true));
    supTowns.forEach(town => { if (town) sel.append(new Option(town, town)); });
    sel.trigger('change');
}


/* ============================================================
   TABLE RENDERING
   ============================================================ */
function supRenderTable() {
    const start          = (supCurrentPage - 1) * supPageSize;
    const pageSuppliers  = supFilteredSuppliers.slice(start, start + supPageSize);
    const tbody          = document.getElementById('supTableBody');

    tbody.innerHTML = '';

    if (pageSuppliers.length === 0) {
        document.getElementById('supTableContainer').style.display = 'none';
        document.getElementById('supNoData').style.display         = 'block';
        document.getElementById('supPagination').innerHTML         = '';
        return;
    }

    document.getElementById('supTableContainer').style.display = 'block';
    document.getElementById('supNoData').style.display         = 'none';

    pageSuppliers.forEach(supplier => {
        const row = document.createElement('tr');
        row.setAttribute('data-supplier-id', supplier.id);

        row.innerHTML = `
            <td class="col-id">${supplier.id}</td>
            <td class="col-name">${supplier.name}</td>
            <td class="col-contact">${supplier.contact || ''}</td>
            <td class="col-email">${supplier.email || ''}</td>
            <td class="col-state">${supplier.state}</td>
            <td class="col-city">${supplier.city}</td>
            <td class="col-purchases">${parseFloat(supplier.purchases).toFixed(2)}</td>
            <td class="col-payments">${parseFloat(supplier.payments).toFixed(2)}</td>
            <td class="col-balance">${parseFloat(supplier.balance).toFixed(2)}</td>
            <td class="action-cell">
                <button class="action-btn edit-btn"   data-supplier-id="${supplier.id}"><i class="fas fa-edit"></i></button>
                <button class="action-btn delete-btn" data-supplier-id="${supplier.id}"><i class="fas fa-trash"></i></button>
                <button class="action-btn update-btn" data-supplier-id="${supplier.id}" style="display:none;"><i class="fas fa-save"></i></button>
                <button class="action-btn cancel-btn" data-supplier-id="${supplier.id}" style="display:none;"><i class="fas fa-times"></i></button>
            </td>
        `;

        row.querySelector('.edit-btn')  .addEventListener('click', function () { supEditSupplier(this); });
        row.querySelector('.delete-btn').addEventListener('click', function () { supDeleteSupplier(this.getAttribute('data-supplier-id')); });
        row.querySelector('.update-btn').addEventListener('click', function () { supUpdateSupplier(this); });
        row.querySelector('.cancel-btn').addEventListener('click', function () { supCancelEdit(this); });

        tbody.appendChild(row);
    });

    supRenderPagination();
}


/* ============================================================
   PAGINATION
   ============================================================ */
function supRenderPagination() {
    const total  = Math.ceil(supFilteredSuppliers.length / supPageSize);
    const pagDiv = document.getElementById('supPagination');
    pagDiv.innerHTML = '';

    if (total <= 1) return;

    const prev     = document.createElement('button');
    prev.className = 'page-btn';
    prev.innerHTML = '<i class="fas fa-chevron-left"></i>';
    prev.disabled  = supCurrentPage === 1;
    prev.onclick   = () => { if (supCurrentPage > 1) { supCurrentPage--; supRenderTable(); } };
    pagDiv.appendChild(prev);

    for (let i = 1; i <= total; i++) {
        const btn       = document.createElement('button');
        btn.className   = `page-btn ${i === supCurrentPage ? 'active' : ''}`;
        btn.textContent = i;
        btn.onclick     = () => { supCurrentPage = i; supRenderTable(); };
        pagDiv.appendChild(btn);
    }

    const next     = document.createElement('button');
    next.className = 'page-btn';
    next.innerHTML = '<i class="fas fa-chevron-right"></i>';
    next.disabled  = supCurrentPage === total;
    next.onclick   = () => { if (supCurrentPage < total) { supCurrentPage++; supRenderTable(); } };
    pagDiv.appendChild(next);
}


/* ============================================================
   INLINE EDIT / UPDATE / CANCEL
   ============================================================ */
function supEditSupplier(button) {
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

    const countyOpts = supCounties.map(c =>
        `<option value="${c}" ${c === cells[4].textContent.trim() ? 'selected' : ''}>${c}</option>`
    ).join('');
    cells[4].innerHTML = `<select class="editable" style="width:100%">${countyOpts}</select>`;

    const townOpts = supTowns.map(t =>
        `<option value="${t}" ${t === cells[5].textContent.trim() ? 'selected' : ''}>${t}</option>`
    ).join('');
    cells[5].innerHTML = `<select class="editable" style="width:100%">${townOpts}</select>`;

    const ac = cells[9];
    ac.querySelector('.edit-btn')  .style.display = 'none';
    ac.querySelector('.delete-btn').style.display = 'none';
    ac.querySelector('.update-btn').style.display = 'inline-block';
    ac.querySelector('.cancel-btn').style.display = 'inline-block';
}

function supCancelEdit(button) {
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

async function supUpdateSupplier(button) {
    const row   = button.closest('tr');
    const cells = row.querySelectorAll('td');

    const data = {
        id:      row.getAttribute('data-supplier-id'),
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

    supShowProcessing();
    try {
        const res    = await fetch('/api/suppliers/update/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-CSRFToken': supGetCSRFToken() },
            credentials: 'same-origin',
            body: JSON.stringify(data)
        });
        const result = await res.json();
        if (result.success) {
            alert('✅ Supplier Updated Successfully');
            await supLoadSuppliers();
        } else {
            alert('Error: ' + result.message);
        }
    } catch (err) {
        console.error('Error updating supplier:', err);
        alert('Failed to update supplier');
    } finally {
        supHideProcessing();
    }
}


/* ============================================================
   DELETE
   ============================================================ */
async function supDeleteSupplier(supplierId) {
    if (!confirm('Are you sure you want to delete this supplier?')) return;

    supShowProcessing();
    try {
        const res    = await fetch('/api/suppliers/delete/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-CSRFToken': supGetCSRFToken() },
            credentials: 'same-origin',
            body: JSON.stringify({ supplier_id: supplierId })
        });
        const result = await res.json();
        if (result.success) {
            alert('✅ Supplier Deleted Successfully');
            await supLoadSuppliers();
        } else {
            if (result.has_balance) {
                alert('❌ YOU HAVE A BALANCE WITH THIS SUPPLIER. YOU CANNOT DELETE THEM UNTIL ALL DUES ARE CLEARED.');
            } else {
                alert('Error: ' + result.message);
            }
        }
    } catch (err) {
        console.error('Error deleting supplier:', err);
        alert('Failed to delete supplier');
    } finally {
        supHideProcessing();
    }
}


/* ============================================================
   MODALS — County
   ============================================================ */
function supOpenNewStateModal() {
    document.getElementById('supStateModal').style.display = 'block';
    document.getElementById('supNewState').value = '';
}

function supCloseStateModal() {
    document.getElementById('supStateModal').style.display = 'none';
}

async function supSaveNewState() {
    const name = document.getElementById('supNewState').value.trim();
    if (!name) { alert('Please enter a county name'); return; }

    supShowProcessing();
    try {
        const res    = await fetch('/api/suppliers/counties/add/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-CSRFToken': supGetCSRFToken() },
            credentials: 'same-origin',
            body: JSON.stringify({ county_name: name })
        });
        const result = await res.json();
        if (result.success) {
            alert('✅ County Added Successfully');
            supCloseStateModal();
            await supLoadCounties();
        } else {
            alert('Error: ' + result.message);
        }
    } catch (err) {
        console.error('Error saving county:', err);
        alert('Failed to add county');
    } finally {
        supHideProcessing();
    }
}


/* ============================================================
   MODALS — Town
   ============================================================ */
function supOpenNewCityModal() {
    document.getElementById('supCityModal').style.display = 'block';
    document.getElementById('supNewCity').value = '';
}

function supCloseCityModal() {
    document.getElementById('supCityModal').style.display = 'none';
}

async function supSaveNewCity() {
    const name = document.getElementById('supNewCity').value.trim();
    if (!name) { alert('Please enter a town name'); return; }

    supShowProcessing();
    try {
        const res    = await fetch('/api/suppliers/towns/add/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-CSRFToken': supGetCSRFToken() },
            credentials: 'same-origin',
            body: JSON.stringify({ town_name: name })
        });
        const result = await res.json();
        if (result.success) {
            alert('✅ Town Added Successfully');
            supCloseCityModal();
            await supLoadTowns();
        } else {
            alert('Error: ' + result.message);
        }
    } catch (err) {
        console.error('Error saving town:', err);
        alert('Failed to add town');
    } finally {
        supHideProcessing();
    }
}


/* ============================================================
   MODALS — Supplier (Add New)
   ============================================================ */
function supOpenNewSupplierModal() {
    document.getElementById('supSupplierModal').style.display  = 'block';
    document.getElementById('supSupplierId').value             = '';
    document.getElementById('supSupplierName').value           = '';
    document.getElementById('supSupplierContact').value        = '';
    document.getElementById('supSupplierEmail').value          = '';
    $('#supSupplierState').val('').trigger('change');
    $('#supSupplierCity') .val('').trigger('change');
}

function supCloseSupplierModal() {
    document.getElementById('supSupplierModal').style.display = 'none';
}

async function supGenerateSupplierId() {
    supShowProcessing();
    try {
        const res    = await fetch('/api/suppliers/generate-id/', {
            headers: { 'Content-Type': 'application/json', 'X-CSRFToken': supGetCSRFToken() },
            credentials: 'same-origin'
        });
        const result = await res.json();
        if (result.success) {
            document.getElementById('supSupplierId').value = result.supplier_id;
        } else {
            alert('Error generating ID: ' + result.message);
        }
    } catch (err) {
        console.error('Error generating supplier ID:', err);
        alert('Failed to generate supplier ID');
    } finally {
        supHideProcessing();
    }
}

async function supSaveNewSupplier() {
    const data = {
        id:      document.getElementById('supSupplierId').value.trim(),
        name:    document.getElementById('supSupplierName').value.trim(),
        contact: document.getElementById('supSupplierContact').value.trim(),
        email:   document.getElementById('supSupplierEmail').value.trim(),
        state:   $('#supSupplierState').val(),
        city:    $('#supSupplierCity').val()
    };

    if (!data.id)    { alert('Please generate a Supplier ID'); return; }
    if (!data.name)  { alert('Please enter Supplier Name');    return; }
    if (!data.state) { alert('Please select County');          return; }
    if (!data.city)  { alert('Please select Town');            return; }

    supShowProcessing();
    try {
        const res    = await fetch('/api/suppliers/add/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-CSRFToken': supGetCSRFToken() },
            credentials: 'same-origin',
            body: JSON.stringify(data)
        });
        const result = await res.json();
        if (result.success) {
            alert('✅ Supplier Saved Successfully');
            supCloseSupplierModal();
            await supLoadSuppliers();
        } else {
            alert('Error: ' + result.message);
        }
    } catch (err) {
        console.error('Error saving supplier:', err);
        alert('Failed to save supplier');
    } finally {
        supHideProcessing();
    }
}


/* ============================================================
   SEARCH
   ============================================================ */
function supSearchSuppliers() {
    const criteria = document.getElementById('supSearchCriteria').value;
    const query    = document.getElementById('supSearchInput').value.toLowerCase().trim();

    if (!query) {
        supFilteredSuppliers = [...supAllSuppliers];
    } else {
        supFilteredSuppliers = supAllSuppliers.filter(supplier => {
            switch (criteria) {
                case 'Supplier Name': return supplier.name.toLowerCase().includes(query);
                case 'State':         return supplier.state && supplier.state.toLowerCase().includes(query);
                case 'City':          return supplier.city  && supplier.city.toLowerCase().includes(query);
                default:
                    return (
                        supplier.name.toLowerCase().includes(query) ||
                        (supplier.state && supplier.state.toLowerCase().includes(query)) ||
                        (supplier.city  && supplier.city.toLowerCase().includes(query))
                    );
            }
        });
    }

    supCurrentPage = 1;
    supRenderTable();
    if (supFilteredSuppliers.length === 0 && query) alert('No matching data found');
}

function supClearSearch() {
    document.getElementById('supSearchInput').value    = '';
    document.getElementById('supSearchCriteria').value = 'all';
    supFilteredSuppliers = [...supAllSuppliers];
    supCurrentPage       = 1;
    supRenderTable();
}


/* ============================================================
   PROCESSING OVERLAY
   ============================================================ */
function supShowProcessing() {
    const el = document.getElementById('supProcessingOverlay');
    if (el) el.style.display = 'flex';
}

function supHideProcessing() {
    const el = document.getElementById('supProcessingOverlay');
    if (el) el.style.display = 'none';
}