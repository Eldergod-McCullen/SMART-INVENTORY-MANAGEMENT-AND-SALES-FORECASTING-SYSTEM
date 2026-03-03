console.log('📊 Reports.js loading...');

/* ---- Global State ---- */
let rptCurrentReportData = null;
let rptCurrentReportType = null;
let rptCharts            = {};


/* ---- CSRF Helper ---- */
function rptGetCSRFToken() {
    const metaTag = document.querySelector('meta[name="csrf-token"]');
    if (metaTag) return metaTag.getAttribute('content');
    const cookies = document.cookie.split(';');
    for (let cookie of cookies) {
        const [name, value] = cookie.trim().split('=');
        if (name === 'csrftoken') return decodeURIComponent(value);
    }
    return null;
}

/* ============================================================
   ENTRY POINT
   ============================================================ */
function initReports() {
    console.log('✅ Reports module initialised');
    rptInitializeDatePickers();
    rptLoadFilterOptions();
}

/* NOTE: initReports() is called at the very bottom of this file.
   Do NOT add a separate <script>initReports();</script> in the HTML.
   Calling it here guarantees the function is always defined before
   it is invoked, eliminating the executeScripts() timing edge case. */


/* ---- Date Pickers ---- */
function rptInitializeDatePickers() {
    flatpickr('.date-picker', {
        dateFormat: 'd/m/Y',
        allowInput: true
    });

    const today    = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    document.getElementById('fromDate').value = rptFormatDate(firstDay);
    document.getElementById('toDate').value   = rptFormatDate(today);
}

function rptFormatDate(date) {
    const day   = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year  = date.getFullYear();
    return `${day}/${month}/${year}`;
}

function rptFormatNumber(num) {
    if (isNaN(num)) return '0.00';
    return parseFloat(num).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}


/* ---- Filter Options ---- */
async function rptLoadFilterOptions() {
    try {
        const catRes  = await fetch('/api/inventory-items/categories/', {
            headers: { 'X-CSRFToken': rptGetCSRFToken() },
            credentials: 'same-origin'
        });
        const catData = await catRes.json();
        if (catData.success) {
            const sel = document.getElementById('filterCategory');
            catData.data.forEach(category => {
                const opt = document.createElement('option');
                opt.value       = category;
                opt.textContent = category;
                sel.appendChild(opt);
            });
        }

        const ctyRes  = await fetch('/api/suppliers/counties/', {
            headers: { 'X-CSRFToken': rptGetCSRFToken() },
            credentials: 'same-origin'
        });
        const ctyData = await ctyRes.json();
        if (ctyData.success) {
            const sel = document.getElementById('filterCounty');
            ctyData.data.forEach(county => {
                const opt = document.createElement('option');
                opt.value       = county;
                opt.textContent = county;
                sel.appendChild(opt);
            });
        }
    } catch (err) { console.error('Error loading filter options:', err); }
}

function rptClearFilters() {
    document.getElementById('reportType').value      = '';
    document.getElementById('filterCategory').value  = '';
    document.getElementById('filterCounty').value    = '';
    const today    = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    document.getElementById('fromDate').value = rptFormatDate(firstDay);
    document.getElementById('toDate').value   = rptFormatDate(today);
}


/* ---- Loading Overlay ---- */
function rptShowLoading() {
    document.getElementById('rptLoadingOverlay').classList.add('active');
}

function rptHideLoading() {
    document.getElementById('rptLoadingOverlay').classList.remove('active');
}


/* ---- Export Buttons ---- */
function rptShowExportButtons() {
    document.getElementById('exportPDFBtn').style.display   = 'flex';
    document.getElementById('exportExcelBtn').style.display = 'flex';
}


/* ============================================================
   QUICK REPORT
   BUG FIX: yearStart is now declared at the top of the
   function so it is accessible to ALL cases, including
   'tax-summary'. In the original it was declared inside the
   'profit-loss' block with const, making it unavailable to
   any other case that tried to reference it.
   ============================================================ */
async function rptGenerateQuickReport(reportType) {
    rptShowLoading();

    const today     = new Date();
    const yearStart = new Date(today.getFullYear(), 0, 1);   // FIX: hoisted here
    let fromDate, toDate;

    switch (reportType) {
        case 'today-sales':
            fromDate = toDate = rptFormatDate(today);
            await rptGenerateSalesReport(fromDate, toDate, "Today's Sales Report");
            break;

        case 'week-sales':
            const weekStart = new Date(today);
            weekStart.setDate(today.getDate() - today.getDay());
            fromDate = rptFormatDate(weekStart);
            toDate   = rptFormatDate(today);
            await rptGenerateSalesReport(fromDate, toDate, "This Week's Sales Report");
            break;

        case 'month-sales':
            const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
            fromDate = rptFormatDate(monthStart);
            toDate   = rptFormatDate(today);
            await rptGenerateSalesReport(fromDate, toDate, "This Month's Sales Report");
            break;

        case 'inventory-status':
            await rptGenerateInventoryReport();
            break;

        case 'outstanding-balances':
            await rptGenerateOutstandingBalancesReport();
            break;

        case 'profit-loss':
            fromDate = rptFormatDate(yearStart);
            toDate   = rptFormatDate(today);
            await rptGenerateProfitLossReport(fromDate, toDate);
            break;

        case 'tax-summary':
            fromDate = rptFormatDate(yearStart);  // FIX: yearStart now defined
            toDate   = rptFormatDate(today);
            await rptGenerateTaxSummaryReport(fromDate, toDate);
            break;
    }

    rptHideLoading();
}


/* ---- Main Generate Report ---- */
async function rptGenerateReport() {
    const reportType = document.getElementById('reportType').value;
    const fromDate   = document.getElementById('fromDate').value;
    const toDate     = document.getElementById('toDate').value;
    const category   = document.getElementById('filterCategory').value;
    const county     = document.getElementById('filterCounty').value;

    if (!reportType) { alert('Please select a report type'); return; }
    if (!fromDate || !toDate) { alert('Please select date range'); return; }

    rptShowLoading();
    rptCurrentReportType = reportType;

    try {
        switch (reportType) {
            case 'sales-summary':
                await rptGenerateSalesReport(fromDate, toDate, 'Sales Summary Report', category, county);
                break;
            case 'inventory-status':
                await rptGenerateInventoryReport(category);
                break;
            case 'profit-loss':
                await rptGenerateProfitLossReport(fromDate, toDate);
                break;
            case 'purchase-summary':
                await rptGeneratePurchaseReport(fromDate, toDate, category, county);
                break;
            case 'customer-analysis':
                await rptGenerateCustomerAnalysisReport(fromDate, toDate, county);
                break;
            case 'supplier-analysis':
                await rptGenerateSupplierAnalysisReport(fromDate, toDate, county);
                break;
            case 'outstanding-balances':
                await rptGenerateOutstandingBalancesReport();
                break;
            case 'tax-summary':
                await rptGenerateTaxSummaryReport(fromDate, toDate);
                break;
            default:
                alert('Report type not implemented yet');
        }
    } catch (err) {
        console.error('Error generating report:', err);
        alert('Error generating report: ' + err.message);
    } finally {
        rptHideLoading();
    }
}


/* ============================================================
   1. SALES SUMMARY REPORT
   ============================================================ */
async function rptGenerateSalesReport(fromDate, toDate, title = 'Sales Summary Report', category = '', county = '') {
    try {
        const params = new URLSearchParams({ start_date: fromDate, end_date: toDate });
        if (category) params.append('category', category);
        if (county)   params.append('county', county);

        const res    = await fetch(`/api/reports/sales-summary/?${params}`, {
            headers: { 'Content-Type': 'application/json', 'X-CSRFToken': rptGetCSRFToken() },
            credentials: 'same-origin'
        });
        const result = await res.json();
        if (!result.success) throw new Error(result.message || 'Failed to generate report');

        rptCurrentReportData = result.data;
        rptRenderSalesReport(result.data, title, fromDate, toDate);
        rptShowExportButtons();
    } catch (err) { console.error('Error generating sales report:', err); throw err; }
}

