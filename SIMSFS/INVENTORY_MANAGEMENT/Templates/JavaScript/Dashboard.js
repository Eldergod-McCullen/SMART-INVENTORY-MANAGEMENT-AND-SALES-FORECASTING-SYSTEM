/* ============================================================
   DASHBOARD.JS
   Static JavaScript for the Dashboard module.
   Called by the partial template Dashboard.html via:
       <script src="{% static 'js/Dashboard.js' %}"></script>
       <script>initDashboard();</script>

   CHANGES FROM ORIGINAL:
   1. Removed document.addEventListener('DOMContentLoaded', ...)
      entirely. All setup code now lives inside initDashboard()
      which is called directly by the partial template.

   2. Renamed getCSRFToken() → dashGetCSRFToken() to avoid
      collision with the same function name in other modules
      sharing the same global scope through Index.html.

   3. Renamed showLoading() → dashShowLoading() and
      hideLoading() → dashHideLoading() for the same reason.

   4. Updated showLoading/hideLoading to target the renamed
      #dashLoadingOverlay element instead of #loadingOverlay.

   5. The global `charts` and `dashboardData` objects are
      prefixed dash to prevent conflicts with other modules.
   ============================================================ */

console.log('Dashboard.js loaded');

/* ---- Global State ---- */
let dashboardData = {
    inventory:       [],
    sales:           [],
    purchases:       [],
    customers:       [],
    suppliers:       [],
    salesDetails:    [],
    purchaseDetails: []
};

let dashCharts = {};


/* ---- CSRF Helper ---- */
function dashGetCSRFToken() {
    const metaTag = document.querySelector('meta[name="csrf-token"]');
    if (metaTag) return metaTag.getAttribute('content');
    const cookies = document.cookie.split(';');
    for (let cookie of cookies) {
        const [name, value] = cookie.trim().split('=');
        if (name === 'csrftoken') return decodeURIComponent(value);
    }
    return null;
}


