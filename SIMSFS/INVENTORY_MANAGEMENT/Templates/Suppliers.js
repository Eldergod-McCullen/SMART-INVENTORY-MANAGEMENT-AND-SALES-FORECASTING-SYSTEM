console.log('Suppliers.js loaded');

// Global variables
let supCurrentPage = 1;
const supPageSize = 25;
let supAllSuppliers = [];
let supFilteredSuppliers = [];
let supCounties = [];
let supTowns = [];

// CSRF Token helper
function getCSRFToken() {
    const cookies = document.cookie.split(';');
    for (let cookie of cookies) {
        const [name, value] = cookie.trim().split('=');
        if (name === 'csrftoken') return value;
    }
    return null;
}

// Initialize page
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded, initializing suppliers module...');
    
    loadCounties();
    loadTowns();
    loadSuppliers();
    
    // Initialize Select2 dropdowns
    $('#supSupplierState').select2({
        placeholder: 'Select County',
        allowClear: true
    });
    
    $('#supSupplierCity').select2({
        placeholder: 'Select Town',
        allowClear: true
    });
});

// ===================== LOAD DATA FUNCTIONS =====================

async function loadCounties() {
    try {
        const response = await fetch('/api/suppliers/counties/', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCSRFToken()
            },
            credentials: 'same-origin'
        });
        
        const result = await response.json();
        if (result.success) {
            supCounties = result.data;
            populateCountyDropdown();
        }
    } catch (error) {
        console.error('Error loading counties:', error);
    }
}

async function loadTowns() {
    try {
        const response = await fetch('/api/suppliers/towns/', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCSRFToken()
            },
            credentials: 'same-origin'
        });
        
        const result = await response.json();
        if (result.success) {
            supTowns = result.data;
            populateTownDropdown();
        }
    } catch (error) {
        console.error('Error loading towns:', error);
    }
}

function populateCountyDropdown() {
    const countySelect = $('#supSupplierState');
    countySelect.empty();
    countySelect.append(new Option('Select County', '', true, true));
    
    supCounties.forEach(county => {
        if (county) {
            countySelect.append(new Option(county, county));
        }
    });
    
    countySelect.trigger('change');
}

function populateTownDropdown() {
    const townSelect = $('#supSupplierCity');
    townSelect.empty();
    townSelect.append(new Option('Select Town', '', true, true));
    
    supTowns.forEach(town => {
        if (town) {
            townSelect.append(new Option(town, town));
        }
    });
    
    townSelect.trigger('change');
}

async function loadSuppliers() {
    showProcessing();
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
            supAllSuppliers = result.data;
            supFilteredSuppliers = [...result.data];
            renderSupplierTable();
        } else {
            alert('Error loading suppliers: ' + result.message);
        }
    } catch (error) {
        console.error('Error loading suppliers:', error);
        alert('Failed to load suppliers');
    } finally {
        hideProcessing();
    }
}

// ===================== RENDER TABLE & PAGINATION =====================