function rptRenderSalesReport(data, title, fromDate, toDate) {
    const reportDisplay = document.getElementById('reportDisplay');
    reportDisplay.classList.add('active');
    Object.values(rptCharts).forEach(c => c.destroy());
    rptCharts = {};

    reportDisplay.innerHTML = `
    <div class="report-header">
      <h2 class="report-title">${title}</h2>
      <p class="report-subtitle">Comprehensive sales analysis and performance metrics</p>
      <span class="report-period">Period: ${fromDate} - ${toDate}</span>
    </div>
    <div class="kpi-grid">
      <div class="kpi-card">
        <div class="kpi-label">Total Sales</div>
        <div class="kpi-value">KSH ${rptFormatNumber(data.kpis.total_sales)}</div>
        <div class="kpi-change neutral">${data.kpis.total_orders} orders</div>
      </div>
      <div class="kpi-card success">
        <div class="kpi-label">Amount Received</div>
        <div class="kpi-value">KSH ${rptFormatNumber(data.kpis.total_received)}</div>
        <div class="kpi-change positive">
          <i class="fas fa-check-circle"></i>
          ${((data.kpis.total_received / data.kpis.total_sales) * 100).toFixed(1)}% collected
        </div>
      </div>
      <div class="kpi-card warning">
        <div class="kpi-label">Outstanding</div>
        <div class="kpi-value">KSH ${rptFormatNumber(data.kpis.outstanding)}</div>
        <div class="kpi-change negative"><i class="fas fa-exclamation-circle"></i> Pending collection</div>
      </div>
      <div class="kpi-card secondary">
        <div class="kpi-label">Avg Order Value</div>
        <div class="kpi-value">KSH ${rptFormatNumber(data.kpis.avg_order_value)}</div>
        <div class="kpi-change neutral">Per transaction</div>
      </div>
    </div>
    <div class="charts-grid">
      <div class="chart-card wide">
        <h3 class="chart-title">Sales Trend - Daily Performance</h3>
        <div class="chart-container"><canvas id="dailySalesChart"></canvas></div>
      </div>
      <div class="chart-card">
        <h3 class="chart-title">Sales by Category</h3>
        <div class="chart-container"><canvas id="categoryChart"></canvas></div>
      </div>
      <div class="chart-card">
        <h3 class="chart-title">Top 5 Customers</h3>
        <div class="chart-container"><canvas id="topCustomersChart"></canvas></div>
      </div>
    </div>
    <div style="margin-top:30px;">
      <h3 class="chart-title">Top Customers by Revenue</h3>
      <table class="data-table">
        <thead><tr>
          <th>Customer Name</th><th class="text-right">Total Sales</th>
          <th class="text-center">Orders</th><th class="text-right">Avg Order Value</th>
        </tr></thead>
        <tbody>
          ${data.top_customers.map(c => `
            <tr>
              <td>${c.name}</td>
              <td class="text-right">KSH ${rptFormatNumber(c.total)}</td>
              <td class="text-center">${c.orders}</td>
              <td class="text-right">KSH ${rptFormatNumber(c.total / c.orders)}</td>
            </tr>`).join('')}
        </tbody>
      </table>
    </div>
    <div style="margin-top:30px;">
      <h3 class="chart-title">Sales by Location</h3>
      <table class="data-table">
        <thead><tr>
          <th>County</th><th class="text-right">Total Sales</th><th class="text-right">% of Total</th>
        </tr></thead>
        <tbody>
          ${data.sales_by_location.map(loc => `
            <tr>
              <td>${loc.location}</td>
              <td class="text-right">KSH ${rptFormatNumber(loc.total)}</td>
              <td class="text-right">${((loc.total / data.kpis.total_sales) * 100).toFixed(1)}%</td>
            </tr>`).join('')}
        </tbody>
      </table>
    </div>`;

    rptRenderDailySalesChart(data.daily_sales);
    rptRenderCategoryPieChart(data.sales_by_category, 'categoryChart');
    rptRenderTopCustomersChart(data.top_customers);
}


/* ============================================================
   2. INVENTORY STATUS REPORT
   ============================================================ */
async function rptGenerateInventoryReport(category = '') {
    try {
        const params = new URLSearchParams();
        if (category) params.append('category', category);

        const res    = await fetch(`/api/reports/inventory-status/?${params}`, {
            headers: { 'Content-Type': 'application/json', 'X-CSRFToken': rptGetCSRFToken() },
            credentials: 'same-origin'
        });
        const result = await res.json();
        if (!result.success) throw new Error(result.message || 'Failed to generate report');

        rptCurrentReportData = result.data;
        rptRenderInventoryReport(result.data);
        rptShowExportButtons();
    } catch (err) { console.error('Error generating inventory report:', err); throw err; }
}

function rptRenderInventoryReport(data) {
    const reportDisplay = document.getElementById('reportDisplay');
    reportDisplay.classList.add('active');
    Object.values(rptCharts).forEach(c => c.destroy());
    rptCharts = {};

    reportDisplay.innerHTML = `
    <div class="report-header">
      <h2 class="report-title">Inventory Status Report</h2>
      <p class="report-subtitle">Current stock levels and inventory valuation</p>
      <span class="report-period">Generated: ${rptFormatDate(new Date())}</span>
    </div>
    <div class="kpi-grid">
      <div class="kpi-card">
        <div class="kpi-label">Total Cost Value</div>
        <div class="kpi-value">KSH ${rptFormatNumber(data.kpis.total_cost_value)}</div>
        <div class="kpi-change neutral">At purchase price</div>
      </div>
      <div class="kpi-card success">
        <div class="kpi-label">Total Sale Value</div>
        <div class="kpi-value">KSH ${rptFormatNumber(data.kpis.total_sale_value)}</div>
        <div class="kpi-change positive"><i class="fas fa-arrow-up"></i> Potential revenue</div>
      </div>
      <div class="kpi-card secondary">
        <div class="kpi-label">Potential Profit</div>
        <div class="kpi-value">KSH ${rptFormatNumber(data.kpis.potential_profit)}</div>
        <div class="kpi-change positive">${((data.kpis.potential_profit / data.kpis.total_cost_value) * 100).toFixed(1)}% margin</div>
      </div>
      <div class="kpi-card warning">
        <div class="kpi-label">Items Requiring Reorder</div>
        <div class="kpi-value">${data.kpis.reorder_items}</div>
        <div class="kpi-change ${data.kpis.reorder_items > 0 ? 'negative' : 'positive'}">
          <i class="fas ${data.kpis.reorder_items > 0 ? 'fa-exclamation-triangle' : 'fa-check-circle'}"></i>
          ${data.kpis.reorder_items > 0 ? 'Action required' : 'Stock sufficient'}
        </div>
      </div>
    </div>
    <div class="charts-grid">
      <div class="chart-card">
        <h3 class="chart-title">Inventory Value by Category</h3>
        <div class="chart-container"><canvas id="categoryValueChart"></canvas></div>
      </div>
      <div class="chart-card">
        <h3 class="chart-title">Stock Status Overview</h3>
        <div class="chart-container"><canvas id="stockStatusChart"></canvas></div>
      </div>
    </div>
    ${data.low_stock.length > 0 ? `
    <div style="margin-top:30px;">
      <h3 class="chart-title" style="color:var(--error);">
        <i class="fas fa-exclamation-triangle"></i> Items Requiring Immediate Reorder
      </h3>
      <table class="data-table">
        <thead><tr>
          <th>Item ID</th><th>Item Name</th><th>Category</th>
          <th class="text-center">Current Stock</th><th class="text-center">Reorder Level</th>
        </tr></thead>
        <tbody>
          ${data.low_stock.map(item => `
            <tr>
              <td>${item.item_id}</td><td>${item.name}</td><td>${item.category}</td>
              <td class="text-center" style="color:var(--error);font-weight:600;">${item.remaining_qty}</td>
              <td class="text-center">${item.reorder_level}</td>
            </tr>`).join('')}
        </tbody>
      </table>
    </div>` : ''}
    <div style="margin-top:30px;">
      <h3 class="chart-title">Complete Inventory List</h3>
      <table class="data-table">
        <thead><tr>
          <th>Item ID</th><th>Item Name</th><th>Category</th>
          <th class="text-center">Purchased</th><th class="text-center">Sold</th>
          <th class="text-center">Remaining</th>
          <th class="text-right">Cost Value</th><th class="text-right">Sale Value</th>
        </tr></thead>
        <tbody>
          ${data.items.map(item => `
            <tr>
              <td>${item.item_id}</td><td>${item.name}</td><td>${item.category}</td>
              <td class="text-center">${item.purchased_qty}</td>
              <td class="text-center">${item.sold_qty}</td>
              <td class="text-center ${item.reorder_required === 'YES' ? 'style="color:var(--error);font-weight:600;"' : ''}">${item.remaining_qty}</td>
              <td class="text-right">KSH ${rptFormatNumber(item.cost_value)}</td>
              <td class="text-right">KSH ${rptFormatNumber(item.sale_value)}</td>
            </tr>`).join('')}
        </tbody>
      </table>
    </div>`;

    rptRenderCategoryValueChart(data.category_breakdown);
    rptRenderStockStatusChart(data.kpis);
}


/* ============================================================
   3. PROFIT & LOSS REPORT
   ============================================================ */