/* ---- Formatting Helpers ---- */
function dashFormatNumber(num) {
    if (isNaN(num)) return '0.00';
    return num.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function dashFormatToThousands(num) {
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toFixed(0);
}

function dashParseDate(dateStr) {
    if (!dateStr) return new Date();
    const [day, month, year] = dateStr.split('/');
    return new Date(year, month - 1, day);
}


/* ---- Loading Overlay ---- */
function dashShowLoading() {
    const el = document.getElementById('dashLoadingOverlay');
    if (el) el.style.display = 'flex';
}

function dashHideLoading() {
    const el = document.getElementById('dashLoadingOverlay');
    if (el) el.style.display = 'none';
}


/* ============================================================
   ENTRY POINT — called directly by the partial template
   ============================================================ */
function initDashboard() {
    console.log('✅ Dashboard module initialised');
    dashLoadAllData();
}


/* ============================================================
   DATA LOADING
   ============================================================ */
async function dashLoadAllData() {
    dashShowLoading();
    try {
        await Promise.all([
            dashLoadInventory(),
            dashLoadSales(),
            dashLoadPurchases(),
            dashLoadCustomers(),
            dashLoadSuppliers()
        ]);

        await Promise.all([
            dashLoadSalesDetails(),
            dashLoadPurchaseDetails()
        ]);

        console.log('✅ All dashboard data loaded');
        console.log('- Inventory:',        dashboardData.inventory.length);
        console.log('- Sales:',            dashboardData.sales.length);
        console.log('- Purchases:',        dashboardData.purchases.length);
        console.log('- Customers:',        dashboardData.customers.length);
        console.log('- Suppliers:',        dashboardData.suppliers.length);
        console.log('- Sales Details:',    dashboardData.salesDetails.length);
        console.log('- Purchase Details:', dashboardData.purchaseDetails.length);

        dashCalculateKPIs();
        dashRenderCharts();
        dashRenderTables();

        console.log('✅ Dashboard complete!');
    } catch (err) {
        console.error('❌ Dashboard error:', err);
        alert('Error loading dashboard. Please check the console.');
    } finally {
        dashHideLoading();
    }
}

async function dashLoadInventory() {
    const res    = await fetch('/api/inventory/all/', {
        headers: { 'Content-Type': 'application/json', 'X-CSRFToken': dashGetCSRFToken() },
        credentials: 'same-origin'
    });
    const result = await res.json();
    dashboardData.inventory = result.success ? (result.data || []) : [];
}

async function dashLoadSales() {
    const res    = await fetch('/api/sales/', {
        headers: { 'Content-Type': 'application/json', 'X-CSRFToken': dashGetCSRFToken() },
        credentials: 'same-origin'
    });
    const result = await res.json();
    dashboardData.sales = result.success ? (result.data || []) : [];
}

async function dashLoadPurchases() {
    const res    = await fetch('/api/purchases/', {
        headers: { 'Content-Type': 'application/json', 'X-CSRFToken': dashGetCSRFToken() },
        credentials: 'same-origin'
    });
    const result = await res.json();
    dashboardData.purchases = result.success ? (result.data || []) : [];
}

async function dashLoadCustomers() {
    const res    = await fetch('/api/customers/', {
        headers: { 'Content-Type': 'application/json', 'X-CSRFToken': dashGetCSRFToken() },
        credentials: 'same-origin'
    });
    const result = await res.json();
    dashboardData.customers = result.success ? (result.data || []) : [];
}

async function dashLoadSuppliers() {
    const res    = await fetch('/api/suppliers/', {
        headers: { 'Content-Type': 'application/json', 'X-CSRFToken': dashGetCSRFToken() },
        credentials: 'same-origin'
    });
    const result = await res.json();
    dashboardData.suppliers = result.success ? (result.data || []) : [];
}

async function dashLoadSalesDetails() {
    try {
        const res    = await fetch('/api/dashboard/sales-details/', {
            headers: { 'Content-Type': 'application/json', 'X-CSRFToken': dashGetCSRFToken() },
            credentials: 'same-origin'
        });
        const result = await res.json();
        dashboardData.salesDetails = result.success ? (result.data || []) : [];
    } catch (err) {
        console.warn('⚠️ Sales details not available:', err);
        dashboardData.salesDetails = [];
    }
}

async function dashLoadPurchaseDetails() {
    try {
        const res    = await fetch('/api/dashboard/purchase-details/', {
            headers: { 'Content-Type': 'application/json', 'X-CSRFToken': dashGetCSRFToken() },
            credentials: 'same-origin'
        });
        const result = await res.json();
        dashboardData.purchaseDetails = result.success ? (result.data || []) : [];
    } catch (err) {
        console.warn('⚠️ Purchase details not available:', err);
        dashboardData.purchaseDetails = [];
    }
}


/* ============================================================
   KPI CALCULATIONS
   ============================================================ */
function dashCalculateKPIs() {

    /* 1. Inventory Cost Value */
    const inventoryCostValue = dashboardData.inventory.reduce((sum, item) =>
        sum + ((parseFloat(item.remainingQty) || 0) * (parseFloat(item.purchase_price) || 0)), 0);
    document.getElementById('inventoryCostValue').textContent = 'KSH ' + dashFormatNumber(inventoryCostValue);
    document.getElementById('inventoryCostChange').textContent = `${dashboardData.inventory.length} items | Cost basis`;

    /* 2. Potential Revenue */
    const potentialRevenue = dashboardData.inventory.reduce((sum, item) =>
        sum + ((parseFloat(item.remainingQty) || 0) * (parseFloat(item.sale_price) || 0)), 0);
    const potentialProfit  = potentialRevenue - inventoryCostValue;
    const potentialMargin  = inventoryCostValue > 0
        ? ((potentialProfit / inventoryCostValue) * 100).toFixed(1) : 0;
    document.getElementById('potentialRevenue').textContent = 'KSH ' + dashFormatNumber(potentialRevenue);
    const potProfitEl = document.getElementById('potentialProfit');
    potProfitEl.textContent  = `KSH ${dashFormatNumber(potentialProfit)} (${potentialMargin}% margin)`;
    potProfitEl.className    = potentialProfit >= 0 ? 'stat-change positive' : 'stat-change negative';

    /* 3. Total Sales */
    const totalSales = dashboardData.sales.reduce((sum, s) => sum + (parseFloat(s.total_amount) || 0), 0);
    document.getElementById('totalSales').textContent   = 'KSH ' + dashFormatNumber(totalSales);
    document.getElementById('salesChange').textContent  = `${dashboardData.sales.length} sales orders`;

    /* 4. Total Purchases */
    const totalPurchases = dashboardData.purchases.reduce((sum, p) => sum + (parseFloat(p.total_amount) || 0), 0);
    document.getElementById('totalPurchases').textContent  = 'KSH ' + dashFormatNumber(totalPurchases);
    document.getElementById('purchasesChange').textContent = `${dashboardData.purchases.length} purchase orders`;

    /* 5. Net Profit */
    const netProfit    = totalSales - totalPurchases;
    const profitMargin = totalSales > 0 ? ((netProfit / totalSales) * 100).toFixed(1) : 0;
    document.getElementById('netProfit').textContent = 'KSH ' + dashFormatNumber(netProfit);
    const profitEl = document.getElementById('profitMargin');
    profitEl.textContent = `Margin: ${profitMargin}%`;
    profitEl.className   = netProfit >= 0 ? 'stat-change positive' : 'stat-change negative';

    /* 6. Total Receivables */
    const totalReceivables = dashboardData.customers.reduce((sum, c) => sum + (parseFloat(c.balance) || 0), 0);
    document.getElementById('totalReceivables').textContent = 'KSH ' + dashFormatNumber(totalReceivables);
    document.getElementById('receivablesChange').textContent = `From ${dashboardData.customers.length} customers`;

    /* 7. Total Payables */
    const totalPayables = dashboardData.suppliers.reduce((sum, s) => sum + (parseFloat(s.balance) || 0), 0);
    document.getElementById('totalPayables').textContent = 'KSH ' + dashFormatNumber(totalPayables);
    document.getElementById('payablesChange').textContent = `To ${dashboardData.suppliers.length} suppliers`;

    /* 8. Reorder Required Items */
    const reorderItems = dashboardData.inventory.filter(item => item.reorderRequired === 'YES').length;
    document.getElementById('reorderItems').textContent = reorderItems;
}


/* ============================================================
   CHARTS
   ============================================================ */
function dashRenderCharts() {
    console.log('📊 Rendering charts...');
    dashRenderSalesTrendChart();
    dashRenderSalesLocationChart();
    dashRenderPurchasesLocationChart();
    dashRenderPaymentStatusChart();
    dashRenderTopCustomersChart();
    console.log('✅ Base charts rendered');
}

/* Sales Trend (Line) */
function dashRenderSalesTrendChart() {
    const ctx = document.getElementById('salesTrendChart');
    if (dashCharts.salesTrend) dashCharts.salesTrend.destroy();

    const monthlySales = {};
    dashboardData.sales.forEach(sale => {
        const date      = dashParseDate(sale.date);
        const monthYear = `${date.getMonth() + 1}/${date.getFullYear()}`;
        if (!monthlySales[monthYear]) monthlySales[monthYear] = { date, amount: 0 };
        monthlySales[monthYear].amount += parseFloat(sale.total_amount) || 0;
    });

    const sortedMonths = Object.keys(monthlySales).sort((a, b) => monthlySales[a].date - monthlySales[b].date);
    const months       = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const labels       = sortedMonths.map(k => {
        const d = monthlySales[k].date;
        return `${months[d.getMonth()]} ${d.getFullYear()}`;
    });
    const data = sortedMonths.map(k => monthlySales[k].amount);

    dashCharts.salesTrend = new Chart(ctx, {
        type: 'line',
        data: {
            labels,
            datasets: [{
                label: 'Sales',
                data,
                backgroundColor: 'rgba(2, 22, 64, 0.2)',
                borderColor: '#021640',
                borderWidth: 2,
                fill: true,
                tension: 0.4,
                pointBackgroundColor: '#021640',
                pointBorderColor: '#021640',
                pointRadius: 2,
                pointHoverRadius: 5
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: { callbacks: { label: ctx => 'KSH ' + dashFormatNumber(ctx.parsed.y) } }
            },
            scales: {
                y: { beginAtZero: true, ticks: { callback: v => dashFormatToThousands(v) } }
            }
        }
    });
}

/* Sales by Location (Bar) */
function dashRenderSalesLocationChart() {
    const ctx = document.getElementById('salesLocationChart');
    if (dashCharts.salesLocation) dashCharts.salesLocation.destroy();

    const locationSales = {};
    dashboardData.sales.forEach(sale => {
        const county = sale.county || 'Unknown';
        locationSales[county] = (locationSales[county] || 0) + (parseFloat(sale.total_amount) || 0);
    });

    dashCharts.salesLocation = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: Object.keys(locationSales),
            datasets: [{
                label: 'Sales Amount',
                data: Object.values(locationSales),
                backgroundColor: 'rgba(26, 188, 156, 0.7)',
                borderColor: 'rgba(26, 188, 156, 1)',
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: { callbacks: { label: ctx => 'KSH ' + dashFormatNumber(ctx.parsed.y) } }
            },
            scales: { y: { beginAtZero: true, ticks: { callback: v => dashFormatToThousands(v) } } }
        }
    });
}

