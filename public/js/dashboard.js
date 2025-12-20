const insights = [
  'Сравнение средней цены и рейтинга по магазинам.',
  'Тренды динамики цен и наличия по месяцам.',
  'Категориальные доли ассортимента и их изменения.',
  'Топы и анти-топы по рейтингу и стоимости.',
  'Связь цены, рейтинга и объёма стока (наличие).'
];

function formatCurrency(value) {
  return `${value.toFixed(2)} €`;
}

function renderInsights() {
  const list = document.getElementById('insights-list');
  list.innerHTML = insights.map(item => `<li class="mb-1">${item}</li>`).join('');
}

function renderKpis(data) {
  const total = data.length;
  const stores = new Set(data.map(item => item.store));
  const avgPrice = data.reduce((acc, item) => acc + item.price, 0) / total;
  const totalStock = data.reduce((acc, item) => acc + item.availability, 0);
  const avgRating = data.reduce((acc, item) => acc + item.rating, 0) / total;

  document.getElementById('kpi-total').textContent = total;
  document.getElementById('kpi-stores').textContent = `${stores.size} магазинов`;
  document.getElementById('kpi-price').textContent = formatCurrency(avgPrice);
  document.getElementById('kpi-stock').textContent = `${totalStock} шт.`;
  document.getElementById('kpi-rating').textContent = avgRating.toFixed(2);
}

function renderTopProducts(data) {
  const rows = data
    .slice()
    .sort((a, b) => b.availability - a.availability)
    .slice(0, 6)
    .map(item => `
      <tr>
        <td>
          <div class="fw-semibold">${item.name}</div>
          <div class="text-secondary small">${item.category}</div>
        </td>
        <td class="text-center">${item.store}</td>
        <td class="text-center">${item.category}</td>
        <td class="text-end">${formatCurrency(item.price)}</td>
        <td class="text-end">${item.availability}</td>
        <td class="text-end">${item.rating.toFixed(1)}</td>
      </tr>
    `)
    .join('');

  document.getElementById('products-table').innerHTML = rows;
}

window.addEventListener('DOMContentLoaded', () => {
  renderInsights();
  renderKpis(sampleProducts);
  renderTopProducts(sampleProducts);
});

