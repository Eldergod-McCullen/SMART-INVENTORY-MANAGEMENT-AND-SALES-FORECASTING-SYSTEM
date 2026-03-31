console.log('📊 Sales Forecasting Module Loading...');

/* ============================================================
   STATE
============================================================ */
let forecastData = {
  monthly:      [],   // [{month, total_revenue, order_count}]  — from /api/sales-forecasting/data/
  salesDetails: [],   // line-item detail rows — from /api/dashboard/sales-details/
  inventory:    []    // inventory rows        — from /api/inventory/all/
};
let fctCharts = {};


/* ============================================================
   CSRF HELPER
============================================================ */
function fctGetCSRFToken() {
  const meta = document.querySelector('meta[name="csrf-token"]');
  if (meta) return meta.getAttribute('content');
  for (const c of document.cookie.split(';')) {
    const [name, value] = c.trim().split('=');
    if (name === 'csrftoken') return value;
  }
  return null;
}


/* ============================================================
   UTILITIES
============================================================ */
function formatNumber(num) {
  if (isNaN(num)) return '0.00';
  return parseFloat(num).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/* Convert "YYYY-MM" string returned by the backend into a Date */
function parseYearMonth(str) {
  if (!str) return new Date();
  const [year, month] = str.split('-');
  return new Date(parseInt(year), parseInt(month) - 1, 1);
}

function fctShowLoading() {
  const el = document.getElementById('fctLoadingOverlay');
  if (el) el.style.display = 'flex';
}

function fctHideLoading() {
  const el = document.getElementById('fctLoadingOverlay');
  if (el) el.style.display = 'none';
}

const MONTH_NAMES_SHORT = ['Jan','Feb','Mar','Apr','May','Jun',
                           'Jul','Aug','Sep','Oct','Nov','Dec'];
const MONTH_NAMES_LONG  = ['January','February','March','April','May','June',
                           'July','August','September','October','November','December'];


/* ============================================================
   DATA LOADING
============================================================ */
async function loadHistoricalData() {
  fctShowLoading();
  try {
    const headers = {
      'Content-Type': 'application/json',
      'X-CSRFToken':  fctGetCSRFToken()
    };
    const opts = { headers, credentials: 'same-origin' };

    /* Use the dedicated forecasting endpoint for monthly aggregates.
       The other two endpoints supply chart-level detail data.          */
    const range = document.getElementById('fctHistoricalRange').value;

    const [monthlyRes, detailsRes, inventoryRes] = await Promise.all([
      fetch(`/api/sales-forecasting/data/?range=${range}`, opts),
      fetch('/api/dashboard/sales-details/',               opts),
      fetch('/api/inventory/all/',                         opts)
    ]);

    const monthlyResult   = await monthlyRes.json();
    const detailsResult   = await detailsRes.json();
    const inventoryResult = await inventoryRes.json();

    forecastData.monthly      = monthlyResult.success   ? (monthlyResult.data   || []) : [];
    forecastData.salesDetails = detailsResult.success   ? (detailsResult.data   || []) : [];
    forecastData.inventory    = inventoryResult.success ? (inventoryResult.data  || []) : [];

    console.log('✅ Forecast data loaded:', {
      monthly:      forecastData.monthly.length,
      salesDetails: forecastData.salesDetails.length,
      inventory:    forecastData.inventory.length
    });

    /* Populate the filter dropdown based on analysis type */
    populateFilterDropdown();

    if (forecastData.monthly.length > 0) {
      generateForecast();
    } else {
      fctHideLoading();
      showNoDataMessage();
    }
  } catch (err) {
    console.error('❌ Error loading forecast data:', err);
    fctHideLoading();
    showNoDataMessage();
  }
}


/* ============================================================
   ANALYSIS TYPE — FILTER DROPDOWN
   When the user picks "By Category" or "By Item" we show an
   extra dropdown so they can narrow the forecast to one
   category or one item.
============================================================ */
function populateFilterDropdown() {
  const analysisType = document.getElementById('fctAnalysisType').value;
  const filterRow    = document.getElementById('fctFilterRow');
  const filterSelect = document.getElementById('fctFilterSelect');

  if (analysisType === 'overall') {
    filterRow.style.display = 'none';
    return;
  }

  filterRow.style.display = 'flex';
  filterSelect.innerHTML  = '';

  const addOption = (val, label) => {
    const opt   = document.createElement('option');
    opt.value   = val;
    opt.textContent = label;
    filterSelect.appendChild(opt);
  };

  if (analysisType === 'category') {
    const cats = [...new Set(forecastData.salesDetails.map(d => d.item_category || 'Unknown'))].sort();
    addOption('__all__', 'All Categories');
    cats.forEach(c => addOption(c, c));
  } else if (analysisType === 'item') {
    const items = [...new Set(forecastData.salesDetails.map(d => d.item_name || 'Unknown'))].sort();
    addOption('__all__', 'All Items');
    items.forEach(i => addOption(i, i));
  }
}

/* Wire up the analysisType dropdown so changing it refreshes the filter row */
document.addEventListener('DOMContentLoaded', () => {
  const sel = document.getElementById('fctAnalysisType');
  if (sel) sel.addEventListener('change', populateFilterDropdown);
});


/* ============================================================
   HELPER: Build monthly series from salesDetails for a
   specific category or item (when not using "overall" mode).
============================================================ */
function buildMonthlyFromDetails(analysisType, filterValue) {
  /* Filter the line-item detail rows */
  let rows = forecastData.salesDetails;

  if (filterValue && filterValue !== '__all__') {
    if (analysisType === 'category') {
      rows = rows.filter(d => (d.item_category || 'Unknown') === filterValue);
    } else if (analysisType === 'item') {
      rows = rows.filter(d => (d.item_name || 'Unknown') === filterValue);
    }
  }

  /* Apply historical range filter */
  const range  = document.getElementById('fctHistoricalRange').value;
  let cutoffMs = 0;
  if (range !== 'all') {
    const cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - parseInt(range));
    cutoffMs = cutoff.getTime();
  }

  /* Aggregate by month using the parent sales order date stored in forecastData.monthly.
     salesDetails doesn't carry a date, so we join via the overall monthly shape.
     Simplest reliable approach: aggregate total_sales_price by month key using
     forecastData.monthly dates as the reference frame.                            */

  /* Build a lookup: so_id → month key from the parent orders.
     Since salesDetails doesn't include dates directly, we rebuild from
     the pre-aggregated monthly data returned by the backend.
     We use the monthly revenue proportioned by detail rows for category/item.     */

  /* Practical approach — sum total_sales_price per month-equivalent bucket.
     We don't have a date on each detail row so we use the parent order dates
     that are already aggregated in forecastData.monthly.
     For category/item views we scale down the overall monthly series by the
     fraction of revenue that category/item represents in the whole dataset.       */

  const totalRevenue = forecastData.salesDetails.reduce(
    (sum, d) => sum + (parseFloat(d.total_sales_price) || 0), 0
  );
  const subsetRevenue = rows.reduce(
    (sum, d) => sum + (parseFloat(d.total_sales_price) || 0), 0
  );
  const fraction = totalRevenue > 0 ? subsetRevenue / totalRevenue : 1;

  /* Scale the overall monthly series by that fraction */
  return forecastData.monthly
    .filter(m => {
      if (!cutoffMs) return true;
      return parseYearMonth(m.month).getTime() >= cutoffMs;
    })
    .map(m => ({
      date:    parseYearMonth(m.month),
      revenue: m.total_revenue * fraction,
      orders:  m.order_count
    }));
}