async function rptGenerateProfitLossReport(fromDate, toDate) {
    try {
        const params = new URLSearchParams({ start_date: fromDate, end_date: toDate });
        const res    = await fetch(`/api/reports/profit-loss/?${params}`, {
            headers: { 'Content-Type': 'application/json', 'X-CSRFToken': rptGetCSRFToken() },
            credentials: 'same-origin'
        });
        const result = await res.json();
        if (!result.success) throw new Error(result.message || 'Failed to generate report');

        rptCurrentReportData = result.data;
        rptRenderProfitLossReport(result.data, fromDate, toDate);
        rptShowExportButtons();
    } catch (err) { console.error('Error generating P&L report:', err); throw err; }
}

function rptRenderProfitLossReport(data, fromDate, toDate) {
    const reportDisplay = document.getElementById('reportDisplay');
    reportDisplay.classList.add('active');
    Object.values(rptCharts).forEach(c => c.destroy());
    rptCharts = {};

    const isProfit = data.kpis.net_profit >= 0;

    reportDisplay.innerHTML = `
    <div class="report-header">
      <h2 class="report-title">Profit & Loss Statement</h2>
      <p class="report-subtitle">Financial performance summary</p>
      <span class="report-period">Period: ${fromDate} - ${toDate}</span>
    </div>
    <div class="kpi-grid">
      <div class="kpi-card">
        <div class="kpi-label">Total Revenue</div>
        <div class="kpi-value">KSH ${rptFormatNumber(data.kpis.total_revenue)}</div>
        <div class="kpi-change positive"><i class="fas fa-dollar-sign"></i> Sales income</div>
      </div>
      <div class="kpi-card warning">
        <div class="kpi-label">Cost of Goods Sold</div>
        <div class="kpi-value">KSH ${rptFormatNumber(data.kpis.cogs)}</div>
        <div class="kpi-change neutral">Direct costs</div>
      </div>
      <div class="kpi-card ${isProfit ? 'success' : 'warning'}">
        <div class="kpi-label">Gross Profit</div>
        <div class="kpi-value">KSH ${rptFormatNumber(data.kpis.gross_profit)}</div>
        <div class="kpi-change ${isProfit ? 'positive' : 'negative'}">
          <i class="fas fa-${isProfit ? 'arrow-up' : 'arrow-down'}"></i>
          ${data.kpis.gross_margin.toFixed(1)}% margin
        </div>
      </div>
      <div class="kpi-card ${isProfit ? 'success' : 'warning'}">
        <div class="kpi-label">Net Profit</div>
        <div class="kpi-value">KSH ${rptFormatNumber(data.kpis.net_profit)}</div>
        <div class="kpi-change ${isProfit ? 'positive' : 'negative'}">
          <i class="fas fa-${isProfit ? 'check-circle' : 'exclamation-circle'}"></i>
          ${data.kpis.net_margin.toFixed(1)}% margin
        </div>
      </div>
    </div>
    <div style="margin-top:30px;">
      <h3 class="chart-title">Profit & Loss Statement Details</h3>
      <table class="data-table">
        <tbody>
          <tr><td><strong>Revenue</strong></td><td class="text-right"><strong>KSH ${rptFormatNumber(data.breakdown.revenue)}</strong></td></tr>
          <tr><td style="padding-left:30px;">Cost of Goods Sold</td><td class="text-right" style="color:var(--error);">(KSH ${rptFormatNumber(data.breakdown.cogs)})</td></tr>
          <tr style="background-color:var(--light-gray);"><td><strong>Gross Profit</strong></td><td class="text-right"><strong>KSH ${rptFormatNumber(data.breakdown.gross_profit)}</strong></td></tr>
          <tr><td><strong>Operating Expenses</strong></td><td></td></tr>
          <tr><td style="padding-left:30px;">Shipping Expenses</td><td class="text-right" style="color:var(--error);">(KSH ${rptFormatNumber(data.breakdown.shipping_expense)})</td></tr>
          <tr class="total-row"><td><strong>Net Profit</strong></td><td class="text-right"><strong>KSH ${rptFormatNumber(data.breakdown.net_profit)}</strong></td></tr>
        </tbody>
      </table>
    </div>
    ${data.monthly_trend.length > 0 ? `
    <div style="margin-top:30px;">
      <h3 class="chart-title">Monthly Revenue Trend</h3>
      <div class="chart-container" style="height:300px;"><canvas id="monthlyTrendChart"></canvas></div>
    </div>` : ''}`;

    if (data.monthly_trend.length > 0) rptRenderMonthlyTrendChart(data.monthly_trend);
}


/* ============================================================
   4. PURCHASE SUMMARY REPORT
   ============================================================ */
async function rptGeneratePurchaseReport(fromDate, toDate, category = '', county = '') {
    try {
        const params = new URLSearchParams({ start_date: fromDate, end_date: toDate });
        if (category) params.append('category', category);
        if (county)   params.append('county', county);

        const res    = await fetch(`/api/reports/purchase-summary/?${params}`, {
            headers: { 'Content-Type': 'application/json', 'X-CSRFToken': rptGetCSRFToken() },
            credentials: 'same-origin'
        });
        const result = await res.json();
        if (!result.success) throw new Error(result.message || 'Failed to generate report');

        rptCurrentReportData = result.data;
        rptRenderPurchaseReport(result.data, fromDate, toDate);
        rptShowExportButtons();
    } catch (err) { console.error('Error generating purchase report:', err); throw err; }
}

function rptRenderPurchaseReport(data, fromDate, toDate) {
    const reportDisplay = document.getElementById('reportDisplay');
    reportDisplay.classList.add('active');
    Object.values(rptCharts).forEach(c => c.destroy());
    rptCharts = {};

    reportDisplay.innerHTML = `
    <div class="report-header">
      <h2 class="report-title">Purchase Summary Report</h2>
      <p class="report-subtitle">Procurement analysis and supplier performance</p>
      <span class="report-period">Period: ${fromDate} - ${toDate}</span>
    </div>
    <div class="kpi-grid">
      <div class="kpi-card">
        <div class="kpi-label">Total Purchases</div>
        <div class="kpi-value">KSH ${rptFormatNumber(data.kpis.total_purchases)}</div>
        <div class="kpi-change neutral">${data.kpis.total_orders} orders</div>
      </div>
      <div class="kpi-card success">
        <div class="kpi-label">Amount Paid</div>
        <div class="kpi-value">KSH ${rptFormatNumber(data.kpis.total_paid)}</div>
        <div class="kpi-change positive">${((data.kpis.total_paid / data.kpis.total_purchases) * 100).toFixed(1)}% settled</div>
      </div>
      <div class="kpi-card warning">
        <div class="kpi-label">Outstanding Payable</div>
        <div class="kpi-value">KSH ${rptFormatNumber(data.kpis.outstanding)}</div>
        <div class="kpi-change negative">Pending payment</div>
      </div>
      <div class="kpi-card secondary">
        <div class="kpi-label">Avg Purchase Value</div>
        <div class="kpi-value">KSH ${rptFormatNumber(data.kpis.avg_order_value)}</div>
        <div class="kpi-change neutral">Per order</div>
      </div>
    </div>
    <div class="charts-grid">
      <div class="chart-card wide">
        <h3 class="chart-title">Daily Purchase Trend</h3>
        <div class="chart-container"><canvas id="dailyPurchasesChart"></canvas></div>
      </div>
      <div class="chart-card">
        <h3 class="chart-title">Purchases by Category</h3>
        <div class="chart-container"><canvas id="purchaseCategoryChart"></canvas></div>
      </div>
      <div class="chart-card">
        <h3 class="chart-title">Top 5 Suppliers</h3>
        <div class="chart-container"><canvas id="topSuppliersChart"></canvas></div>
      </div>
    </div>
    <div style="margin-top:30px;">
      <h3 class="chart-title">Top Suppliers by Purchase Volume</h3>
      <table class="data-table">
        <thead><tr>
          <th>Supplier Name</th><th class="text-right">Total Purchases</th>
          <th class="text-center">Orders</th><th class="text-right">Avg Order Value</th>
        </tr></thead>
        <tbody>
          ${data.top_suppliers.map(s => `
            <tr>
              <td>${s.name}</td>
              <td class="text-right">KSH ${rptFormatNumber(s.total)}</td>
              <td class="text-center">${s.orders}</td>
              <td class="text-right">KSH ${rptFormatNumber(s.total / s.orders)}</td>
            </tr>`).join('')}
        </tbody>
      </table>
    </div>`;

    rptRenderDailyPurchasesChart(data.daily_purchases);
    rptRenderCategoryPieChart(data.purchases_by_category, 'purchaseCategoryChart');
    rptRenderTopSuppliersChart(data.top_suppliers);
}


/* ============================================================
   5. OUTSTANDING BALANCES REPORT
   ============================================================ */
