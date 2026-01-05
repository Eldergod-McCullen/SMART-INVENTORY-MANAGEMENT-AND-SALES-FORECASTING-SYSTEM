document.addEventListener('DOMContentLoaded', () => {
      google.script.run
        .withSuccessHandler(dashRender)
        .withFailureHandler(err => alert('Error: ' + err.message))
        .dashGetDashboardData();
    });

    function dashFmt(v) {
  return '$' + Math.round(v).toLocaleString('en-US');
}

    function dashRender(data) {
      // KPIs
      document.getElementById('dash-total-sales').textContent      = dashFmt(data.totalSales);
      document.getElementById('dash-total-purchases').textContent = dashFmt(data.totalPurchases);
      document.getElementById('dash-net-profit').textContent      = dashFmt(data.netProfit);
      document.getElementById('dash-total-receivable').textContent= dashFmt(data.totalReceivable);
      document.getElementById('dash-total-payable').textContent   = dashFmt(data.totalPayable);
      document.getElementById('dash-top-location').textContent    = data.topLocation;
      document.getElementById('dash-top-item').textContent        = data.topItem;

      // Chart 1: Sales Trend (no dataLabels)
new ApexCharts(document.querySelector('#dash-chart1'), {
  chart: {
    type: 'area',
    height: 300,
    fontFamily: 'Arial, sans-serif',
    toolbar: { show: false }
  },
  series: [{
    name: 'Sales',
    data: data.salesTrend.values
  }],
  dataLabels: { enabled: false },
  stroke: {
    curve: 'smooth',
    width: 2,
    colors: ['#021640']
  },
  fill: {
    type: 'gradient',
    gradient: {
      shade: 'light',
      type: 'vertical',
      shadeIntensity: 0.8,
      opacityFrom: 0.7,
      opacityTo: 0.2,
      stops: [0, 100]
    },
    colors: ['#021640']
  },
  markers: {
    size: 2,
    colors: ['#021640'],
    strokeColors: ['#021640'],
    strokeWidth: 2
  },
  xaxis: {
    type: 'datetime',
    categories: data.salesTrend.dates,
    labels: {
      format: 'MMM-yy',
      style: {
        colors: '#021640',
        fontSize: '12px'
      }
    }
  },
  yaxis: {
    labels: {
      formatter: v => (v / 1000) + 'k',
      style: {
        colors: '#021640',
        fontSize: '12px'
      }
    }
  },
  tooltip: {
    x: {
      format: 'MMM yyyy'
    }
  },
  colors: ['#021640'],
  grid: {
    borderColor: '#e0e0e0',
    strokeDashArray: 4
  }
}).render();


      // Chart 2: Sales By Location
      new ApexCharts(document.querySelector('#dash-chart2'), {
        chart:{ type:'bar', height:300, toolbar:{ show:false } },
        series:[{ data: data.salesByLocation.values }],
        dataLabels:{ enabled:false },
        plotOptions:{ bar:{ columnWidth:'80%', borderRadius:4 } },
        xaxis:{ categories: data.salesByLocation.labels, labels:{ style:{ colors:'#021640' } } },
        yaxis:{ labels:{ formatter:v=> (v/1000)+'K', style:{ colors:'#021640' } } },
        colors:['#0066CC'],
        grid:{ strokeDashArray:4 }
      }).render();

      // Chart 3: Sales By Category
      new ApexCharts(document.querySelector('#dash-chart3'), {
        chart:{ type:'pie', height:300 },
        series: data.salesByCategory.values,
        labels: data.salesByCategory.labels,
        dataLabels:{ enabled:true },
        colors:['#021640','#0066CC','#0099CC','#4572C4','#558ED5','#1F4E79'],
        legend:{ position:'bottom' }
      }).render();

      // Chart 4: Top 10 Customers
new ApexCharts(document.querySelector('#dash-chart4'), {
  chart: {
    type: 'bar',
    height: 700,
    toolbar: { show: false }
  },
  series: [{
    data: data.topCustomers.values
  }],
  dataLabels: {
    enabled: true,
    formatter: function (val) {
      return Math.round(val / 1000) + 'K';
    },
    style: {
      colors: ['#FFFFFF']
    }
  },
  plotOptions: {
    bar: {
      horizontal: true,
      borderRadius: 4
    }
  },
  xaxis: {
    categories: data.topCustomers.labels,
    labels: {
      formatter: v => Math.round(v / 1000) + 'K',
      style: { colors: '#021640' }
    }
  },
  colors: ['#0099CC'],
  grid: { strokeDashArray: 4 }
}).render();

      // Chart 5: Purchase By Location (Donut width 50%)
      const filteredLabels = [];
      const filteredValues = [];

      data.purchaseByLocation.labels.forEach((label, index) => {
      if (label && label.toLowerCase() !== 'unknown') {
        filteredLabels.push(label);
        filteredValues.push(data.purchaseByLocation.values[index]);
      }
    });

    new ApexCharts(document.querySelector('#dash-chart5'), {
      chart: { type: 'donut', height: 300 },
      series: filteredValues,
      labels: filteredLabels,
      plotOptions: { pie: { donut: { size: '50%' } } },
      dataLabels: { enabled: true },
      colors: ['#021640', '#0066CC', '#0099CC', '#4572C4', '#558ED5', '#1F4E79'],
      legend: { position: 'bottom' }
    }).render();

      // Chart 6: Purchase By Category (Stacked, no dataLabels, filtered years 2024 & 2025, increased bar size)
      (function(){
        const pc = data.purchaseByCategory;
        const years = pc.years.filter(y=> y==2024 || y==2025);
        const series = pc.series.map(s=>({ name: s.name, data: years.map(y=> s.data[pc.years.indexOf(y)]||0) }));
        new ApexCharts(document.querySelector('#dash-chart6'), {
          chart:{ type:'bar', height:300, stacked:true, toolbar:{ show:false } },
          series: series,
          dataLabels:{ enabled:false },
          plotOptions:{ bar:{ borderRadius:4, columnWidth:'80%' } },
          xaxis:{ categories: years, labels:{ style:{ colors:'#021640' } } },
          yaxis:{ labels:{ formatter:v=> (v/1000)+'K', style:{ colors:'#021640' } } },
          colors:['#021640','#0099CC','#558ED5','#4572C4','#0066CC','#1F4E79'],
          legend:{ position:'bottom' },
          grid:{ strokeDashArray:4 }
        }).render();
      })();

      // Chart 7: Sales By City (Treemap, color #0066CC)
      new ApexCharts(document.querySelector('#dash-chart7'), {
        chart:{ type:'treemap', height:300 },
        series:[{ data: data.salesByCity }],
        colors:['#0066CC']
      }).render();
    }