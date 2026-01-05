  // Global variables (no change, just for context)
    let poCurrentPage = 1;
    const poPageSize = 10;
    let poAllPOs = [];
    let poFilteredPOs = [];
    let poSuppliers = [];
    let poItems = [];
    let poPMTStatuses = [];
    let poShippingStatuses = [];
    let poDetailCounter = 1; // This counter is not strictly needed if detailId is randomly generated

    // Initialize page (no change, just for context)
    document.addEventListener('DOMContentLoaded', function() {
      // Initialize date picker
      flatpickr("#poPODate", {
        dateFormat: "Y-m-d", // Format for internal use and saving to sheet
        defaultDate: "today"
      });

      // Load initial data
      poLoadSuppliers();
      poLoadInventoryItems();
      poLoadPMTStatuses();
      poLoadShippingStatuses();
      poLoadPOs();
    });

    // Load suppliers (no change, just for context)
    function poLoadSuppliers() {
      google.script.run
        .withSuccessHandler(function(suppliers) {
          poSuppliers = suppliers;
          const supplierSelect = $('#poSupplierName');
          supplierSelect.empty();

          poSuppliers.forEach(supplier => {
            if (supplier.name) {
              supplierSelect.append(new Option(supplier.name, supplier.id));
            }
          });

          supplierSelect.select2();
        })
        .poGetSuppliers();
    }

    // Load inventory items (no change, just for context)
    function poLoadInventoryItems() {
      google.script.run
        .withSuccessHandler(function(items) {
          poItems = items;
        })
        .poGetInventoryItems();
    }

    // Load PMT statuses (no change, just for context)
    function poLoadPMTStatuses() {
      google.script.run
        .withSuccessHandler(function(statuses) {
          poPMTStatuses = statuses;
        })
        .poGetPMTStatuses();
    }

    // Load shipping statuses (no change, just for context)
    function poLoadShippingStatuses() {
      google.script.run
        .withSuccessHandler(function(statuses) {
          poShippingStatuses = statuses;
        })
        .poGetShippingStatuses();
    }

    // Load purchase orders
    // Fix (ii): Added console.log to inspect fetched POs.
    function poLoadPOs() {
      poShowProcessing();
      google.script.run
        .withSuccessHandler(function(pos) {
          console.log("Fetched POs:", pos); // Debug: Check what data is returned
          poAllPOs = pos;
          poFilteredPOs = [...pos];
          poRenderPOTable();
          poHideProcessing();
        })
        .withFailureHandler(function(error) { // Added failure handler for initial load
            poHideProcessing();
            console.error("Error loading POs:", error);
            // alert("Error loading purchase orders: " + error.message); // Uncomment for user-facing error
        })
        .poGetPOs();
    }

    // Render PO table
    // Fix (ii): Ensured date formatting for display.
    function poRenderPOTable() {
      const startIndex = (poCurrentPage - 1) * poPageSize;
      const endIndex = startIndex + poPageSize;
      const pagePOs = poFilteredPOs.slice(startIndex, endIndex);
      const tableBody = document.getElementById('poTableBody');

      tableBody.innerHTML = '';

      if (pagePOs.length === 0) {
        document.getElementById('poTableContainer').style.display = 'none';
        document.getElementById('poNoData').style.display = 'block';
        document.getElementById('poPagination').innerHTML = '';
        return;
      }

      document.getElementById('poTableContainer').style.display = 'block';
      document.getElementById('poNoData').style.display = 'none';

      pagePOs.forEach((po, index) => {
        // Format date for display
        const formattedDate = po.date instanceof Date ?
                              po.date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) :
                              po.date || ''; // Use existing value if not a Date object or empty

        const row = document.createElement('tr');
        row.innerHTML = `
          <td>${formattedDate}</td>
          <td>${po.id || ''}</td>
          <td>${po.supplierId || ''}</td>
          <td>${po.supplierName || ''}</td>
          <td>${po.billNum || ''}</td>
          <td>${po.state || ''}</td>
          <td>${po.city || ''}</td>
          <td>${po.totalAmount ? po.totalAmount.toFixed(2) : '0.00'}</td>
          <td>${po.totalPaid ? po.totalPaid.toFixed(2) : '0.00'}</td>
          <td>${po.poBalance ? po.poBalance.toFixed(2) : '0.00'}</td>
          <td>${po.pmtStatus || ''}</td>
          <td>${po.shippingStatus || ''}</td>
          <td class="action-cell">
            <button class="action-btn view-btn" onclick="poViewPODetails('${po.id}')">
              <i class="fas fa-eye"></i> View
            </button>
          </td>
        `;
        tableBody.appendChild(row);
      });

      // Render pagination
      poRenderPagination();
    }

    // Render pagination (no change, just for context)
    function poRenderPagination() {
      const totalPages = Math.ceil(poFilteredPOs.length / poPageSize);
      const paginationDiv = document.getElementById('poPagination');
      paginationDiv.innerHTML = '';

      if (totalPages <= 1) return;

      // Previous button
      const prevBtn = document.createElement('button');
      prevBtn.className = 'page-btn';
      prevBtn.innerHTML = '<i class="fas fa-chevron-left"></i>';
      prevBtn.disabled = poCurrentPage === 1;
      prevBtn.onclick = () => {
        if (poCurrentPage > 1) {
          poCurrentPage--;
          poRenderPOTable();
        }
      };
      paginationDiv.appendChild(prevBtn);

      // Page buttons
      for (let i = 1; i <= totalPages; i++) {
        const pageBtn = document.createElement('button');
        pageBtn.className = `page-btn ${i === poCurrentPage ? 'active' : ''}`;
        pageBtn.textContent = i;
        pageBtn.onclick = () => {
          poCurrentPage = i;
          poRenderPOTable();
        };
        paginationDiv.appendChild(pageBtn);
      }

      // Next button
      const nextBtn = document.createElement('button');
      nextBtn.className = 'page-btn';
      nextBtn.innerHTML = '<i class="fas fa-chevron-right"></i>';
      nextBtn.disabled = poCurrentPage === totalPages;
      nextBtn.onclick = () => {
        if (poCurrentPage < totalPages) {
          poCurrentPage++;
          poRenderPOTable();
        }
      };
      paginationDiv.appendChild(nextBtn);
    }

    // Open PMT Status modal (no change, just for context)
    function poOpenPMTStatusModal() {
      document.getElementById('poPMTStatusModal').style.display = 'block';
      document.getElementById('poNewPMTStatus').value = '';
    }

    // Close PMT Status modal (no change, just for context)
    function poClosePMTStatusModal() {
      document.getElementById('poPMTStatusModal').style.display = 'none';
    }

    // Save new PMT Status (no change, just for context)
    function poSaveNewPMTStatus() {
      const status = document.getElementById('poNewPMTStatus').value.trim();

      if (!status) {
        // Changed alert to a more user-friendly message box if you have one
        // For now, keeping alert as per original code, but consider replacing
        alert('Please enter a PMT status');
        return;
      }

      poShowProcessing();
      google.script.run
        .withSuccessHandler(function() {
          poHideProcessing();
          alert('New PMT Status Added');
          poClosePMTStatusModal();
          poLoadPMTStatuses();
        })
        .withFailureHandler(function(error) { // Added failure handler
            poHideProcessing();
            console.error("Error adding PMT status:", error);
            alert("Error adding PMT status: " + error.message);
        })
        .poAddNewPMTStatus(status);
    }

    // Open Shipping Status modal (no change, just for context)
    function poOpenShippingStatusModal() {
      document.getElementById('poShippingStatusModal').style.display = 'block';
      document.getElementById('poNewShippingStatus').value = '';
    }

    // Close Shipping Status modal (no change, just for context)
    function poCloseShippingStatusModal() {
      document.getElementById('poShippingStatusModal').style.display = 'none';
    }

    // Save new Shipping Status (no change, just for context)
    function poSaveNewShippingStatus() {
      const status = document.getElementById('poNewShippingStatus').value.trim();

      if (!status) {
        // Changed alert to a more user-friendly message box if you have one
        // For now, keeping alert as per original code, but consider replacing
        alert('Please enter a shipping status');
        return;
      }

      poShowProcessing();
      google.script.run
        .withSuccessHandler(function() {
          poHideProcessing();
          alert('New Shipping Status Added');
          poCloseShippingStatusModal();
          poLoadShippingStatuses();
        })
        .withFailureHandler(function(error) { // Added failure handler
            poHideProcessing();
            console.error("Error adding shipping status:", error);
            alert("Error adding shipping status: " + error.message);
        })
        .poAddNewShippingStatus(status);
    }

    // Open New PO modal (no change, just for context)
    function poOpenNewPOModal() {
      document.getElementById('poNewPOModal').style.display = 'block';
      document.getElementById('poPOID').value = '';
      document.getElementById('poPODate').value = '';
      document.getElementById('poBillNum').value = '';
      document.getElementById('poSupplierID').value = '';
      document.getElementById('poState').value = '';
      document.getElementById('poCity').value = '';
      $('#poSupplierName').val(null).trigger('change');
      document.getElementById('poItemsTableBody').innerHTML = '';
      poDetailCounter = 1; // Reset counter for new PO
    }

    // Close New PO modal (no change, just for context)
    function poCloseNewPOModal() {
      document.getElementById('poNewPOModal').style.display = 'none';
    }

    // Generate PO ID (no change, just for context)
    function poGeneratePOID() {
      poShowProcessing();
      google.script.run
        .withSuccessHandler(function(newId) {
          document.getElementById('poPOID').value = newId;
          poHideProcessing();
        })
        .withFailureHandler(function(error) { // Added failure handler
            poHideProcessing();
            console.error("Error generating PO ID:", error);
            alert("Error generating PO ID: " + error.message);
        })
        .poGeneratePOID();
    }

    // Supplier changed handler (no change, just for context)
    function poSupplierChanged() {
      const supplierId = $('#poSupplierName').val();
      if (!supplierId) return;

      const supplier = poSuppliers.find(s => s.id === supplierId);
      if (supplier) {
        document.getElementById('poSupplierID').value = supplier.id;
        document.getElementById('poState').value = supplier.state;
        document.getElementById('poCity').value = supplier.city;

        // Update any existing item rows
        const rows = document.querySelectorAll('#poItemsTableBody tr');
        rows.forEach(row => {
          // Ensure these cells exist and are meant to be updated
          if (row.cells[3]) row.cells[3].textContent = supplier.id; // Supplier ID
          if (row.cells[4]) row.cells[4].textContent = supplier.name; // Supplier Name
          if (row.cells[5]) row.cells[5].textContent = supplier.state; // State
          if (row.cells[6]) row.cells[6].textContent = supplier.city; // City
          // Bill Num is from the main form, not supplier data, so keep original logic
          // row.cells[7].textContent = document.getElementById('poBillNum').value; // Bill Num
        });
      }
    }

    // Add item row (no change, just for context)
    function poAddItemRow() {
      const poId = document.getElementById('poPOID').value;
      const poDate = document.getElementById('poPODate').value;
      const supplierId = document.getElementById('poSupplierID').value;
      const supplierName = $('#poSupplierName option:selected').text();
      const state = document.getElementById('poState').value;
      const city = document.getElementById('poCity').value;
      const billNum = document.getElementById('poBillNum').value;

      if (!poId) {
        alert('Please generate a PO ID first');
        return;
      }

      if (!supplierId) {
        alert('Please select a supplier first');
        return;
      }

      if (!billNum) {
        alert('Please enter a Bill Number');
        return;
      }

      // Generate a unique detail ID
      const detailId = `D${Math.floor(10000 + Math.random() * 90000)}`;
      const tableBody = document.getElementById('poItemsTableBody');

      const row = document.createElement('tr');
      row.innerHTML = `
        <td class="readonly">${poDate}</td>
        <td class="readonly">${poId}</td>
        <td class="readonly">${detailId}</td>
        <td class="readonly">${supplierId}</td>
        <td class="readonly">${supplierName}</td>
        <td class="readonly">${state}</td>
        <td class="readonly">${city}</td>
        <td class="readonly">${billNum}</td>
        <td><span class="item-id"></span></td>
        <td><span class="item-type"></span></td>
        <td><span class="item-category"></span></td>
        <td><span class="item-subcategory"></span></td>
        <td>
          <select class="item-select" onchange="poItemChanged(this)">
            <option value="">Select Item</option>
            ${poItems.map(item => `<option value="${item.id}">${item.name}</option>`).join('')}
          </select>
        </td>
        <td><input type="number" min="1" class="qty-purchased" onchange="poCalculateRow(this)" oninput="poCalculateRow(this)"></td>
        <td><input type="number" min="0.01" step="0.01" class="unit-cost" onchange="poCalculateRow(this)" oninput="poCalculateRow(this)"></td>
        <td><span class="cost-excl-tax">0.00</span></td>
        <td><input type="number" min="0" max="100" step="0.01" class="tax-rate" onchange="poCalculateRow(this)" oninput="poCalculateRow(this)">%</td>
        <td><span class="total-tax">0.00</span></td>
        <td><span class="cost-incl-tax">0.00</span></td>
        <td><span class="shipping-fees">0.00</span></td>
        <td><span class="total-price">0.00</span></td>
        <td><button class="remove-item-btn" onclick="poRemoveItemRow(this)"><i class="fas fa-times"></i></button></td>
      `;

      tableBody.appendChild(row);
      // poDetailCounter++; // Not needed if detailId is randomly generated
    }

    // Item changed handler (no change, just for context)
    function poItemChanged(select) {
      const row = select.closest('tr');
      const itemId = select.value;

      if (!itemId) {
        row.querySelector('.item-id').textContent = '';
        row.querySelector('.item-type').textContent = '';
        row.querySelector('.item-category').textContent = '';
        row.querySelector('.item-subcategory').textContent = '';
        return;
      }

      const item = poItems.find(i => i.id === itemId);
      if (item) {
        row.querySelector('.item-id').textContent = item.id;
        row.querySelector('.item-type').textContent = item.type;
        row.querySelector('.item-category').textContent = item.category;
        row.querySelector('.item-subcategory').textContent = item.subcategory;
      }

      // Trigger calculation
      poCalculateRow(select);
    }

    // Calculate row values (no change, just for context)
    function poCalculateRow(input) {
      const row = input.closest('tr');
      const qty = parseFloat(row.querySelector('.qty-purchased').value) || 0;
      const unitCost = parseFloat(row.querySelector('.unit-cost').value) || 0;
      const taxRate = parseFloat(row.querySelector('.tax-rate').value) || 0;

      // Calculate values
      const costExclTax = qty * unitCost;
      const totalTax = costExclTax * (taxRate / 100);
      const costInclTax = costExclTax + totalTax;
      const shippingFees = costInclTax * 0.01; // 1% of cost incl tax
      const totalPrice = costInclTax + shippingFees;

      // Update fields
      row.querySelector('.cost-excl-tax').textContent = costExclTax.toFixed(2);
      row.querySelector('.total-tax').textContent = totalTax.toFixed(2);
      row.querySelector('.cost-incl-tax').textContent = costInclTax.toFixed(2);
      row.querySelector('.shipping-fees').textContent = shippingFees.toFixed(2);
      row.querySelector('.total-price').textContent = totalPrice.toFixed(2);
    }

    // Remove item row (no change, just for context)
    function poRemoveItemRow(button) {
      const row = button.closest('tr');
      row.remove();
    }

    // Save new PO
    // Fix (i): Changed how itemName is retrieved to avoid querySelector error.
    // Fix (iii): Added withFailureHandler to ensure processing overlay is hidden on error.
    function poSaveNewPO() {
      const poId = document.getElementById('poPOID').value;
      const poDate = document.getElementById('poPODate').value;
      const billNum = document.getElementById('poBillNum').value;
      const supplierId = document.getElementById('poSupplierID').value;

      if (!poId) {
        alert('Please generate a PO ID');
        return;
      }

      if (!poDate) {
        alert('Please select a PO date');
        return;
      }

      if (!supplierId) {
        alert('Please select a supplier');
        return;
      }

      if (!billNum) {
        alert('Please enter a Bill Number');
        return;
      }

      const items = [];
      const rows = document.querySelectorAll('#poItemsTableBody tr');

      if (rows.length === 0) {
        alert('Please add at least one item to the PO');
        return;
      }

      let isValid = true;

      rows.forEach(row => {
        const itemSelectElement = row.querySelector('.item-select');
        const itemId = row.querySelector('.item-id').textContent;
        const qty = parseFloat(row.querySelector('.qty-purchased').value) || 0;
        const unitCost = parseFloat(row.querySelector('.unit-cost').value) || 0;
        const taxRate = parseFloat(row.querySelector('.tax-rate').value) || 0;

        if (!itemId) {
          isValid = false;
          alert('Please select an item for all rows');
          return;
        }

        if (qty <= 0) {
          isValid = false;
          alert('Please enter a valid quantity for all items');
          return;
        }

        if (unitCost <= 0) {
          isValid = false;
          alert('Please enter a valid unit cost for all items');
          return;
        }

        // Fix (i) - More robust way to get selected item name
        const selectedItemName = itemSelectElement && itemSelectElement.selectedIndex !== -1
                                 ? itemSelectElement.options[itemSelectElement.selectedIndex].textContent
                                 : '';

        const item = {
          date: row.cells[0].textContent,
          poId: row.cells[1].textContent,
          detailId: row.cells[2].textContent,
          supplierId: row.cells[3].textContent,
          supplierName: row.cells[4].textContent,
          state: row.cells[5].textContent,
          city: row.cells[6].textContent,
          billNum: row.cells[7].textContent,
          itemId: itemId,
          itemType: row.cells[9].textContent,
          itemCategory: row.cells[10].textContent,
          itemSubcategory: row.cells[11].textContent,
          itemName: selectedItemName, // Use the more robustly retrieved name
          qtyPurchased: qty,
          unitCost: unitCost,
          costExclTax: parseFloat(row.querySelector('.cost-excl-tax').textContent),
          taxRate: taxRate,
          totalTax: parseFloat(row.querySelector('.total-tax').textContent),
          costInclTax: parseFloat(row.querySelector('.cost-incl-tax').textContent),
          shippingFees: parseFloat(row.querySelector('.shipping-fees').textContent),
          totalPrice: parseFloat(row.querySelector('.total-price').textContent)
        };

        items.push(item);
      });

      if (!isValid) return;

      poShowProcessing();
      google.script.run
        .withSuccessHandler(function() {
          poHideProcessing();
          alert('New PO Created Successfully');
          poCloseNewPOModal();
          poLoadPOs(); // This will re-load POs and hide processing on its success
        })
        .withFailureHandler(function(error) { // Fix (iii): Added failure handler
          poHideProcessing(); // Hide processing overlay even if there's an error
          console.error("Error saving PO:", error); // Log the error for debugging
          alert("Error saving PO: " + error.message); // Inform the user
        })
        .poSaveNewPO(items);
    }

    // View PO details (no change, just for context)
    function poViewPODetails(poId) {
  poShowProcessing();
  google.script.run
    .withSuccessHandler(function(details) {
      let html = `
        <div class="form-section">
          <h3>PO Details: ${poId}</h3>
          <div class="items-table-container">
            <table id="poDetailsTable" class="items-table">
              <thead>
                <tr>
                  <th>Date</th><th>PO ID</th><th>Detail ID</th>
                  <th>Supplier ID</th><th>Supplier Name</th><th>State</th>
                  <th>City</th><th>Bill Num</th>
                  <th>Item ID</th><th>Item Type</th><th>Item Category</th>
                  <th>Item Subcategory</th><th>Item Name</th><th>QTY Purchased</th>
                  <th>Unit Cost</th><th>Cost Excl Tax</th><th>Tax Rate</th>
                  <th>Total Tax</th><th>Cost Incl Tax</th><th>Shipping Fees</th>
                  <th>Total Purchase Price</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
      `;
      details.forEach(detail => {
        const d = (detail.date instanceof Date)
          ? detail.date.toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'})
          : detail.date||'';
        html += `
          <tr data-detail-id="${detail.detailId}">
            <td>${d}</td>
            <td>${detail.poId}</td>
            <td>${detail.detailId}</td>
            <td>${detail.supplierId}</td>
            <td>${detail.supplierName}</td>
            <td>${detail.state}</td>
            <td>${detail.city}</td>
            <td>${detail.billNum}</td>
            <td class="item-id">${detail.itemId}</td>
            <td class="item-type">${detail.itemType}</td>
            <td class="item-category">${detail.itemCategory}</td>
            <td class="item-subcategory">${detail.itemSubcategory}</td>
            <td class="item-name">${detail.itemName}</td>
            <td class="qty-purchased">${detail.qtyPurchased}</td>
            <td class="unit-cost">${detail.unitCost.toFixed(2)}</td>
            <td class="cost-excl-tax">${detail.costExclTax.toFixed(2)}</td>
            <td class="tax-rate">${detail.taxRate.toFixed(2)}%</td>
            <td class="total-tax">${detail.totalTax.toFixed(2)}</td>
            <td class="cost-incl-tax">${detail.costInclTax.toFixed(2)}</td>
            <td class="shipping-fees">${detail.shippingFees.toFixed(2)}</td>
            <td class="total-price">${detail.totalPrice.toFixed(2)}</td>
            <td class="actions-cell">
              <button class="action-btn delete-btn"
                      onclick="poDeleteDetail('${detail.detailId}')">
                <i class="fas fa-trash"></i>
              </button>
            </td>
          </tr>
        `;
      });
      html += `
              </tbody>
            </table>
          </div>
          <div class="modal-footer" style="text-align:right; margin-top:10px;">
            <button id="poEditAllBtn" class="btn" onclick="poEnableEditMode()">Edit</button>
            <button id="poSaveAllBtn" class="btn" style="display:none" onclick="poSavePODetails()">Update</button>
            <button id="poCancelAllBtn" class="btn" style="display:none" onclick="poCancelEditMode()">Cancel</button>
          </div>
        </div>
      `;
      document.getElementById('poDetailsContent').innerHTML = html;
      document.getElementById('poDetailsModal').style.display = 'block';
      poHideProcessing();
    })
    .withFailureHandler(function(err){
      poHideProcessing();
      alert("Error: "+err.message);
    })
    .poGetPODetails(poId);
}

    // Close PO details modal (no change, just for context)
    function poCloseDetailsModal() {
      document.getElementById('poDetailsModal').style.display = 'none';
    }

    // Search POs (no change, just for context)
    function poSearchPOs() {
      const criteria = document.getElementById('poSearchCriteria').value;
      const query = document.getElementById('poSearchInput').value.toLowerCase().trim();

      if (!query) {
        poFilteredPOs = [...poAllPOs];
      } else {
        poFilteredPOs = poAllPOs.filter(po => {
          if (criteria === 'all') {
            return (
              (po.id && po.id.toLowerCase().includes(query)) ||
              (po.supplierName && po.supplierName.toLowerCase().includes(query)) ||
              (po.billNum && po.billNum.toLowerCase().includes(query)) ||
              (po.pmtStatus && po.pmtStatus.toLowerCase().includes(query)) ||
              (po.shippingStatus && po.shippingStatus.toLowerCase().includes(query))
            );
          } else if (criteria === 'PO ID') {
            return po.id && po.id.toLowerCase().includes(query);
          } else if (criteria === 'Supplier Name') {
            return po.supplierName && po.supplierName.toLowerCase().includes(query);
          } else if (criteria === 'Bill Num') {
            return po.billNum && po.billNum.toLowerCase().includes(query);
          } else if (criteria === 'PMT Status') {
            return po.pmtStatus && po.pmtStatus.toLowerCase().includes(query);
          } else if (criteria === 'Shipping Status') {
            return po.shippingStatus && po.shippingStatus.toLowerCase().includes(query);
          }
          return true;
        });
      }

      poCurrentPage = 1;
      poRenderPOTable();

      if (poFilteredPOs.length === 0) {
        alert('No matching data found');
      }
    }

    // Clear search (no change, just for context)
    function poClearSearch() {
      document.getElementById('poSearchInput').value = '';
      document.getElementById('poSearchCriteria').value = 'all';
      poFilteredPOs = [...poAllPOs];
      poCurrentPage = 1;
      poRenderPOTable();
    }

    // Show processing overlay (no change, just for context)
    function poShowProcessing() {
      document.getElementById('poProcessingOverlay').style.display = 'flex';
    }

    // Hide processing overlay (no change, just for context)
    function poHideProcessing() {
      document.getElementById('poProcessingOverlay').style.display = 'none';
    }