async function rptGenerateOutstandingBalancesReport() {
    try {
        const res    = await fetch('/api/reports/outstanding-balances/', {
            headers: { 'Content-Type': 'application/json', 'X-CSRFToken': rptGetCSRFToken() },
            credentials: 'same-origin'
        });
        const result = await res.json();
        if (!result.success) throw new Error(result.message || 'Failed to generate report');

        rptCurrentReportData = result.data;
        rptRenderOutstandingBalancesReport(result.data);
        rptShowExportButtons();
    } catch (err) { console.error('Error generating outstanding balances report:', err); throw err; }
}

function rptRenderOutstandingBalancesReport(data) {
    const reportDisplay = document.getElementById('reportDisplay');
    reportDisplay.classList.add('active');
    Object.values(rptCharts).forEach(c => c.destroy());
    rptCharts = {};

    reportDisplay.innerHTML = `
    <div class="report-header">
      <h2 class="report-title">Outstanding Balances Report</h2>
      <p class="report-subtitle">Accounts receivable and payable summary</p>
      <span class="report-period">Generated: ${rptFormatDate(new Date())}</span>
    </div>
    <div class="kpi-grid">
      <div class="kpi-card success">
        <div class="kpi-label">Total Receivable</div>
        <div class="kpi-value">KSH ${rptFormatNumber(data.kpis.total_receivable)}</div>
        <div class="kpi-change positive"><i class="fas fa-arrow-down"></i> From customers</div>
      </div>
      <div class="kpi-card warning">
        <div class="kpi-label">Total Payable</div>
        <div class="kpi-value">KSH ${rptFormatNumber(data.kpis.total_payable)}</div>
        <div class="kpi-change negative"><i class="fas fa-arrow-up"></i> To suppliers</div>
      </div>
      <div class="kpi-card ${data.kpis.net_position >= 0 ? 'success' : 'warning'}">
        <div class="kpi-label">Net Position</div>
        <div class="kpi-value">KSH ${rptFormatNumber(data.kpis.net_position)}</div>
        <div class="kpi-change ${data.kpis.net_position >= 0 ? 'positive' : 'negative'}">
          <i class="fas fa-${data.kpis.net_position >= 0 ? 'check-circle' : 'exclamation-circle'}"></i>
          ${data.kpis.net_position >= 0 ? 'Healthy' : 'Review needed'}
        </div>
      </div>
    </div>
    ${data.customer_balances.length > 0 ? `
    <div style="margin-top:30px;">
      <h3 class="chart-title"><i class="fas fa-users"></i> Outstanding Customer Balances (Receivable)</h3>
      <table class="data-table">
        <thead><tr>
          <th>Customer ID</th><th>Customer Name</th>
          <th class="text-right">Total Sales</th><th class="text-right">Payments Received</th>
          <th class="text-right">Balance Due</th>
        </tr></thead>
        <tbody>
          ${data.customer_balances.map(c => `
            <tr>
              <td>${c.id}</td><td>${c.name}</td>
              <td class="text-right">KSH ${rptFormatNumber(c.total_sales)}</td>
              <td class="text-right">KSH ${rptFormatNumber(c.total_payments)}</td>
              <td class="text-right" style="color:var(--success);font-weight:600;">KSH ${rptFormatNumber(c.balance)}</td>
            </tr>`).join('')}
          <tr class="total-row">
            <td colspan="4"><strong>Total Receivable</strong></td>
            <td class="text-right"><strong>KSH ${rptFormatNumber(data.kpis.total_receivable)}</strong></td>
          </tr>
        </tbody>
      </table>
    </div>` : `
    <div style="margin-top:30px;text-align:center;padding:40px;background:var(--light-gray);border-radius:8px;">
      <i class="fas fa-check-circle" style="font-size:3rem;color:var(--success);margin-bottom:15px;"></i>
      <h3 style="color:var(--success);">No Outstanding Customer Balances</h3>
      <p style="color:var(--gray);">All customers have settled their accounts</p>
    </div>`}
    ${data.supplier_balances.length > 0 ? `
    <div style="margin-top:30px;">
      <h3 class="chart-title"><i class="fas fa-truck"></i> Outstanding Supplier Balances (Payable)</h3>
      <table class="data-table">
        <thead><tr>
          <th>Supplier ID</th><th>Supplier Name</th>
          <th class="text-right">Total Purchases</th><th class="text-right">Payments Made</th>
          <th class="text-right">Balance Due</th>
        </tr></thead>
        <tbody>
          ${data.supplier_balances.map(s => `
            <tr>
              <td>${s.id}</td><td>${s.name}</td>
              <td class="text-right">KSH ${rptFormatNumber(s.total_purchases)}</td>
              <td class="text-right">KSH ${rptFormatNumber(s.total_payments)}</td>
              <td class="text-right" style="color:var(--error);font-weight:600;">KSH ${rptFormatNumber(s.balance)}</td>
            </tr>`).join('')}
          <tr class="total-row">
            <td colspan="4"><strong>Total Payable</strong></td>
            <td class="text-right"><strong>KSH ${rptFormatNumber(data.kpis.total_payable)}</strong></td>
          </tr>
        </tbody>
      </table>
    </div>` : `
    <div style="margin-top:30px;text-align:center;padding:40px;background:var(--light-gray);border-radius:8px;">
      <i class="fas fa-check-circle" style="font-size:3rem;color:var(--success);margin-bottom:15px;"></i>
      <h3 style="color:var(--success);">No Outstanding Supplier Balances</h3>
      <p style="color:var(--gray);">All suppliers have been paid</p>
    </div>`}`;
}


/* ============================================================
   6. CUSTOMER ANALYSIS REPORT
   ============================================================ */
async function rptGenerateCustomerAnalysisReport(fromDate, toDate, county = '') {
    try {
        const params = new URLSearchParams({ start_date: fromDate, end_date: toDate });
        if (county) params.append('county', county);

        const res    = await fetch(`/api/reports/customer-analysis/?${params}`, {
            headers: { 'Content-Type': 'application/json', 'X-CSRFToken': rptGetCSRFToken() },
            credentials: 'same-origin'
        });
        const result = await res.json();
        if (!result.success) throw new Error(result.message || 'Failed to generate report');

        rptCurrentReportData = result.data;
        rptRenderCustomerAnalysisReport(result.data, fromDate, toDate);
        rptShowExportButtons();
    } catch (err) { console.error('Error generating customer analysis:', err); throw err; }
}

