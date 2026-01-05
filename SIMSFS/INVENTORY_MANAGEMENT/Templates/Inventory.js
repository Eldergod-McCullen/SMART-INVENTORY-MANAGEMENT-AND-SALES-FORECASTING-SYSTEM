    // Global variables
let currentPage = 1;
const pageSize = 25;
let allItems = [];
let filteredItems = [];
let types = [];
let categories = [];
    let subcategories = [];
    
    // Initialize page
    document.addEventListener('DOMContentLoaded', function() {
      loadTypes();
      loadCategories();
      loadSubcategories();
      loadInventoryItems();
      
      // Initialize dropdowns
      $('#itemType').select2();
      $('#itemCategory').select2();
      $('#itemSubcategory').select2();
    });
    
    // Load item types from Dimensions sheet
    function loadTypes() {
      google.script.run
        .withSuccessHandler(function(result) {
          types = result;
          populateTypeDropdown();
        })
        .itemGetTypes();
    }
    
    // Load item categories from Dimensions sheet
    function loadCategories() {
      google.script.run
        .withSuccessHandler(function(result) {
          categories = result;
          populateCategoryDropdown();
        })
        .itemGetCategories();
    }
    
    // Load item subcategories from Dimensions sheet
    function loadSubcategories() {
      google.script.run
        .withSuccessHandler(function(result) {
          subcategories = result;
          populateSubcategoryDropdown();
        })
        .itemGetSubcategories();
    }
    
    // Populate type dropdown
    function populateTypeDropdown() {
      const typeSelect = $('#itemType');
      typeSelect.empty();
      
      types.forEach(type => {
        if (type) {
          typeSelect.append(new Option(type, type));
        }
      });
      
      typeSelect.trigger('change');
    }
    
    // Populate category dropdown
    function populateCategoryDropdown() {
      const categorySelect = $('#itemCategory');
      categorySelect.empty();
      
      categories.forEach(category => {
        if (category) {
          categorySelect.append(new Option(category, category));
        }
      });
      
      categorySelect.trigger('change');
    }
    
    // Populate subcategory dropdown
    function populateSubcategoryDropdown() {
      const subcategorySelect = $('#itemSubcategory');
      subcategorySelect.empty();
      
      subcategories.forEach(subcategory => {
        if (subcategory) {
          subcategorySelect.append(new Option(subcategory, subcategory));
        }
      });
      
      subcategorySelect.trigger('change');
    }
    
    // Load inventory items from sheet
    function loadInventoryItems() {
      showProcessing();
      google.script.run
        .withSuccessHandler(function(result) {
          allItems = result;
          filteredItems = [...result];
          renderItemTable();
          hideProcessing();
        })
        .itemGetInventoryItems();
    }
    
    // Render inventory table with pagination
    function renderItemTable() {
      const startIndex = (currentPage - 1) * pageSize;
      const endIndex = startIndex + pageSize;
      const pageItems = filteredItems.slice(startIndex, endIndex);
      const tableBody = document.getElementById('tableBody');
      
      tableBody.innerHTML = '';
      
      if (pageItems.length === 0) {
        document.getElementById('tableContainer').style.display = 'none';
        document.getElementById('noData').style.display = 'block';
        document.getElementById('pagination').innerHTML = '';
        return;
      }
      
      document.getElementById('tableContainer').style.display = 'block';
      document.getElementById('noData').style.display = 'none';
      
      pageItems.forEach((item, index) => {
        const row = document.createElement('tr');
        
        // Add class for low stock or reorder needed
        if (item.remainingQty < item.reorderLevel) {
          row.classList.add('reorder-needed');
        } else if (item.remainingQty < item.reorderLevel * 1.5) {
          row.classList.add('low-stock');
        }
        
        row.innerHTML = `
          <td>${item.id}</td>
          <td>${item.type}</td>
          <td>${item.category}</td>
          <td>${item.subcategory}</td>
          <td>${item.name}</td>
          <td>${item.purchasedQty}</td>
          <td>${item.soldQty}</td>
          <td>${item.remainingQty}</td>
          <td>${item.reorderLevel}</td>
          <td>
            <span class="reorder-flag ${item.reorderRequired ? 'reorder-yes' : 'reorder-no'}">   <!-- BE SURE TO CHECK THE RE-ORDER LEVEL AND IF IT IS REQUIRED -->
              ${item.reorderRequired ? 'Yes' : 'No'}
            </span>
          </td>
          <td class="action-cell">
            <button class="action-btn edit-btn" onclick="editItem(${index})">
              <i class="fas fa-edit"></i>
            </button>
            <button class="action-btn delete-btn" onclick="deleteItem('${item.id}')">
              <i class="fas fa-trash"></i>
            </button>
            <button class="action-btn update-btn" style="display:none;" 
              onclick="updateItem(${index})">
              <i class="fas fa-save"></i>
            </button>
            <button class="action-btn cancel-btn" style="display:none;" 
              onclick="cancelEdit(${index})">
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
      const totalPages = Math.ceil(filteredItems.length / pageSize);
      const paginationDiv = document.getElementById('pagination');
      paginationDiv.innerHTML = '';
      
      if (totalPages <= 1) return;
      
      // Previous button
      const prevBtn = document.createElement('button');
      prevBtn.className = 'page-btn';
      prevBtn.innerHTML = '<i class="fas fa-chevron-left"></i>';
      prevBtn.disabled = currentPage === 1;
      prevBtn.onclick = () => {
        if (currentPage > 1) {
          currentPage--;
          renderItemTable();
        }
      };
      paginationDiv.appendChild(prevBtn);
      
      // Page buttons
      for (let i = 1; i <= totalPages; i++) {
        const pageBtn = document.createElement('button');
        pageBtn.className = `page-btn ${i === currentPage ? 'active' : ''}`;
        pageBtn.textContent = i;
        pageBtn.onclick = () => {
          currentPage = i;
          renderItemTable();
        };
        paginationDiv.appendChild(pageBtn);
      }
      
      // Next button
      const nextBtn = document.createElement('button');
      nextBtn.className = 'page-btn';
      nextBtn.innerHTML = '<i class="fas fa-chevron-right"></i>';
      nextBtn.disabled = currentPage === totalPages;
      nextBtn.onclick = () => {
        if (currentPage < totalPages) {
          currentPage++;
          renderItemTable();
        }
      };
      paginationDiv.appendChild(nextBtn);
    }
    
    // Open new type modal
    function openNewTypeModal() {
      document.getElementById('typeModal').style.display = 'block';
      document.getElementById('newType').value = '';
    }
    
    // Close new type modal
    function closeTypeModal() {
      document.getElementById('typeModal').style.display = 'none';
    }
    
    // Save new type
    function saveNewType() {
      const typeName = document.getElementById('newType').value.trim();
      
      if (!typeName) {
        alert('Please enter an item type');
        return;
      }
      
      showProcessing();
      google.script.run
        .withSuccessHandler(function() {
          hideProcessing();
          alert('New Item Type Added');
          closeTypeModal();
          loadTypes();
        })
        .itemAddNewType(typeName);
    }
    
    // Open new category modal
    function openNewCategoryModal() {
      document.getElementById('categoryModal').style.display = 'block';
      document.getElementById('newCategory').value = '';
    }
    
    // Close new category modal
    function closeCategoryModal() {
      document.getElementById('categoryModal').style.display = 'none';
    }
    
    // Save new category
    function saveNewCategory() {
      const categoryName = document.getElementById('newCategory').value.trim();
      
      if (!categoryName) {
        alert('Please enter an item category');
        return;
      }
      
      showProcessing();
      google.script.run
        .withSuccessHandler(function() {
          hideProcessing();
          alert('New Item Category Added');
          closeCategoryModal();
          loadCategories();
        })
        .itemAddNewCategory(categoryName);
    }
    
    // Open new subcategory modal
    function openNewSubcategoryModal() {
      document.getElementById('subcategoryModal').style.display = 'block';
      document.getElementById('newSubcategory').value = '';
    }
    
    // Close new subcategory modal
    function closeSubcategoryModal() {
      document.getElementById('subcategoryModal').style.display = 'none';
    }
    
    // Save new subcategory
    function saveNewSubcategory() {
      const subcategoryName = document.getElementById('newSubcategory').value.trim();
      
      if (!subcategoryName) {
        alert('Please enter an item subcategory');
        return;
      }
      
      showProcessing();
      google.script.run
        .withSuccessHandler(function() {
          hideProcessing();
          alert('New Item Subcategory Added');
          closeSubcategoryModal();
          loadSubcategories();
        })
        .itemAddNewSubcategory(subcategoryName);
    }
    
    // Open new inventory item modal
    function openNewItemModal() {
      document.getElementById('inventoryModal').style.display = 'block';
      document.getElementById('inventoryId').value = '';
      document.getElementById('itemName').value = '';
      document.getElementById('reorderLevel').value = '';
      $('#itemType').val(null).trigger('change');
      $('#itemCategory').val(null).trigger('change');
      $('#itemSubcategory').val(null).trigger('change');
    }
    
    // Close new inventory item modal
    function closeInventoryModal() {
      document.getElementById('inventoryModal').style.display = 'none';
    }
    
    // Generate unique item ID
    function generateInventoryId() {
      showProcessing();
      google.script.run
        .withSuccessHandler(function(newId) {
          document.getElementById('inventoryId').value = newId;
          hideProcessing();
        })
        .itemGenerateInventoryId();
    }
    
    // Save new inventory item
    function saveNewInventoryItem() {
      const item = {
        id: document.getElementById('inventoryId').value,
        type: $('#itemType').val(),
        category: $('#itemCategory').val(),
        subcategory: $('#itemSubcategory').val(),
        name: document.getElementById('itemName').value.trim(),
        reorderLevel: parseInt(document.getElementById('reorderLevel').value) || 0
      };
      
      // Validate required fields
      if (!item.id) {
        alert('Please generate an Item ID');
        return;
      }
      
      if (!item.type) {
        alert('Please select Item Type');
        return;
      }
      
      if (!item.category) {
        alert('Please select Item Category');
        return;
      }
      
      if (!item.subcategory) {
        alert('Please select Item Subcategory');
        return;
      }
      
      if (!item.name) {
        alert('Please enter Item Name');
        return;
      }
      
      if (isNaN(item.reorderLevel)) {
        alert('Please enter a valid Reorder Level');
        return;
      }
      
      showProcessing();
      google.script.run
        .withSuccessHandler(function() {
          hideProcessing();
          alert('New Item Added');
          closeInventoryModal();
          loadInventoryItems();
        })
        .itemAddNewInventoryItem(item);
    }
    
    // Edit item row
    function editItem(index) {
      const tableBody = document.getElementById('tableBody');
      const row = tableBody.rows[index];
      const cells = row.cells;
      const item = filteredItems[(currentPage - 1) * pageSize + index];
      
      // Make cells editable
      // Item Type dropdown
      let typeOptions = types.map(type => 
        `<option value="${type}" ${type === cells[1].textContent ? 'selected' : ''}>${type}</option>`
      ).join('');
      cells[1].innerHTML = `<select class="editable" style="width:100%">${typeOptions}</select>`;
      
      // Item Category dropdown
      let categoryOptions = categories.map(category => 
        `<option value="${category}" ${category === cells[2].textContent ? 'selected' : ''}>${category}</option>`
      ).join('');
      cells[2].innerHTML = `<select class="editable" style="width:100%">${categoryOptions}</select>`;
      
      // Item Subcategory dropdown
      let subcategoryOptions = subcategories.map(subcategory => 
        `<option value="${subcategory}" ${subcategory === cells[3].textContent ? 'selected' : ''}>${subcategory}</option>`
      ).join('');
      cells[3].innerHTML = `<select class="editable" style="width:100%">${subcategoryOptions}</select>`;
      
      cells[4].innerHTML = `<input type="text" class="editable" value="${cells[4].textContent}">`;
      cells[8].innerHTML = `<input type="number" class="editable" min="0" value="${parseInt(cells[8].textContent)}">`;
      
      // Show update/cancel buttons
      const actionCell = cells[10];
      actionCell.querySelector('.edit-btn').style.display = 'none';
      actionCell.querySelector('.delete-btn').style.display = 'none';
      actionCell.querySelector('.update-btn').style.display = 'inline-block';
      actionCell.querySelector('.cancel-btn').style.display = 'inline-block';
    }
    
    // Cancel edit
    function cancelEdit(index) {
      renderItemTable(); // Simply re-render the table to reset
    }
    
    // Update item
    function updateItem(index) {
      const tableBody = document.getElementById('tableBody');
      const row = tableBody.rows[index];
      const cells = row.cells;
      const originalItem = filteredItems[(currentPage - 1) * pageSize + index];
      
      const item = {
        id: cells[0].textContent,
        type: cells[1].querySelector('select').value,
        category: cells[2].querySelector('select').value,
        subcategory: cells[3].querySelector('select').value,
        name: cells[4].querySelector('input').value,
        reorderLevel: parseInt(cells[8].querySelector('input').value) || 0
      };
      
      // Validate required fields
      if (!item.type) {
        alert('Please select Item Type');
        return;
      }
      
      if (!item.category) {
        alert('Please select Item Category');
        return;
      }
      
      if (!item.subcategory) {
        alert('Please select Item Subcategory');
        return;
      }
      
      if (!item.name) {
        alert('Please enter Item Name');
        return;
      }
      
      if (isNaN(item.reorderLevel)) {
        alert('Please enter a valid Reorder Level');
        return;
      }
      
      showProcessing();
      google.script.run
        .withSuccessHandler(function() {
          hideProcessing();
          alert('Inventory Item Updated');
          loadInventoryItems();
        })
        .itemUpdateInventoryItem(item);
    }
    
    // Delete item
    function deleteItem(itemId) {
      if (confirm('Are you sure you want to delete this inventory item?')) {
        showProcessing();
        google.script.run
          .withSuccessHandler(function(result) {
            hideProcessing();
            if (result === 'success') {
              loadInventoryItems();
            } else {
              alert('Item with stock in hand can\'t be deleted');
            }
          })
          .itemDeleteInventoryItem(itemId);
      }
    }
    
    // Search items
    function searchItems() {
      const criteria = document.getElementById('searchCriteria').value;
      const query = document.getElementById('searchInput').value.toLowerCase().trim();
      
      if (criteria === 'Reorder Required') {
        filteredItems = allItems.filter(item => {
          return item.reorderRequired;
        });
      } else if (!query) {
        filteredItems = [...allItems];
      } else {
        filteredItems = allItems.filter(item => {
          if (criteria === 'all') {
            return (
              item.type.toLowerCase().includes(query) ||
              item.category.toLowerCase().includes(query) ||
              item.subcategory.toLowerCase().includes(query) ||
              item.name.toLowerCase().includes(query)
            );
          } else if (criteria === 'Item Type') {
            return item.type.toLowerCase().includes(query);
          } else if (criteria === 'Item Category') {
            return item.category.toLowerCase().includes(query);
          } else if (criteria === 'Item Subcategory') {
            return item.subcategory.toLowerCase().includes(query);
          } else if (criteria === 'Item Name') {
            return item.name.toLowerCase().includes(query);
          }
          return true;
        });
      }
      
      currentPage = 1;
      renderItemTable();
      
      if (filteredItems.length === 0) {
        alert('No matching data found');
      }
    }
    
    // Clear search
    function clearSearch() {
      document.getElementById('searchInput').value = '';
      document.getElementById('searchCriteria').value = 'all';
      filteredItems = [...allItems];
      currentPage = 1;
      renderItemTable();
    }
    
    // Show processing overlay
    function showProcessing() {
      document.getElementById('processingOverlay').style.display = 'flex';
    }
    
    // Hide processing overlay
    function hideProcessing() {
      document.getElementById('processingOverlay').style.display = 'none';
    }