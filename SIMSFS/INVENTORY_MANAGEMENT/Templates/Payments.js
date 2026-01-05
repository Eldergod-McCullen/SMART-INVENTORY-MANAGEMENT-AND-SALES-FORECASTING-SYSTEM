// Global state arrays
let ptPayments = [], ptSuppliers = [], ptPO = [], ptDims = [];

// Show/hide processing overlay
function ptShowProcessing(){ document.getElementById('ptProcessing').style.display='flex'; }
function ptHideProcessing(){ document.getElementById('ptProcessing').style.display='none'; }

// Load and render payments list
function ptRefresh() {
    ptShowProcessing();
    google.script.run
    .withSuccessHandler(ptRenderList)
    .withFailureHandler(ptHideProcessing)
    .ptGetAllPayments();
}

function ptInitSelect2() {
    $('#ptSupplierName')
        .select2({placeholder:'Select Supplier', dropdownParent:$('#ptModal')})
        .on('change', ptOnSupplier);

    $('#ptPOID')
      .select2({ placeholder:'Select PO', dropdownParent:$('#ptModal') })
      .on('change', ptOnPO);

    $('#ptBillNum')
      .select2({ placeholder:'Bill Num', dropdownParent:$('#ptModal') });

    $('#ptPMTMode')
      .select2({ placeholder:'Payment Mode', dropdownParent:$('#ptModal') });
  }


    function ptRenderList(rows) {
      ptHideProcessing();
      ptPayments = rows || [];
      const tbody = document.querySelector('#ptList tbody');
      tbody.innerHTML = '';
      (rows||[]).forEach(r => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${r['Trx Date']}</td>
          <td>${r['Trx ID']}</td>
          <td>${r['Supplier ID']}</td>
          <td>${r['Supplier Name']}</td>
          <td>${r['State']}</td>
          <td>${r['City']}</td>
          <td>${r['PO ID']}</td>
          <td>${r['Bill Num']}</td>
          <td>${r['PMT Mode']}</td>
          <td>${parseFloat(r['Amount Paid']).toFixed(2)}</td>
          <td>
            <button class="btn" onclick="ptOpenEdit('${r['Trx ID']}')">Edit</button>
            <button class="btn-clear" onclick="ptDelete('${r['Trx ID']}')">Delete</button>
          </td>`;
        tbody.appendChild(tr);
      });
    }

    // Search & clear
    function ptSearch() {
      const crit = document.getElementById('ptSearchCrit').value;
      const val  = document.getElementById('ptSearchInput').value.toLowerCase();
      if (crit==='All' || !val) return ptRenderList(ptPayments);
      const filtered = ptPayments.filter(r => (''+r[crit]).toLowerCase().includes(val));
      if (!filtered.length) alert('No matching data found');
      ptRenderList(filtered);
    }
    function ptClear() {
      document.getElementById('ptSearchInput').value='';
      document.getElementById('ptSearchCrit').value='All';
      ptRenderList(ptPayments);
    }

    // On load: fetch lookups & bind buttons
    document.addEventListener('DOMContentLoaded', () => {
      ptRefresh();
      google.script.run.withSuccessHandler(a=>ptSuppliers=a||[]).ptGetSuppliers();
      google.script.run.withSuccessHandler(a=>ptPO=a||[]).ptGetPO();
      google.script.run
      .withSuccessHandler(data => {
        console.log('CLIENT ptPO data:', data);
        ptPO = data || [];
      })
      .ptGetPO();
      google.script.run.withSuccessHandler(a=>ptDims=a||[]).ptGetDimensions();
      document.getElementById('ptBtnNew').onclick    = ptOpenNew;
      document.getElementById('ptBtnSearch').onclick = ptSearch;
      document.getElementById('ptBtnClear').onclick  = ptClear;
    });

    // Modal helpers
   function ptShowModal(title, body, footer) {
    $('#ptModalTitle').text(title);
    $('#ptModalBody').html(body);
    $('#ptModalFooter').html(footer);
    $('#ptModalOverlay').css('display','flex');
    ptInitSelect2();
  }
    function ptCloseModal(){
      document.getElementById('ptModalOverlay').style.display='none';
    }



    // Form HTML builders
    function ptFormBody() {
      return `
      <div class="flex-space">
        <div style="flex:1;margin-right:10px;">
          <label>Trx Date</label><br><input type="date" id="ptTrxDate"><br><br>
          <label>Trx ID</label><br>
          <input type="text" id="ptTrxID" readonly style="width:70%">
          <button class="btn" onclick="ptGenTrxID()">Generate</button><br><br>
          <label>Supplier Name</label><br><select id="ptSupplierName" style="width:100%"></select><br><br>
          <label>Supplier ID</label><br><input type="text" id="ptSupplierID" readonly><br><br>
          <label>State</label><br><input type="text" id="ptState" readonly><br><br>
          <label>City</label><br><input type="text" id="ptCity" readonly><br><br>
        </div>
        <div style="flex:1;margin-left:10px;">
          <label>PO ID</label><br><select id="ptPOID" style="width:100%"></select><br><br>
          <label>Bill Num</label><br><select id="ptBillNum" style="width:100%"></select><br><br>
          <label>PO Balance</label><br><input type="text" id="ptPOBalance" readonly><br><br>
          <label>PMT Mode</label><br><select id="ptPMTMode" style="width:100%"></select><br><br>
          <label>Amount Paid</label><br><input type="number" id="ptAmount" step="0.01"><br>
        </div>
      </div>`;
    }
    function ptFormFooter(label, handler) {
      return `
        <button class="btn" onclick="${handler}">${label}</button>
        <button class="btn-clear" onclick="ptCloseModal()">Close</button>`;
    }

    // Open New
    function ptOpenNew(){
      ptShowModal('New Payment', ptFormBody(), ptFormFooter('Save','ptSave()'));
      ptPopulateForm(true);
    }
    // Open Edit
    function ptOpenEdit(id){
      const rec = ptPayments.find(r=>r['Trx ID']===id);
      if(!rec) return alert('Record not found');
      ptShowModal('Edit Payment', ptFormBody(), ptFormFooter('Update','ptUpdate()'));
      ptPopulateForm(false, rec);
    }

    // Populate form (new vs edit)
    function ptPopulateForm(isNew, rec={}){
      $('#ptTrxDate').val(isNew?'':rec['Trx Date']);
      $('#ptTrxID').val(isNew?'':rec['Trx ID']);
      $('#ptSupplierID,#ptState,#ptCity,#ptPOID,#ptBillNum,#ptPOBalance,#ptAmount').val('');

      // supplier dropdown
      const sup = $('#ptSupplierName').empty().append('<option></option>');
      ptSuppliers.forEach(s=> sup.append(new Option(s['Supplier Name'],s['Supplier Name'])));
      if(!isNew) setSelect('#ptSupplierName', rec['Supplier Name']);

      // PMT Mode
      const pm = $('#ptPMTMode').empty().append('<option></option>');
      [...new Set(ptDims.map(d=>d['PMT Mode']))]
        .forEach(m=>pm.append(new Option(m,m)));
      if(!isNew) setSelect('#ptPMTMode', rec['PMT Mode']);
    }

    // helper to set select2 value
    function setSelect(sel, val){
      const $s = $(sel).append(new Option(val,val,true,true));
      $s.trigger('change');
    }

    // Generate unique Trx ID
    function ptGenTrxID(){
      ptShowProcessing();
      google.script.run.withSuccessHandler(id=>{
        $('#ptTrxID').val(id);
        ptHideProcessing();
      }).ptGenerateTrxID();
    }

    // Supplier changed
 function ptOnSupplier() {
    const name = this.value;
    const sup  = ptSuppliers.find(s=>s['Supplier Name']===name) || {};

    $('#ptSupplierID').val(sup['Supplier ID']||'');
    $('#ptState').val(sup['State']||'');
    $('#ptCity').val(sup['City']||'');

    // Filter by Supplier Name (not ID)
    const orders = (ptPO||[]).filter(o => o['Supplier Name'] === name);

    // Populate PO ID dropdown
    const $po = $('#ptPOID').empty().append('<option></option>');
    orders.forEach(o => $po.append(new Option(o['PO ID'], o['PO ID'])));

    // Populate Bill Num dropdown
    const $bill = $('#ptBillNum').empty().append('<option></option>');
    orders.forEach(o => $bill.append(new Option(o['Bill Num'], o['Bill Num'])));

    $('#ptSupplierName').select2('close');
    // trigger PO change if at least one order
    if (orders.length) $po.trigger('change');
  }

  // Handler when PO ID changes
  function ptOnPO() {
    const id    = this.value;
    const order = (ptPO||[]).find(o=>o['PO ID']===id) || {};

    $('#ptBillNum').val(order['Bill Num']||'');
    $('#ptPOBalance').val(order['PO Balance']||'');
    $('#ptPOID').select2('close');
  }

    // Save new payment
    function ptSave(){
      const rec = {
        'Trx Date': $('#ptTrxDate').val(),
        'Trx ID':   $('#ptTrxID').val(),
        'Supplier ID':$('#ptSupplierID').val(),
        'Supplier Name':$('#ptSupplierName').val(),
        'State':    $('#ptState').val(),
        'City':     $('#ptCity').val(),
        'PO ID':    $('#ptPOID').val(),
        'Bill Num': $('#ptBillNum').val(),
        'PMT Mode': $('#ptPMTMode').val(),
        'Amount Paid': parseFloat($('#ptAmount').val())
      };
      if (!rec['Trx Date']||!rec['Trx ID']||!rec['Supplier Name']||
          !rec['PO ID']||!rec['Bill Num']||isNaN(rec['Amount Paid'])) {
        return alert('Fill all required fields');
      }
      if (rec['Amount Paid'] > parseFloat($('#ptPOBalance').val()||0)) {
        return alert('Amount paid is more than PO Balance');
      }
      ptShowProcessing();
      google.script.run.withSuccessHandler(()=>{
        alert('New Payment Saved');
        ptCloseModal(); ptRefresh(); ptHideProcessing();
      }).ptSaveNewPayment(rec);
    }

    // Update existing
    function ptUpdate(){
      const rec = {
        'Trx Date': $('#ptTrxDate').val(),
        'Trx ID':   $('#ptTrxID').val(),
        'Supplier ID':$('#ptSupplierID').val(),
        'Supplier Name':$('#ptSupplierName').val(),
        'State':    $('#ptState').val(),
        'City':     $('#ptCity').val(),
        'PO ID':    $('#ptPOID').val(),
        'Bill Num': $('#ptBillNum').val(),
        'PMT Mode': $('#ptPMTMode').val(),
        'Amount Paid': parseFloat($('#ptAmount').val())
      };
      ptShowProcessing();
      google.script.run.withSuccessHandler(()=>{
        alert('Payment Updated');
        ptCloseModal(); ptRefresh(); ptHideProcessing();
      }).ptUpdatePayment(rec);
    }

    // Delete
    function ptDelete(id){
      if(!confirm('Delete this payment?')) return;
      ptShowProcessing();
      google.script.run.withSuccessHandler(()=>{
        alert('Payment deleted');
        ptRefresh(); ptHideProcessing();
      }).ptDeletePayment(id);
    }