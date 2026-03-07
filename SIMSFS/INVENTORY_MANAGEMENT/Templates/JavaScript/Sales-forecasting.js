console.log('📊 Sales Forecasting Module Loading...');

  /* ---- State ---- */
  let forecastData = { historical: [], salesDetails: [], inventory: [] };
  let fctCharts    = {};

  /* ---- CSRF ---- */
  function fctGetCSRFToken() {
    const metaTag = document.querySelector('meta[name="csrf-token"]');
    if (metaTag) return metaTag.getAttribute('content');
    const cookies = document.cookie.split(';');
    for (let c of cookies) {
      const [name, value] = c.trim().split('=');
      if (name === 'csrftoken') return value;
    }
    return null;
  }

  /* ---- Utilities ---- */
  function formatNumber(num) {
    if (isNaN(num)) return '0.00';
    return parseFloat(num).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }

  function parseDate(dateStr) {
    if (!dateStr) return new Date();
    // Handles DD/MM/YYYY and YYYY-MM-DD
    if (dateStr.includes('/')) {
      const [day, month, year] = dateStr.split('/');
      return new Date(year, month - 1, day);
    }
    return new Date(dateStr);
  }

  function fctShowLoading() {
    const el = document.getElementById('fctLoadingOverlay');
    if (el) el.style.display = 'flex';
  }
  function fctHideLoading() {
    const el = document.getElementById('fctLoadingOverlay');
    if (el) el.style.display = 'none';
  }

  /* ============================================================
     DATA LOADING
  ============================================================ */
  async function loadHistoricalData() {
    fctShowLoading();
    try {
      const headers = {
        'Content-Type': 'application/json',
        'X-CSRFToken': fctGetCSRFToken()
      };

      const [salesRes, detailsRes, inventoryRes] = await Promise.all([
        fetch('/api/sales/',                    { headers, credentials: 'same-origin' }),
        fetch('/api/dashboard/sales-details/',  { headers, credentials: 'same-origin' }),
        fetch('/api/inventory/all/',            { headers, credentials: 'same-origin' })
      ]);

      const salesResult     = await salesRes.json();
      const detailsResult   = await detailsRes.json();
      const inventoryResult = await inventoryRes.json();

      forecastData.historical   = salesResult.success     ? (salesResult.data     || []) : [];
      forecastData.salesDetails = detailsResult.success   ? (detailsResult.data   || []) : [];
      forecastData.inventory    = inventoryResult.success ? (inventoryResult.data  || []) : [];

      console.log('✅ Forecast data loaded:', {
        sales:     forecastData.historical.length,
        details:   forecastData.salesDetails.length,
        inventory: forecastData.inventory.length
      });

      if (forecastData.historical.length > 0) {
        generateForecast();
      } else {
        fctHideLoading();
        showNoDataMessage();
      }
    } catch (error) {
      console.error('❌ Error loading forecast data:', error);
      fctHideLoading();
      showNoDataMessage();
    }
  }

  /* ============================================================
     FORECAST GENERATION
  ============================================================ */
  function generateForecast() {
    if (forecastData.historical.length === 0) {
      alert('No historical sales data available for forecasting');
      return;
    }

    fctShowLoading();

    try {
      const forecastPeriod  = parseInt(document.getElementById('fctForecastPeriod').value);
      const historicalRange = document.getElementById('fctHistoricalRange').value;

      const filteredData  = filterHistoricalData(historicalRange);
      const monthlyData   = aggregateByMonth(filteredData);
      const forecast      = calculateForecast(monthlyData, forecastPeriod);
      const insights      = generateInsights(monthlyData, forecast);

      updateMetrics(forecast, monthlyData);
      renderCharts(monthlyData, forecast);
      displayInsights(insights);
      populateForecastTable(forecast);

      console.log('✅ Forecast generated successfully');
    } catch (error) {
      console.error('❌ Error generating forecast:', error);
      alert('Error generating forecast. Please try again.');
    } finally {
      fctHideLoading();
    }
  }

  function filterHistoricalData(range) {
    if (range === 'all') return forecastData.historical;
    const months = parseInt(range);
    const cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - months);
    return forecastData.historical.filter(sale => parseDate(sale.date) >= cutoff);
  }

  function aggregateByMonth(sales) {
    const monthly = {};
    sales.forEach(sale => {
      const date = parseDate(sale.date);
      const key  = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      if (!monthly[key]) {
        monthly[key] = {
          date:    new Date(date.getFullYear(), date.getMonth(), 1),
          revenue: 0,
          orders:  0
        };
      }
      monthly[key].revenue += parseFloat(sale.total_amount) || 0;
      monthly[key].orders  += 1;
    });
    return Object.values(monthly).sort((a, b) => a.date - b.date);
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
      const seasonalIndex = seasonality[nextDate.getMonth() % 12];
      const baseValue     = trendValue * seasonalIndex;
      const noise         = baseValue * 0.1;

      forecast.push({
        date:       nextDate,
        predicted:  Math.max(0, baseValue),
        lower:      Math.max(0, baseValue - noise),
        upper:      baseValue + noise,
        confidence: calculateConfidence(historical.length, i)
      });
    }
    return forecast;
  }

  function calculateLinearTrend(data) {
    const n     = data.length;
    const sumX  = (n * (n - 1)) / 2;
    const sumY  = data.reduce((a, b) => a + b, 0);
    const sumXY = data.reduce((sum, y, x) => sum + x * y, 0);
    const sumX2 = (n * (n - 1) * (2 * n - 1)) / 6;
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    return { slope, intercept: (sumY - slope * sumX) / n };
  }

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
      const avg       = avgPerMonth[month].reduce((a, b) => a + b, 0) / avgPerMonth[month].length;
      seasonal[month] = overall > 0 ? avg / overall : 1;
    });
    return seasonal;
  }

  function calculateConfidence(historicalLength, periodsAhead) {
    const base  = Math.min(historicalLength / 12, 1);
    const decay = Math.exp(-periodsAhead / 6);
    return Math.round(base * decay * 100);
  }

  function generateDefaultForecast(periods) {
    const forecast = [];
    const today    = new Date();
    for (let i = 1; i <= periods; i++) {
      const nextDate = new Date(today);
      nextDate.setMonth(nextDate.getMonth() + i);
      forecast.push({ date: nextDate, predicted: 0, lower: 0, upper: 0, confidence: 0 });
    }
    return forecast;
  }

  /* ============================================================
     METRICS
  ============================================================ */
  function updateMetrics(forecast, historical) {
    const nextPeriodSales = forecast[0]?.predicted || 0;
    document.getElementById('predictedSales').textContent      = 'KSH ' + formatNumber(nextPeriodSales);
    document.getElementById('predictionConfidence').textContent = `${forecast[0]?.confidence || 0}% confidence`;

    const growthRates = [];
    for (let i = 1; i < historical.length; i++) {
      const rate = ((historical[i].revenue - historical[i-1].revenue) / historical[i-1].revenue) * 100;
      if (isFinite(rate)) growthRates.push(rate);
    }
    const avgGrowth = growthRates.length > 0
      ? growthRates.reduce((a, b) => a + b, 0) / growthRates.length : 0;

    document.getElementById('growthRate').textContent  = avgGrowth.toFixed(1) + '%';
    document.getElementById('growthTrend').textContent = avgGrowth >= 0 ? 'Growing' : 'Declining';
    document.getElementById('growthTrend').className   = 'metric-change ' + (avgGrowth >= 0 ? 'positive' : 'negative');

    const avgMonthlySales   = historical.length > 0
      ? historical.reduce((sum, m) => sum + m.orders, 0) / historical.length : 0;
    const recommendedStock  = Math.ceil(avgMonthlySales * 1.5);
    document.getElementById('stockLevel').textContent = recommendedStock;
    document.getElementById('stockDays').textContent  = '~45 days supply';

    const peakMonth    = forecast.reduce((max, curr) => curr.predicted > max.predicted ? curr : max, forecast[0]);
    const monthNames   = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    document.getElementById('peakPeriod').textContent = monthNames[peakMonth.date.getMonth()] + ' ' + peakMonth.date.getFullYear();
    document.getElementById('peakValue').textContent  = 'KSH ' + formatNumber(peakMonth.predicted);

    const accuracy = historical.length >= 3 ? Math.min(95, 60 + (historical.length * 2)) : 50;
    document.getElementById('forecastAccuracy').textContent = accuracy + '%';
    document.getElementById('accuracyNote').textContent     = historical.length >= 6 ? 'High confidence' : 'Limited historical data';
  }

  /* ============================================================
     CHARTS
  ============================================================ */
  function renderCharts(historical, forecast) {
    renderForecastChart(historical, forecast);
    renderSeasonalityChart(historical);
    renderTrendChart(historical, forecast);
    renderTopProductsChart();
    renderCategoryChart();
  }

  function renderForecastChart(historical, forecast) {
    const ctx = document.getElementById('forecastChart');
    if (fctCharts.forecast) fctCharts.forecast.destroy();

    const mNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const hLabels = historical.map(m => mNames[m.date.getMonth()] + ' ' + m.date.getFullYear());
    const fLabels = forecast.map(f  => mNames[f.date.getMonth()]  + ' ' + f.date.getFullYear());

    fctCharts.forecast = new Chart(ctx, {
      type: 'line',
      data: {
        labels: [...hLabels, ...fLabels],
        datasets: [
          {
            label: 'Historical Sales',
            data: [...historical.map(m => m.revenue), ...new Array(forecast.length).fill(null)],
            borderColor: '#2c3e50', backgroundColor: 'rgba(44,62,80,0.1)',
            borderWidth: 3, fill: true, tension: 0.4, pointRadius: 4, pointHoverRadius: 6
          },
          {
            label: 'Forecasted Sales',
            data: [...new Array(historical.length).fill(null), ...forecast.map(f => f.predicted)],
            borderColor: '#1abc9c', backgroundColor: 'rgba(26,188,156,0.1)',
            borderWidth: 3, borderDash: [5, 5], fill: true, tension: 0.4, pointRadius: 4, pointHoverRadius: 6
          },
          {
            label: 'Upper Bound',
            data: [...new Array(historical.length).fill(null), ...forecast.map(f => f.upper)],
            borderColor: 'rgba(26,188,156,0.3)', borderWidth: 1, borderDash: [2, 2],
            fill: false, pointRadius: 0
          },
          {
            label: 'Lower Bound',
            data: [...new Array(historical.length).fill(null), ...forecast.map(f => f.lower)],
            borderColor: 'rgba(26,188,156,0.3)', borderWidth: 1, borderDash: [2, 2],
            fill: false, pointRadius: 0
          }
        ]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: true } },
        scales: { y: { beginAtZero: true, ticks: { callback: v => 'KSH ' + (v / 1000).toFixed(0) + 'K' } } }
      }
    });
  }

  function renderSeasonalityChart(historical) {
    const ctx = document.getElementById('seasonalityChart');
    if (fctCharts.seasonality) fctCharts.seasonality.destroy();

    const monthlyRevenue = new Array(12).fill(0);
    const monthlyCount   = new Array(12).fill(0);
    historical.forEach(m => {
      monthlyRevenue[m.date.getMonth()] += m.revenue;
      monthlyCount[m.date.getMonth()]   += 1;
    });
    const avgRevenue = monthlyRevenue.map((rev, i) => monthlyCount[i] > 0 ? rev / monthlyCount[i] : 0);

    fctCharts.seasonality = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'],
        datasets: [{
          label: 'Avg Monthly Revenue',
          data: avgRevenue,
          backgroundColor: 'rgba(52,152,219,0.7)',
          borderColor: 'rgba(52,152,219,1)',
          borderWidth: 2
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: { y: { beginAtZero: true, ticks: { callback: v => 'KSH ' + (v / 1000).toFixed(0) + 'K' } } }
      }
    });
  }

  function renderTrendChart(historical, forecast) {
    const ctx = document.getElementById('trendChart');
    if (fctCharts.trend) fctCharts.trend.destroy();

    const allData  = historical.map(m => m.revenue);
    const n        = allData.length;
    const trend    = calculateLinearTrend(allData);
    const trendLine = allData.map((_, i) => trend.slope * i + trend.intercept);

    const mNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const labels = historical.map(m => mNames[m.date.getMonth()] + ' ' + m.date.getFullYear());

    fctCharts.trend = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [
          { label: 'Actual Revenue', data: allData, borderColor: '#2c3e50', backgroundColor: 'rgba(44,62,80,0.1)', borderWidth: 2, fill: true, pointRadius: 3 },
          { label: 'Trend Line',     data: trendLine, borderColor: '#e74c3c', borderWidth: 2, borderDash: [5,5], fill: false, pointRadius: 0 }
        ]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: true } },
        scales: { y: { beginAtZero: true, ticks: { callback: v => 'KSH ' + (v / 1000).toFixed(0) + 'K' } } }
      }
    });
  }

  function renderTopProductsChart() {
    const ctx = document.getElementById('topProductsChart');
    if (fctCharts.topProducts) fctCharts.topProducts.destroy();

    const productSales = {};
    forecastData.salesDetails.forEach(detail => {
      const item = detail.item_name;
      productSales[item] = (productSales[item] || 0) + (parseFloat(detail.total_sales_price) || 0);
    });
    const top5 = Object.entries(productSales).sort((a, b) => b[1] - a[1]).slice(0, 5);

    fctCharts.topProducts = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: top5.map(p => p[0]),
        datasets: [{ label: 'Sales Revenue', data: top5.map(p => p[1]), backgroundColor: 'rgba(155,89,182,0.7)', borderColor: 'rgba(155,89,182,1)', borderWidth: 2 }]
      },
      options: {
        indexAxis: 'y', responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => 'KSH ' + formatNumber(ctx.parsed.x) } } }
      }
    });
  }

  function renderCategoryChart() {
    const ctx = document.getElementById('categoryChart');
    if (fctCharts.category) fctCharts.category.destroy();

    const catSales = {};
    forecastData.salesDetails.forEach(detail => {
      const cat = detail.item_category || 'Unknown';
      catSales[cat] = (catSales[cat] || 0) + (parseFloat(detail.total_sales_price) || 0);
    });

    fctCharts.category = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: Object.keys(catSales),
        datasets: [{
          data: Object.values(catSales),
          backgroundColor: ['rgba(26,188,156,0.8)','rgba(52,152,219,0.8)','rgba(155,89,182,0.8)','rgba(230,126,34,0.8)','rgba(231,76,60,0.8)','rgba(243,156,18,0.8)'],
          borderWidth: 2, borderColor: '#fff'
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom' },
          tooltip: { callbacks: { label: ctx => { const total = ctx.dataset.data.reduce((a,b) => a+b, 0); const pct = ((ctx.parsed / total) * 100).toFixed(1); return `${ctx.label}: KSH ${formatNumber(ctx.parsed)} (${pct}%)`; } } }
        }
      }
    });
  }

  /* ============================================================
     INSIGHTS
  ============================================================ */
  function generateInsights(historical, forecast) {
    const insights = [];
    const growthRates = [];
    for (let i = 1; i < historical.length; i++) {
      const rate = ((historical[i].revenue - historical[i-1].revenue) / historical[i-1].revenue) * 100;
      if (isFinite(rate)) growthRates.push(rate);
    }
    const avgGrowth = growthRates.length > 0 ? growthRates.reduce((a, b) => a + b, 0) / growthRates.length : 0;

    if (avgGrowth > 5) {
      insights.push({ type: 'success', title: 'Strong Growth Trajectory',
        text: `Sales are growing at ${avgGrowth.toFixed(1)}% per month. Consider increasing inventory to meet demand.` });
    } else if (avgGrowth < -5) {
      insights.push({ type: 'warning', title: 'Declining Sales Trend',
        text: `Sales are declining at ${Math.abs(avgGrowth).toFixed(1)}% per month. Review pricing and marketing.` });
    }

    const nextPrediction  = forecast[0]?.predicted || 0;
    const lastActual      = historical[historical.length - 1]?.revenue || 0;
    const expectedChange  = lastActual > 0 ? ((nextPrediction - lastActual) / lastActual) * 100 : 0;

    if (Math.abs(expectedChange) > 10) {
      insights.push({ type: 'info', title: 'Significant Change Expected',
        text: `Next month's sales are predicted to ${expectedChange > 0 ? 'increase' : 'decrease'} by ${Math.abs(expectedChange).toFixed(1)}%. Plan inventory accordingly.` });
    }

    const lowStockItems = forecastData.inventory.filter(item => item.reorderRequired === 'YES');
    if (lowStockItems.length > 0) {
      insights.push({ type: 'warning', title: 'Stock Replenishment Needed',
        text: `${lowStockItems.length} items are below reorder level. Replenish to avoid stockouts.` });
    }

    const peakMonth  = forecast.reduce((max, curr) => curr.predicted > max.predicted ? curr : max, forecast[0]);
    const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    insights.push({ type: 'info', title: 'Peak Sales Period Identified',
      text: `${monthNames[peakMonth.date.getMonth()]} is expected to be your peak sales month with KSH ${formatNumber(peakMonth.predicted)}.` });

    if (historical.length < 6) {
      insights.push({ type: 'warning', title: 'Limited Historical Data',
        text: `Only ${historical.length} month(s) of data available. Accuracy improves with 12+ months of data.` });
    }
    return insights;
  }

  function displayInsights(insights) {
    const container = document.getElementById('insightsContainer');
    if (insights.length === 0) {
      container.innerHTML = '<div class="fct-no-data-message"><p>No specific insights available</p></div>';
      return;
    }
    container.innerHTML = insights.map(ins => `
      <div class="insight-card ${ins.type}">
        <div class="insight-title">
          <i class="fas ${ins.type === 'success' ? 'fa-check-circle' : ins.type === 'warning' ? 'fa-exclamation-triangle' : 'fa-info-circle'}"></i>
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
    const tbody     = document.getElementById('forecastTableBody');
    const mNames    = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    tbody.innerHTML = forecast.map(f => {
      const badge  = f.confidence >= 70 ? 'high' : f.confidence >= 50 ? 'medium' : 'low';
      const action = f.confidence >= 70 ? 'Stock up' : f.confidence >= 50 ? 'Monitor closely' : 'Tentative planning';
      return `
        <tr>
          <td>${mNames[f.date.getMonth()]} ${f.date.getFullYear()}</td>
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
    document.querySelector('.metrics-grid').innerHTML = `
      <div class="fct-no-data-message" style="grid-column:1/-1;">
        <i class="fas fa-chart-line"></i>
        <h3>No Historical Sales Data</h3>
        <p>Start making sales to enable forecasting and analytics</p>
      </div>
    `;
  }

  /* ============================================================
     EXPORT
  ============================================================ */
  function exportForecast() {
    alert('Export functionality: Generate a CSV/PDF report with forecast data. Implement as a Django endpoint.');
  }

  /* ============================================================
     ENTRY POINT
     Called directly here — NOT inside DOMContentLoaded.
     DOMContentLoaded fired when Index.html loaded; it will never
     fire again when this partial is injected dynamically.
  ============================================================ */
  console.log('🚀 Initializing Sales Forecasting...');
  loadHistoricalData();