function rptRenderCustomerAnalysisReport(data, fromDate, toDate) {
    const reportDisplay = document.getElementById('reportDisplay');
    reportDisplay.classList.add('active');
    Object.values(rptCharts).forEach(c => c.destroy());
    rptCharts = {};

    reportDisplay.innerHTML = `
    <div class="report-header">
      <h2 class="report-title">Customer Analysis Report</h2>
      <p class="report-subtitle">Customer behavior, segmentation, and value analysis</p>
      <span class="report-period">Period: ${fromDate} - ${toDate}</span>
    </div>
    <div class="kpi-grid">
      <div class="kpi-card">
        <div class="kpi-label">Total Customers</div>
        <div class="kpi-value">${data.kpis.total_customers}</div>
        <div class="kpi-change neutral">${data.kpis.active_customers} active</div>
      </div>
      <div class="kpi-card success">
        <div class="kpi-label">Total Revenue</div>
        <div class="kpi-value">KSH ${rptFormatNumber(data.kpis.total_revenue)}</div>
        <div class="kpi-change positive"><i class="fas fa-arrow-up"></i> From customers</div>
      </div>
      <div class="kpi-card secondary">
        <div class="kpi-label">Avg Customer Value</div>
        <div class="kpi-value">KSH ${rptFormatNumber(data.kpis.avg_customer_value)}</div>
        <div class="kpi-change neutral">Per customer</div>
      </div>
      <div class="kpi-card warning">
        <div class="kpi-label">Avg Orders Per Customer</div>
        <div class="kpi-value">${data.kpis.avg_orders_per_customer.toFixed(1)}</div>
        <div class="kpi-change neutral">Order frequency</div>
      </div>
    </div>
    <div style="margin-top:30px;">
      <h3 class="chart-title"><i class="fas fa-layer-group"></i> Customer Segmentation</h3>
      <div class="kpi-grid" style="grid-template-columns:repeat(3,1fr);">
        <div class="kpi-card" style="border-left:4px solid #f39c12;">
          <div class="kpi-label">VIP Customers (Top 20%)</div>
          <div class="kpi-value">${data.segmentation.vip.count}</div>
          <div class="kpi-change neutral">KSH ${rptFormatNumber(data.segmentation.vip.total_value)} (${data.segmentation.vip.percentage.toFixed(1)}%)</div>
        </div>
        <div class="kpi-card" style="border-left:4px solid #3498db;">
          <div class="kpi-label">High-Value (Next 30%)</div>
          <div class="kpi-value">${data.segmentation.high_value.count}</div>
          <div class="kpi-change neutral">KSH ${rptFormatNumber(data.segmentation.high_value.total_value)} (${data.segmentation.high_value.percentage.toFixed(1)}%)</div>
        </div>
        <div class="kpi-card" style="border-left:4px solid #95a5a6;">
          <div class="kpi-label">Regular Customers</div>
          <div class="kpi-value">${data.segmentation.regular.count}</div>
          <div class="kpi-change neutral">KSH ${rptFormatNumber(data.segmentation.regular.total_value)} (${data.segmentation.regular.percentage.toFixed(1)}%)</div>
        </div>
      </div>
    </div>
    <div class="charts-grid" style="margin-top:30px;">
      <div class="chart-card"><h3 class="chart-title">Top 10 Customers by Revenue</h3><div class="chart-container"><canvas id="topCustomersValueChart"></canvas></div></div>
      <div class="chart-card"><h3 class="chart-title">Customer Payment Behavior</h3><div class="chart-container"><canvas id="paymentBehaviorChart"></canvas></div></div>
      <div class="chart-card"><h3 class="chart-title">Geographic Distribution</h3><div class="chart-container"><canvas id="customerGeographicChart"></canvas></div></div>
      <div class="chart-card"><h3 class="chart-title">Customer Segmentation Breakdown</h3><div class="chart-container"><canvas id="customerSegmentationChart"></canvas></div></div>
    </div>
    <div style="margin-top:30px;">
      <h3 class="chart-title">Top 10 Customers - Detailed Analysis</h3>
      <table class="data-table">
        <thead><tr>
          <th>Customer Name</th><th class="text-right">Total Sales</th><th class="text-center">Orders</th>
          <th class="text-right">Avg Order Value</th><th class="text-right">Outstanding</th>
          <th class="text-center">Payment Ratio</th><th class="text-center">Last Order</th>
        </tr></thead>
        <tbody>
          ${data.top_customers.map(c => `
            <tr>
              <td><strong>${c.customer_name}</strong><br><small>${c.customer_id}</small></td>
              <td class="text-right">KSH ${rptFormatNumber(c.total_sales)}</td>
              <td class="text-center">${c.total_orders}</td>
              <td class="text-right">KSH ${rptFormatNumber(c.avg_order_value)}</td>
              <td class="text-right" style="color:${c.outstanding_balance > 0 ? 'var(--error)' : 'var(--success)'};">KSH ${rptFormatNumber(c.outstanding_balance)}</td>
              <td class="text-center"><span style="color:${c.payment_ratio >= 90 ? 'var(--success)' : c.payment_ratio >= 70 ? 'var(--warning)' : 'var(--error)'};">${c.payment_ratio.toFixed(1)}%</span></td>
              <td class="text-center">${c.last_order_date}</td>
            </tr>`).join('')}
        </tbody>
      </table>
    </div>`;

    rptRenderTopCustomersValueChart(data.top_customers);
    rptRenderPaymentBehaviorChart(data.payment_behavior);
    rptRenderCustomerGeographicChart(data.geographic_distribution);
    rptRenderCustomerSegmentationChart(data.segmentation);
}


/* ============================================================
   7. SUPPLIER ANALYSIS REPORT
   ============================================================ */
async function rptGenerateSupplierAnalysisReport(fromDate, toDate, county = '') {
    try {
        const params = new URLSearchParams({ start_date: fromDate, end_date: toDate });
        if (county) params.append('county', county);

        const res    = await fetch(`/api/reports/supplier-analysis/?${params}`, {
            headers: { 'Content-Type': 'application/json', 'X-CSRFToken': rptGetCSRFToken() },
            credentials: 'same-origin'
        });
        const result = await res.json();
        if (!result.success) throw new Error(result.message || 'Failed to generate report');

        rptCurrentReportData = result.data;
        rptRenderSupplierAnalysisReport(result.data, fromDate, toDate);
        rptShowExportButtons();
    } catch (err) { console.error('Error generating supplier analysis:', err); throw err; }
}

function rptRenderSupplierAnalysisReport(data, fromDate, toDate) {
    const reportDisplay = document.getElementById('reportDisplay');
    reportDisplay.classList.add('active');
    Object.values(rptCharts).forEach(c => c.destroy());
    rptCharts = {};

    reportDisplay.innerHTML = `
    <div class="report-header">
      <h2 class="report-title">Supplier Analysis Report</h2>
      <p class="report-subtitle">Supplier performance, reliability, and cost analysis</p>
      <span class="report-period">Period: ${fromDate} - ${toDate}</span>
    </div>
    <div class="kpi-grid">
      <div class="kpi-card">
        <div class="kpi-label">Total Suppliers</div>
        <div class="kpi-value">${data.kpis.total_suppliers}</div>
        <div class="kpi-change neutral">${data.kpis.active_suppliers} active</div>
      </div>
      <div class="kpi-card warning">
        <div class="kpi-label">Total Purchases</div>
        <div class="kpi-value">KSH ${rptFormatNumber(data.kpis.total_purchases)}</div>
        <div class="kpi-change neutral"><i class="fas fa-shopping-cart"></i> Total procurement</div>
      </div>
      <div class="kpi-card secondary">
        <div class="kpi-label">Avg Supplier Value</div>
        <div class="kpi-value">KSH ${rptFormatNumber(data.kpis.avg_supplier_value)}</div>
        <div class="kpi-change neutral">Per supplier</div>
      </div>
      <div class="kpi-card success">
        <div class="kpi-label">Avg Orders Per Supplier</div>
        <div class="kpi-value">${data.kpis.avg_orders_per_supplier.toFixed(1)}</div>
        <div class="kpi-change neutral">Order frequency</div>
      </div>
    </div>
    <div style="margin-top:30px;">
      <h3 class="chart-title"><i class="fas fa-layer-group"></i> Supplier Segmentation</h3>
      <div class="kpi-grid" style="grid-template-columns:repeat(3,1fr);">
        <div class="kpi-card" style="border-left:4px solid #e74c3c;">
          <div class="kpi-label">Strategic Suppliers (Top 20%)</div>
          <div class="kpi-value">${data.segmentation.strategic.count}</div>
          <div class="kpi-change neutral">KSH ${rptFormatNumber(data.segmentation.strategic.total_value)} (${data.segmentation.strategic.percentage.toFixed(1)}%)</div>
        </div>
        <div class="kpi-card" style="border-left:4px solid #3498db;">
          <div class="kpi-label">Preferred (Next 30%)</div>
          <div class="kpi-value">${data.segmentation.preferred.count}</div>
          <div class="kpi-change neutral">KSH ${rptFormatNumber(data.segmentation.preferred.total_value)} (${data.segmentation.preferred.percentage.toFixed(1)}%)</div>
        </div>
        <div class="kpi-card" style="border-left:4px solid #95a5a6;">
          <div class="kpi-label">Standard Suppliers</div>
          <div class="kpi-value">${data.segmentation.standard.count}</div>
          <div class="kpi-change neutral">KSH ${rptFormatNumber(data.segmentation.standard.total_value)} (${data.segmentation.standard.percentage.toFixed(1)}%)</div>
        </div>
      </div>
    </div>
    <div class="charts-grid" style="margin-top:30px;">
      <div class="chart-card"><h3 class="chart-title">Top 10 Suppliers by Volume</h3><div class="chart-container"><canvas id="topSuppliersValueChart"></canvas></div></div>
      <div class="chart-card"><h3 class="chart-title">Supplier Performance Rating</h3><div class="chart-container"><canvas id="performanceRatingChart"></canvas></div></div>
      <div class="chart-card"><h3 class="chart-title">Geographic Distribution</h3><div class="chart-container"><canvas id="supplierGeographicChart"></canvas></div></div>
      <div class="chart-card"><h3 class="chart-title">Supplier Segmentation Breakdown</h3><div class="chart-container"><canvas id="supplierSegmentationChart"></canvas></div></div>
    </div>
    <div style="margin-top:30px;">
      <h3 class="chart-title">Top 10 Suppliers - Detailed Analysis</h3>
      <table class="data-table">
        <thead><tr>
          <th>Supplier Name</th><th class="text-right">Total Purchases</th><th class="text-center">Orders</th>
          <th class="text-right">Avg Order Value</th><th class="text-right">Outstanding</th>
          <th class="text-center">Delivery Rate</th><th class="text-center">Categories</th>
        </tr></thead>
        <tbody>
          ${data.top_suppliers.map(s => `
            <tr>
              <td><strong>${s.supplier_name}</strong><br><small>${s.supplier_id}</small></td>
              <td class="text-right">KSH ${rptFormatNumber(s.total_purchases)}</td>
              <td class="text-center">${s.total_orders}</td>
              <td class="text-right">KSH ${rptFormatNumber(s.avg_order_value)}</td>
              <td class="text-right" style="color:${s.outstanding_balance > 0 ? 'var(--error)' : 'var(--success)'};">KSH ${rptFormatNumber(s.outstanding_balance)}</td>
              <td class="text-center"><span style="color:${s.delivery_rate >= 90 ? 'var(--success)' : s.delivery_rate >= 70 ? 'var(--warning)' : 'var(--error)'};">${s.delivery_rate.toFixed(1)}%</span></td>
              <td class="text-center">${s.categories_supplied}</td>
            </tr>`).join('')}
        </tbody>
      </table>
    </div>`;

    rptRenderTopSuppliersValueChart(data.top_suppliers);
    rptRenderPerformanceRatingChart(data.performance_rating);
    rptRenderSupplierGeographicChart(data.geographic_distribution);
    rptRenderSupplierSegmentationChart(data.segmentation);
}


