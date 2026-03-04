/* ============================================================
   SALES-FORECASTING.JS
   Static JavaScript for the Sales Forecasting module.
   Loaded by Sales-forecasting.html partial template via:
       <script src="{% static 'js/Sales-forecasting.js' %}"></script>

   CHANGES FROM ORIGINAL:
   1. Removed document.addEventListener('DOMContentLoaded', ...)
      entirely. All setup now inside initSalesForecast() which
      is called at the very bottom of this file.

   2. All globally-exposed names prefixed with sf to prevent
      collisions with other modules in the shared global scope:
        forecastData            → sfForecastData
        charts                  → sfCharts
        getCSRFToken()          → sfGetCSRFToken()
        formatNumber()          → sfFormatNumber()
        parseDate()             → sfParseDate()
        showLoading()           → sfShowLoading()
        hideLoading()           → sfHideLoading()
        loadHistoricalData()    → sfLoadHistoricalData()
        generateForecast()      → sfGenerateForecast()
        filterHistoricalData()  → sfFilterHistoricalData()
        aggregateByMonth()      → sfAggregateByMonth()
        calculateForecast()     → sfCalculateForecast()
        calculateLinearTrend()  → sfCalculateLinearTrend()
        calculateSeasonality()  → sfCalculateSeasonality()
        calculateConfidence()   → sfCalculateConfidence()
        generateDefaultForecast()→ sfGenerateDefaultForecast()
        updateMetrics()         → sfUpdateMetrics()
        renderCharts()          → sfRenderCharts()
        renderForecastChart()   → sfRenderForecastChart()
        renderSeasonalityChart()→ sfRenderSeasonalityChart()
        renderTrendChart()      → sfRenderTrendChart()
        renderTopProductsChart()→ sfRenderTopProductsChart()
        renderCategoryChart()   → sfRenderCategoryChart()
        generateInsights()      → sfGenerateInsights()
        displayInsights()       → sfDisplayInsights()
        populateForecastTable() → sfPopulateForecastTable()
        showNoDataMessage()     → sfShowNoDataMessage()
        exportForecast()        → sfExportForecast()
        simulateScenario()      → sfSimulateScenario()

   3. Loading overlay id="loadingOverlay" → id="sfLoadingOverlay"
      class .loading-overlay → .sf-loading-overlay (in CSS)
      Toggled via classList.add/remove('active').

   4. onclick="" attributes in the HTML updated to use sf prefix:
        generateForecast()  → sfGenerateForecast()
        exportForecast()    → sfExportForecast()

   5. self-initialises at bottom of file — no separate inline
      <script>initSalesForecast();</script> needed in the HTML.
   ============================================================ */

console.log('📊 Sales-forecasting.js loading...');

/* ---- Global State ---- */
let sfForecastData = {
    historical: [],
    salesDetails: [],
    inventory: []
};

let sfCharts = {};


/* ---- CSRF Helper ---- */
function sfGetCSRFToken() {
    const metaTag = document.querySelector('meta[name="csrf-token"]');
    if (metaTag) return metaTag.getAttribute('content');
    const cookies = document.cookie.split(';');
    for (let cookie of cookies) {
        const [name, value] = cookie.trim().split('=');
        if (name === 'csrftoken') return decodeURIComponent(value);
    }
    return null;
}