// recalc the derived columns on the fly
function poRecalcRow(row) {
  const qty = parseFloat(row.querySelector('.edit-qty-purchased').value) || 0;
  const unitCost = parseFloat(row.querySelector('.edit-unit-cost').value) || 0;
  const taxRate = parseFloat(row.querySelector('.edit-tax-rate').value)/100 || 0;

  const excl = qty * unitCost;
  const tax   = excl * taxRate;
  const incl  = excl + tax;
  const ship  = parseFloat(row.querySelector('.shipping-fees').textContent) || 0;  // unchanged
  const total = incl + ship;

  row.querySelector('.cost-excl-tax').textContent = excl.toFixed(2);
  row.querySelector('.total-tax').textContent    = tax.toFixed(2);
  row.querySelector('.cost-incl-tax').textContent = incl.toFixed(2);
  row.querySelector('.total-price').textContent   = total.toFixed(2);
}

// 4. Delete: ask for confirmation, then call server
function poDeleteDetail(id) {
  if (!confirm('Delete this PO item permanently?')) return;
  poShowProcessing();
  const poId = document.querySelector('#poDetailsContent h3').textContent.split(': ')[1];
  google.script.run
    .withSuccessHandler(() => {
      poHideProcessing();
      alert('PO Item Deleted');
      poCloseDetailsModal();
      poLoadPOs();
    })
    .poDeletePODetail(id, poId);
}