/* ============================================================
   FORECAST GENERATION — ENTRY POINT
============================================================ */
function generateForecast() {
  if (forecastData.monthly.length === 0) {
    alert('No historical sales data available for forecasting.');
    return;
  }

  fctShowLoading();

  try {
    const forecastPeriod = parseInt(document.getElementById('fctForecastPeriod').value);
    const analysisType   = document.getElementById('fctAnalysisType').value;
    const filterValue    = document.getElementById('fctFilterSelect')
                             ? document.getElementById('fctFilterSelect').value
                             : '__all__';
    const range          = document.getElementById('fctHistoricalRange').value;

    /* Build the historical monthly series to forecast from */
    let historical;
    if (analysisType === 'overall') {
      /* Use the backend-aggregated monthly data directly */
      let cutoffMs = 0;
      if (range !== 'all') {
        const cutoff = new Date();
        cutoff.setMonth(cutoff.getMonth() - parseInt(range));
        cutoffMs = cutoff.getTime();
      }
      historical = forecastData.monthly
        .filter(m => {
          if (!cutoffMs) return true;
          return parseYearMonth(m.month).getTime() >= cutoffMs;
        })
        .map(m => ({
          date:    parseYearMonth(m.month),
          revenue: m.total_revenue,
          orders:  m.order_count
        }));
    } else {
      historical = buildMonthlyFromDetails(analysisType, filterValue);
    }

    /* Update the forecast chart subtitle */
    const subtitleEl = document.getElementById('forecastChartSubtitle');
    if (subtitleEl) {
      const label = analysisType === 'overall' ? 'Overall Sales'
                  : analysisType === 'category' ? `Category: ${filterValue === '__all__' ? 'All' : filterValue}`
                  : `Item: ${filterValue === '__all__' ? 'All' : filterValue}`;
      subtitleEl.textContent = `Predicted sales with confidence intervals — ${label}`;
    }

    if (historical.length < 1) {
      alert('No data available for the selected filter and range.');
      fctHideLoading();
      return;
    }

    const forecast = calculateForecast(historical, forecastPeriod);
    const insights = generateInsights(historical, forecast);

    updateMetrics(forecast, historical);
    renderCharts(historical, forecast);
    displayInsights(insights);
    populateForecastTable(forecast);

    console.log('✅ Forecast generated successfully');
  } catch (err) {
    console.error('❌ Error generating forecast:', err);
    alert('Error generating forecast. Please try again.');
  } finally {
    fctHideLoading();
  }
}