/* ---- Helpers ---- */
function sfFormatNumber(num) {
    if (isNaN(num)) return '0.00';
    return num.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function sfParseDate(dateStr) {
    if (!dateStr) return new Date();
    const [day, month, year] = dateStr.split('/');
    return new Date(year, month - 1, day);
}


/* ---- Loading Overlay ---- */
function sfShowLoading() {
    document.getElementById('sfLoadingOverlay').classList.add('active');
}

function sfHideLoading() {
    document.getElementById('sfLoadingOverlay').classList.remove('active');
}


/* ============================================================
   ENTRY POINT
   ============================================================ */
function initSalesForecast() {
    console.log('✅ Sales Forecasting module initialised');
    sfLoadHistoricalData();
}


/* ---- Data Loading ---- */
async function sfLoadHistoricalData() {
    sfShowLoading();
    try {
        const [salesResponse, detailsResponse, inventoryResponse] = await Promise.all([
            fetch('/api/sales/', {
                headers: { 'Content-Type': 'application/json', 'X-CSRFToken': sfGetCSRFToken() },
                credentials: 'same-origin'
            }),
            fetch('/api/dashboard/sales-details/', {
                headers: { 'Content-Type': 'application/json', 'X-CSRFToken': sfGetCSRFToken() },
                credentials: 'same-origin'
            }),
            fetch('/api/inventory/all/', {
                headers: { 'Content-Type': 'application/json', 'X-CSRFToken': sfGetCSRFToken() },
                credentials: 'same-origin'
            })
        ]);

        const salesResult     = await salesResponse.json();
        const detailsResult   = await detailsResponse.json();
        const inventoryResult = await inventoryResponse.json();

        sfForecastData.historical   = salesResult.success     ? (salesResult.data     || []) : [];
        sfForecastData.salesDetails = detailsResult.success   ? (detailsResult.data   || []) : [];
        sfForecastData.inventory    = inventoryResult.success ? (inventoryResult.data  || []) : [];

        console.log('✅ Data loaded:', {
            sales:     sfForecastData.historical.length,
            details:   sfForecastData.salesDetails.length,
            inventory: sfForecastData.inventory.length
        });

        if (sfForecastData.historical.length > 0) {
            sfGenerateForecast();
        } else {
            sfHideLoading();
            sfShowNoDataMessage();
        }
    } catch (error) {
        console.error('❌ Error loading data:', error);
        sfHideLoading();
        alert('Error loading historical data. Please check console.');
    }
}


/* ---- Generate Forecast ---- */
function sfGenerateForecast() {
    if (sfForecastData.historical.length === 0) {
        alert('No historical sales data available for forecasting');
        return;
    }

    sfShowLoading();

    try {
        const forecastPeriod  = parseInt(document.getElementById('forecastPeriod').value);
        const historicalRange = document.getElementById('historicalRange').value;

        const filteredData = sfFilterHistoricalData(historicalRange);
        const monthlyData  = sfAggregateByMonth(filteredData);
        const forecast     = sfCalculateForecast(monthlyData, forecastPeriod);
        const insights     = sfGenerateInsights(monthlyData, forecast);

        sfUpdateMetrics(forecast, monthlyData);
        sfRenderCharts(monthlyData, forecast);
        sfDisplayInsights(insights);
        sfPopulateForecastTable(forecast);

        console.log('✅ Forecast generated successfully');
    } catch (error) {
        console.error('❌ Error generating forecast:', error);
        alert('Error generating forecast. Please try again.');
    } finally {
        sfHideLoading();
    }
}


/* ---- Data Filtering & Aggregation ---- */
function sfFilterHistoricalData(range) {
    if (range === 'all') return sfForecastData.historical;

    const months     = parseInt(range);
    const cutoffDate = new Date();
    cutoffDate.setMonth(cutoffDate.getMonth() - months);

    return sfForecastData.historical.filter(sale => {
        const saleDate = sfParseDate(sale.date);
        return saleDate >= cutoffDate;
    });
}

function sfAggregateByMonth(sales) {
    const monthly = {};

    sales.forEach(sale => {
        const date = sfParseDate(sale.date);
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


/* ---- Forecast Calculation ---- */
function sfCalculateForecast(historical, periods) {
    if (historical.length < 2) {
        return sfGenerateDefaultForecast(periods);
    }

    const revenues    = historical.map(m => m.revenue);
    const trend       = sfCalculateLinearTrend(revenues);
    const seasonality = sfCalculateSeasonality(revenues);

    const forecast  = [];
    const lastDate  = historical[historical.length - 1].date;

    for (let i = 1; i <= periods; i++) {
        const nextDate = new Date(lastDate);
        nextDate.setMonth(nextDate.getMonth() + i);

        const trendValue    = trend.slope * (historical.length + i) + trend.intercept;
        const seasonalIndex = seasonality[(nextDate.getMonth()) % 12];
        const baseValue     = trendValue * seasonalIndex;
        const noise         = baseValue * 0.1;

        forecast.push({
            date:       nextDate,
            predicted:  Math.max(0, baseValue),
            lower:      Math.max(0, baseValue - noise),
            upper:      baseValue + noise,
            confidence: sfCalculateConfidence(historical.length, i)
        });
    }

    return forecast;
}

function sfCalculateLinearTrend(data) {
    const n      = data.length;
    const sumX   = (n * (n - 1)) / 2;
    const sumY   = data.reduce((a, b) => a + b, 0);
    const sumXY  = data.reduce((sum, y, x) => sum + x * y, 0);
    const sumX2  = (n * (n - 1) * (2 * n - 1)) / 6;

    const slope     = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    return { slope, intercept };
}

function sfCalculateSeasonality(data) {
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
        const avg         = avgPerMonth[month].reduce((a, b) => a + b, 0) / avgPerMonth[month].length;
        seasonal[month]   = overall > 0 ? avg / overall : 1;
    });

    return seasonal;
}

function sfCalculateConfidence(historicalLength, periodsAhead) {
    const base  = Math.min(historicalLength / 12, 1);
    const decay = Math.exp(-periodsAhead / 6);
    return Math.round(base * decay * 100);
}

function sfGenerateDefaultForecast(periods) {
    const forecast = [];
    const today    = new Date();

    for (let i = 1; i <= periods; i++) {
        const nextDate = new Date(today);
        nextDate.setMonth(nextDate.getMonth() + i);

        forecast.push({
            date:       nextDate,
            predicted:  0,
            lower:      0,
            upper:      0,
            confidence: 0
        });
    }

    return forecast;
}


/* ---- Metrics ---- */
function sfUpdateMetrics(forecast, historical) {
    const monthNames       = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const nextPeriodSales  = forecast[0]?.predicted || 0;

    document.getElementById('predictedSales').textContent      = 'KSH ' + sfFormatNumber(nextPeriodSales);
    document.getElementById('predictionConfidence').textContent = `${forecast[0]?.confidence || 0}% confidence`;

    const growthRates = [];
    for (let i = 1; i < historical.length; i++) {
        const rate = ((historical[i].revenue - historical[i - 1].revenue) / historical[i - 1].revenue) * 100;
        if (isFinite(rate)) growthRates.push(rate);
    }
    const avgGrowth = growthRates.length > 0
        ? growthRates.reduce((a, b) => a + b, 0) / growthRates.length
        : 0;

    document.getElementById('growthRate').textContent      = avgGrowth.toFixed(1) + '%';
    document.getElementById('growthTrend').textContent     = avgGrowth >= 0 ? 'Growing' : 'Declining';
    document.getElementById('growthTrend').className       = avgGrowth >= 0 ? 'metric-change positive' : 'metric-change negative';

    const avgMonthlySales  = historical.length > 0
        ? historical.reduce((sum, m) => sum + m.orders, 0) / historical.length
        : 0;
    const recommendedStock = Math.ceil(avgMonthlySales * 1.5);
    document.getElementById('stockLevel').textContent = recommendedStock;
    document.getElementById('stockDays').textContent  = '~45 days supply';

    const peakMonth = forecast.reduce((max, curr) =>
        curr.predicted > max.predicted ? curr : max, forecast[0]);
    document.getElementById('peakPeriod').textContent = monthNames[peakMonth.date.getMonth()] + ' ' + peakMonth.date.getFullYear();
    document.getElementById('peakValue').textContent  = 'KSH ' + sfFormatNumber(peakMonth.predicted);

    const accuracy = historical.length >= 3 ? Math.min(95, 60 + (historical.length * 2)) : 50;
    document.getElementById('forecastAccuracy').textContent = accuracy + '%';
    document.getElementById('accuracyNote').textContent     = historical.length >= 6 ? 'High confidence' : 'Limited historical data';
}


/* ---- Charts ---- */
function sfRenderCharts(historical, forecast) {
    sfRenderForecastChart(historical, forecast);
    sfRenderSeasonalityChart(historical);
    sfRenderTrendChart(historical, forecast);
    sfRenderTopProductsChart();
    sfRenderCategoryChart();
}

function sfRenderForecastChart(historical, forecast) {
    const ctx        = document.getElementById('forecastChart');
    if (sfCharts.forecast) sfCharts.forecast.destroy();

    const monthNames       = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const historicalLabels = historical.map(m => monthNames[m.date.getMonth()] + ' ' + m.date.getFullYear());
    const forecastLabels   = forecast.map(f => monthNames[f.date.getMonth()] + ' ' + f.date.getFullYear());

    sfCharts.forecast = new Chart(ctx, {
        type: 'line',
        data: {
            labels: [...historicalLabels, ...forecastLabels],
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
                    borderColor: 'rgba(26,188,156,0.3)',
                    borderWidth: 1,
                    borderDash:  [2, 2],
                    fill:        false,
                    pointRadius: 0
                },
                {
                    label:       'Lower Bound',
                    data:        [...new Array(historical.length).fill(null), ...forecast.map(f => f.lower)],
                    borderColor: 'rgba(26,188,156,0.3)',
                    borderWidth: 1,
                    borderDash:  [2, 2],
                    fill:        false,
                    pointRadius: 0
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: true, position: 'top' },
                tooltip: {
                    callbacks: {
                        label: (context) => context.dataset.label + ': KSH ' + sfFormatNumber(context.parsed.y)
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: { callback: (value) => 'KSH ' + (value / 1000).toFixed(0) + 'K' }
                }
            }
        }
    });
}

function sfRenderSeasonalityChart(historical) {
    const ctx = document.getElementById('seasonalityChart');
    if (sfCharts.seasonality) sfCharts.seasonality.destroy();

    const monthlyAvg = {};
    historical.forEach(m => {
        const month = m.date.getMonth();
        if (!monthlyAvg[month]) monthlyAvg[month] = { total: 0, count: 0 };
        monthlyAvg[month].total += m.revenue;
        monthlyAvg[month].count += 1;
    });

    const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const data       = monthNames.map((_, i) =>
        monthlyAvg[i] ? monthlyAvg[i].total / monthlyAvg[i].count : 0
    );

    sfCharts.seasonality = new Chart(ctx, {
        type: 'bar',
        data: {
            labels:   monthNames,
            datasets: [{
                label:           'Average Sales',
                data:            data,
                backgroundColor: 'rgba(52,152,219,0.7)',
                borderColor:     'rgba(52,152,219,1)',
                borderWidth:     2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend:  { display: false },
                tooltip: { callbacks: { label: (context) => 'KSH ' + sfFormatNumber(context.parsed.y) } }
            },
            scales: {
                y: { beginAtZero: true, ticks: { callback: (value) => 'KSH ' + (value / 1000).toFixed(0) + 'K' } }
            }
        }
    });
}

function sfRenderTrendChart(historical, forecast) {
    const ctx = document.getElementById('trendChart');
    if (sfCharts.trend) sfCharts.trend.destroy();

    const allData   = [...historical, ...forecast];
    const revenues  = historical.map(m => m.revenue);
    const trend     = sfCalculateLinearTrend(revenues);
    const trendLine = allData.map((_, i) => trend.slope * i + trend.intercept);

    const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const labels     = allData.map(m => monthNames[m.date.getMonth()]);

    sfCharts.trend = new Chart(ctx, {
        type: 'line',
        data: {
            labels:   labels,
            datasets: [
                {
                    label:       'Actual',
                    data:        [...revenues, ...new Array(forecast.length).fill(null)],
                    borderColor: '#2c3e50',
                    borderWidth: 2,
                    pointRadius: 3
                },
                {
                    label:       'Trend Line',
                    data:        trendLine,
                    borderColor: '#e74c3c',
                    borderWidth: 2,
                    borderDash:  [5, 5],
                    pointRadius: 0
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: true } },
            scales: {
                y: { beginAtZero: true, ticks: { callback: (value) => 'KSH ' + (value / 1000).toFixed(0) + 'K' } }
            }
        }
    });
}

function sfRenderTopProductsChart() {
    const ctx = document.getElementById('topProductsChart');
    if (sfCharts.topProducts) sfCharts.topProducts.destroy();

    const productSales = {};
    sfForecastData.salesDetails.forEach(detail => {
        const item         = detail.item_name;
        productSales[item] = (productSales[item] || 0) + (parseFloat(detail.total_sales_price) || 0);
    });

    const top5 = Object.entries(productSales)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);

    sfCharts.topProducts = new Chart(ctx, {
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
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend:  { display: false },
                tooltip: { callbacks: { label: (context) => 'KSH ' + sfFormatNumber(context.parsed.x) } }
            }
        }
    });
}