function renderSupplierTable() {
    const startIndex = (supCurrentPage - 1) * supPageSize;
    const endIndex = startIndex + supPageSize;
    const pageSuppliers = supFilteredSuppliers.slice(startIndex, endIndex);
    const tableBody = document.getElementById('supTableBody');
    
    tableBody.innerHTML = '';
    
    if (pageSuppliers.length === 0) {
        document.getElementById('supTableContainer').style.display = 'none';
        document.getElementById('supNoData').style.display = 'block';
        document.getElementById('supPagination').innerHTML = '';
        return;
    }
    
    document.getElementById('supTableContainer').style.display = 'block';
    document.getElementById('supNoData').style.display = 'none';
    
    pageSuppliers.forEach((supplier, index) => {
        const row = document.createElement('tr');
        row.setAttribute('data-supplier-id', supplier.id);
        row.setAttribute('data-index', index);
        
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
                <button class="action-btn edit-btn" data-supplier-id="${supplier.id}">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="action-btn delete-btn" data-supplier-id="${supplier.id}">
                    <i class="fas fa-trash"></i>
                </button>
                <button class="action-btn update-btn" style="display:none;" data-supplier-id="${supplier.id}">
                    <i class="fas fa-save"></i>
                </button>
                <button class="action-btn cancel-btn" style="display:none;" data-supplier-id="${supplier.id}">
                    <i class="fas fa-times"></i>
                </button>
            </td>
        `;
        
        // Add event listeners
        row.querySelector('.edit-btn').addEventListener('click', function() {
            editSupplier(this);
        });
        row.querySelector('.delete-btn').addEventListener('click', function() {
            deleteSupplier(this.getAttribute('data-supplier-id'));
        });
        row.querySelector('.update-btn').addEventListener('click', function() {
            updateSupplier(this);
        });
        row.querySelector('.cancel-btn').addEventListener('click', function() {
            cancelEdit(this);
        });
        
        tableBody.appendChild(row);
    });
    
    renderPagination();
}

function renderPagination() {
    const totalPages = Math.ceil(supFilteredSuppliers.length / supPageSize);
    const paginationDiv = document.getElementById('supPagination');
    paginationDiv.innerHTML = '';
    
    if (totalPages <= 1) return;
    
    // Previous button
    const prevBtn = document.createElement('button');
    prevBtn.className = 'page-btn';
    prevBtn.innerHTML = '<i class="fas fa-chevron-left"></i>';
    prevBtn.disabled = supCurrentPage === 1;
    prevBtn.onclick = () => {
        if (supCurrentPage > 1) {
            supCurrentPage--;
            renderSupplierTable();
        }
    };
    paginationDiv.appendChild(prevBtn);
    
    // Page buttons
    for (let i = 1; i <= totalPages; i++) {
        const pageBtn = document.createElement('button');
        pageBtn.className = `page-btn ${i === supCurrentPage ? 'active' : ''}`;
        pageBtn.textContent = i;
        pageBtn.onclick = () => {
            supCurrentPage = i;
            renderSupplierTable();
        };
        paginationDiv.appendChild(pageBtn);
    }
    
    // Next button
    const nextBtn = document.createElement('button');
    nextBtn.className = 'page-btn';
    nextBtn.innerHTML = '<i class="fas fa-chevron-right"></i>';
    nextBtn.disabled = supCurrentPage === totalPages;
    nextBtn.onclick = () => {
        if (supCurrentPage < totalPages) {
            supCurrentPage++;
            renderSupplierTable();
        }
    };
    paginationDiv.appendChild(nextBtn);
}

// ===================== COUNTY MODAL FUNCTIONS =====================

function supOpenNewStateModal() {
    document.getElementById('supStateModal').style.display = 'block';
    document.getElementById('supNewState').value = '';
}

function supCloseStateModal() {
    document.getElementById('supStateModal').style.display = 'none';
}

async function supSaveNewState() {
    const countyName = document.getElementById('supNewState').value.trim();
    
    if (!countyName) {
        alert('Please enter a county name');
        return;
    }
    
    showProcessing();
    try {
        const response = await fetch('/api/suppliers/counties/add/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCSRFToken()
            },
            credentials: 'same-origin',
            body: JSON.stringify({ county_name: countyName })
        });
        
        const result = await response.json();
        if (result.success) {
            alert('County Added Successfully');
            supCloseStateModal();
            await loadCounties();
        } else {
            alert('Error: ' + result.message);
        }
    } catch (error) {
        console.error('Error saving county:', error);
        alert('Failed to add county');
    } finally {
        hideProcessing();
    }
}

// ===================== TOWN MODAL FUNCTIONS =====================

function supOpenNewCityModal() {
    document.getElementById('supCityModal').style.display = 'block';
    document.getElementById('supNewCity').value = '';
}

function supCloseCityModal() {
    document.getElementById('supCityModal').style.display = 'none';
}

async function supSaveNewCity() {
    const townName = document.getElementById('supNewCity').value.trim();
    
    if (!townName) {
        alert('Please enter a town name');
        return;
    }
    
    showProcessing();
    try {
        const response = await fetch('/api/suppliers/towns/add/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCSRFToken()
            },
            credentials: 'same-origin',
            body: JSON.stringify({ town_name: townName })
        });
        
        const result = await response.json();
        if (result.success) {
            alert('Town Added Successfully');
            supCloseCityModal();
            await loadTowns();
        } else {
            alert('Error: ' + result.message);
        }
    } catch (error) {
        console.error('Error saving town:', error);
        alert('Failed to add town');
    } finally {
        hideProcessing();
    }
}

// ===================== SUPPLIER MODAL FUNCTIONS =====================

function supOpenNewSupplierModal() {
    document.getElementById('supSupplierModal').style.display = 'block';
    document.getElementById('supSupplierId').value = '';
    document.getElementById('supSupplierName').value = '';
    document.getElementById('supSupplierContact').value = '';
    document.getElementById('supSupplierEmail').value = '';
    $('#supSupplierState').val('').trigger('change');
    $('#supSupplierCity').val('').trigger('change');
}

function supCloseSupplierModal() {
    document.getElementById('supSupplierModal').style.display = 'none';
}

async function supGenerateSupplierId() {
    showProcessing();
    try {
        const response = await fetch('/api/suppliers/generate-id/', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCSRFToken()
            },
            credentials: 'same-origin'
        });
        
        const result = await response.json();
        if (result.success) {
            document.getElementById('supSupplierId').value = result.supplier_id;
        } else {
            alert('Error generating ID: ' + result.message);
        }
    } catch (error) {
        console.error('Error generating supplier ID:', error);
        alert('Failed to generate supplier ID');
    } finally {
        hideProcessing();
    }
}

async function supSaveNewSupplier() {
    const supplierData = {
        id: document.getElementById('supSupplierId').value.trim(),
        name: document.getElementById('supSupplierName').value.trim(),
        contact: document.getElementById('supSupplierContact').value.trim(),
        email: document.getElementById('supSupplierEmail').value.trim(),
        state: $('#supSupplierState').val(),
        city: $('#supSupplierCity').val()
    };
    
    // Validation
    if (!supplierData.id) {
        alert('Please generate a Supplier ID');
        return;
    }
    if (!supplierData.name) {
        alert('Please enter Supplier Name');
        return;
    }
    if (!supplierData.state) {
        alert('Please select County');
        return;
    }
    if (!supplierData.city) {
        alert('Please select Town');
        return;
    }
    
    showProcessing();
    try {
        const response = await fetch('/api/suppliers/add/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCSRFToken()
            },
            credentials: 'same-origin',
            body: JSON.stringify(supplierData)
        });
        
        const result = await response.json();
        if (result.success) {
            alert('Supplier Saved Successfully');
            supCloseSupplierModal();
            await loadSuppliers();
        } else {
            alert('Error: ' + result.message);
        }
    } catch (error) {
        console.error('Error saving supplier:', error);
        alert('Failed to save supplier');
    } finally {
        hideProcessing();
    }
}

// ===================== EDIT, UPDATE, CANCEL FUNCTIONS =====================

function editSupplier(button) {
    const row = button.closest('tr');
    const cells = row.querySelectorAll('td');
    
    // Store original values
    row.setAttribute('data-original-name', cells[1].textContent);
    row.setAttribute('data-original-contact', cells[2].textContent);
    row.setAttribute('data-original-email', cells[3].textContent);
    row.setAttribute('data-original-state', cells[4].textContent);
    row.setAttribute('data-original-city', cells[5].textContent);
    
    // Make editable
    cells[1].innerHTML = `<input type="text" class="editable" value="${cells[1].textContent}">`;
    cells[2].innerHTML = `<input type="text" class="editable" value="${cells[2].textContent}">`;
    cells[3].innerHTML = `<input type="email" class="editable" value="${cells[3].textContent}">`;
    
    // County dropdown
    let countyOptions = supCounties.map(county => 
        `<option value="${county}" ${county === cells[4].textContent ? 'selected' : ''}>${county}</option>`
    ).join('');
    cells[4].innerHTML = `<select class="editable" style="width:100%">${countyOptions}</select>`;
    
    // Town dropdown
    let townOptions = supTowns.map(town => 
        `<option value="${town}" ${town === cells[5].textContent ? 'selected' : ''}>${town}</option>`
    ).join('');
    cells[5].innerHTML = `<select class="editable" style="width:100%">${townOptions}</select>`;
    
    // Show/hide buttons
    const actionCell = cells[9];
    actionCell.querySelector('.edit-btn').style.display = 'none';
    actionCell.querySelector('.delete-btn').style.display = 'none';
    actionCell.querySelector('.update-btn').style.display = 'inline-block';
    actionCell.querySelector('.cancel-btn').style.display = 'inline-block';
}

function cancelEdit(button) {
    const row = button.closest('tr');
    const cells = row.querySelectorAll('td');
    
    // Restore original values
    cells[1].textContent = row.getAttribute('data-original-name');
    cells[2].textContent = row.getAttribute('data-original-contact');
    cells[3].textContent = row.getAttribute('data-original-email');
    cells[4].textContent = row.getAttribute('data-original-state');
    cells[5].textContent = row.getAttribute('data-original-city');
    
    // Show/hide buttons
    const actionCell = cells[9];
    actionCell.querySelector('.edit-btn').style.display = 'inline-block';
    actionCell.querySelector('.delete-btn').style.display = 'inline-block';
    actionCell.querySelector('.update-btn').style.display = 'none';
    actionCell.querySelector('.cancel-btn').style.display = 'none';
}

async function updateSupplier(button) {
    const row = button.closest('tr');
    const cells = row.querySelectorAll('td');
    const supplierId = row.getAttribute('data-supplier-id');
    
    const supplierData = {
        id: supplierId,
        name: cells[1].querySelector('input').value.trim(),
        contact: cells[2].querySelector('input').value.trim(),
        email: cells[3].querySelector('input').value.trim(),
        state: cells[4].querySelector('select').value,
        city: cells[5].querySelector('select').value
    };
    
    // Validation
    if (!supplierData.name || !supplierData.state || !supplierData.city) {
        alert('Please fill all required fields');
        return;
    }
    
    showProcessing();
    try {
        const response = await fetch('/api/suppliers/update/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCSRFToken()
            },
            credentials: 'same-origin',
            body: JSON.stringify(supplierData)
        });
        
        const result = await response.json();
        if (result.success) {
            alert('Supplier Updated Successfully');
            await loadSuppliers();
        } else {
            alert('Error: ' + result.message);
        }
    } catch (error) {
        console.error('Error updating supplier:', error);
        alert('Failed to update supplier');
    } finally {
        hideProcessing();
    }
}

// ===================== DELETE FUNCTION =====================

async function deleteSupplier(supplierId) {
    if (!confirm('Are you sure you want to delete this supplier?')) {
        return;
    }
    
    showProcessing();
    try {
        const response = await fetch('/api/suppliers/delete/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCSRFToken()
            },
            credentials: 'same-origin',
            body: JSON.stringify({ supplier_id: supplierId })
        });
        
        const result = await response.json();
        
        if (result.success) {
            alert('Supplier Deleted Successfully');
            await loadSuppliers();
        } else {
            if (result.has_balance) {
                alert('YOU HAVE A BALANCE WITH THIS SUPPLIER. YOU CANNOT DELETE THEM UNTIL ALL DUES ARE CLEARED.');
            } else {
                alert('Error: ' + result.message);
            }
        }
    } catch (error) {
        console.error('Error deleting supplier:', error);
        alert('Failed to delete supplier');
    } finally {
        hideProcessing();
    }
}

// ===================== SEARCH FUNCTIONS =====================

function supSearchSuppliers() {
    const criteria = document.getElementById('supSearchCriteria').value;
    const query = document.getElementById('supSearchInput').value.toLowerCase().trim();
    
    if (!query) {
        supFilteredSuppliers = [...supAllSuppliers];
    } else {
        supFilteredSuppliers = supAllSuppliers.filter(supplier => {
            if (criteria === 'all') {
                return (
                    supplier.name.toLowerCase().includes(query) ||
                    (supplier.state && supplier.state.toLowerCase().includes(query)) ||
                    (supplier.city && supplier.city.toLowerCase().includes(query))
                );
            } else if (criteria === 'Supplier Name') {
                return supplier.name.toLowerCase().includes(query);
            } else if (criteria === 'State') {
                return supplier.state && supplier.state.toLowerCase().includes(query);
            } else if (criteria === 'City') {
                return supplier.city && supplier.city.toLowerCase().includes(query);
            }
            return true;
        });
    }
    
    supCurrentPage = 1;
    renderSupplierTable();
    
    if (supFilteredSuppliers.length === 0) {
        alert('No matching data found');
    }
}

function supClearSearch() {
    document.getElementById('supSearchInput').value = '';
    document.getElementById('supSearchCriteria').value = 'all';
    supFilteredSuppliers = [...supAllSuppliers];
    supCurrentPage = 1;
    renderSupplierTable();
}

// ===================== UTILITY FUNCTIONS =====================

function showProcessing() {
    document.getElementById('supProcessingOverlay').style.display = 'flex';
}

function hideProcessing() {
    document.getElementById('supProcessingOverlay').style.display = 'none';
}