/* ============================================================
   FORECASTING ALGORITHMS
============================================================ */
function calculateForecast(historical, periods) {
  if (historical.length < 2) return generateDefaultForecast(periods);

  const revenues    = historical.map(m => m.revenue);
  const trend       = calculateLinearTrend(revenues);
  const seasonality = calculateSeasonality(revenues);
  const forecast    = [];
  const lastDate    = historical[historical.length - 1].date;

  for (let i = 1; i <= periods; i++) {
    const nextDate = new Date(lastDate);
    nextDate.setMonth(nextDate.getMonth() + i);

    const trendValue    = trend.slope * (historical.length + i) + trend.intercept;
    const seasonalIndex = seasonality[nextDate.getMonth()];
    const baseValue     = Math.max(0, trendValue * seasonalIndex);
    const noise         = baseValue * 0.10;                        /* ±10 % band */

    forecast.push({
      date:       nextDate,
      predicted:  baseValue,
      lower:      Math.max(0, baseValue - noise),
      upper:      baseValue + noise,
      confidence: calculateConfidence(historical.length, i)
    });
  }
  return forecast;
}

/* Ordinary Least Squares linear trend */
function calculateLinearTrend(data) {
  const n    = data.length;
  const sumX = (n * (n - 1)) / 2;
  const sumY = data.reduce((a, b) => a + b, 0);
  const sumXY = data.reduce((sum, y, x) => sum + x * y, 0);
  const sumX2 = (n * (n - 1) * (2 * n - 1)) / 6;
  const denom  = n * sumX2 - sumX * sumX;
  const slope  = denom !== 0 ? (n * sumXY - sumX * sumY) / denom : 0;
  return { slope, intercept: (sumY - slope * sumX) / n };
}