/* Purchases by Location (Bar) */
function dashRenderPurchasesLocationChart() {
    const ctx = document.getElementById('purchasesLocationChart');
    if (dashCharts.purchasesLocation) dashCharts.purchasesLocation.destroy();

    const locationPurchases = {};
    dashboardData.purchases.forEach(purchase => {
        const county = purchase.county || 'Unknown';
        locationPurchases[county] = (locationPurchases[county] || 0) + (parseFloat(purchase.total_amount) || 0);
    });

    dashCharts.purchasesLocation = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: Object.keys(locationPurchases),
            datasets: [{
                label: 'Purchase Amount',
                data: Object.values(locationPurchases),
                backgroundColor: 'rgba(52, 152, 219, 0.7)',
                borderColor: 'rgba(52, 152, 219, 1)',
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: { callbacks: { label: ctx => 'KSH ' + dashFormatNumber(ctx.parsed.y) } }
            },
            scales: { y: { beginAtZero: true, ticks: { callback: v => dashFormatToThousands(v) } } }
        }
    });
}

/* Payment Status (Pie) */
function dashRenderPaymentStatusChart() {
    const ctx = document.getElementById('paymentStatusChart');
    if (dashCharts.paymentStatus) dashCharts.paymentStatus.destroy();

    const statusCounts = { completed: 0, pending: 0, partial: 0 };

    dashboardData.purchases.forEach(po => {
        const status = (po.payment_status || '').toLowerCase();
        if      (status === 'completed')         statusCounts.completed++;
        else if (status === 'pending')           statusCounts.pending++;
        else if (status.includes('partial'))     statusCounts.partial++;
    });

    dashboardData.sales.forEach(so => {
        const status = (so.receipt_status || '').toLowerCase();
        if      (status === 'completed')         statusCounts.completed++;
        else if (status === 'pending')           statusCounts.pending++;
        else if (status.includes('partial'))     statusCounts.partial++;
    });

    dashCharts.paymentStatus = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: ['Completed', 'Partial Payment', 'Pending'],
            datasets: [{
                data: [statusCounts.completed, statusCounts.partial, statusCounts.pending],
                backgroundColor: [
                    'rgba(46, 204, 113, 0.8)',
                    'rgba(52, 152, 219, 0.8)',
                    'rgba(243, 156, 18, 0.8)'
                ],
                borderWidth: 2,
                borderColor: '#ffffff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { position: 'bottom' } }
        }
    });
}

