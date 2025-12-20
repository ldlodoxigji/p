const state = window.pageData || { products: [], insights: [] };

const insights = state.insights || [
  'Данные пока не загружены — проверьте подключение к БД или прокси.',
];

function formatCurrency(value) {
  if (!Number.isFinite(value)) return '—';
  return `${value.toFixed(2)} €`;
}

function renderInsights() {
  const list = document.getElementById('insights-list');
  list.innerHTML = insights.map((item) => `<li class="mb-1">${item}</li>`).join('');
}

function renderKpis(data) {
  const total = data.length;
  const stores = new Set(data.map((item) => item.store));
  const avgPrice = total ? data.reduce((acc, item) => acc + item.price, 0) / total : 0;
  const totalStock = data.reduce((acc, item) => acc + (item.availability || 0), 0);
  const avgRating = total ? data.reduce((acc, item) => acc + (item.rating || 0), 0) / total : 0;

  document.getElementById('kpi-total').textContent = total;
  document.getElementById('kpi-stores').textContent = `${stores.size} магазинов`;
  document.getElementById('kpi-price').textContent = formatCurrency(avgPrice);
  document.getElementById('kpi-stock').textContent = `${totalStock} шт.`;
  document.getElementById('kpi-rating').textContent = avgRating ? avgRating.toFixed(2) : '—';
}

function renderTopProducts(data) {
  const rows = data
    .slice()
    .sort((a, b) => (b.availability || 0) - (a.availability || 0))
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
        <td class="text-end">${item.availability ?? '—'}</td>
        <td class="text-end">${Number.isFinite(item.rating) ? item.rating.toFixed(1) : '—'}</td>
      </tr>
    `)
    .join('');

  document.getElementById('products-table').innerHTML = rows || '<tr><td colspan="6" class="text-center text-secondary">Нет данных для отображения.</td></tr>';
}

window.addEventListener('DOMContentLoaded', () => {
  renderInsights();
  renderKpis(state.products || []);
  renderTopProducts(state.topProducts || state.products || []);
});