/* Seasonal index per calendar month (0–11) */
function calculateSeasonality(data) {
  const seasonal = new Array(12).fill(1);
  if (data.length < 12) return seasonal;

  const avgPerMonth = {};
  const overall     = data.reduce((a, b) => a + b, 0) / data.length;

  data.forEach((value, i) => {
    const month = i % 12;
    if (!avgPerMonth[month]) avgPerMonth[month] = [];
    avgPerMonth[month].push(value);
  });

  Object.keys(avgPerMonth).forEach(month => {
    const avg        = avgPerMonth[month].reduce((a, b) => a + b, 0) / avgPerMonth[month].length;
    seasonal[month]  = overall > 0 ? avg / overall : 1;
  });
  return seasonal;
}

/* Confidence decays exponentially as we forecast further ahead */
function calculateConfidence(historicalLength, periodsAhead) {
  const base  = Math.min(historicalLength / 12, 1);
  const decay = Math.exp(-periodsAhead / 6);
  return Math.round(base * decay * 100);
}

function generateDefaultForecast(periods) {
  const today    = new Date();
  const forecast = [];
  for (let i = 1; i <= periods; i++) {
    const next = new Date(today);
    next.setMonth(next.getMonth() + i);
    forecast.push({ date: next, predicted: 0, lower: 0, upper: 0, confidence: 0 });
  }
  return forecast;
}


/* ============================================================
   METRICS
============================================================ */
function updateMetrics(forecast, historical) {
  /* Predicted next period */
  const nextPeriodSales = forecast[0]?.predicted || 0;
  document.getElementById('predictedSales').textContent       = 'KSH ' + formatNumber(nextPeriodSales);
  document.getElementById('predictionConfidence').textContent = `${forecast[0]?.confidence || 0}% confidence`;

  /* Average growth rate */
  const growthRates = [];
  for (let i = 1; i < historical.length; i++) {
    const prev = historical[i - 1].revenue;
    if (prev > 0) {
      growthRates.push(((historical[i].revenue - prev) / prev) * 100);
    }
  }
  const avgGrowth = growthRates.length > 0
    ? growthRates.reduce((a, b) => a + b, 0) / growthRates.length
    : 0;

  document.getElementById('growthRate').textContent  = avgGrowth.toFixed(1) + '%';
  document.getElementById('growthTrend').textContent = avgGrowth >= 0 ? 'Growing' : 'Declining';
  document.getElementById('growthTrend').className   =
    'metric-change ' + (avgGrowth >= 0 ? 'positive' : 'negative');

  /* Recommended stock level — based on avg monthly orders */
  const avgOrders        = historical.length > 0
    ? historical.reduce((sum, m) => sum + m.orders, 0) / historical.length
    : 0;
  const recommendedStock = Math.ceil(avgOrders * 1.5);
  document.getElementById('stockLevel').textContent = recommendedStock;
  document.getElementById('stockDays').textContent  = '~45 days supply';

  /* Peak period */
  const peakMonth = forecast.reduce(
    (max, curr) => curr.predicted > max.predicted ? curr : max,
    forecast[0]
  );
  document.getElementById('peakPeriod').textContent =
    MONTH_NAMES_SHORT[peakMonth.date.getMonth()] + ' ' + peakMonth.date.getFullYear();
  document.getElementById('peakValue').textContent =
    'KSH ' + formatNumber(peakMonth.predicted);

  /* Accuracy estimate */
  const accuracy = historical.length >= 3 ? Math.min(95, 60 + (historical.length * 2)) : 50;
  document.getElementById('forecastAccuracy').textContent = accuracy + '%';
  document.getElementById('accuracyNote').textContent     =
    historical.length >= 6 ? 'High confidence' : 'Limited historical data';
}