function sfRenderCategoryChart() {
    const ctx = document.getElementById('categoryChart');
    if (sfCharts.category) sfCharts.category.destroy();

    const categorySales = {};
    sfForecastData.salesDetails.forEach(detail => {
        const cat           = detail.item_category || 'Unknown';
        categorySales[cat]  = (categorySales[cat] || 0) + (parseFloat(detail.total_sales_price) || 0);
    });

    sfCharts.category = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels:   Object.keys(categorySales),
            datasets: [{
                data:            Object.values(categorySales),
                backgroundColor: [
                    'rgba(26,188,156,0.8)',
                    'rgba(52,152,219,0.8)',
                    'rgba(155,89,182,0.8)',
                    'rgba(230,126,34,0.8)',
                    'rgba(231,76,60,0.8)',
                    'rgba(243,156,18,0.8)'
                ],
                borderWidth: 2,
                borderColor: '#ffffff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend:  { position: 'bottom' },
                tooltip: {
                    callbacks: {
                        label: (context) => {
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const pct   = ((context.parsed / total) * 100).toFixed(1);
                            return `${context.label}: KSH ${sfFormatNumber(context.parsed)} (${pct}%)`;
                        }
                    }
                }
            }
        }
    });
}


/* ---- Insights ---- */
function sfGenerateInsights(historical, forecast) {
    const insights   = [];
    const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];

    const growthRates = [];
    for (let i = 1; i < historical.length; i++) {
        const rate = ((historical[i].revenue - historical[i - 1].revenue) / historical[i - 1].revenue) * 100;
        if (isFinite(rate)) growthRates.push(rate);
    }
    const avgGrowth = growthRates.length > 0
        ? growthRates.reduce((a, b) => a + b, 0) / growthRates.length
        : 0;

    if (avgGrowth > 5) {
        insights.push({
            type:  'success',
            title: 'Strong Growth Trajectory',
            text:  `Sales are growing at ${avgGrowth.toFixed(1)}% per month. Consider increasing inventory levels to meet expected demand.`
        });
    } else if (avgGrowth < -5) {
        insights.push({
            type:  'warning',
            title: 'Declining Sales Trend',
            text:  `Sales are declining at ${Math.abs(avgGrowth).toFixed(1)}% per month. Review pricing strategy and marketing efforts.`
        });
    }

    const nextMonthPrediction = forecast[0]?.predicted || 0;
    const lastMonthActual     = historical[historical.length - 1]?.revenue || 0;
    const expectedChange      = ((nextMonthPrediction - lastMonthActual) / lastMonthActual) * 100;

    if (Math.abs(expectedChange) > 10) {
        insights.push({
            type:  'info',
            title: 'Significant Change Expected',
            text:  `Next month's sales are predicted to ${expectedChange > 0 ? 'increase' : 'decrease'} by ${Math.abs(expectedChange).toFixed(1)}%. Plan inventory accordingly.`
        });
    }

    const lowStockItems = sfForecastData.inventory.filter(item => item.reorderRequired === 'YES');
    if (lowStockItems.length > 0) {
        insights.push({
            type:  'warning',
            title: 'Stock Replenishment Needed',
            text:  `${lowStockItems.length} items are below reorder level. Replenish stock to avoid stockouts during forecasted sales periods.`
        });
    }

    const peakMonth = forecast.reduce((max, curr) =>
        curr.predicted > max.predicted ? curr : max, forecast[0]);
    insights.push({
        type:  'info',
        title: 'Peak Sales Period Identified',
        text:  `${monthNames[peakMonth.date.getMonth()]} is expected to be your peak sales month with KSH ${sfFormatNumber(peakMonth.predicted)} in revenue.`
    });

    if (historical.length < 6) {
        insights.push({
            type:  'warning',
            title: 'Limited Historical Data',
            text:  `Only ${historical.length} months of data available. Forecast accuracy will improve as more historical data accumulates (recommended: 12+ months).`
        });
    }

    return insights;
}

