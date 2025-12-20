function groupBy(array, selector) {
  return array.reduce((acc, item) => {
    const key = selector(item);
    acc[key] = acc[key] || [];
    acc[key].push(item);
    return acc;
  }, {});
}

function prepareMonthlyTrend(data) {
  const byMonth = groupBy(data, (item) => (item.date || '').slice(0, 7));
  const labels = Object.keys(byMonth).sort();
  const values = labels.map((month) => {
    const items = byMonth[month];
    return items.reduce((acc, item) => acc + item.price, 0) / (items.length || 1);
  });
  return { labels, values };
}

function prepareInventory(data) {
  const byStore = groupBy(data, (item) => item.store || 'Неизвестно');
  const labels = Object.keys(byStore);
  const values = labels.map((store) => byStore[store].reduce((acc, item) => acc + (item.availability || 0), 0));
  return { labels, values };
}

function drawMonthlyTrend(ctx, labels, values) {
  if (!ctx) return;
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
        y: { beginAtZero: false, ticks: { callback: (value) => `€${value}` } },
      },
    },
  });
}

function drawInventory(ctx, labels, values) {
  if (!ctx) return;
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

function drawPriceRatingScatter(target, datasets) {
  if (!target) return;
  const traces = datasets.map((set) => ({
    x: set.ratings,
    y: set.prices,
    text: set.names,
    mode: 'markers',
    name: set.store,
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
  if (!target) return;
  const byCategory = groupBy(data, (item) => item.category || 'Без категории');
  const labels = Object.keys(byCategory);
  const values = labels.map((key) => byCategory[key].length);

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
  const payload = window.chartPayload || {};
  const products = payload.products || [];
  const charts = payload.charts || {};

  const monthly = charts.monthlyTrend || prepareMonthlyTrend(products);
  const inventory = charts.inventory || prepareInventory(products);
  const priceRatingEl = document.getElementById('priceRatingPlot');
  const categoryShareEl = document.getElementById('categorySharePlot');

  drawMonthlyTrend(document.getElementById('monthlyTrendChart'), monthly.labels || [], monthly.values || []);
  drawInventory(document.getElementById('inventoryChart'), inventory.labels || [], inventory.values || []);
  drawPriceRatingScatter(priceRatingEl, charts.priceRating || []);
  drawCategoryShare(categoryShareEl, products);

  window.addEventListener('resize', () => {
    if (priceRatingEl) Plotly.Plots.resize(priceRatingEl);
    if (categoryShareEl) Plotly.Plots.resize(categoryShareEl);
  });
}

window.addEventListener('DOMContentLoaded', () => {
  initVisualizations();
});
