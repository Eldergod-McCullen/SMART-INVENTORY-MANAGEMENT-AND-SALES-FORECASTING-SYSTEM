    /* === Utility & State === */
    let soAllData = [];      // Array of { … } from RANGESO
    let soSearchData = [];   // Filtered view
    let soCustomers = [];
    let soInventory = [];
    
    /* === Initialization === */
    document.addEventListener('DOMContentLoaded', () => {
      soRefreshSOList();
      google.script.run.withSuccessHandler(data => {
      soInventory = data;
        }).soGetInventoryItems();
      // Button bindings
      document.getElementById('soBtnNewSO').onclick = openNewSOForm;
      document.getElementById('soBtnSearch').onclick = applySearch;
      document.getElementById('soBtnClear').onclick = clearSearch;
    });

    /* === Rendering SO List === */
    function soRefreshSOList() {
  document.getElementById('soProcessingOverlay').style.display = 'flex';
  google.script.run
    .withSuccessHandler(renderSOList)
    .withFailureHandler(err => {
      console.error('soGetAllSO failed:', err);
      document.getElementById('soProcessingOverlay').style.display = 'none';
    })
    .soGetAllSO();
}


function renderSOList(rows) {
  const tbody = document.querySelector('#solist tbody');
  tbody.innerHTML = '';
  rows.forEach(r => {
    // ensure numeric values
    const totalAmt  = parseFloat(r['Total SO Amount'])  || 0;
    const received  = parseFloat(r['Total Received'])  || 0;
    const balance   = parseFloat(r['SO Balance'])      || 0;

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${new Date(r['SO Date']).toLocaleDateString()}</td>
      <td>${r['SO ID']}</td>
      <td>${r['Customer ID']}</td>
      <td>${r['Customer Name']}</td>
      <td>${r['Invoice Num']}</td>
      <td>${r['State']}</td>
      <td>${r['City']}</td>
      <td>${totalAmt.toFixed(2)}</td>
      <td>${received.toFixed(2)}</td>
      <td>${balance.toFixed(2)}</td>
      <td>${r['Receipt Status']}</td>
      <td>${r['Shipping Status']}</td>
      <td><button class="btn" onclick="openSODetails('${r['SO ID']}')">View</button></td>
    `;
    tbody.appendChild(tr);
  });
  document.getElementById('soProcessingOverlay').style.display = 'none';
}


    /* === Search / Clear === */
    function applySearch() {
      const crit = document.getElementById('soSearchCriteria').value;
      const val  = document.getElementById('soSearchInput').value.toLowerCase();
      if (crit === 'All' || !val) {
        renderSOList(soAllData);
        return;
      }
      const filtered = soAllData.filter(r => (''+r[crit]).toLowerCase().includes(val));
      if (!filtered.length) {
        alert('No matching data found');
      }
      renderSOList(filtered);
    }
    function clearSearch() {
      document.getElementById('soSearchInput').value = '';
      document.getElementById('soSearchCriteria').value = 'All';
      renderSOList(soAllData);
    }

    /* === New SO Form === */
    function openNewSOForm() {
  // 1) Render the modal skeleton
  showModal('Create New SO', newSOFormBody(), newSOFormFooter());

  // 2) Now that <select id="soNewCustomer"> is in the DOM,
  //    fetch customers and populate
  google.script.run
    .withSuccessHandler(populateCustomerDropdown)
    .withFailureHandler(err => {
      console.error('soGetCustomers failed:', err);
      alert('Could not load customer list. Verify named range RANGECUSTOMERS.');
    })
    .soGetCustomers();
}


    function newSOFormBody() {
      return `
        <div>
          <h3>Section 1: Master Information</h3>
          <div class="flex-space">
            <div style="flex:1; margin-right:10px">
              <label>SO ID</label><br>
              <input type="text" id="soNewSOID" readonly>
              <button class="btn" onclick="genSOID()">Generate</button>
            </div>
            <div style="flex:1; margin-right:10px">
              <label>Customer Name</label><br>
              <select id="soNewCustomer" style="width:100%"></select>
            </div>
            <div style="flex:1; margin-right:10px">
              <label>Customer ID</label><br>
              <input type="text" id="soNewCustID" readonly>
            </div>
            <div style="flex:1; margin-right:10px">
              <label>State</label><br>
              <input type="text" id="soNewState" readonly>
            </div>
            <div style="flex:1; margin-right:10px">
              <label>City</label><br>
              <input type="text" id="soNewCity" readonly>
            </div>
            <div style="flex:1; margin-right:10px">
              <label>Invoice Num</label><br>
              <input type="text" id="soNewInvoice">
            </div>
            <div style="flex:1">
              <label>SO Date</label><br>
              <input type="date" id="soNewDate">
            </div>
          </div>
        </div>
        <hr>
        <div>
          <h3>Section 2: Line Items</h3>
          <button class="add-row btn" onclick="addSOLine()">+ Add Row</button>
          <table id="soNewLines">
            <thead>
              <tr>
                <th>SO Date</th><th>SO ID</th><th>Detail ID</th><th>Customer ID</th>
                <th>Customer Name</th><th>State</th><th>City</th><th>Invoice Num</th>
                <th>Item Name</th><th>Item ID</th><th>Item Type</th><th>Item Category</th>
                <th>Item Subcategory</th><th>QTY Sold</th><th>Unit Price</th>
                <th>Price Excl Tax</th><th>Tax Rate</th><th>Total Tax</th>
                <th>Price Incl Tax</th><th>Shipping Fees</th><th>Total Sales Price</th>
                <th>Remove</th>
              </tr>
            </thead>
            <tbody></tbody>
          </table>
        </div>
      `;
    }

    function newSOFormFooter() {
      return `
        <button class="btn" onclick="saveNewSO()">Save</button>
        <button class="btn-clear" onclick="closeModal()">Close</button>
      `;
    }





function populateCustomerDropdown(customers) {
  console.log('populateCustomerDropdown got:', customers);

  const sel = document.getElementById('soNewCustomer');
  if (!sel) {
    console.error('#soNewCustomer not found');
    return;
  }

  // clear & add placeholder
  sel.innerHTML = '<option></option>';

  // only non-empty names
  customers
    .filter(c => c['Customer Name'])
    .forEach(cust => {
      const opt = document.createElement('option');
      opt.value = cust['Customer Name'];
      opt.textContent = cust['Customer Name'];
      sel.appendChild(opt);
    });

  // initialize Select2 and wire up ID/State/City
  $('#soNewCustomer').select2({
    placeholder: 'Select Customer',
    width: '100%'
  }).on('change', function() {
    const name = this.value;
    const cust = customers.find(x => x['Customer Name'] === name);
    if (cust) {
      document.getElementById('soNewCustID').value = cust['Customer ID'];
      document.getElementById('soNewState').value   = cust['State'];
      document.getElementById('soNewCity').value    = cust['City'];
    }
  });
}


    

    /* === Modal Helpers === */
    function showModal(title, bodyHTML, footerHTML) {
      document.getElementById('soModalTitle').innerText   = title;
      document.getElementById('soModalBody').innerHTML    = bodyHTML;
      document.getElementById('soModalFooter').innerHTML  = footerHTML;
      document.getElementById('soModalOverlay').style.display = 'flex';
    }
    function closeModal() {
      document.getElementById('soModalOverlay').style.display = 'none';
    }








    /* === Generate IDs === */
    function genSOID() {
      document.getElementById('soProcessingOverlay').style.display='flex';
      google.script.run.withSuccessHandler(id=>{
        document.getElementById('soNewSOID').value = id;
        document.getElementById('soProcessingOverlay').style.display='none';
      }).soGenerateSOID();
    }

    function genDetailID(rowIdx) {
      return new Promise(resolve=>{
        google.script.run.withSuccessHandler(id=>{
          resolve(id);
        }).soGenerateSalesDetailID();
      });
    }

    /* === Add / Remove Line Items === */
    async function addSOLine() {
      const tbody = document.querySelector('#soNewLines tbody');
      const rowIdx = tbody.children.length;
      const soDate = document.getElementById('soNewDate').value;
      const soID   = document.getElementById('soNewSOID').value;
      const custID = document.getElementById('soNewCustID').value;
      const custNm = $('#soNewCustomer').val();
      const state  = document.getElementById('soNewState').value;
      const city   = document.getElementById('soNewCity').value;
      const inv    = document.getElementById('soNewInvoice').value;
      const detailID = await genDetailID();

      const tr = document.createElement('tr');
      tr.setAttribute('data-idx', rowIdx);
      tr.innerHTML = `
        <td>${soDate}</td><td>${soID}</td><td>${detailID}</td>
        <td>${custID}</td><td>${custNm}</td><td>${state}</td><td>${city}</td><td>${inv}</td>
        <td><select class="soItemName" style="width:150px"></select></td>
        <td class="soItemID"></td><td class="soItemType"></td>
        <td class="soItemCat"></td><td class="soItemSubcat"></td>
        <td><input type="number" class="soQty" min="1" value="1"></td>
        <td><input type="number" class="soUnitPrice" step="0.01" value="0.00"></td>
        <td class="soPriceExcl">0.00</td>
        <td><input type="number" class="soTaxRate" step="0.01" value="0.00"></td>
        <td class="soTotalTax">0.00</td>
        <td class="soPriceIncl">0.00</td>
        <td><input type="number" class="soShipFees" step="0.01" value="0.00"></td>
        <td class="soTotalSales">0.00</td>
        <td><span class="remove-row" onclick="removeSOLine(this)">×</span></td>
      `;
      tbody.appendChild(tr);

      // init item dropdown
      const sel = tr.querySelector('.soItemName');
      soInventory.forEach(item=>{
        const opt = new Option(item['Item Name'], item['Item Name'], false, false);
        sel.add(opt);
      });
      $(sel).select2({ placeholder: 'Item Name' })
        .on('change', function(){
          const itemName = this.value;
          const item = soInventory.find(i=>i['Item Name']===itemName);
          if (item) {
            tr.querySelector('.soItemID').innerText   = item['Item ID'];
            tr.querySelector('.soItemType').innerText = item['Item Type'];
            tr.querySelector('.soItemCat').innerText  = item['Item Category'];
            tr.querySelector('.soItemSubcat').innerText = item['Item Subcategory'];
            recalcLine(tr);
          }
        });

      // recalc on qty, price, tax, shipping changes
      ['.soQty','.soUnitPrice','.soTaxRate','.soShipFees'].forEach(cls=>{
        tr.querySelector(cls).addEventListener('input',()=>recalcLine(tr));
      });
    }

    function removeSOLine(el){
      el.closest('tr').remove();
    }

    /* === Recalc One Line === */
    function recalcLine(tr) {
      const qty   = parseFloat(tr.querySelector('.soQty').value)     || 0;
      const up    = parseFloat(tr.querySelector('.soUnitPrice').value)|| 0;
      let rate    = parseFloat(tr.querySelector('.soTaxRate').value)  || 0;
      const ship  = parseFloat(tr.querySelector('.soShipFees').value) || 0;
      if (/\%/.test(tr.querySelector('.soTaxRate').value)){
        alert('Enter Tax Rate without % sign');
        tr.querySelector('.soTaxRate').value = '';
        return;
      }
      const excl  = qty * up;
      const tax   = excl * (rate/100);
      const incl  = excl + tax;
      const total = incl + ship;
      tr.querySelector('.soPriceExcl').innerText  = excl.toFixed(2);
      tr.querySelector('.soTotalTax').innerText   = tax.toFixed(2);
      tr.querySelector('.soPriceIncl').innerText  = incl.toFixed(2);
      tr.querySelector('.soTotalSales').innerText = total.toFixed(2);
    }

    /* === Save New SO === */
    function saveNewSO() {
      const date   = document.getElementById('soNewDate').value;
      const soID   = document.getElementById('soNewSOID').value;
      const custID = document.getElementById('soNewCustID').value;
      const custNm = $('#soNewCustomer').val();
      const state  = document.getElementById('soNewState').value;
      const city   = document.getElementById('soNewCity').value;
      const inv    = document.getElementById('soNewInvoice').value;
      if (!date||!soID||!custID||!custNm||!inv) {
        alert('Please fill all required fields');
        return;
      }
      const lines = [];
      document.querySelectorAll('#soNewLines tbody tr').forEach(tr=>{
        const row = {
          'SO Date': date, 'SO ID': soID, 'Detail ID': tr.children[2].innerText,
          'Customer ID': custID, 'Customer Name': custNm,
          'State': state, 'City': city, 'Invoice Num': inv,
          'Item ID': tr.querySelector('.soItemID').innerText,
          'Item Type': tr.querySelector('.soItemType').innerText,
          'Item Category': tr.querySelector('.soItemCat').innerText,
          'Item Subcategory': tr.querySelector('.soItemSubcat').innerText,
          'Item Name': tr.querySelector('.soItemName').value,
          'QTY Sold': parseInt(tr.querySelector('.soQty').value),
          'Unit Price': parseFloat(tr.querySelector('.soUnitPrice').value),
          'Price Excl Tax': parseFloat(tr.querySelector('.soPriceExcl').innerText),
          'Tax Rate': parseFloat(tr.querySelector('.soTaxRate').value),
          'Total Tax': parseFloat(tr.querySelector('.soTotalTax').innerText),
          'Price Incl Tax': parseFloat(tr.querySelector('.soPriceIncl').innerText),
          'Shipping Fees': parseFloat(tr.querySelector('.soShipFees').value),
          'Total Sales Price': parseFloat(tr.querySelector('.soTotalSales').innerText)
        };
        lines.push(row);
      });
      if (!lines.length) { alert('Add at least one line'); return; }

      document.getElementById('soProcessingOverlay').style.display = 'flex';
      google.script.run.withSuccessHandler(()=>{
        alert('New SO Created');
        closeModal();
        soRefreshSOList();
        document.getElementById('soProcessingOverlay').style.display = 'none';
      }).soSaveNewSO({ master: { date, soID, custID, custNm, state, city, inv }, details: lines });
    }

    /* === View / Edit SO Details === */
    function openSODetails(soID) {
      document.getElementById('soProcessingOverlay').style.display='flex';
      google.script.run.withSuccessHandler(rows=>{
        showModal(`SO Details: ${soID}`, sodetailsBody(rows), sodetailsFooter());
        initDetailEvents();
        document.getElementById('soProcessingOverlay').style.display='none';
      }).soGetSODetails(soID);
    }

    function sodetailsBody(rows) {
      // 1) Define the exact columns in the sheet order
      const cols = [
        'SO Date','SO ID','Detail ID','Customer ID','Customer Name',
        'State','City','Invoice Num','Item ID','Item Type','Item Category',
        'Item Subcategory','Item Name','QTY Sold','Unit Price','Price Excl Tax',
        'Tax Rate','Total Tax','Price Incl Tax','Shipping Fees','Total Sales Price'
      ];

      // 2) Build the header row
      let html = `<table id="soDetailsTable"><thead><tr>`;
      cols.forEach(c => html += `<th>${c}</th>`);
      html += `<th>Actions</th></tr></thead><tbody>`;

      // 3) Build each data row in that same order
      rows.forEach(r => {
        html += `<tr data-detailid="${r['Detail ID']}">`;
        cols.forEach(c => {
          html += `<td class="col-${c.replace(/\s/g,'')}">${r[c]}</td>`;
        });
        html += `<td><i class="fa fa-trash" onclick="deleteDetail(this)"></i></td></tr>`;
      });

      html += `</tbody></table>`;
      return html;
    }


   function sodetailsFooter() {
  return `
    <button class="btn" id="soBtnEdit" onclick="enterEditMode()">Edit</button>
    <button class="btn" id="soBtnUpdate" style="display:none" onclick="updateDetails()">Update</button>
    <button class="btn-clear" id="soBtnCancel" onclick="onDetailsCancel()">Cancel</button>
  `;
}



    /* === SODetails: Edit, Update, Cancel, Delete === */
    let soEditOriginal = [];
    function initDetailEvents() {
      // store original
      soEditOriginal = Array.from(document.querySelectorAll('#soDetailsTable tbody tr'))
        .map(tr=>[tr.dataset.detailid, ...Array.from(tr.children).slice(0,-1).map(td=>td.innerText)]);
    }

    function enterEditMode() {
  // Swap footer buttons
  document.getElementById('soBtnEdit').style.display   = 'none';
  const btnUpdate = document.getElementById('soBtnUpdate');
  btnUpdate.style.display = 'inline-block';
  btnUpdate.disabled      = false;

  // For every detail row:
  document.querySelectorAll('#soDetailsTable tbody tr').forEach(tr => {
    // --- ITEM NAME dropdown ---
    const tdName    = tr.querySelector('.col-ItemName');
    const current   = tdName.innerText;
    tdName.innerHTML = `<select class="edit-ItemName" style="width:200px"></select>`;

    // Populate options from global soInventory
    const $sel = $(tdName).find('select');
    soInventory.forEach(item => {
      const opt = new Option(item['Item Name'], item['Item Name'], false, false);
      $sel.append(opt);
    });
    $sel.val(current).trigger('change');

    // Initialize Select2 inside the modal
    $sel.select2({
      placeholder: 'Item Name',
      width: '200px',
      dropdownParent: $('#soModal')
    }).on('change', function() {
      const name = this.value;
      const item = soInventory.find(i => i['Item Name'] === name);
      if (item) {
        tr.querySelector('.col-ItemID').innerText          = item['Item ID'];
        tr.querySelector('.col-ItemType').innerText        = item['Item Type'];
        tr.querySelector('.col-ItemCategory').innerText    = item['Item Category'];
        tr.querySelector('.col-ItemSubcategory').innerText = item['Item Subcategory'];
      }
      recalcDetailLine(tr);
    });

    // --- Numeric fields into inputs ---
    const mappings = [
      { cls: 'QTYSold',     type: 'number', step: '1'    },
      { cls: 'UnitPrice',   type: 'number', step: '0.01' },
      { cls: 'TaxRate',     type: 'number', step: '0.01' },
      { cls: 'ShippingFees',type: 'number', step: '0.01' }
    ];
    mappings.forEach(m => {
      const td = tr.querySelector(`.col-${m.cls}`);
      const val = td.innerText;
      td.innerHTML = `<input type="${m.type}"
                             class="edit-${m.cls}"
                             step="${m.step}"
                             value="${val}">`;
    });

    // Attach live recalc on input changes
    ['.edit-QTYSold','.edit-UnitPrice','.edit-TaxRate','.edit-ShippingFees']
      .forEach(sel => {
        tr.querySelector(sel)
          .addEventListener('input', () => recalcDetailLine(tr));
      });
  });
}


    function cancelEdit() {
      // restore from soEditOriginal
      soEditOriginal.forEach(orig=>{
        const [did,...cells] = orig;
        const tr = document.querySelector(`#soDetailsTable tr[data-detailid="${did}"]`);
        Array.from(tr.children).slice(0,-1).forEach((td,i)=>{
          td.innerText = cells[i];
        });
      });
      document.getElementById('soBtnUpdate').disabled = true;
      document.getElementById('soBtnCancel').disabled = true;
    }

  function updateDetails() {
  const table   = document.getElementById('soDetailsTable');
  const ths     = Array.from(table.querySelectorAll('thead th'));
  const headers = ths.slice(0, -1).map(th => th.innerText.trim());
  const rowsToUpdate = [];

  table.querySelectorAll('tbody tr').forEach(tr => {
    const rowObj = {};
    headers.forEach((h, idx) => {
      const cell = tr.children[idx];
      let val;

      // 1) If there's an <input> or <select> inside, grab its .value
      const inputOrSelect = cell.querySelector('input, select');
      if (inputOrSelect) {
        val = inputOrSelect.value;
      } else {
        // 2) Otherwise use the displayed text
        val = cell.innerText.trim();
      }

      // 3) Strip commas for numeric columns
      if ([
          'QTY Sold','Unit Price','Price Excl Tax','Tax Rate',
          'Total Tax','Price Incl Tax','Shipping Fees','Total Sales Price'
        ].includes(h)) {
        val = val.replace(/,/g,'');
      }

      rowObj[h] = val;
    });
    rowsToUpdate.push(rowObj);
  });

  // Send just the edited-SO’s detail rows to the server
  document.getElementById('soProcessingOverlay').style.display = 'flex';
  google.script.run
    .withSuccessHandler(() => {
      alert('SO Details Updated');
      closeModal();
      soRefreshSOList();
      document.getElementById('soProcessingOverlay').style.display = 'none';
    })
    .withFailureHandler(err => {
      console.error(err);
      alert('Update failed: ' + err.message);
      document.getElementById('soProcessingOverlay').style.display = 'none';
    })
    .soUpdateSODetails(rowsToUpdate);
}




        /**
     * If we're in edit-mode (Update is visible), cancel edits.
     * Otherwise close the popup entirely.
     */
    function onDetailsCancel() {
  const btnUpdate = document.getElementById('soBtnUpdate');

  // If in edit-mode, revert edits
  if (btnUpdate.style.display === 'inline-block') {
    cancelEdit();
    document.getElementById('soBtnEdit').style.display   = 'inline-block';
    btnUpdate.style.display                              = 'none';
  } else {
    // Otherwise close the modal
    closeModal();
  }
}


    /**
 * Recalculate one detail row’s totals on-the-fly
 */
function recalcDetailLine(tr) {
  const qty   = parseFloat(tr.querySelector('.edit-QTYSold').value)     || 0;
  const up    = parseFloat(tr.querySelector('.edit-UnitPrice').value)   || 0;
  const rate  = parseFloat(tr.querySelector('.edit-TaxRate').value)     || 0;
  const ship  = parseFloat(tr.querySelector('.edit-ShippingFees').value) || 0;

  const excl  = qty * up;
  const tax   = excl * (rate/100);
  const incl  = excl + tax;
  const total = incl + ship;

  tr.querySelector('.col-PriceExclTax').innerText    = excl.toFixed(2);
  tr.querySelector('.col-TotalTax').innerText        = tax.toFixed(2);
  tr.querySelector('.col-PriceInclTax').innerText    = incl.toFixed(2);
  tr.querySelector('.col-TotalSalesPrice').innerText = total.toFixed(2);
}