function sfDisplayInsights(insights) {
    const container = document.getElementById('insightsContainer');

    if (insights.length === 0) {
        container.innerHTML = '<div class="no-data-message"><p>No specific insights available</p></div>';
        return;
    }

    container.innerHTML = insights.map(insight => `
        <div class="insight-card ${insight.type}">
            <div class="insight-title">
                <i class="fas ${insight.type === 'success' ? 'fa-check-circle' : insight.type === 'warning' ? 'fa-exclamation-triangle' : 'fa-info-circle'}"></i>
                ${insight.title}
            </div>
            <div class="insight-text">${insight.text}</div>
        </div>
    `).join('');
}


/* ---- Forecast Table ---- */
function sfPopulateForecastTable(forecast) {
    const tbody      = document.getElementById('forecastTableBody');
    const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

    tbody.innerHTML = forecast.map(f => {
        const confidenceBadge = f.confidence >= 70 ? 'high' : f.confidence >= 50 ? 'medium' : 'low';
        const action          = f.confidence >= 70 ? 'Stock up' : f.confidence >= 50 ? 'Monitor closely' : 'Tentative planning';

        return `
            <tr>
                <td>${monthNames[f.date.getMonth()]} ${f.date.getFullYear()}</td>
                <td>KSH ${sfFormatNumber(f.predicted)}</td>
                <td>KSH ${sfFormatNumber(f.lower)}</td>
                <td>KSH ${sfFormatNumber(f.upper)}</td>
                <td><span class="accuracy-badge ${confidenceBadge}">${f.confidence}%</span></td>
                <td>${action}</td>
            </tr>
        `;
    }).join('');
}