/* Top 5 Customers (Horizontal Bar) */
function dashRenderTopCustomersChart() {
    const ctx = document.getElementById('topCustomersChart');
    if (dashCharts.topCustomers) dashCharts.topCustomers.destroy();

    const top5 = [...dashboardData.customers]
        .sort((a, b) => (parseFloat(b.sales) || 0) - (parseFloat(a.sales) || 0))
        .slice(0, 5);

    dashCharts.topCustomers = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: top5.map(c => c.name || 'Unknown'),
            datasets: [{
                label: 'Total Sales',
                data: top5.map(c => parseFloat(c.sales) || 0),
                backgroundColor: 'rgba(155, 89, 182, 0.7)',
                borderColor: 'rgba(155, 89, 182, 1)',
                borderWidth: 2
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: { callbacks: { label: ctx => 'KSH ' + dashFormatNumber(ctx.parsed.x) } }
            },
            scales: { x: { beginAtZero: true, ticks: { callback: v => dashFormatToThousands(v) } } }
        }
    });
}

/* Sales by Category (Doughnut) — uses salesDetails */
function dashRenderSalesCategoryChart() {
    const ctx = document.getElementById('salesCategoryChart');
    if (dashCharts.salesCategory) dashCharts.salesCategory.destroy();

    const categorySales = {};
    dashboardData.salesDetails.forEach(detail => {
        const category = detail.item_category || 'Unknown';
        categorySales[category] = (categorySales[category] || 0) + (parseFloat(detail.total_sales_price) || 0);
    });

    const sorted = Object.entries(categorySales).sort((a, b) => b[1] - a[1]).slice(0, 6);

    dashCharts.salesCategory = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: sorted.map(c => c[0]),
            datasets: [{
                data: sorted.map(c => c[1]),
                backgroundColor: [
                    'rgba(26, 188, 156, 0.8)',
                    'rgba(52, 152, 219, 0.8)',
                    'rgba(155, 89, 182, 0.8)',
                    'rgba(230, 126, 34, 0.8)',
                    'rgba(231, 76, 60, 0.8)',
                    'rgba(243, 156, 18, 0.8)'
                ],
                borderWidth: 2,
                borderColor: '#ffffff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'bottom' },
                tooltip: {
                    callbacks: {
                        label: ctx => {
                            const total = ctx.dataset.data.reduce((s, v) => s + v, 0);
                            const pct   = ((ctx.parsed / total) * 100).toFixed(1);
                            return `${ctx.label}: KSH ${dashFormatNumber(ctx.parsed)} (${pct}%)`;
                        }
                    }
                }
            }
        }
    });
}

