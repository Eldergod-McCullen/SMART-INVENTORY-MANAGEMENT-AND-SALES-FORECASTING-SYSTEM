// Global variables
  let supCurrentPage = 1;
  const supPageSize = 25;
  let supAllSuppliers = [];
  let supFilteredSuppliers = [];
  let supStates = [];
  let supCities = [];
  
  // Initialize page
  document.addEventListener('DOMContentLoaded', function() {
    supLoadStates();
    supLoadCities();
    supLoadSuppliers();
    
    // Initialize dropdowns
    $('#supSupplierState').select2();
    $('#supSupplierCity').select2();
  });
  
  // Load states from Dimensions sheet
  function supLoadStates() {
    google.script.run
      .withSuccessHandler(function(states) {
        supStates = states;
        populateStateDropdown();
      })
      .supGetStates();
  }
  
  // Load cities from Dimensions sheet
  function supLoadCities() {
    google.script.run
      .withSuccessHandler(function(cities) {
        supCities = cities;
        populateCityDropdown();
      })
      .supGetCities();
  }
  
  // Populate state dropdown
  function populateStateDropdown() {
    const stateSelect = $('#supSupplierState');
    stateSelect.empty();
    
    supStates.forEach(state => {
      if (state) {
        stateSelect.append(new Option(state, state));
      }
    });
    
    stateSelect.trigger('change');
  }
  
  // Populate city dropdown
  function populateCityDropdown() {
    const citySelect = $('#supSupplierCity');
    citySelect.empty();
    
    supCities.forEach(city => {
      if (city) {
        citySelect.append(new Option(city, city));
      }
    });
    
    citySelect.trigger('change');
  }
  
  // Load suppliers from sheet
  function supLoadSuppliers() {
    showProcessing();
    google.script.run
      .withSuccessHandler(function(suppliers) {
        supAllSuppliers = suppliers;
        supFilteredSuppliers = [...suppliers];
        renderSupplierTable();
        hideProcessing();
      })
      .supGetSuppliers();
  }
  
  // Render supplier table with pagination
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
      row.innerHTML = `
        <td>${supplier.id}</td>
        <td>${supplier.name}</td>
        <td>${supplier.contact || ''}</td>
        <td>${supplier.email || ''}</td>
        <td>${supplier.state}</td>
        <td>${supplier.city}</td>
        <td>${supplier.address || ''}</td>
        <td>${supplier.purchases || '0.00'}</td>
        <td>${supplier.payments || '0.00'}</td>
        <td>${supplier.balance || '0.00'}</td>
        <td class="action-cell">
          <button class="action-btn edit-btn" onclick="supEditSupplier(${index})">
            <i class="fas fa-edit"></i>
          </button>
          <button class="action-btn delete-btn" onclick="supDeleteSupplier('${supplier.id}')">
            <i class="fas fa-trash"></i>
          </button>
          <button class="action-btn update-btn" style="display:none;" 
            onclick="supUpdateSupplier(${index})">
            <i class="fas fa-save"></i>
          </button>
          <button class="action-btn cancel-btn" style="display:none;" 
            onclick="supCancelEdit(${index})">
            <i class="fas fa-times"></i>
          </button>
        </td>
      `;
      tableBody.appendChild(row);
    });
    
    // Render pagination
    renderPagination();
  }
  
  // Render pagination controls
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
  
  // Open new state modal
  function supOpenNewStateModal() {
    document.getElementById('supStateModal').style.display = 'block';
    document.getElementById('supNewState').value = '';
  }
  
  // Close new state modal
  function supCloseStateModal() {
    document.getElementById('supStateModal').style.display = 'none';
  }
  
  // Save new state
  function supSaveNewState() {
    const stateName = document.getElementById('supNewState').value.trim();
    
    if (!stateName) {
      alert('Please enter a state name');
      return;
    }
    
    showProcessing();
    google.script.run
      .withSuccessHandler(function() {
        hideProcessing();
        alert('New State Added');
        supCloseStateModal();
        supLoadStates();
      })
      .supAddNewState(stateName);
  }
  
  // Open new city modal
  function supOpenNewCityModal() {
    document.getElementById('supCityModal').style.display = 'block';
    document.getElementById('supNewCity').value = '';
  }
  
  // Close new city modal
  function supCloseCityModal() {
    document.getElementById('supCityModal').style.display = 'none';
  }
  
  // Save new city
  function supSaveNewCity() {
    const cityName = document.getElementById('supNewCity').value.trim();
    
    if (!cityName) {
      alert('Please enter a city name');
      return;
    }
    
    showProcessing();
    google.script.run
      .withSuccessHandler(function() {
        hideProcessing();
        alert('New City Added');
        supCloseCityModal();
        supLoadCities();
      })
      .supAddNewCity(cityName);
  }
  
  // Open new supplier modal
  function supOpenNewSupplierModal() {
    document.getElementById('supSupplierModal').style.display = 'block';
    document.getElementById('supSupplierId').value = '';
    document.getElementById('supSupplierName').value = '';
    document.getElementById('supSupplierContact').value = '';
    document.getElementById('supSupplierEmail').value = '';
    document.getElementById('supSupplierAddress').value = '';
    $('#supSupplierState').val(null).trigger('change');
    $('#supSupplierCity').val(null).trigger('change');
  }
  
  // Close new supplier modal
  function supCloseSupplierModal() {
    document.getElementById('supSupplierModal').style.display = 'none';
  }
  
  // Generate unique supplier ID
  function supGenerateSupplierId() {
    showProcessing();
    google.script.run
      .withSuccessHandler(function(newId) {
        document.getElementById('supSupplierId').value = newId;
        hideProcessing();
      })
      .supGenerateSupplierId();
  }
  
  // Save new supplier
  function supSaveNewSupplier() {
    const supplier = {
      id: document.getElementById('supSupplierId').value,
      name: document.getElementById('supSupplierName').value.trim(),
      contact: document.getElementById('supSupplierContact').value.trim(),
      email: document.getElementById('supSupplierEmail').value.trim(),
      state: $('#supSupplierState').val(),
      city: $('#supSupplierCity').val(),
      address: document.getElementById('supSupplierAddress').value.trim()
    };
    
    // Validate required fields
    if (!supplier.id) {
      alert('Please generate a Supplier ID');
      return;
    }
    
    if (!supplier.name) {
      alert('Please enter Supplier Name');
      return;
    }
    
    if (!supplier.state) {
      alert('Please select State');
      return;
    }
    
    if (!supplier.city) {
      alert('Please select City');
      return;
    }
    
    showProcessing();
    google.script.run
      .withSuccessHandler(function() {
        hideProcessing();
        alert('New Supplier Added');
        supCloseSupplierModal();
        supLoadSuppliers();
      })
      .supAddNewSupplier(supplier);
  }
  
  // Edit supplier row
  function supEditSupplier(index) {
    const tableBody = document.getElementById('supTableBody');
    const row = tableBody.rows[index];
    const cells = row.cells;
    
    // Make cells editable
    cells[1].innerHTML = `<input type="text" class="editable" value="${cells[1].textContent}">`;
    cells[2].innerHTML = `<input type="text" class="editable" value="${cells[2].textContent}">`;
    cells[3].innerHTML = `<input type="email" class="editable" value="${cells[3].textContent}">`;
    
    // State dropdown
    let stateOptions = supStates.map(state => 
      `<option value="${state}" ${state === cells[4].textContent ? 'selected' : ''}>${state}</option>`
    ).join('');
    cells[4].innerHTML = `<select class="editable" style="width:100%">${stateOptions}</select>`;
    
    // City dropdown
    let cityOptions = supCities.map(city => 
      `<option value="${city}" ${city === cells[5].textContent ? 'selected' : ''}>${city}</option>`
    ).join('');
    cells[5].innerHTML = `<select class="editable" style="width:100%">${cityOptions}</select>`;
    
    cells[6].innerHTML = `<textarea class="editable" style="width:100%">${cells[6].textContent}</textarea>`;
    
    // Show update/cancel buttons
    const actionCell = cells[10];
    actionCell.querySelector('.edit-btn').style.display = 'none';
    actionCell.querySelector('.delete-btn').style.display = 'none';
    actionCell.querySelector('.update-btn').style.display = 'inline-block';
    actionCell.querySelector('.cancel-btn').style.display = 'inline-block';
  }
  
  // Cancel edit
  function supCancelEdit(index) {
    renderSupplierTable(); // Simply re-render the table to reset
  }
  
  // Update supplier
  function supUpdateSupplier(index) {
    const tableBody = document.getElementById('supTableBody');
    const row = tableBody.rows[index];
    const cells = row.cells;
    
    const supplier = {
      id: cells[0].textContent,
      name: cells[1].querySelector('input').value,
      contact: cells[2].querySelector('input').value,
      email: cells[3].querySelector('input').value,
      state: cells[4].querySelector('select').value,
      city: cells[5].querySelector('select').value,
      address: cells[6].querySelector('textarea').value
    };
    
    showProcessing();
    google.script.run
      .withSuccessHandler(function() {
        hideProcessing();
        alert('Supplier Details Updated');
        supLoadSuppliers();
      })
      .supUpdateSupplier(supplier);
  }
  
  // Delete supplier
  function supDeleteSupplier(supplierId) {
    if (confirm('Are you sure you want to delete this supplier?')) {
      showProcessing();
      google.script.run
        .withSuccessHandler(function(result) {
          hideProcessing();
          if (result === 'success') {
            supLoadSuppliers();
          } else {
            alert('Supplier has outstanding balance');
          }
        })
        .supDeleteSupplier(supplierId);
    }
  }
  
  // Search suppliers
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
  
  // Clear search
  function supClearSearch() {
    document.getElementById('supSearchInput').value = '';
    document.getElementById('supSearchCriteria').value = 'all';
    supFilteredSuppliers = [...supAllSuppliers];
    supCurrentPage = 1;
    renderSupplierTable();
  }
  
  // Show processing overlay
  function showProcessing() {
    document.getElementById('supProcessingOverlay').style.display = 'flex';
  }
  
  // Hide processing overlay
  function hideProcessing() {
    document.getElementById('supProcessingOverlay').style.display = 'none';
  }