/* ---- No Data ---- */
function sfShowNoDataMessage() {
    document.querySelector('.metrics-grid').innerHTML = `
        <div class="no-data-message" style="grid-column: 1 / -1;">
            <i class="fas fa-chart-line"></i>
            <h3>No Historical Sales Data</h3>
            <p>Start making sales to enable forecasting and analytics</p>
        </div>
    `;
}


/* ---- Export ---- */
function sfExportForecast() {
    alert('Export functionality: Generate a CSV/PDF report with forecast data, charts, and insights. This would be implemented as a backend endpoint.');
}


/* ---- Scenario Simulation ---- */
function sfSimulateScenario(baselineForecast, scenario) {
    let adjustment = 1.0;

    if (scenario.priceChange) {
        /* Price elasticity: -10% price = +15% demand */
        adjustment *= (1 + (scenario.priceChange * -1.5));
    }

    if (scenario.marketingSpend) {
        /* Marketing ROI: +$1K spend = +5% sales */
        adjustment *= (1 + (scenario.marketingSpend / 1000) * 0.05);
    }

    return baselineForecast.map(f => f * adjustment);
}


/* ============================================================
   WINDOW ASSIGNMENTS
   Assign every function called by onclick="" attributes in
   Sales-forecasting.html to window explicitly.
   ============================================================ */
window.initSalesForecast  = initSalesForecast;
window.sfGenerateForecast = sfGenerateForecast;
window.sfExportForecast   = sfExportForecast;
window.sfSimulateScenario = sfSimulateScenario;


/* ============================================================
   SELF-INITIALISE
   By the time this line runs every function above is fully
   defined. No separate <script>initSalesForecast();</script>
   is needed in Sales-forecasting.html.
   ============================================================ */
initSalesForecast();

console.log('✅ Sales-forecasting.js complete');