/* ============================================================
   CHARTS
============================================================ */
function renderCharts(historical, forecast) {
  renderForecastChart(historical, forecast);
  renderSeasonalityChart(historical);
  renderTrendChart(historical);
  renderTopProductsChart();
  renderCategoryChart();
}

/* Chart 1 — Forecast vs Historical */
function renderForecastChart(historical, forecast) {
  const ctx = document.getElementById('forecastChart');
  if (!ctx) return;
  if (fctCharts.forecast) fctCharts.forecast.destroy();

  const hLabels = historical.map(m =>
    MONTH_NAMES_SHORT[m.date.getMonth()] + ' ' + m.date.getFullYear());
  const fLabels = forecast.map(f =>
    MONTH_NAMES_SHORT[f.date.getMonth()] + ' ' + f.date.getFullYear());

  fctCharts.forecast = new Chart(ctx, {
    type: 'line',
    data: {
      labels: [...hLabels, ...fLabels],
      datasets: [
        {
          label:           'Historical Sales',
          data:            [...historical.map(m => m.revenue), ...new Array(forecast.length).fill(null)],
          borderColor:     '#2c3e50',
          backgroundColor: 'rgba(44,62,80,0.1)',
          borderWidth:     3,
          fill:            true,
          tension:         0.4,
          pointRadius:     4,
          pointHoverRadius:6
        },
        {
          label:           'Forecasted Sales',
          data:            [...new Array(historical.length).fill(null), ...forecast.map(f => f.predicted)],
          borderColor:     '#1abc9c',
          backgroundColor: 'rgba(26,188,156,0.1)',
          borderWidth:     3,
          borderDash:      [5, 5],
          fill:            true,
          tension:         0.4,
          pointRadius:     4,
          pointHoverRadius:6
        },
        {
          label:       'Upper Bound',
          data:        [...new Array(historical.length).fill(null), ...forecast.map(f => f.upper)],
          borderColor: 'rgba(26,188,156,0.35)',
          borderWidth: 1,
          borderDash:  [2, 2],
          fill:        false,
          pointRadius: 0
        },
        {
          label:       'Lower Bound',
          data:        [...new Array(historical.length).fill(null), ...forecast.map(f => f.lower)],
          borderColor: 'rgba(26,188,156,0.35)',
          borderWidth: 1,
          borderDash:  [2, 2],
          fill:        false,
          pointRadius: 0
        }
      ]
    },
    options: {
      responsive:          true,
      maintainAspectRatio: false,
      plugins: { legend: { display: true } },
      scales:  {
        y: {
          beginAtZero: true,
          ticks: { callback: v => 'KSH ' + (v / 1000).toFixed(0) + 'K' }
        }
      }
    }
  });
}

/* Chart 2 — Seasonality */
function renderSeasonalityChart(historical) {
  const ctx = document.getElementById('seasonalityChart');
  if (!ctx) return;
  if (fctCharts.seasonality) fctCharts.seasonality.destroy();

  const monthlyRevenue = new Array(12).fill(0);
  const monthlyCount   = new Array(12).fill(0);
  historical.forEach(m => {
    monthlyRevenue[m.date.getMonth()] += m.revenue;
    monthlyCount[m.date.getMonth()]   += 1;
  });
  const avgRevenue = monthlyRevenue.map((rev, i) =>
    monthlyCount[i] > 0 ? rev / monthlyCount[i] : 0
  );

  fctCharts.seasonality = new Chart(ctx, {
    type: 'bar',
    data: {
      labels:   MONTH_NAMES_SHORT,
      datasets: [{
        label:           'Avg Monthly Revenue',
        data:            avgRevenue,
        backgroundColor: 'rgba(52,152,219,0.7)',
        borderColor:     'rgba(52,152,219,1)',
        borderWidth:     2
      }]
    },
    options: {
      responsive:          true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales:  {
        y: {
          beginAtZero: true,
          ticks: { callback: v => 'KSH ' + (v / 1000).toFixed(0) + 'K' }
        }
      }
    }
  });
}

