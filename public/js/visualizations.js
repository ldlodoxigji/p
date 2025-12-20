function groupBy(array, selector) {
  return array.reduce((acc, item) => {
    const key = selector(item);
    acc[key] = acc[key] || [];
    acc[key].push(item);
    return acc;
  }, {});
}

function prepareMonthlyTrend(data) {
  const byMonth = groupBy(data, item => item.date.slice(0, 7));
  const labels = Object.keys(byMonth).sort();
  const values = labels.map(month => {
    const items = byMonth[month];
    return items.reduce((acc, item) => acc + item.price, 0) / items.length;
  });
  return { labels, values };
}

function prepareInventory(data) {
  const byStore = groupBy(data, item => item.store);
  const labels = Object.keys(byStore);
  const values = labels.map(store => byStore[store].reduce((acc, item) => acc + item.availability, 0));
  return { labels, values };
}

function drawMonthlyTrend(ctx, labels, values) {
  new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: '€',
          data: values,
          borderColor: '#4c7bd9',
          backgroundColor: 'rgba(76, 123, 217, 0.15)',
          tension: 0.35,
          fill: true,
          pointRadius: 4,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: { mode: 'index', intersect: false },
      },
      scales: {
        y: { beginAtZero: false, ticks: { callback: value => `€${value}` } },
      },
    },
  });
}

function drawInventory(ctx, labels, values) {
  new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          label: 'Доступно, шт.',
          data: values,
          backgroundColor: '#f4a259',
          borderRadius: 6,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        y: { beginAtZero: true },
      },
    },
  });
}

function drawPriceRatingScatter(target, data) {
  const traces = Object.entries(groupBy(data, item => item.store)).map(([store, items]) => ({
    x: items.map(item => item.rating),
    y: items.map(item => item.price),
    text: items.map(item => item.name),
    mode: 'markers',
    name: store,
    marker: { size: 10 },
  }));

  const layout = {
    margin: { t: 16, r: 16, b: 40, l: 50 },
    xaxis: { title: 'Рейтинг' },
    yaxis: { title: 'Цена, €' },
    hovermode: 'closest',
  };

  Plotly.newPlot(target, traces, layout, { responsive: true });
}

function drawCategoryShare(target, data) {
  const byCategory = groupBy(data, item => item.category);
  const labels = Object.keys(byCategory);
  const values = labels.map(key => byCategory[key].length);

  const trace = [{
    type: 'pie',
    labels,
    values,
    hole: 0.45,
    marker: {
      colors: ['#4c7bd9', '#f4a259', '#70c1b3', '#b07bac', '#ffd166'],
    },
  }];

  const layout = {
    margin: { t: 16, b: 16, l: 16, r: 16 },
    showlegend: true,
  };

  Plotly.newPlot(target, trace, layout, { responsive: true });
}

function initVisualizations() {
  const monthly = prepareMonthlyTrend(sampleProducts);
  const inventory = prepareInventory(sampleProducts);
  const priceRatingEl = document.getElementById('priceRatingPlot');
  const categoryShareEl = document.getElementById('categorySharePlot');

  drawMonthlyTrend(document.getElementById('monthlyTrendChart'), monthly.labels, monthly.values);
  drawInventory(document.getElementById('inventoryChart'), inventory.labels, inventory.values);
  drawPriceRatingScatter(priceRatingEl, sampleProducts);
  drawCategoryShare(categoryShareEl, sampleProducts);

  window.addEventListener('resize', () => {
    Plotly.Plots.resize(priceRatingEl);
    Plotly.Plots.resize(categoryShareEl);
  });
}

window.addEventListener('DOMContentLoaded', () => {
  initVisualizations();
});