/* ============================================================
   8. TAX SUMMARY REPORT
   ============================================================ */
async function rptGenerateTaxSummaryReport(fromDate, toDate) {
    try {
        const params = new URLSearchParams({ start_date: fromDate, end_date: toDate });
        const res    = await fetch(`/api/reports/tax-summary/?${params}`, {
            headers: { 'Content-Type': 'application/json', 'X-CSRFToken': rptGetCSRFToken() },
            credentials: 'same-origin'
        });
        const result = await res.json();
        if (!result.success) throw new Error(result.message || 'Failed to generate report');

        rptCurrentReportData = result.data;
        rptRenderTaxSummaryReport(result.data, fromDate, toDate);
        rptShowExportButtons();
    } catch (err) { console.error('Error generating tax summary report:', err); throw err; }
}

function rptRenderTaxSummaryReport(data, fromDate, toDate) {
    const reportDisplay = document.getElementById('reportDisplay');
    reportDisplay.classList.add('active');
    Object.values(rptCharts).forEach(c => c.destroy());
    rptCharts = {};

    const taxBalance  = data.kpis.net_tax;
    const balanceType = taxBalance >= 0 ? 'Payable to Tax Authority' : 'Tax Credit Available';
    const balanceClass = taxBalance >= 0 ? 'warning' : 'success';

    reportDisplay.innerHTML = `
    <div class="report-header">
      <h2 class="report-title">Tax Summary Report</h2>
      <p class="report-subtitle">Tax collected and paid analysis</p>
      <span class="report-period">Period: ${fromDate} - ${toDate}</span>
    </div>
    <div class="kpi-grid">
      <div class="kpi-card success">
        <div class="kpi-label">Tax Collected (Sales)</div>
        <div class="kpi-value">KSH ${rptFormatNumber(data.kpis.total_sales_tax)}</div>
        <div class="kpi-change positive"><i class="fas fa-arrow-down"></i> From ${data.kpis.sales_transactions} transactions</div>
      </div>
      <div class="kpi-card warning">
        <div class="kpi-label">Tax Paid (Purchases)</div>
        <div class="kpi-value">KSH ${rptFormatNumber(data.kpis.total_purchase_tax)}</div>
        <div class="kpi-change negative"><i class="fas fa-arrow-up"></i> From ${data.kpis.purchase_transactions} transactions</div>
      </div>
      <div class="kpi-card ${balanceClass}">
        <div class="kpi-label">Net Tax Position</div>
        <div class="kpi-value">KSH ${rptFormatNumber(Math.abs(taxBalance))}</div>
        <div class="kpi-change ${taxBalance >= 0 ? 'negative' : 'positive'}">
          <i class="fas fa-${taxBalance >= 0 ? 'exclamation-circle' : 'check-circle'}"></i> ${balanceType}
        </div>
      </div>
    </div>
    <div class="charts-grid">
      <div class="chart-card"><h3 class="chart-title">Sales Tax by Rate</h3><div class="chart-container"><canvas id="salesTaxChart"></canvas></div></div>
      <div class="chart-card"><h3 class="chart-title">Purchase Tax by Rate</h3><div class="chart-container"><canvas id="purchaseTaxChart"></canvas></div></div>
    </div>
    <div style="margin-top:30px;">
      <h3 class="chart-title"><i class="fas fa-shopping-cart"></i> Sales Tax Collected by Rate</h3>
      <table class="data-table">
        <thead><tr><th>Tax Rate</th><th class="text-right">Taxable Amount</th><th class="text-right">Tax Collected</th><th class="text-center">Transactions</th></tr></thead>
        <tbody>
          ${data.sales_by_rate.map(r => `
            <tr>
              <td>${r.tax_rate}%</td>
              <td class="text-right">KSH ${rptFormatNumber(r.taxable_amount)}</td>
              <td class="text-right" style="color:var(--success);font-weight:600;">KSH ${rptFormatNumber(r.tax_collected)}</td>
              <td class="text-center">${r.transactions}</td>
            </tr>`).join('')}
          <tr class="total-row">
            <td><strong>Total</strong></td>
            <td class="text-right"><strong>KSH ${rptFormatNumber(data.sales_by_rate.reduce((s, r) => s + r.taxable_amount, 0))}</strong></td>
            <td class="text-right"><strong>KSH ${rptFormatNumber(data.kpis.total_sales_tax)}</strong></td>
            <td class="text-center"><strong>${data.kpis.sales_transactions}</strong></td>
          </tr>
        </tbody>
      </table>
    </div>
    <div style="margin-top:30px;">
      <h3 class="chart-title"><i class="fas fa-truck"></i> Purchase Tax Paid by Rate</h3>
      <table class="data-table">
        <thead><tr><th>Tax Rate</th><th class="text-right">Taxable Amount</th><th class="text-right">Tax Paid</th><th class="text-center">Transactions</th></tr></thead>
        <tbody>
          ${data.purchase_by_rate.map(r => `
            <tr>
              <td>${r.tax_rate}%</td>
              <td class="text-right">KSH ${rptFormatNumber(r.taxable_amount)}</td>
              <td class="text-right" style="color:var(--error);font-weight:600;">KSH ${rptFormatNumber(r.tax_paid)}</td>
              <td class="text-center">${r.transactions}</td>
            </tr>`).join('')}
          <tr class="total-row">
            <td><strong>Total</strong></td>
            <td class="text-right"><strong>KSH ${rptFormatNumber(data.purchase_by_rate.reduce((s, r) => s + r.taxable_amount, 0))}</strong></td>
            <td class="text-right"><strong>KSH ${rptFormatNumber(data.kpis.total_purchase_tax)}</strong></td>
            <td class="text-center"><strong>${data.kpis.purchase_transactions}</strong></td>
          </tr>
        </tbody>
      </table>
    </div>
    <div style="margin-top:30px;">
      <h3 class="chart-title"><i class="fas fa-calculator"></i> Net Tax Position</h3>
      <table class="data-table">
        <tbody>
          <tr><td><strong>Tax Collected (Sales)</strong></td><td class="text-right" style="color:var(--success);font-weight:600;">KSH ${rptFormatNumber(data.kpis.total_sales_tax)}</td></tr>
          <tr><td><strong>Tax Paid (Purchases)</strong></td><td class="text-right" style="color:var(--error);">(KSH ${rptFormatNumber(data.kpis.total_purchase_tax)})</td></tr>
          <tr class="total-row"><td><strong>Net Tax ${taxBalance >= 0 ? 'Payable' : 'Credit'}</strong></td><td class="text-right"><strong>KSH ${rptFormatNumber(Math.abs(taxBalance))}</strong></td></tr>
        </tbody>
      </table>
      ${taxBalance >= 0
        ? `<div style="margin-top:20px;padding:15px;background:#fff3cd;border-left:4px solid var(--warning);border-radius:4px;"><strong>⚠️ Action Required:</strong> You have KSH ${rptFormatNumber(taxBalance)} in net tax to remit to the tax authority.</div>`
        : `<div style="margin-top:20px;padding:15px;background:#d4edda;border-left:4px solid var(--success);border-radius:4px;"><strong>✅ Tax Credit:</strong> You have KSH ${rptFormatNumber(Math.abs(taxBalance))} in tax credits available for offset.</div>`}
    </div>
    ${data.sales_transactions && data.sales_transactions.length > 0 ? `
    <div style="margin-top:30px;">
      <h3 class="chart-title">Recent Sales Tax Transactions (Last 20)</h3>
      <table class="data-table">
        <thead><tr><th>Date</th><th>Invoice</th><th>Customer</th><th>Item</th><th class="text-right">Amount</th><th class="text-center">Rate</th><th class="text-right">Tax</th></tr></thead>
        <tbody>
          ${data.sales_transactions.slice(0, 20).map(txn => `
            <tr>
              <td>${txn.date}</td><td>${txn.invoice}</td><td>${txn.customer}</td><td>${txn.item}</td>
              <td class="text-right">KSH ${rptFormatNumber(txn.amount)}</td>
              <td class="text-center">${txn.tax_rate}%</td>
              <td class="text-right">KSH ${rptFormatNumber(txn.tax)}</td>
            </tr>`).join('')}
        </tbody>
      </table>
    </div>` : ''}`;

    if (data.sales_by_rate.length > 0)    rptRenderTaxByRateChart(data.sales_by_rate,    'salesTaxChart',    'Sales Tax Collected');
    if (data.purchase_by_rate.length > 0) rptRenderTaxByRateChart(data.purchase_by_rate, 'purchaseTaxChart', 'Purchase Tax Paid', true);
}