/* Chart 3 — Trend line */
function renderTrendChart(historical) {
  const ctx = document.getElementById('trendChart');
  if (!ctx) return;
  if (fctCharts.trend) fctCharts.trend.destroy();

  const allData   = historical.map(m => m.revenue);
  const trend     = calculateLinearTrend(allData);
  const trendLine = allData.map((_, i) => Math.max(0, trend.slope * i + trend.intercept));
  const labels    = historical.map(m =>
    MONTH_NAMES_SHORT[m.date.getMonth()] + ' ' + m.date.getFullYear()
  );

  fctCharts.trend = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label:           'Actual Revenue',
          data:            allData,
          borderColor:     '#2c3e50',
          backgroundColor: 'rgba(44,62,80,0.1)',
          borderWidth:     2,
          fill:            true,
          tension:         0.3,
          pointRadius:     3
        },
        {
          label:       'Trend Line',
          data:        trendLine,
          borderColor: '#e74c3c',
          borderWidth: 2,
          borderDash:  [5, 5],
          fill:        false,
          pointRadius: 0
        }
      ]
    },
    options: {
      responsive:          true,
      maintainAspectRatio: false,
      plugins: { legend: { display: true } },
      scales:  {
        y: {
          beginAtZero: true,
          ticks: { callback: v => 'KSH ' + (v / 1000).toFixed(0) + 'K' }
        }
      }
    }
  });
}

/* Chart 4 — Top 5 products by total revenue */
function renderTopProductsChart() {
  const ctx = document.getElementById('topProductsChart');
  if (!ctx) return;
  if (fctCharts.topProducts) fctCharts.topProducts.destroy();

  const productSales = {};
  forecastData.salesDetails.forEach(detail => {
    const item = detail.item_name || 'Unknown';
    productSales[item] = (productSales[item] || 0) + (parseFloat(detail.total_sales_price) || 0);
  });

  const top5 = Object.entries(productSales)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  if (top5.length === 0) {
    ctx.parentElement.innerHTML =
      '<p style="text-align:center;color:#7f8c8d;padding:20px;">No product data available</p>';
    return;
  }

  fctCharts.topProducts = new Chart(ctx, {
    type: 'bar',
    data: {
      labels:   top5.map(p => p[0]),
      datasets: [{
        label:           'Sales Revenue',
        data:            top5.map(p => p[1]),
        backgroundColor: 'rgba(155,89,182,0.7)',
        borderColor:     'rgba(155,89,182,1)',
        borderWidth:     2
      }]
    },
    options: {
      indexAxis:           'y',
      responsive:          true,
      maintainAspectRatio: false,
      plugins: {
        legend:  { display: false },
        tooltip: { callbacks: { label: ctx => 'KSH ' + formatNumber(ctx.parsed.x) } }
      },
      scales: {
        x: {
          beginAtZero: true,
          ticks: { callback: v => 'KSH ' + (v / 1000).toFixed(0) + 'K' }
        }
      }
    }
  });
}

/* Chart 5 — Revenue by category */
function renderCategoryChart() {
  const ctx = document.getElementById('categoryChart');
  if (!ctx) return;
  if (fctCharts.category) fctCharts.category.destroy();

  const catSales = {};
  forecastData.salesDetails.forEach(detail => {
    const cat = detail.item_category || 'Unknown';
    catSales[cat] = (catSales[cat] || 0) + (parseFloat(detail.total_sales_price) || 0);
  });

  if (Object.keys(catSales).length === 0) {
    ctx.parentElement.innerHTML =
      '<p style="text-align:center;color:#7f8c8d;padding:20px;">No category data available</p>';
    return;
  }

  fctCharts.category = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels:   Object.keys(catSales),
      datasets: [{
        data:            Object.values(catSales),
        backgroundColor: [
          'rgba(26,188,156,0.8)',
          'rgba(52,152,219,0.8)',
          'rgba(155,89,182,0.8)',
          'rgba(230,126,34,0.8)',
          'rgba(231,76,60,0.8)',
          'rgba(243,156,18,0.8)'
        ],
        borderWidth: 2,
        borderColor: '#fff'
      }]
    },
    options: {
      responsive:          true,
      maintainAspectRatio: false,
      plugins: {
        legend:  { position: 'bottom' },
        tooltip: {
          callbacks: {
            label: ctx => {
              const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
              const pct   = total > 0 ? ((ctx.parsed / total) * 100).toFixed(1) : '0.0';
              return `${ctx.label}: KSH ${formatNumber(ctx.parsed)} (${pct}%)`;
            }
          }
        }
      }
    }
  });
}


