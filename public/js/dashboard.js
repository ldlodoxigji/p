const state = window.pageData || { products: [], insights: [] };

const insights = state.insights || [
  'Данные пока не загружены — проверьте подключение к БД или прокси.',
];

const KNOWN_STORES = new Set(['amazon', 'bestseller', 'coolmod', 'stradivarius', 'ulanka', 'westwing']);

function normalizeStoreKey(value) {
  return (value || '').toString().trim().toLowerCase();
}

function isKnownStore(value) {
  return KNOWN_STORES.has(normalizeStoreKey(value));
}

function dedupeProducts(items) {
  const seen = new Set();
  return items.filter((item) => {
    const priceKey = Number.isFinite(item.price) ? item.price.toFixed(2) : '0.00';
    const nameKey = (item.name || '').toString().trim().toLowerCase();
    const categoryKey = (item.category || '').toString().trim().toLowerCase();
    const storeKey = normalizeStoreKey(item.store);
    const key = `${storeKey}|${nameKey}|${priceKey}|${categoryKey}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function formatCurrency(value) {
  if (!Number.isFinite(value)) return '—';
  return `${value.toFixed(2)} €`;
}

function renderInsights() {
  const list = document.getElementById('insights-list');
  list.innerHTML = insights.map((item) => `<li class="mb-1">${item}</li>`).join('');
}

function renderKpis(data) {
  const filtered = data.filter((item) => isKnownStore(item.store));
  const total = filtered.length;
  const stores = new Set(filtered.map((item) => item.store));
  const avgPrice = total ? filtered.reduce((acc, item) => acc + item.price, 0) / total : 0;
  const ratedItems = filtered.filter((item) => Number.isFinite(item.rating) && item.rating > 0);
  const avgRating = ratedItems.length
    ? ratedItems.reduce((acc, item) => acc + item.rating, 0) / ratedItems.length
    : 0;

  document.getElementById('kpi-total').textContent = total;
  document.getElementById('kpi-stores').textContent = `${stores.size} магазинов`;
  document.getElementById('kpi-price').textContent = formatCurrency(avgPrice);
  document.getElementById('kpi-rating').textContent = avgRating > 0 ? avgRating.toFixed(2) : '-';
}

function renderTopProducts(data) {
  const rows = dedupeProducts(data)
    .filter((item) => isKnownStore(item.store))
    .filter((item) => (item.price || 0) > 0)
    .slice()
    .sort((a, b) => (b.price || 0) - (a.price || 0))
    .slice(0, 6)
    .map((item) => `
      <tr>
        <td>
          <div class="fw-semibold">${item.name}</div>
          <div class="text-secondary small">${item.category}</div>
        </td>
        <td class="text-center">${item.store}</td>
        <td class="text-center">${item.category}</td>
        <td class="text-end">${formatCurrency(item.price)}</td>
        <td class="text-end">${item.rating > 0 ? item.rating.toFixed(1) : '-'}</td>
      </tr>
    `)
    .join('');

  document.getElementById('products-table').innerHTML = rows || '<tr><td colspan="5" class="text-center text-secondary">Нет данных для отображения.</td></tr>';
}

window.addEventListener('DOMContentLoaded', () => {
  renderInsights();
  renderKpis(state.products || []);
  renderTopProducts(state.topProducts || state.products || []);
});