/* ============================================================
   CHART RENDERING
   ============================================================ */
function rptRenderDailySalesChart(dailyData) {
    const ctx = document.getElementById('dailySalesChart');
    rptCharts.dailySales = new Chart(ctx, {
        type: 'line',
        data: {
            labels: dailyData.map(d => d.date),
            datasets: [{ label: 'Daily Sales', data: dailyData.map(d => d.total), borderColor: 'rgba(26,188,156,1)', backgroundColor: 'rgba(26,188,156,0.1)', borderWidth: 3, fill: true, tension: 0.4, pointRadius: 4, pointHoverRadius: 6 }]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { callbacks: { label: (ctx) => 'Sales: KSH ' + rptFormatNumber(ctx.parsed.y) } } }, scales: { y: { beginAtZero: true, ticks: { callback: (v) => 'KSH ' + (v / 1000).toFixed(0) + 'K' } } } }
    });
}

function rptRenderCategoryPieChart(categoryData, canvasId) {
    const ctx = document.getElementById(canvasId);
    rptCharts[canvasId] = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: categoryData.map(c => c.category),
            datasets: [{ data: categoryData.map(c => c.total), backgroundColor: ['rgba(26,188,156,0.8)','rgba(52,152,219,0.8)','rgba(155,89,182,0.8)','rgba(230,126,34,0.8)','rgba(231,76,60,0.8)','rgba(243,156,18,0.8)','rgba(46,204,113,0.8)','rgba(52,73,94,0.8)'], borderWidth: 2, borderColor: '#fff' }]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' }, tooltip: { callbacks: { label: (ctx) => { const total = ctx.dataset.data.reduce((a,b) => a+b, 0); return `${ctx.label}: KSH ${rptFormatNumber(ctx.parsed)} (${((ctx.parsed/total)*100).toFixed(1)}%)`; } } } } }
    });
}

function rptRenderTopCustomersChart(customersData) {
    const ctx = document.getElementById('topCustomersChart');
    rptCharts.topCustomers = new Chart(ctx, {
        type: 'bar',
        data: { labels: customersData.map(c => c.name), datasets: [{ label: 'Total Sales', data: customersData.map(c => c.total), backgroundColor: 'rgba(52,152,219,0.7)', borderColor: 'rgba(52,152,219,1)', borderWidth: 2 }] },
        options: { indexAxis: 'y', responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { callbacks: { label: (ctx) => 'Sales: KSH ' + rptFormatNumber(ctx.parsed.x) } } }, scales: { x: { beginAtZero: true, ticks: { callback: (v) => 'KSH ' + (v/1000).toFixed(0) + 'K' } } } }
    });
}

function rptRenderCategoryValueChart(categoryData) {
    const ctx = document.getElementById('categoryValueChart');
    rptCharts.categoryValue = new Chart(ctx, {
        type: 'bar',
        data: { labels: categoryData.map(c => c.category), datasets: [{ label: 'Cost Value', data: categoryData.map(c => c.cost_value), backgroundColor: 'rgba(230,126,34,0.7)', borderColor: 'rgba(230,126,34,1)', borderWidth: 2 }, { label: 'Sale Value', data: categoryData.map(c => c.sale_value), backgroundColor: 'rgba(46,204,113,0.7)', borderColor: 'rgba(46,204,113,1)', borderWidth: 2 }] },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'top' }, tooltip: { callbacks: { label: (ctx) => ctx.dataset.label + ': KSH ' + rptFormatNumber(ctx.parsed.y) } } }, scales: { y: { beginAtZero: true, ticks: { callback: (v) => 'KSH ' + (v/1000).toFixed(0) + 'K' } } } }
    });
}

function rptRenderStockStatusChart(kpis) {
    const ctx = document.getElementById('stockStatusChart');
    rptCharts.stockStatus = new Chart(ctx, {
        type: 'doughnut',
        data: { labels: ['In Stock', 'Needs Reorder'], datasets: [{ data: [kpis.total_items - kpis.reorder_items, kpis.reorder_items], backgroundColor: ['rgba(46,204,113,0.8)','rgba(231,76,60,0.8)'], borderWidth: 2, borderColor: '#fff' }] },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }
    });
}

function rptRenderMonthlyTrendChart(monthlyData) {
    const ctx = document.getElementById('monthlyTrendChart');
    rptCharts.monthlyTrend = new Chart(ctx, {
        type: 'line',
        data: { labels: monthlyData.map(m => m.month), datasets: [{ label: 'Monthly Revenue', data: monthlyData.map(m => m.revenue), borderColor: 'rgba(155,89,182,1)', backgroundColor: 'rgba(155,89,182,0.1)', borderWidth: 3, fill: true, tension: 0.4 }] },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { callbacks: { label: (ctx) => 'Revenue: KSH ' + rptFormatNumber(ctx.parsed.y) } } }, scales: { y: { beginAtZero: true, ticks: { callback: (v) => 'KSH ' + (v/1000).toFixed(0) + 'K' } } } }
    });
}

function rptRenderDailyPurchasesChart(dailyData) {
    const ctx = document.getElementById('dailyPurchasesChart');
    rptCharts.dailyPurchases = new Chart(ctx, {
        type: 'line',
        data: { labels: dailyData.map(d => d.date), datasets: [{ label: 'Daily Purchases', data: dailyData.map(d => d.total), borderColor: 'rgba(230,126,34,1)', backgroundColor: 'rgba(230,126,34,0.1)', borderWidth: 3, fill: true, tension: 0.4, pointRadius: 4, pointHoverRadius: 6 }] },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { callbacks: { label: (ctx) => 'Purchases: KSH ' + rptFormatNumber(ctx.parsed.y) } } }, scales: { y: { beginAtZero: true, ticks: { callback: (v) => 'KSH ' + (v/1000).toFixed(0) + 'K' } } } }
    });
}

function rptRenderTopSuppliersChart(suppliersData) {
    const ctx = document.getElementById('topSuppliersChart');
    rptCharts.topSuppliers = new Chart(ctx, {
        type: 'bar',
        data: { labels: suppliersData.map(s => s.name), datasets: [{ label: 'Total Purchases', data: suppliersData.map(s => s.total), backgroundColor: 'rgba(155,89,182,0.7)', borderColor: 'rgba(155,89,182,1)', borderWidth: 2 }] },
        options: { indexAxis: 'y', responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { callbacks: { label: (ctx) => 'Purchases: KSH ' + rptFormatNumber(ctx.parsed.x) } } }, scales: { x: { beginAtZero: true, ticks: { callback: (v) => 'KSH ' + (v/1000).toFixed(0) + 'K' } } } }
    });
}

function rptRenderTopCustomersValueChart(customers) {
    const ctx = document.getElementById('topCustomersValueChart');
    rptCharts.topCustomersValue = new Chart(ctx, {
        type: 'bar',
        data: { labels: customers.map(c => c.customer_name), datasets: [{ label: 'Total Sales', data: customers.map(c => c.total_sales), backgroundColor: 'rgba(52,152,219,0.7)', borderColor: 'rgba(52,152,219,1)', borderWidth: 2 }] },
        options: { indexAxis: 'y', responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { callbacks: { label: (ctx) => 'KSH ' + rptFormatNumber(ctx.parsed.x) } } }, scales: { x: { beginAtZero: true, ticks: { callback: (v) => 'KSH ' + (v/1000).toFixed(0) + 'K' } } } }
    });
}

function rptRenderPaymentBehaviorChart(paymentData) {
    const ctx = document.getElementById('paymentBehaviorChart');
    rptCharts.paymentBehavior = new Chart(ctx, {
        type: 'doughnut',
        data: { labels: ['Excellent (>90%)', 'Good (70-90%)', 'Fair (50-70%)', 'Poor (<50%)'], datasets: [{ data: [paymentData.excellent, paymentData.good, paymentData.fair, paymentData.poor], backgroundColor: ['rgba(46,204,113,0.8)','rgba(52,152,219,0.8)','rgba(243,156,18,0.8)','rgba(231,76,60,0.8)'], borderWidth: 2, borderColor: '#fff' }] },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }
    });
}