/* ============================================================
   INSIGHTS
============================================================ */
function generateInsights(historical, forecast) {
  const insights = [];

  /* Growth trend */
  const growthRates = [];
  for (let i = 1; i < historical.length; i++) {
    const prev = historical[i - 1].revenue;
    if (prev > 0) growthRates.push(((historical[i].revenue - prev) / prev) * 100);
  }
  const avgGrowth = growthRates.length > 0
    ? growthRates.reduce((a, b) => a + b, 0) / growthRates.length
    : 0;

  if (avgGrowth > 5) {
    insights.push({
      type:  'success',
      title: 'Strong Growth Trajectory',
      text:  `Sales are growing at ${avgGrowth.toFixed(1)}% per month on average. ` +
             `Consider increasing stock levels to meet rising demand.`
    });
  } else if (avgGrowth < -5) {
    insights.push({
      type:  'warning',
      title: 'Declining Sales Trend',
      text:  `Sales are declining at ${Math.abs(avgGrowth).toFixed(1)}% per month. ` +
             `Review pricing strategy and marketing campaigns.`
    });
  } else {
    insights.push({
      type:  'info',
      title: 'Stable Sales Pattern',
      text:  `Sales are relatively stable with an average monthly change of ${avgGrowth.toFixed(1)}%.`
    });
  }

  /* Expected change next month */
  const nextPrediction = forecast[0]?.predicted || 0;
  const lastActual     = historical[historical.length - 1]?.revenue || 0;
  if (lastActual > 0) {
    const expectedChange = ((nextPrediction - lastActual) / lastActual) * 100;
    if (Math.abs(expectedChange) > 10) {
      insights.push({
        type:  'info',
        title: 'Significant Change Expected',
        text:  `Next month's sales are predicted to ` +
               `${expectedChange > 0 ? 'increase' : 'decrease'} by ` +
               `${Math.abs(expectedChange).toFixed(1)}%. Plan your inventory accordingly.`
      });
    }
  }

  /* Low-stock warning */
  const lowStockItems = forecastData.inventory.filter(item => item.reorderRequired === 'YES');
  if (lowStockItems.length > 0) {
    insights.push({
      type:  'warning',
      title: 'Stock Replenishment Needed',
      text:  `${lowStockItems.length} item(s) are currently below reorder level. ` +
             `Replenish stock to avoid sales disruption.`
    });
  }

  /* Peak forecast month */
  const peak       = forecast.reduce(
    (max, curr) => curr.predicted > max.predicted ? curr : max, forecast[0]
  );
  insights.push({
    type:  'info',
    title: 'Peak Sales Period Identified',
    text:  `${MONTH_NAMES_LONG[peak.date.getMonth()]} ${peak.date.getFullYear()} ` +
           `is your projected peak month with KSH ${formatNumber(peak.predicted)} in sales.`
  });

  /* Limited data warning */
  if (historical.length < 6) {
    insights.push({
      type:  'warning',
      title: 'Limited Historical Data',
      text:  `Only ${historical.length} month(s) of data available for the selected range. ` +
             `Forecast accuracy improves significantly with 12 or more months of data.`
    });
  }

  return insights;
}

