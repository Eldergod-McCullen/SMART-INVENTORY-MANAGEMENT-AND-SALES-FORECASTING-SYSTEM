// Global state
let rcReceipts = [];
let rcCustomers = [];
let rcSalesOrders = [];
let rcDimensions = [];

    // Initialization
    document.addEventListener('DOMContentLoaded', () => {
      rcRefreshList();
      google.script.run.withSuccessHandler(data => rcCustomers = data).rcGetCustomers();
      google.script.run.withSuccessHandler(data => rcSalesOrders = data).rcGetSalesOrders();
      google.script.run.withSuccessHandler(data => rcDimensions  = data).rcGetDimensions();

      document.getElementById('rcBtnNew').onclick    = openNewReceipt;
      document.getElementById('rcBtnSearch').onclick = doSearch;
      document.getElementById('rcBtnClear').onclick  = clearSearch;
    });

    // Refresh receipt list
    function rcRefreshList() {
      showProcessing();
      google.script.run
        .withSuccessHandler(renderList)
        .withFailureHandler(hideProcessing)
        .rcGetAllReceipts();
    }

    function renderList(rows) {
      hideProcessing();
      rcReceipts = rows;
      const tbody = document.querySelector('#rcList tbody');
      tbody.innerHTML = '';
      rows.forEach(r => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${r['Trx Date']}</td>
          <td>${r['Trx ID']}</td>
          <td>${r['Customer ID']}</td>
          <td>${r['Customer Name']}</td>
          <td>${r['State']}</td>
          <td>${r['City']}</td>
          <td>${r['SO ID']}</td>
          <td>${r['Invoice Num']}</td>
          <td>${r['PMT Mode']}</td>
          <td>${parseFloat(r['Amount Received']).toFixed(2)}</td>
          <td>
            <button class="btn" onclick="openEditReceipt('${r['Trx ID']}')">Edit</button>
            <button class="btn-clear" onclick="deleteReceipt('${r['Trx ID']}')">Delete</button>
          </td>
        `;
        tbody.appendChild(tr);
      });
    }

    // Search / Clear
    function doSearch() {
      const crit = document.getElementById('rcSearchCrit').value;
      const val  = document.getElementById('rcSearchInput').value.toLowerCase();
      if (crit==='All' || !val) return renderList(rcReceipts);
      const filtered = rcReceipts.filter(r => 
        (''+r[crit]).toLowerCase().includes(val)
      );
      if (!filtered.length) alert('No matching data found');
      renderList(filtered);
    }
    function clearSearch() {
      document.getElementById('rcSearchInput').value='';
      document.getElementById('rcSearchCrit').value='All';
      renderList(rcReceipts);
    }

    // Show / hide processing
    function showProcessing() { document.getElementById('rcProcessing').style.display='flex'; }
    function hideProcessing() { document.getElementById('rcProcessing').style.display='none'; }

    // Open New Receipt form
    function openNewReceipt() {
      showModal('New Receipt', rcFormBody(), rcFormFooter('Save','rcSaveReceipt()'));
      initFormElements(true);
    }

    // HTML for form body
    function rcFormBody() {
      return `
      <div class="flex-space">
        <div style="flex:1; padding-right:10px;">
          <label>Trx Date</label><br>
          <input type="date" id="rcTrxDate"><br><br>

          <label>Trx ID</label><br>
          <input type="text" id="rcTrxID" readonly style="width:70%">
          <button class="btn" onclick="rcGenTrxID()">Generate</button><br><br>

          <label>Customer Name</label><br>
          <select id="rcCustomerName" style="width:100%"></select><br><br>

          <label>State</label><br>
          <input type="text" id="rcState" readonly><br><br>

          <label>City</label><br>
          <input type="text" id="rcCity" readonly><br><br>

          <label>Customer ID</label><br>
          <input type="text" id="rcCustomerID" readonly><br><br>
        </div>
        <div style="flex:1; padding-left:10px">
          <label>SO ID</label><br>
          <select id="rcSOID" style="width:100%"></select><br><br>

          <label>Invoice Num</label><br>
          <select id="rcInvoiceNum" style="width:100%"></select><br><br>

          <label>SO Balance</label><br>
          <input type="text" id="rcSOBalance" readonly><br><br>

          <label>PMT Mode</label><br>
          <select id="rcPMTMode" style="width:100%"></select><br><br>

          <label>Amount Received</label><br>
          <input type="number" id="rcAmount" step="0.01" placeholder="0.00"><br>
        </div>
      </div>`;
    }

    // Generic form footer
    function rcFormFooter(btnText, onClick) {
      return `
        <button class="btn" onclick="${onClick}">${btnText}</button>
        <button class="btn-clear" onclick="closeModal()">Close</button>
      `;
    }

    // Show modal
    function showModal(title, body, footer) {
      document.getElementById('rcModalTitle').innerText = title;
      document.getElementById('rcModalBody').innerHTML  = body;
      document.getElementById('rcModalFooter').innerHTML= footer;
      document.getElementById('rcModalOverlay').style.display = 'flex';
      initSelect2();  // global init
    }
    function closeModal() {
      document.getElementById('rcModalOverlay').style.display='none';
    }

    // Initialize all select2 in form
    function initSelect2() {
      $('#rcCustomerName').select2({ placeholder:'Select Customer', dropdownParent:$('#rcModal') })
        .on('change', onCustomerChange);
      $('#rcSOID').select2({ placeholder:'Select SO ID', dropdownParent:$('#rcModal') })
        .on('change', onSOChange);
      $('#rcInvoiceNum').select2({ placeholder:'Select Invoice', dropdownParent:$('#rcModal') });
      $('#rcPMTMode').select2({ placeholder:'Payment Mode', dropdownParent:$('#rcModal') });
    }

    // Initialize form elements (for both New & Edit)
    function initFormElements(isNew) {
      // Populate Customer dropdown
      const custSel = document.getElementById('rcCustomerName');
      custSel.innerHTML = '<option></option>';
      rcCustomers.filter(c=>c['Customer Name'])
        .forEach(c=>{
          const opt=new Option(c['Customer Name'],c['Customer Name']);
          custSel.add(opt);
        });

      // Populate PMT Mode
      const pmSel = document.getElementById('rcPMTMode');
      pmSel.innerHTML = '<option></option>';
      rcDimensions.filter(d=>d['PMT Mode'])
        .map(d=>d['PMT Mode'])
        .filter((v,i,self)=>self.indexOf(v)===i)
        .forEach(v=>pmSel.add(new Option(v,v)));

      if (!isNew) return;

      // Clear form
      ['rcTrxDate','rcTrxID','rcState','rcCity','rcCustomerID','rcSOID',
       'rcInvoiceNum','rcSOBalance','rcAmount'].forEach(id=>{
         document.getElementById(id).value = '';
       });
    }

    // Generate unique Trx ID
    function rcGenTrxID() {
      showProcessing();
      google.script.run.withSuccessHandler(id=>{
        document.getElementById('rcTrxID').value = id;
        hideProcessing();
      }).rcGenerateTrxID();
    }

    // When Customer changes, auto-fill ID/State/City, populate SO and Invoice lists
    function onCustomerChange() {
      const name = this.value;
      const cust = rcCustomers.find(c=>c['Customer Name']===name) || {};
      document.getElementById('rcCustomerID').value = cust['Customer ID']||'';
      document.getElementById('rcState').value      = cust['State']||'';
      document.getElementById('rcCity').value       = cust['City']||'';

      // Populate SO ID dropdown
      const soSel = $('#rcSOID');
      soSel.empty().append('<option></option>');
      rcSalesOrders
        .filter(o=>o['Customer ID']===cust['Customer ID'])
        .forEach(o=>soSel.append(new Option(o['SO ID'], o['SO ID'])));
      soSel.trigger('change');
    }

    // When SO ID changes, auto-fill Invoice & SO Balance
    function onSOChange() {
      const soID = this.value;
      const order = rcSalesOrders.find(o=>o['SO ID']===soID)||{};
      $('#rcInvoiceNum').empty().append('<option></option>')
        .append(new Option(order['Invoice Num'], order['Invoice Num']))
        .trigger('change');
      document.getElementById('rcSOBalance').value = order['SO Balance']||'';
    }

    // Save new receipt
    function rcSaveReceipt() {
      const trxDate = document.getElementById('rcTrxDate').value;
      const trxID   = document.getElementById('rcTrxID').value;
      const custID  = document.getElementById('rcCustomerID').value;
      const custNm  = $('#rcCustomerName').val();
      const state   = document.getElementById('rcState').value;
      const city    = document.getElementById('rcCity').value;
      const soID    = $('#rcSOID').val();
      const inv     = $('#rcInvoiceNum').val();
      const mode    = $('#rcPMTMode').val();
      const amt     = parseFloat(document.getElementById('rcAmount').value);

      // Validation
      if (!trxDate||!trxID||!custNm||!soID||!inv||!mode||isNaN(amt)) {
        alert('Please fill all required fields.');
        return;
      }
      const soBal = parseFloat(document.getElementById('rcSOBalance').value)||0;
      if (amt > soBal) {
        alert('Amount received is more than SO Balance');
        return;
      }

      showProcessing();
      google.script.run
        .withSuccessHandler(()=>{
          alert('New Receipt Saved');
          closeModal();
          rcRefreshList();
          hideProcessing();
        })
        .rcSaveNewReceipt({
          'Trx Date': trxDate,
          'Trx ID': trxID,
          'Customer ID': custID,
          'Customer Name': custNm,
          'State': state,
          'City': city,
          'SO ID': soID,
          'Invoice Num': inv,
          'PMT Mode': mode,
          'Amount Received': amt
        });
    }

    // Edit existing receipt
    function openEditReceipt(trxID) {
      // Find the record
      const rec = rcReceipts.find(r=>r['Trx ID']===trxID);
      if (!rec) return;

      showModal('Edit Receipt', rcFormBody(), rcFormFooter('Update','rcUpdateReceipt()'));
      initFormElements(false);

      // Prefill
      document.getElementById('rcTrxDate').value     = rec['Trx Date'];
      document.getElementById('rcTrxID').value       = rec['Trx ID'];
      $('#rcCustomerName').append(new Option(rec['Customer Name'],rec['Customer Name'],true,true))
        .trigger('change');
      $('#rcSOID').append(new Option(rec['SO ID'],rec['SO ID'],true,true))
        .trigger('change');
      $('#rcInvoiceNum').append(new Option(rec['Invoice Num'],rec['Invoice Num'],true,true))
        .trigger('change');
      $('#rcPMTMode').append(new Option(rec['PMT Mode'],rec['PMT Mode'],true,true))
        .trigger('change');
      document.getElementById('rcAmount').value     = parseFloat(rec['Amount Received']).toFixed(2);
    }

    // Update receipt
    function rcUpdateReceipt() {
      const payload = {
        'Trx Date': document.getElementById('rcTrxDate').value,
        'Trx ID':   document.getElementById('rcTrxID').value,
        'Customer ID': document.getElementById('rcCustomerID').value,
        'Customer Name': $('#rcCustomerName').val(),
        'State': document.getElementById('rcState').value,
        'City':  document.getElementById('rcCity').value,
        'SO ID': $('#rcSOID').val(),
        'Invoice Num': $('#rcInvoiceNum').val(),
        'PMT Mode': $('#rcPMTMode').val(),
        'Amount Received': parseFloat(document.getElementById('rcAmount').value)
      };
      showProcessing();
      google.script.run
        .withSuccessHandler(()=>{
          alert('Receipt Updated');
          closeModal();
          rcRefreshList();
          hideProcessing();
        })
        .rcUpdateReceipt(payload);
    }

    // Delete receipt
    function deleteReceipt(trxID) {
      if (!confirm('Delete this receipt?')) return;
      showProcessing();
      google.script.run
        .withSuccessHandler(()=>{
          alert('Receipt Deleted');
          rcRefreshList();
          hideProcessing();
        })
        .rcDeleteReceipt(trxID);
    }