function rptRenderCustomerGeographicChart(geoData) {
    const ctx = document.getElementById('customerGeographicChart');
    rptCharts.customerGeographic = new Chart(ctx, {
        type: 'bar',
        data: { labels: geoData.map(g => g.county), datasets: [{ label: 'Total Sales', data: geoData.map(g => g.total_sales), backgroundColor: 'rgba(26,188,156,0.7)', borderColor: 'rgba(26,188,156,1)', borderWidth: 2 }] },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { callbacks: { label: (ctx) => 'KSH ' + rptFormatNumber(ctx.parsed.y) } } }, scales: { y: { beginAtZero: true, ticks: { callback: (v) => 'KSH ' + (v/1000).toFixed(0) + 'K' } } } }
    });
}

function rptRenderCustomerSegmentationChart(segmentation) {
    const ctx = document.getElementById('customerSegmentationChart');
    rptCharts.customerSegmentation = new Chart(ctx, {
        type: 'pie',
        data: { labels: ['VIP', 'High-Value', 'Regular'], datasets: [{ data: [segmentation.vip.total_value, segmentation.high_value.total_value, segmentation.regular.total_value], backgroundColor: ['rgba(243,156,18,0.8)','rgba(52,152,219,0.8)','rgba(149,165,166,0.8)'], borderWidth: 2, borderColor: '#fff' }] },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' }, tooltip: { callbacks: { label: (ctx) => `${ctx.label}: KSH ${rptFormatNumber(ctx.parsed)}` } } } }
    });
}

function rptRenderTopSuppliersValueChart(suppliers) {
    const ctx = document.getElementById('topSuppliersValueChart');
    rptCharts.topSuppliersValue = new Chart(ctx, {
        type: 'bar',
        data: { labels: suppliers.map(s => s.supplier_name), datasets: [{ label: 'Total Purchases', data: suppliers.map(s => s.total_purchases), backgroundColor: 'rgba(155,89,182,0.7)', borderColor: 'rgba(155,89,182,1)', borderWidth: 2 }] },
        options: { indexAxis: 'y', responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { callbacks: { label: (ctx) => 'KSH ' + rptFormatNumber(ctx.parsed.x) } } }, scales: { x: { beginAtZero: true, ticks: { callback: (v) => 'KSH ' + (v/1000).toFixed(0) + 'K' } } } }
    });
}

function rptRenderPerformanceRatingChart(performanceData) {
    const ctx = document.getElementById('performanceRatingChart');
    rptCharts.performanceRating = new Chart(ctx, {
        type: 'doughnut',
        data: { labels: ['Excellent','Good','Fair','Poor'], datasets: [{ data: [performanceData.excellent, performanceData.good, performanceData.fair, performanceData.poor], backgroundColor: ['rgba(46,204,113,0.8)','rgba(52,152,219,0.8)','rgba(243,156,18,0.8)','rgba(231,76,60,0.8)'], borderWidth: 2, borderColor: '#fff' }] },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' }, tooltip: { callbacks: { label: (ctx) => `${ctx.label}: ${ctx.parsed} suppliers` } } } }
    });
}

function rptRenderSupplierGeographicChart(geoData) {
    const ctx = document.getElementById('supplierGeographicChart');
    rptCharts.supplierGeographic = new Chart(ctx, {
        type: 'bar',
        data: { labels: geoData.map(g => g.county), datasets: [{ label: 'Total Purchases', data: geoData.map(g => g.total_purchases), backgroundColor: 'rgba(230,126,34,0.7)', borderColor: 'rgba(230,126,34,1)', borderWidth: 2 }] },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { callbacks: { label: (ctx) => 'KSH ' + rptFormatNumber(ctx.parsed.y) } } }, scales: { y: { beginAtZero: true, ticks: { callback: (v) => 'KSH ' + (v/1000).toFixed(0) + 'K' } } } }
    });
}

function rptRenderSupplierSegmentationChart(segmentation) {
    const ctx = document.getElementById('supplierSegmentationChart');
    rptCharts.supplierSegmentation = new Chart(ctx, {
        type: 'pie',
        data: { labels: ['Strategic','Preferred','Standard'], datasets: [{ data: [segmentation.strategic.total_value, segmentation.preferred.total_value, segmentation.standard.total_value], backgroundColor: ['rgba(231,76,60,0.8)','rgba(52,152,219,0.8)','rgba(149,165,166,0.8)'], borderWidth: 2, borderColor: '#fff' }] },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' }, tooltip: { callbacks: { label: (ctx) => `${ctx.label}: KSH ${rptFormatNumber(ctx.parsed)}` } } } }
    });
}

function rptRenderTaxByRateChart(taxData, canvasId, label, isPurchase = false) {
    const ctx = document.getElementById(canvasId);
    rptCharts[canvasId] = new Chart(ctx, {
        type: 'bar',
        data: { labels: taxData.map(d => `${d.tax_rate}%`), datasets: [{ label: label, data: taxData.map(d => isPurchase ? d.tax_paid : d.tax_collected), backgroundColor: isPurchase ? 'rgba(231,76,60,0.7)' : 'rgba(46,204,113,0.7)', borderColor: isPurchase ? 'rgba(231,76,60,1)' : 'rgba(46,204,113,1)', borderWidth: 2 }] },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { callbacks: { label: (ctx) => `Tax: KSH ${rptFormatNumber(ctx.parsed.y)}` } } }, scales: { y: { beginAtZero: true, ticks: { callback: (v) => 'KSH ' + (v/1000).toFixed(0) + 'K' } } } }
    });
}


/* ============================================================
   EXPORT FUNCTIONS
   ============================================================ */
async function rptExportToPDF() {
    if (!rptCurrentReportData || !rptCurrentReportType) {
        alert('Please generate a report first before exporting');
        return;
    }
    try {
        rptShowLoading();
        const res = await fetch('/api/reports/export-pdf/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-CSRFToken': rptGetCSRFToken() },
            credentials: 'same-origin',
            body: JSON.stringify({ report_type: rptCurrentReportType, report_data: rptCurrentReportData, period: { start: document.getElementById('fromDate').value, end: document.getElementById('toDate').value } })
        });
        if (!res.ok) throw new Error('Failed to generate PDF');
        const cd       = res.headers.get('Content-Disposition');
        let filename   = 'report.pdf';
        if (cd) { const m = /filename="(.+)"/.exec(cd); if (m) filename = m[1]; }
        const blob = await res.blob();
        const url  = window.URL.createObjectURL(blob);
        const a    = document.createElement('a');
        a.href = url; a.download = filename;
        document.body.appendChild(a); a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        console.log('✅ PDF exported');
    } catch (err) {
        console.error('❌ Error exporting PDF:', err);
        alert('Error exporting PDF: ' + err.message);
    } finally { rptHideLoading(); }
}

async function rptExportToExcel() {
    if (!rptCurrentReportData || !rptCurrentReportType) {
        alert('Please generate a report first before exporting');
        return;
    }
    try {
        rptShowLoading();
        const res = await fetch('/api/reports/export-excel/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-CSRFToken': rptGetCSRFToken() },
            credentials: 'same-origin',
            body: JSON.stringify({ report_type: rptCurrentReportType, report_data: rptCurrentReportData, period: { start: document.getElementById('fromDate').value, end: document.getElementById('toDate').value } })
        });
        if (!res.ok) throw new Error('Failed to generate Excel file');
        const cd       = res.headers.get('Content-Disposition');
        let filename   = 'report.xlsx';
        if (cd) { const m = /filename="(.+)"/.exec(cd); if (m) filename = m[1]; }
        const blob = await res.blob();
        const url  = window.URL.createObjectURL(blob);
        const a    = document.createElement('a');
        a.href = url; a.download = filename;
        document.body.appendChild(a); a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        console.log('✅ Excel exported');
    } catch (err) {
        console.error('❌ Error exporting Excel:', err);
        alert('Error exporting Excel: ' + err.message);
    } finally { rptHideLoading(); }
}

/* ============================================================
   GLOBAL WINDOW ASSIGNMENTS
   Assign every function referenced by onclick="" attributes in
   Reports.html to window explicitly.  Top-level function
   declarations are technically already on window, but this
   explicit assignment guarantees they are reachable even in
   environments that scope scripts differently (strict mode,
   certain browser quirks with dynamically injected script tags).
   ============================================================ */
window.initReports              = initReports;
window.rptGenerateQuickReport   = rptGenerateQuickReport;
window.rptGenerateReport        = rptGenerateReport;
window.rptClearFilters          = rptClearFilters;
window.rptExportToPDF           = rptExportToPDF;
window.rptExportToExcel         = rptExportToExcel;

/* ============================================================
   SELF-INITIALISE
   Called here so there is no separate inline <script> needed
   in Reports.html.  By the time this line runs, every function
   in this file is fully defined.
   ============================================================ */
initReports();

console.log('✅ Reports.js complete');