function groupBy(array, selector) {
  return array.reduce((acc, item) => {
    const key = selector(item);
    acc[key] = acc[key] || [];
    acc[key].push(item);
    return acc;
  }, {});
}

const KNOWN_STORES = new Set(['amazon', 'coolmod', 'stradivarius', 'ulanka', 'westwing']);

function normalizeStoreKey(value) {
  return (value || '').toString().trim().toLowerCase();
}

function isKnownStore(value) {
  return KNOWN_STORES.has(normalizeStoreKey(value));
}

function buildScatterDatasets(products) {
  const storeSource = products.filter((item) => isKnownStore(item.store));
  const source = storeSource.length ? storeSource : products;
  const byStore = groupBy(source, (item) => item.store || 'Unknown');
  return Object.entries(byStore).map(([store, items]) => ({
    store,
    prices: items.map((item) => item.price),
    ratings: items.map((item) => item.rating),
    names: items.map((item) => item.name),
  }));
}

function dedupeProducts(items) {
  const seen = new Set();
  return items.filter((item) => {
    const priceKey = Number.isFinite(item.price) ? item.price.toFixed(2) : '0.00';
    const nameKey = (item.name || '').toString().trim().toLowerCase();
    const categoryKey = (item.category || '').toString().trim().toLowerCase();
    const storeKey = (item.store || '').toString().trim().toLowerCase();
    const key = `${storeKey}|${nameKey}|${priceKey}|${categoryKey}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function prepareStoreCounts(data) {
  const filtered = dedupeProducts(data);
  const known = filtered.filter((item) => isKnownStore(item.store));
  const source = known.length ? known : filtered;
  const byStore = groupBy(source, (item) => item.store || 'Unknown');
  const labels = Object.keys(byStore);
  const values = labels.map((store) => byStore[store].length);
  return { labels, values };
}

function prepareAveragePriceByStore(data) {
  const filtered = dedupeProducts(data).filter((item) => (item.price || 0) > 0);
  const known = filtered.filter((item) => isKnownStore(item.store));
  const source = known.length ? known : filtered;
  const byStore = groupBy(source, (item) => item.store || 'Unknown');
  const labels = Object.keys(byStore);
  const pairs = labels.map((store) => {
    const items = byStore[store];
    const prices = items.map((item) => item.price || 0).filter((value) => value > 0);
    if (!prices.length) return null;
    const total = prices.reduce((acc, value) => acc + value, 0);
    return { store, value: total / prices.length };
  }).filter(Boolean);
  return {
    labels: pairs.map((pair) => pair.store),
    values: pairs.map((pair) => pair.value),
  };
}

function drawMonthlyTrend(ctx, labels, values) {
  if (!ctx) return;
  new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          label: 'Items',
          data: values,
          borderColor: '#4c7bd9',
          backgroundColor: 'rgba(76, 123, 217, 0.15)',
          borderWidth: 1,
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
        y: { beginAtZero: true },
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
          label: 'EUR',
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
        y: { beginAtZero: false, ticks: { callback: (value) => `EUR ${value}` } },
      },
    },
  });
}

function drawPriceRatingScatter(target, datasets) {
  if (!target) return;
  const traces = datasets.map((set) => {
    const points = set.ratings.map((rating, index) => ({
      rating,
      price: set.prices[index],
      name: set.names[index],
    })).filter((point) => (point.rating || 0) > 0 && (point.price || 0) > 0);

    return {
      x: points.map((point) => point.rating),
      y: points.map((point) => point.price),
      text: points.map((point) => point.name),
      mode: 'markers',
      name: set.store,
      marker: { size: 10 },
    };
  }).filter((trace) => trace.x.length > 0);

  if (traces.length > 0) {
    const layout = {
      margin: { t: 16, r: 16, b: 40, l: 50 },
      xaxis: { title: 'Rating' },
      yaxis: { title: 'Price, EUR' },
      hovermode: 'closest',
    };

    Plotly.newPlot(target, traces, layout, { responsive: true });
    return;
  }

  const boxTraces = datasets.map((set) => {
    const prices = set.prices.filter((price) => (price || 0) > 0);
    return {
      y: prices,
      name: set.store,
      type: 'box',
      boxpoints: 'all',
      jitter: 0.3,
      pointpos: -1.8,
    };
  }).filter((trace) => trace.y.length > 0);

  const layout = {
    margin: { t: 16, r: 16, b: 40, l: 50 },
    yaxis: { title: 'Price, EUR' },
    xaxis: { title: 'Store' },
  };

  Plotly.newPlot(target, boxTraces, layout, { responsive: true });
}

function drawCategoryShare(target, data) {
  if (!target) return;
  const byCategory = groupBy(data, (item) => item.category || 'Uncategorized');
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

  const monthly = prepareStoreCounts(products);
  const inventory = prepareAveragePriceByStore(products);
  const priceRatingEl = document.getElementById('priceRatingPlot');
  const categoryShareEl = document.getElementById('categorySharePlot');
  const scatterData = buildScatterDatasets(dedupeProducts(products));

  drawMonthlyTrend(document.getElementById('monthlyTrendChart'), monthly.labels || [], monthly.values || []);
  drawInventory(document.getElementById('inventoryChart'), inventory.labels || [], inventory.values || []);
  drawPriceRatingScatter(priceRatingEl, scatterData);
  drawCategoryShare(categoryShareEl, products);

  window.addEventListener('resize', () => {
    if (priceRatingEl) Plotly.Plots.resize(priceRatingEl);
    if (categoryShareEl) Plotly.Plots.resize(categoryShareEl);
  });
}

window.addEventListener('DOMContentLoaded', () => {
  initVisualizations();
});
