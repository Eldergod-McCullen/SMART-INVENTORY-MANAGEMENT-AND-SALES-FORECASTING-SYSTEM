console.log('Starting Inventory Items script...');
    
    // Global variables
    let currentPage = 1;
    const pageSize = 25;
    let allItems = [];
    let filteredItems = [];
    let types = [];
    let categories = [];
    let subcategories = [];

    // Get CSRF token
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

    // Initialize page
    document.addEventListener('DOMContentLoaded', function() {
        console.log('DOM loaded, initializing...');
        
        // Set up event listeners
        document.getElementById('btnAddInventoryItem').addEventListener('click', openNewItemModal);
        document.getElementById('btnAddItemType').addEventListener('click', openNewTypeModal);
        document.getElementById('btnAddItemCategory').addEventListener('click', openNewCategoryModal);
        document.getElementById('btnAddItemSubcategory').addEventListener('click', openNewSubcategoryModal);
        document.getElementById('btnSearch').addEventListener('click', searchItems);
        document.getElementById('btnClear').addEventListener('click', clearSearch);
        
        // Modal close buttons
        document.getElementById('closeTypeModal').addEventListener('click', closeTypeModal);
        document.getElementById('btnCloseTypeModal').addEventListener('click', closeTypeModal);
        document.getElementById('btnSaveType').addEventListener('click', saveNewType);
        
        document.getElementById('closeCategoryModal').addEventListener('click', closeCategoryModal);
        document.getElementById('btnCloseCategoryModal').addEventListener('click', closeCategoryModal);
        document.getElementById('btnSaveCategory').addEventListener('click', saveNewCategory);
        
        document.getElementById('closeSubcategoryModal').addEventListener('click', closeSubcategoryModal);
        document.getElementById('btnCloseSubcategoryModal').addEventListener('click', closeSubcategoryModal);
        document.getElementById('btnSaveSubcategory').addEventListener('click', saveNewSubcategory);
        
        document.getElementById('closeInventoryModal').addEventListener('click', closeInventoryModal);
        document.getElementById('btnCloseInventoryModal').addEventListener('click', closeInventoryModal);
        document.getElementById('btnGenerateId').addEventListener('click', generateInventoryId);
        document.getElementById('btnSaveInventoryItem').addEventListener('click', saveNewInventoryItem);
        
        // Load data
        loadTypes();
        loadCategories();
        loadSubcategories();
        loadInventoryItems();
        
        // Initialize dropdowns
        $('#itemType').select2();
        $('#itemCategory').select2();
        $('#itemSubcategory').select2();
        
        console.log('Initialization complete');
    });

    // Load functions
    async function loadTypes() {
        try {
            const response = await fetch('/api/inventory-items/types/', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': getCSRFToken()
                },
                credentials: 'same-origin'
            });
            
            const result = await response.json();
            if (result.success) {
                types = result.data;
                populateTypeDropdown();
            }
        } catch (error) {
            console.error('Error loading types:', error);
        }
    }

    async function loadCategories() {
        try {
            const response = await fetch('/api/inventory-items/categories/', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': getCSRFToken()
                },
                credentials: 'same-origin'
            });
            
            const result = await response.json();
            if (result.success) {
                categories = result.data;
                populateCategoryDropdown();
            }
        } catch (error) {
            console.error('Error loading categories:', error);
        }
    }

    async function loadSubcategories() {
        try {
            const response = await fetch('/api/inventory-items/subcategories/', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': getCSRFToken()
                },
                credentials: 'same-origin'
            });
            
            const result = await response.json();
            if (result.success) {
                subcategories = result.data;
                populateSubcategoryDropdown();
            }
        } catch (error) {
            console.error('Error loading subcategories:', error);
        }
    }

    function populateTypeDropdown() {
        const typeSelect = $('#itemType');
        typeSelect.empty();
        typeSelect.append(new Option('Select Item Type', '', true, true));
        
        types.forEach(type => {
            if (type) {
                typeSelect.append(new Option(type, type));
            }
        });
        
        typeSelect.trigger('change');
    }

    function populateCategoryDropdown() {
        const categorySelect = $('#itemCategory');
        categorySelect.empty();
        categorySelect.append(new Option('Select Item Category', '', true, true));
        
        categories.forEach(category => {
            if (category) {
                categorySelect.append(new Option(category, category));
            }
        });
        
        categorySelect.trigger('change');
    }

    function populateSubcategoryDropdown() {
        const subcategorySelect = $('#itemSubcategory');
        subcategorySelect.empty();
        subcategorySelect.append(new Option('Select Item Subcategory', '', true, true));
        
        subcategories.forEach(subcategory => {
            if (subcategory) {
                subcategorySelect.append(new Option(subcategory, subcategory));
            }
        });
        
        subcategorySelect.trigger('change');
    }

    async function loadInventoryItems() {
        showProcessing();
        try {
            const response = await fetch('/api/inventory-items/', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': getCSRFToken()
                },
                credentials: 'same-origin'
            });
            
            const result = await response.json();
            if (result.success) {
                allItems = result.data;
                filteredItems = [...result.data];
                renderItemTable();
            } else {
                alert('Error loading items: ' + result.message);
            }
        } catch (error) {
            console.error('Error loading items:', error);
            alert('Error loading inventory items');
        } finally {
            hideProcessing();
        }
    }

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
            row.setAttribute('data-item-id', item.id);
            row.setAttribute('data-index', index);
            
            row.innerHTML = `
                <td class="col-id">${item.id}</td>
                <td class="col-type">${item.type}</td>
                <td class="col-category">${item.category}</td>
                <td class="col-subcategory">${item.subcategory}</td>
                <td class="col-name">${item.name}</td>
                <td class="col-purchase-price">${parseFloat(item.purchase_price).toFixed(2)}</td>
                <td class="col-sale-price">${parseFloat(item.sale_price).toFixed(2)}</td>
                <td class="action-cell">
                    <button class="action-btn edit-btn" data-item-id="${item.id}">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="action-btn delete-btn" data-item-id="${item.id}">
                        <i class="fas fa-trash"></i>
                    </button>
                    <button class="action-btn update-btn" style="display:none;" data-item-id="${item.id}">
                        <i class="fas fa-save"></i>
                    </button>
                    <button class="action-btn cancel-btn" style="display:none;" data-item-id="${item.id}">
                        <i class="fas fa-times"></i>
                    </button>
                </td>
            `;
            
            // Add event listeners
            row.querySelector('.edit-btn').addEventListener('click', function() {
                editItem(this);
            });
            row.querySelector('.delete-btn').addEventListener('click', function() {
                deleteItem(this.getAttribute('data-item-id'));
            });
            row.querySelector('.update-btn').addEventListener('click', function() {
                updateItem(this);
            });
            row.querySelector('.cancel-btn').addEventListener('click', function() {
                cancelEdit(this);
            });
            
            tableBody.appendChild(row);
        });
        
        renderPagination();
    }

    function renderPagination() {
        const totalPages = Math.ceil(filteredItems.length / pageSize);
        const paginationDiv = document.getElementById('pagination');
        paginationDiv.innerHTML = '';
        
        if (totalPages <= 1) return;
        
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

    // Modal functions
    function openNewTypeModal() {
        console.log('Opening type modal...');
        document.getElementById('typeModal').style.display = 'block';
        document.getElementById('newType').value = '';
    }

    function closeTypeModal() {
        document.getElementById('typeModal').style.display = 'none';
    }

    async function saveNewType() {
        const typeName = document.getElementById('newType').value.trim();
        
        if (!typeName) {
            alert('Please enter an item type');
            return;
        }
        
        showProcessing();
        try {
            const response = await fetch('/api/inventory-items/types/add/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': getCSRFToken()
                },
                credentials: 'same-origin',
                body: JSON.stringify({ type_name: typeName })
            });
            
            const result = await response.json();
            if (result.success) {
                alert('Item Type Added Successfully');
                closeTypeModal();
                await loadTypes();
            } else {
                alert('Error: ' + result.message);
            }
        } catch (error) {
            console.error('Error saving type:', error);
            alert('Error adding item type');
        } finally {
            hideProcessing();
        }
    }

    function openNewCategoryModal() {
        console.log('Opening category modal...');
        document.getElementById('categoryModal').style.display = 'block';
        document.getElementById('newCategory').value = '';
    }

    function closeCategoryModal() {
        document.getElementById('categoryModal').style.display = 'none';
    }

    async function saveNewCategory() {
        const categoryName = document.getElementById('newCategory').value.trim();
        
        if (!categoryName) {
            alert('Please enter an item category');
            return;
        }
        
        showProcessing();
        try {
            const response = await fetch('/api/inventory-items/categories/add/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': getCSRFToken()
                },
                credentials: 'same-origin',
                body: JSON.stringify({ category_name: categoryName })
            });
            
            const result = await response.json();
            if (result.success) {
                alert('Item Category Added Successfully');
                closeCategoryModal();
                await loadCategories();
            } else {
                alert('Error: ' + result.message);
            }
        } catch (error) {
            console.error('Error saving category:', error);
            alert('Error adding item category');
        } finally {
            hideProcessing();
        }
    }

    function openNewSubcategoryModal() {
        console.log('Opening subcategory modal...');
        document.getElementById('subcategoryModal').style.display = 'block';
        document.getElementById('newSubcategory').value = '';
    }

    function closeSubcategoryModal() {
        document.getElementById('subcategoryModal').style.display = 'none';
    }

    async function saveNewSubcategory() {
        const subcategoryName = document.getElementById('newSubcategory').value.trim();
        
        if (!subcategoryName) {
            alert('Please enter an item subcategory');
            return;
        }
        
        showProcessing();
        try {
            const response = await fetch('/api/inventory-items/subcategories/add/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': getCSRFToken()
                },
                credentials: 'same-origin',
                body: JSON.stringify({ subcategory_name: subcategoryName })
            });
            
            const result = await response.json();
            if (result.success) {
                alert('Item Subcategory Added Successfully');
                closeSubcategoryModal();
                await loadSubcategories();
            } else {
                alert('Error: ' + result.message);
            }
        } catch (error) {
            console.error('Error saving subcategory:', error);
            alert('Error adding item subcategory');
        } finally {
            hideProcessing();
        }
    }

    async function generateInventoryId() {
        showProcessing();
        try {
            const response = await fetch('/api/inventory-items/generate-id/', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': getCSRFToken()
                },
                credentials: 'same-origin'
            });
            
            const result = await response.json();
            if (result.success) {
                document.getElementById('inventoryId').value = result.item_id;
            } else {
                alert('Error generating ID: ' + result.message);
            }
        } catch (error) {
            console.error('Error generating ID:', error);
            alert('Error generating item ID');
        } finally {
            hideProcessing();
        }
    }

    function openNewItemModal() {
        console.log('Opening inventory item modal...');
        document.getElementById('inventoryModal').style.display = 'block';
        document.getElementById('inventoryId').value = '';
        document.getElementById('itemName').value = '';
        document.getElementById('PurchasePrice').value = '';
        document.getElementById('SalePrice').value = '';
        $('#itemType').val('').trigger('change');
        $('#itemCategory').val('').trigger('change');
        $('#itemSubcategory').val('').trigger('change');
    }

    function closeInventoryModal() {
        document.getElementById('inventoryModal').style.display = 'none';
    }

    async function saveNewInventoryItem() {
        const itemData = {
            item_id: document.getElementById('inventoryId').value.trim(),
            item_type: $('#itemType').val(),
            item_category: $('#itemCategory').val(),
            item_subcategory: $('#itemSubcategory').val(),
            item_name: document.getElementById('itemName').value.trim(),
            purchase_price: parseFloat(document.getElementById('PurchasePrice').value) || 0,
            sale_price: parseFloat(document.getElementById('SalePrice').value) || 0
        };
        
        if (!itemData.item_id) {
            alert('Please generate an Item ID');
            return;
        }
        if (!itemData.item_type) {
            alert('Please select Item Type');
            return;
        }
        if (!itemData.item_category) {
            alert('Please select Item Category');
            return;
        }
        if (!itemData.item_subcategory) {
            alert('Please select Item Subcategory');
            return;
        }
        if (!itemData.item_name) {
            alert('Please enter Item Name');
            return;
        }
        if (itemData.purchase_price <= 0) {
            alert('Please enter a valid Purchase Price');
            return;
        }
        if (itemData.sale_price <= 0) {
            alert('Please enter a valid Sale Price');
            return;
        }
        
        showProcessing();
        try {
            const response = await fetch('/api/inventory-items/add/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': getCSRFToken()
                },
                credentials: 'same-origin',
                body: JSON.stringify(itemData)
            });
            
            const result = await response.json();
            if (result.success) {
                alert('Item Saved Successfully');
                closeInventoryModal();
                await loadInventoryItems();
            } else {
                alert('Error: ' + result.message);
            }
        } catch (error) {
            console.error('Error saving item:', error);
            alert('Error adding inventory item');
        } finally {
            hideProcessing();
        }
    }

    function editItem(button) {
        const row = button.closest('tr');
        const cells = row.querySelectorAll('td');
        
        row.setAttribute('data-original-type', cells[1].textContent);
        row.setAttribute('data-original-category', cells[2].textContent);
        row.setAttribute('data-original-subcategory', cells[3].textContent);
        row.setAttribute('data-original-name', cells[4].textContent);
        row.setAttribute('data-original-purchase-price', cells[5].textContent);
        row.setAttribute('data-original-sale-price', cells[6].textContent);
        
        let typeOptions = types.map(type => 
            `<option value="${type}" ${type === cells[1].textContent ? 'selected' : ''}>${type}</option>`
        ).join('');
        cells[1].innerHTML = `<select class="editable" style="width:100%">${typeOptions}</select>`;
        
        let categoryOptions = categories.map(category => 
            `<option value="${category}" ${category === cells[2].textContent ? 'selected' : ''}>${category}</option>`
        ).join('');
        cells[2].innerHTML = `<select class="editable" style="width:100%">${categoryOptions}</select>`;
        
        let subcategoryOptions = subcategories.map(subcategory => 
            `<option value="${subcategory}" ${subcategory === cells[3].textContent ? 'selected' : ''}>${subcategory}</option>`
        ).join('');
        cells[3].innerHTML = `<select class="editable" style="width:100%">${subcategoryOptions}</select>`;
        
        cells[4].innerHTML = `<input type="text" class="editable" value="${cells[4].textContent}">`;
        
        const purchasePrice = parseFloat(cells[5].textContent);
        cells[5].innerHTML = `<input type="number" step="0.01" class="editable" value="${purchasePrice}">`;
        
        const salePrice = parseFloat(cells[6].textContent);
        cells[6].innerHTML = `<input type="number" step="0.01" class="editable" value="${salePrice}">`;
        
        const actionCell = cells[7];
        actionCell.querySelector('.edit-btn').style.display = 'none';
        actionCell.querySelector('.delete-btn').style.display = 'none';
        actionCell.querySelector('.update-btn').style.display = 'inline-block';
        actionCell.querySelector('.cancel-btn').style.display = 'inline-block';
    }

    function cancelEdit(button) {
        const row = button.closest('tr');
        const cells = row.querySelectorAll('td');
        
        cells[1].textContent = row.getAttribute('data-original-type');
        cells[2].textContent = row.getAttribute('data-original-category');
        cells[3].textContent = row.getAttribute('data-original-subcategory');
        cells[4].textContent = row.getAttribute('data-original-name');
        cells[5].textContent = row.getAttribute('data-original-purchase-price');
        cells[6].textContent = row.getAttribute('data-original-sale-price');
        
        const actionCell = cells[7];
        actionCell.querySelector('.edit-btn').style.display = 'inline-block';
        actionCell.querySelector('.delete-btn').style.display = 'inline-block';
        actionCell.querySelector('.update-btn').style.display = 'none';
        actionCell.querySelector('.cancel-btn').style.display = 'none';
    }

    async function updateItem(button) {
        const row = button.closest('tr');
        const cells = row.querySelectorAll('td');
        const itemId = row.getAttribute('data-item-id');
        
        const itemData = {
            item_id: itemId,
            item_type: cells[1].querySelector('select').value,
            item_category: cells[2].querySelector('select').value,
            item_subcategory: cells[3].querySelector('select').value,
            item_name: cells[4].querySelector('input').value.trim(),
            purchase_price: parseFloat(cells[5].querySelector('input').value) || 0,
            sale_price: parseFloat(cells[6].querySelector('input').value) || 0
        };
        
        if (!itemData.item_type || !itemData.item_category || !itemData.item_subcategory) {
            alert('Please select all dropdown fields');
            return;
        }
        if (!itemData.item_name) {
            alert('Please enter Item Name');
            return;
        }
        if (itemData.purchase_price <= 0 || itemData.sale_price <= 0) {
            alert('Please enter valid prices');
            return;
        }
        
        showProcessing();
        try {
            const response = await fetch('/api/inventory-items/update/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': getCSRFToken()
                },
                credentials: 'same-origin',
                body: JSON.stringify(itemData)
            });
            
            const result = await response.json();
            if (result.success) {
                alert('Inventory Item Updated Successfully');
                await loadInventoryItems();
            } else {
                alert('Error: ' + result.message);
            }
        } catch (error) {
            console.error('Error updating item:', error);
            alert('Error updating inventory item');
        } finally {
            hideProcessing();
        }
    }

    async function deleteItem(itemId) {
        if (!confirm('Are you sure you want to delete this inventory item?')) {
            return;
        }
        
        showProcessing();
        try {
            const response = await fetch('/api/inventory-items/delete/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': getCSRFToken()
                },
                credentials: 'same-origin',
                body: JSON.stringify({ item_id: itemId })
            });
            
            const result = await response.json();
            if (result.success) {
                alert('Inventory Item Deleted Successfully');
                await loadInventoryItems();
            } else {
                alert('Error: ' + result.message);
            }
        } catch (error) {
            console.error('Error deleting item:', error);
            alert('Error deleting inventory item');
        } finally {
            hideProcessing();
        }
    }

    function searchItems() {
        const criteria = document.getElementById('searchCriteria').value;
        const query = document.getElementById('searchInput').value.toLowerCase().trim();
        
        if (!query) {
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

    function clearSearch() {
        document.getElementById('searchInput').value = '';
        document.getElementById('searchCriteria').value = 'all';
        filteredItems = [...allItems];
        currentPage = 1;
        renderItemTable();
    }

    function showProcessing() {
        document.getElementById('processingOverlay').style.display = 'flex';
    }

    function hideProcessing() {
        document.getElementById('processingOverlay').style.display = 'none';
    }