// 1️⃣ Enable global edit mode
function poEnableEditMode() {
  document.getElementById('poEditAllBtn').style.display   = 'none';
  document.getElementById('poSaveAllBtn').style.display   = 'inline-block';
  document.getElementById('poCancelAllBtn').style.display = 'inline-block';

  document.querySelectorAll('#poDetailsTable tbody tr').forEach(row => {
    // ITEM NAME → dropdown
    const nameTd = row.querySelector('.item-name');
    const curr   = nameTd.textContent;
    nameTd.innerHTML = `<select class="edit-item-select">
      ${poItems.map(i=>`<option value="${i.id}" ${i.name===curr?'selected':''}>${i.name}</option>`).join('')}
    </select>`;
    nameTd.querySelector('select').onchange = function(){
      const it = poItems.find(x=>x.id===this.value);
      row.querySelector('.item-id').textContent          = it.id;
      row.querySelector('.item-type').textContent        = it.type;
      row.querySelector('.item-category').textContent    = it.category;
      row.querySelector('.item-subcategory').textContent = it.subcategory;
    };

    // QTY Purchased
    const q = row.querySelector('.qty-purchased').textContent;
    row.querySelector('.qty-purchased').innerHTML =
      `<input type="number" class="edit-qty" value="${q}" min="0">`;
    row.querySelector('.edit-qty').oninput = ()=> poRecalcRow(row);

    // Unit Cost
    const c = row.querySelector('.unit-cost').textContent;
    row.querySelector('.unit-cost').innerHTML =
      `<input type="number" class="edit-cost" value="${c}" step="0.01" min="0">`;
    row.querySelector('.edit-cost').oninput = ()=> poRecalcRow(row);

    // Tax Rate
    const t = row.querySelector('.tax-rate').textContent.replace('%','');
    row.querySelector('.tax-rate').innerHTML =
      `<input type="number" class="edit-tax" value="${t}" step="0.01" min="0" max="100"> %`;
    row.querySelector('.edit-tax').oninput = ()=> poRecalcRow(row);
  });
}