/* Purchases by Category (Doughnut) — uses purchaseDetails */
function dashRenderPurchasesCategoryChart() {
    const ctx = document.getElementById('purchasesCategoryChart');
    if (dashCharts.purchasesCategory) dashCharts.purchasesCategory.destroy();

    const categoryPurchases = {};
    dashboardData.purchaseDetails.forEach(detail => {
        const category = detail.item_category || 'Unknown';
        categoryPurchases[category] = (categoryPurchases[category] || 0) + (parseFloat(detail.total_purchase_price) || 0);
    });

    const sorted = Object.entries(categoryPurchases).sort((a, b) => b[1] - a[1]).slice(0, 6);

    dashCharts.purchasesCategory = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: sorted.map(c => c[0]),
            datasets: [{
                data: sorted.map(c => c[1]),
                backgroundColor: [
                    'rgba(52, 152, 219, 0.8)',
                    'rgba(26, 188, 156, 0.8)',
                    'rgba(230, 126, 34, 0.8)',
                    'rgba(155, 89, 182, 0.8)',
                    'rgba(243, 156, 18, 0.8)',
                    'rgba(231, 76, 60, 0.8)'
                ],
                borderWidth: 2,
                borderColor: '#ffffff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'bottom' },
                tooltip: {
                    callbacks: {
                        label: ctx => {
                            const total = ctx.dataset.data.reduce((s, v) => s + v, 0);
                            const pct   = ((ctx.parsed / total) * 100).toFixed(1);
                            return `${ctx.label}: KSH ${dashFormatNumber(ctx.parsed)} (${pct}%)`;
                        }
                    }
                }
            }
        }
    });
}


/* ============================================================
   ADDITIONAL KPIs — top selling item & top sales location
   These rely on salesDetails so run after those are loaded.
   ============================================================ */
function dashUpdateAdditionalKPIs() {
    /* Top Selling Item */
    const itemSales = {};
    dashboardData.salesDetails.forEach(detail => {
        const name = detail.item_name;
        if (!itemSales[name]) itemSales[name] = { qty: 0, revenue: 0, category: detail.item_category, type: detail.item_type };
        itemSales[name].qty     += parseInt(detail.quantity_sold)       || 0;
        itemSales[name].revenue += parseFloat(detail.total_sales_price) || 0;
    });

    const topItem = Object.entries(itemSales).sort((a, b) => b[1].qty - a[1].qty)[0];
    if (topItem) {
        const [itemName, data] = topItem;
        document.getElementById('topSellingItem').textContent  = itemName;
        document.getElementById('topItemCategory').textContent = `${data.category} | ${data.type}`;
    } else {
        document.getElementById('topSellingItem').textContent  = 'No Data';
        document.getElementById('topItemCategory').textContent = 'N/A';
    }

    /* Top Sales Location */
    const locationSales = {};
    dashboardData.sales.forEach(sale => {
        const county = sale.county || 'Unknown';
        locationSales[county] = (locationSales[county] || 0) + (parseFloat(sale.total_amount) || 0);
    });

    const topLocation = Object.entries(locationSales).sort((a, b) => b[1] - a[1])[0];
    if (topLocation) {
        const [county, amount] = topLocation;
        document.getElementById('topSalesLocation').textContent  = county;
        document.getElementById('topLocationAmount').textContent = `KSH ${dashFormatNumber(amount)}`;
    } else {
        document.getElementById('topSalesLocation').textContent  = 'No Data';
        document.getElementById('topLocationAmount').textContent = 'N/A';
    }
}


