const fs = require('fs');
const path = require('path');
const sequelize = require('../models');
const Page = require('../models/Page');
const ParsedData = require('../models/ParsedData');

Page.hasMany(ParsedData, { foreignKey: 'PageId' });
ParsedData.belongsTo(Page, { foreignKey: 'PageId' });

const insights = [
  'Сравнение средней цены и рейтинга по магазинам.',
  'Тренды динамики цен и наличия по месяцам.',
  'Категориальные доли ассортимента и их изменения.',
  'Топы и анти-топы по рейтингу и стоимости.',
  'Связь цены, рейтинга и объёма стока (наличие).',
];

const sampleDataPath = path.join(__dirname, '..', 'public', 'js', 'data.js');

function parseSampleProducts() {
  if (!fs.existsSync(sampleDataPath)) {
    return [];
  }

  const content = fs.readFileSync(sampleDataPath, 'utf-8');
  const match = content.match(/const sampleProducts = ([\s\S]*?);\s*$/m);
  if (!match) {
    return [];
  }

  // eslint-disable-next-line no-eval
  return eval(match[1]);
}

function parsePrice(value) {
  if (!value) return 0;
  const cleaned = value.toString().replace(/[^0-9.,]/g, '').replace(',', '.');
  const parsed = parseFloat(cleaned);
  return Number.isFinite(parsed) ? parsed : 0;
}

function parseAvailability(value) {
  if (value === null || value === undefined) return null;
  const parsed = parseInt(value.toString().replace(/[^0-9]/g, ''), 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return parsed;
}

function parseRating(value) {
  if (!value) return 0;
  const match = value.toString().match(/([0-9]+(?:\.[0-9]+)?)/);
  if (!match) return 0;
  const parsed = parseFloat(match[1]);
  return Number.isFinite(parsed) ? parsed : 0;
}

function deriveStoreName(url) {
  if (!url) return 'Неизвестно';
  try {
    const { hostname } = new URL(url);
    const clean = hostname.replace('www.', '');
    const base = clean.split('.')[0];
    return base.charAt(0).toUpperCase() + base.slice(1);
  } catch (err) {
    return 'Неизвестно';
  }
}

function normalizeRecord(record) {
  const store = deriveStoreName(record.Page ? record.Page.url : null);
  const date = record.createdAt ? record.createdAt.toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10);

  return {
    id: record.id,
    store,
    category: record.category || 'Без категории',
    name: record.title || 'Без названия',
    price: parsePrice(record.price),
    rating: parseRating(record.rating || record.price),
    availability: parseAvailability(record.unitsSold),
    date,
  };
}

async function loadProducts() {
  // Ensure the schema matches models; "alter" keeps existing data while adding missing columns.
  await sequelize.sync({ alter: true });
  const items = await ParsedData.findAll({ include: Page, order: [['createdAt', 'DESC']] });
  if (items.length === 0) {
    return parseSampleProducts();
  }
  return items.map(normalizeRecord);
}

function buildOverview(products) {
  const total = products.length;
  const stores = new Set(products.map((item) => item.store));
  const averagePrice = total ? products.reduce((acc, item) => acc + item.price, 0) / total : 0;
  const totalAvailability = products.reduce((acc, item) => acc + (item.availability || 0), 0);
  const averageRating = total ? products.reduce((acc, item) => acc + (item.rating || 0), 0) / total : 0;

  const topProducts = products
    .slice()
    .sort((a, b) => (b.availability || 0) - (a.availability || 0))
    .slice(0, 6);

  return {
    insights,
    kpis: {
      total,
      storeCount: stores.size,
      averagePrice,
      totalAvailability,
      averageRating,
    },
    topProducts,
  };
}

function groupBy(array, selector) {
  return array.reduce((acc, item) => {
    const key = selector(item);
    acc[key] = acc[key] || [];
    acc[key].push(item);
    return acc;
  }, {});
}

function buildCharts(products) {
  const byMonth = groupBy(products, (item) => (item.date || '').slice(0, 7));
  const monthlyLabels = Object.keys(byMonth).sort();
  const monthlyValues = monthlyLabels.map((month) => {
    const items = byMonth[month];
    return items.reduce((acc, item) => acc + item.price, 0) / (items.length || 1);
  });

  const byStore = groupBy(products, (item) => item.store || 'Неизвестно');
  const storeLabels = Object.keys(byStore);
  const storeValues = storeLabels.map((store) => byStore[store].reduce((acc, item) => acc + (item.availability || 0), 0));

  const byCategory = groupBy(products, (item) => item.category || 'Без категории');
  const categoryLabels = Object.keys(byCategory);
  const categoryValues = categoryLabels.map((key) => byCategory[key].length);

  const scatter = Object.entries(byStore).map(([store, items]) => ({
    store,
    prices: items.map((item) => item.price),
    ratings: items.map((item) => item.rating),
    names: items.map((item) => item.name),
  }));

  return {
    monthlyTrend: { labels: monthlyLabels, values: monthlyValues },
    inventory: { labels: storeLabels, values: storeValues },
    categoryShare: { labels: categoryLabels, values: categoryValues },
    priceRating: scatter,
  };
}

module.exports = {
  loadProducts,
  buildOverview,
  buildCharts,
};