// 2️⃣ Recalculate derived columns
function poRecalcRow(row) {
  const qty  = parseFloat(row.querySelector('.edit-qty').value)||0;
  const cost = parseFloat(row.querySelector('.edit-cost').value)||0;
  const tax  = parseFloat(row.querySelector('.edit-tax').value)/100||0;
  const excl = qty*cost;
  const totTax = excl*tax;
  const incl  = excl+totTax;
  const ship  = parseFloat(row.querySelector('.shipping-fees').textContent)||0;
  row.querySelector('.cost-excl-tax').textContent = excl.toFixed(2);
  row.querySelector('.total-tax').textContent    = totTax.toFixed(2);
  row.querySelector('.cost-incl-tax').textContent= incl.toFixed(2);
  row.querySelector('.total-price').textContent  = (incl+ship).toFixed(2);
}

// 3️⃣ Cancel & reload
function poCancelEditMode() {
  const poId = document.querySelector('#poDetailsContent h3').textContent.split(':')[1].trim();
  poViewPODetails(poId);
}

// 4️⃣ Gather all and save
function poSavePODetails() {
  const poId = document.querySelector('#poDetailsContent h3')
                 .textContent.split(':')[1].trim();
  const updates = [];
  document.querySelectorAll('#poDetailsTable tbody tr').forEach(row => {
    updates.push({
      detailId:     row.dataset.detailId,
      poId:         poId,
      itemId:       row.querySelector('.item-id').textContent.trim(),
      itemName:     row.querySelector('.edit-item-select').selectedOptions[0].textContent,
      qtyPurchased: parseFloat(row.querySelector('.edit-qty').value) || 0,
      unitCost:     parseFloat(row.querySelector('.edit-cost').value) || 0,
      taxRate:      parseFloat(row.querySelector('.edit-tax').value) || 0,
      // derived values pulled directly from the table cells
      costExclTax:  parseFloat(row.querySelector('.cost-excl-tax').textContent) || 0,
      totalTax:     parseFloat(row.querySelector('.total-tax').textContent) || 0,
      costInclTax:  parseFloat(row.querySelector('.cost-incl-tax').textContent) || 0,
      shippingFees: parseFloat(row.querySelector('.shipping-fees').textContent) || 0,
      totalPrice:   parseFloat(row.querySelector('.total-price').textContent) || 0
    });
  });

  poShowProcessing();
  google.script.run
    .withSuccessHandler(()=>{
      poHideProcessing();
      alert('PO Details Updated');
      poCloseDetailsModal();
      poLoadPOs();
    })
    .withFailureHandler(err=>{
      poHideProcessing();
      alert('Update failed: ' + err.message);
    })
    .poSavePODetails(updates);
}


// 5️⃣ Per‑row delete (keep yours as is)
function poDeleteDetail(detailId) {
  if (!confirm('Delete this item?')) return;
  poShowProcessing();
  const poId = document.querySelector('#poDetailsContent h3').textContent.split(':')[1].trim();
  google.script.run
    .withSuccessHandler(()=>{
      poHideProcessing();
      alert('PO Item Deleted');
      poCloseDetailsModal();
      poLoadPOs();
    })
    .poDeletePODetail(detailId, poId);
}