/* ============================================================
   TABLES
   ============================================================ */
function dashRenderTables() {
    dashRenderLowStockTable();
    dashRenderRecentSalesTable();
    dashRenderRecentPurchasesTable();
    dashUpdateAdditionalKPIs();
    dashRenderSalesCategoryChart();
    dashRenderPurchasesCategoryChart();
}

function dashRenderLowStockTable() {
    const tbody         = document.getElementById('lowStockTable');
    const lowStockItems = dashboardData.inventory
        .filter(item => item.reorderRequired === 'YES')
        .sort((a, b) => (a.remainingQty - a.reorderLevel) - (b.remainingQty - b.reorderLevel))
        .slice(0, 10);

    if (lowStockItems.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:30px; color:#2ecc71;">
            <i class="fas fa-check-circle" style="font-size:2rem; margin-bottom:10px; display:block;"></i>
            All items are adequately stocked!</td></tr>`;
        return;
    }

    tbody.innerHTML = lowStockItems.map(item => `
        <tr>
            <td>${item.id}</td>
            <td>${item.name}</td>
            <td>${item.category}</td>
            <td style="font-weight:600; color:${item.remainingQty === 0 ? '#e74c3c' : '#f39c12'};">${item.remainingQty}</td>
            <td>${item.reorderLevel}</td>
            <td><span class="status-badge reorder"><i class="fas fa-exclamation-triangle"></i> REORDER</span></td>
        </tr>
    `).join('');
}

function dashRenderRecentSalesTable() {
    const tbody       = document.getElementById('recentSalesTable');
    const recentSales = [...dashboardData.sales]
        .sort((a, b) => dashParseDate(b.date) - dashParseDate(a.date))
        .slice(0, 10);

    if (recentSales.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:30px;">No sales orders yet</td></tr>';
        return;
    }

    tbody.innerHTML = recentSales.map(sale => {
        const rClass = (sale.receipt_status  || '').toLowerCase().replace(/\s+/g, '-');
        const sClass = (sale.shipping_status || '').toLowerCase().replace(/\s+/g, '-');
        return `
            <tr>
                <td>${sale.so_id}</td>
                <td>${sale.date}</td>
                <td>${sale.customer_name}</td>
                <td>KSH ${dashFormatNumber(parseFloat(sale.total_amount) || 0)}</td>
                <td><span class="status-badge ${rClass}">${sale.receipt_status  || 'N/A'}</span></td>
                <td><span class="status-badge ${sClass}">${sale.shipping_status || 'N/A'}</span></td>
            </tr>
        `;
    }).join('');
}

function dashRenderRecentPurchasesTable() {
    const tbody           = document.getElementById('recentPurchasesTable');
    const recentPurchases = [...dashboardData.purchases]
        .sort((a, b) => dashParseDate(b.date) - dashParseDate(a.date))
        .slice(0, 10);

    if (recentPurchases.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:30px;">No purchase orders yet</td></tr>';
        return;
    }

    tbody.innerHTML = recentPurchases.map(purchase => {
        const pClass = (purchase.payment_status  || '').toLowerCase().replace(/\s+/g, '-');
        const sClass = (purchase.shipping_status || '').toLowerCase().replace(/\s+/g, '-');
        return `
            <tr>
                <td>${purchase.po_id}</td>
                <td>${purchase.date}</td>
                <td>${purchase.supplier_name}</td>
                <td>KSH ${dashFormatNumber(parseFloat(purchase.total_amount) || 0)}</td>
                <td><span class="status-badge ${pClass}">${purchase.payment_status  || 'N/A'}</span></td>
                <td><span class="status-badge ${sClass}">${purchase.shipping_status || 'N/A'}</span></td>
            </tr>
        `;
    }).join('');
}

console.log('✅ Dashboard.js complete');