function displayInsights(insights) {
  const container = document.getElementById('insightsContainer');
  if (!container) return;

  if (insights.length === 0) {
    container.innerHTML =
      '<div class="fct-no-data-message"><p>No specific insights available</p></div>';
    return;
  }

  const iconMap = { success: 'fa-check-circle', warning: 'fa-exclamation-triangle', info: 'fa-info-circle' };

  container.innerHTML = insights.map(ins => `
    <div class="insight-card ${ins.type}">
      <div class="insight-title">
        <i class="fas ${iconMap[ins.type] || 'fa-info-circle'}"></i>
        ${ins.title}
      </div>
      <div class="insight-text">${ins.text}</div>
    </div>
  `).join('');
}


/* ============================================================
   FORECAST TABLE
============================================================ */
function populateForecastTable(forecast) {
  const tbody  = document.getElementById('forecastTableBody');
  if (!tbody) return;

  tbody.innerHTML = forecast.map(f => {
    const badge  = f.confidence >= 70 ? 'high' : f.confidence >= 50 ? 'medium' : 'low';
    const action = f.confidence >= 70 ? 'Stock up'
                 : f.confidence >= 50 ? 'Monitor closely'
                 : 'Tentative planning only';
    return `
      <tr>
        <td>${MONTH_NAMES_SHORT[f.date.getMonth()]} ${f.date.getFullYear()}</td>
        <td>KSH ${formatNumber(f.predicted)}</td>
        <td>KSH ${formatNumber(f.lower)}</td>
        <td>KSH ${formatNumber(f.upper)}</td>
        <td><span class="accuracy-badge ${badge}">${f.confidence}%</span></td>
        <td>${action}</td>
      </tr>
    `;
  }).join('');
}


/* ============================================================
   NO DATA
============================================================ */
function showNoDataMessage() {
  const grid = document.querySelector('.metrics-grid');
  if (!grid) return;
  grid.innerHTML = `
    <div class="fct-no-data-message" style="grid-column:1/-1;">
      <i class="fas fa-chart-line"></i>
      <h3>No Historical Sales Data</h3>
      <p>Start recording sales to enable forecasting and analytics.</p>
    </div>
  `;
}


/* ============================================================
   EXPORT — POST rows to Django, receive CSV download
============================================================ */
async function exportForecast() {
  const tbody = document.getElementById('forecastTableBody');
  const rows  = [];

  tbody.querySelectorAll('tr').forEach(tr => {
    const cells = tr.querySelectorAll('td');
    if (cells.length < 6) return;     /* skip placeholder / colspan rows */

    const badgeEl = cells[4].querySelector('.accuracy-badge');
    rows.push({
      period:     cells[0].textContent.trim(),
      predicted:  cells[1].textContent.replace('KSH', '').replace(/,/g, '').trim(),
      lower:      cells[2].textContent.replace('KSH', '').replace(/,/g, '').trim(),
      upper:      cells[3].textContent.replace('KSH', '').replace(/,/g, '').trim(),
      confidence: badgeEl ? badgeEl.textContent.replace('%', '').trim() : '0',
      action:     cells[5].textContent.trim()
    });
  });

  if (rows.length === 0) {
    alert('Generate a forecast first before exporting.');
    return;
  }

  try {
    const response = await fetch('/api/sales-forecasting/export-csv/', {
      method:      'POST',
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRFToken':  fctGetCSRFToken()
      },
      body: JSON.stringify({ rows })
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      alert('Export failed: ' + (err.message || 'Unknown error'));
      return;
    }

    /* Trigger browser file download */
    const blob = await response.blob();
    const url  = window.URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = 'sales_forecast.csv';
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);

  } catch (err) {
    console.error('❌ Export error:', err);
    alert('Export failed. Please try again.');
  }
}

console.log('🚀 Initialising Sales Forecasting...');
loadHistoricalData();