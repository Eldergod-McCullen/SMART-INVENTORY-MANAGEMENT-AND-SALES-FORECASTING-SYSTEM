// Global variables
  let custCurrentPage = 1;
  const custPageSize = 25;
  let custAllCustomers = [];
  let custFilteredCustomers = [];
  let custStates = [];
  let custCities = [];
  
  // Initialize page
  document.addEventListener('DOMContentLoaded', function() {
    custLoadStates();
    custLoadCities();
    custLoadCustomers();
    
    // Initialize dropdowns
    $('#custCustomerState').select2();
    $('#custCustomerCity').select2();
  });
  
  // Load states from Dimensions sheet
  function custLoadStates() {
    google.script.run
      .withSuccessHandler(function(states) {
        custStates = states;
        populateCustStateDropdown();
      })
      .custGetStates();
  }
  
  // Load cities from Dimensions sheet
  function custLoadCities() {
    google.script.run
      .withSuccessHandler(function(cities) {
        custCities = cities;
        populateCustCityDropdown();
      })
      .custGetCities();
  }
  
  // Populate state dropdown
  function populateCustStateDropdown() {
    const stateSelect = $('#custCustomerState');
    stateSelect.empty();
    
    custStates.forEach(state => {
      if (state) {
        stateSelect.append(new Option(state, state));
      }
    });
    
    stateSelect.trigger('change');
  }
  
  // Populate city dropdown
  function populateCustCityDropdown() {
    const citySelect = $('#custCustomerCity');
    citySelect.empty();
    
    custCities.forEach(city => {
      if (city) {
        citySelect.append(new Option(city, city));
      }
    });
    
    citySelect.trigger('change');
  }
  
  // Load customers from sheet
  function custLoadCustomers() {
    showCustProcessing();
    google.script.run
      .withSuccessHandler(function(customers) {
        custAllCustomers = customers;
        custFilteredCustomers = [...customers];
        renderCustomerTable();
        hideCustProcessing();
      })
      .custGetCustomers();
  }
  
  // Render customer table with pagination
  function renderCustomerTable() {
    const startIndex = (custCurrentPage - 1) * custPageSize;
    const endIndex = startIndex + custPageSize;
    const pageCustomers = custFilteredCustomers.slice(startIndex, endIndex);
    const tableBody = document.getElementById('custTableBody');
    
    tableBody.innerHTML = '';
    
    if (pageCustomers.length === 0) {
      document.getElementById('custTableContainer').style.display = 'none';
      document.getElementById('custNoData').style.display = 'block';
      document.getElementById('custPagination').innerHTML = '';
      return;
    }
    
    document.getElementById('custTableContainer').style.display = 'block';
    document.getElementById('custNoData').style.display = 'none';
    
    pageCustomers.forEach((customer, index) => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${customer.id}</td>
        <td>${customer.name}</td>
        <td>${customer.contact || ''}</td>
        <td>${customer.email || ''}</td>
        <td>${customer.state}</td>
        <td>${customer.city}</td>
        <td>${customer.address || ''}</td>
        <td>${customer.sales || '0.00'}</td>
        <td>${customer.receipts || '0.00'}</td>
        <td>${customer.balance || '0.00'}</td>
        <td class="action-cell">
          <button class="action-btn edit-btn" onclick="custEditCustomer(${index})">
            <i class="fas fa-edit"></i>
          </button>
          <button class="action-btn delete-btn" onclick="custDeleteCustomer('${customer.id}')">
            <i class="fas fa-trash"></i>
          </button>
          <button class="action-btn update-btn" style="display:none;" 
            onclick="custUpdateCustomer(${index})">
            <i class="fas fa-save"></i>
          </button>
          <button class="action-btn cancel-btn" style="display:none;" 
            onclick="custCancelEdit(${index})">
            <i class="fas fa-times"></i>
          </button>
        </td>
      `;
      tableBody.appendChild(row);
    });
    
    // Render pagination
    renderCustPagination();
  }
  
  // Render pagination controls
  function renderCustPagination() {
    const totalPages = Math.ceil(custFilteredCustomers.length / custPageSize);
    const paginationDiv = document.getElementById('custPagination');
    paginationDiv.innerHTML = '';
    
    if (totalPages <= 1) return;
    
    // Previous button
    const prevBtn = document.createElement('button');
    prevBtn.className = 'page-btn';
    prevBtn.innerHTML = '<i class="fas fa-chevron-left"></i>';
    prevBtn.disabled = custCurrentPage === 1;
    prevBtn.onclick = () => {
      if (custCurrentPage > 1) {
        custCurrentPage--;
        renderCustomerTable();
      }
    };
    paginationDiv.appendChild(prevBtn);
    
    // Page buttons
    for (let i = 1; i <= totalPages; i++) {
      const pageBtn = document.createElement('button');
      pageBtn.className = `page-btn ${i === custCurrentPage ? 'active' : ''}`;
      pageBtn.textContent = i;
      pageBtn.onclick = () => {
        custCurrentPage = i;
        renderCustomerTable();
      };
      paginationDiv.appendChild(pageBtn);
    }
    
    // Next button
    const nextBtn = document.createElement('button');
    nextBtn.className = 'page-btn';
    nextBtn.innerHTML = '<i class="fas fa-chevron-right"></i>';
    nextBtn.disabled = custCurrentPage === totalPages;
    nextBtn.onclick = () => {
      if (custCurrentPage < totalPages) {
        custCurrentPage++;
        renderCustomerTable();
      }
    };
    paginationDiv.appendChild(nextBtn);
  }
  
  // Open new state modal
  function custOpenNewStateModal() {
    document.getElementById('custStateModal').style.display = 'block';
    document.getElementById('custNewState').value = '';
  }
  
  // Close new state modal
  function custCloseStateModal() {
    document.getElementById('custStateModal').style.display = 'none';
  }
  
  // Save new state
  function custSaveNewState() {
    const stateName = document.getElementById('custNewState').value.trim();
    
    if (!stateName) {
      alert('Please enter a state name');
      return;
    }
    
    showCustProcessing();
    google.script.run
      .withSuccessHandler(function() {
        hideCustProcessing();
        alert('New State Added');
        custCloseStateModal();
        custLoadStates();
      })
      .custAddNewState(stateName);
  }
  
  // Open new city modal
  function custOpenNewCityModal() {
    document.getElementById('custCityModal').style.display = 'block';
    document.getElementById('custNewCity').value = '';
  }
  
  // Close new city modal
  function custCloseCityModal() {
    document.getElementById('custCityModal').style.display = 'none';
  }
  
  // Save new city
  function custSaveNewCity() {
    const cityName = document.getElementById('custNewCity').value.trim();
    
    if (!cityName) {
      alert('Please enter a city name');
      return;
    }
    
    showCustProcessing();
    google.script.run
      .withSuccessHandler(function() {
        hideCustProcessing();
        alert('New City Added');
        custCloseCityModal();
        custLoadCities();
      })
      .custAddNewCity(cityName);
  }
  
  // Open new customer modal
  function custOpenNewCustomerModal() {
    document.getElementById('custCustomerModal').style.display = 'block';
    document.getElementById('custCustomerId').value = '';
    document.getElementById('custCustomerName').value = '';
    document.getElementById('custCustomerContact').value = '';
    document.getElementById('custCustomerEmail').value = '';
    document.getElementById('custCustomerAddress').value = '';
    $('#custCustomerState').val(null).trigger('change');
    $('#custCustomerCity').val(null).trigger('change');
  }
  
  // Close new customer modal
  function custCloseCustomerModal() {
    document.getElementById('custCustomerModal').style.display = 'none';
  }
  
  // Generate unique customer ID
  function custGenerateCustomerId() {
    showCustProcessing();
    google.script.run
      .withSuccessHandler(function(newId) {
        document.getElementById('custCustomerId').value = newId;
        hideCustProcessing();
      })
      .custGenerateCustomerId();
  }
  
  // Save new customer
  function custSaveNewCustomer() {
    const customer = {
      id: document.getElementById('custCustomerId').value,
      name: document.getElementById('custCustomerName').value.trim(),
      contact: document.getElementById('custCustomerContact').value.trim(),
      email: document.getElementById('custCustomerEmail').value.trim(),
      state: $('#custCustomerState').val(),
      city: $('#custCustomerCity').val(),
      address: document.getElementById('custCustomerAddress').value.trim()
    };
    
    // Validate required fields
    if (!customer.id) {
      alert('Please generate a Customer ID');
      return;
    }
    
    if (!customer.name) {
      alert('Please enter Customer Name');
      return;
    }
    
    if (!customer.state) {
      alert('Please select State');
      return;
    }
    
    if (!customer.city) {
      alert('Please select City');
      return;
    }
    
    showCustProcessing();
    google.script.run
      .withSuccessHandler(function() {
        hideCustProcessing();
        alert('New Customer Added');
        custCloseCustomerModal();
        custLoadCustomers();
      })
      .custAddNewCustomer(customer);
  }
  
  // Edit customer row
  function custEditCustomer(index) {
    const tableBody = document.getElementById('custTableBody');
    const row = tableBody.rows[index];
    const cells = row.cells;
    
    // Make cells editable
    cells[1].innerHTML = `<input type="text" class="editable" value="${cells[1].textContent}">`;
    cells[2].innerHTML = `<input type="text" class="editable" value="${cells[2].textContent}">`;
    cells[3].innerHTML = `<input type="email" class="editable" value="${cells[3].textContent}">`;
    
    // State dropdown
    let stateOptions = custStates.map(state => 
      `<option value="${state}" ${state === cells[4].textContent ? 'selected' : ''}>${state}</option>`
    ).join('');
    cells[4].innerHTML = `<select class="editable" style="width:100%">${stateOptions}</select>`;
    
    // City dropdown
    let cityOptions = custCities.map(city => 
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
  function custCancelEdit(index) {
    renderCustomerTable(); // Simply re-render the table to reset
  }
  
  // Update customer
  function custUpdateCustomer(index) {
    const tableBody = document.getElementById('custTableBody');
    const row = tableBody.rows[index];
    const cells = row.cells;
    
    const customer = {
      id: cells[0].textContent,
      name: cells[1].querySelector('input').value,
      contact: cells[2].querySelector('input').value,
      email: cells[3].querySelector('input').value,
      state: cells[4].querySelector('select').value,
      city: cells[5].querySelector('select').value,
      address: cells[6].querySelector('textarea').value
    };
    
    showCustProcessing();
    google.script.run
      .withSuccessHandler(function() {
        hideCustProcessing();
        alert('Customer Details Updated');
        custLoadCustomers();
      })
      .custUpdateCustomer(customer);
  }
  
  // Delete customer
  function custDeleteCustomer(customerId) {
    if (confirm('Are you sure you want to delete this customer?')) {
      showCustProcessing();
      google.script.run
        .withSuccessHandler(function(result) {
          hideCustProcessing();
          if (result === 'success') {
            custLoadCustomers();
          } else {
            alert('Customer has outstanding balance');
          }
        })
        .custDeleteCustomer(customerId);
    }
  }
  
  // Search customers
  function custSearchCustomers() {
    const criteria = document.getElementById('custSearchCriteria').value;
    const query = document.getElementById('custSearchInput').value.toLowerCase().trim();
    
    if (!query) {
      custFilteredCustomers = [...custAllCustomers];
    } else {
      custFilteredCustomers = custAllCustomers.filter(customer => {
        if (criteria === 'all') {
          return (
            customer.name.toLowerCase().includes(query) ||
            (customer.state && customer.state.toLowerCase().includes(query)) ||
            (customer.city && customer.city.toLowerCase().includes(query))
          );
        } else if (criteria === 'Customer Name') {
          return customer.name.toLowerCase().includes(query);
        } else if (criteria === 'State') {
          return customer.state && customer.state.toLowerCase().includes(query);
        } else if (criteria === 'City') {
          return customer.city && customer.city.toLowerCase().includes(query);
        }
        return true;
      });
    }
    
    custCurrentPage = 1;
    renderCustomerTable();
    
    if (custFilteredCustomers.length === 0) {
      alert('No matching data found');
    }
  }
  
  // Clear search
  function custClearSearch() {
    document.getElementById('custSearchInput').value = '';
    document.getElementById('custSearchCriteria').value = 'all';
    custFilteredCustomers = [...custAllCustomers];
    custCurrentPage = 1;
    renderCustomerTable();
  }
  
  // Show processing overlay
  function showCustProcessing() {
    document.getElementById('custProcessingOverlay').style.display = 'flex';
  }
  
  // Hide processing overlay
  function hideCustProcessing() {
    document.getElementById('custProcessingOverlay').style.display = 'none';
  }