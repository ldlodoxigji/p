const fs = require('fs');
const path = require('path');
const sequelize = require('../models');
const Page = require('../models/Page');
const ParsedData = require('../models/ParsedData');

Page.hasMany(ParsedData, { foreignKey: 'PageId' });
ParsedData.belongsTo(Page, { foreignKey: 'PageId' });

const STORE_CANONICAL = {
  amazon: 'Amazon',
  bestseller: 'Amazon',
  coolmod: 'Coolmod',
  stradivarius: 'Stradivarius',
  ulanka: 'Ulanka',
  westwing: 'Westwing',
};

const CATEGORY_STORE_MAP = {
  bestseller: 'Amazon',
  amazon: 'Amazon',
  coolmod: 'Coolmod',
  stradivarius: 'Stradivarius',
  ulanka: 'Ulanka',
  westwing: 'Westwing',
};

function normalizeStoreName(value) {
  const key = (value || '').toString().trim().toLowerCase();
  return STORE_CANONICAL[key] || 'Unknown';
}

function normalizeStoreFromCategory(value) {
  const key = (value || '').toString().trim().toLowerCase();
  return CATEGORY_STORE_MAP[key] || '';
}

function dedupeProducts(items) {
  const seen = new Set();
  return items.filter((item) => {
    const priceKey = Number.isFinite(item.price) ? item.price.toFixed(2) : '0.00';
    const nameKey = (item.name || '').toString().trim().toLowerCase();
    const categoryKey = (item.category || '').toString().trim().toLowerCase();
    const key = `${item.store}|${nameKey}|${priceKey}|${categoryKey}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

const insights = [
  'Category shares updated after the latest scrape.',
  'Price trends highlight seasonal demand shifts.',
  'Ratings are calculated only for items with real scores.',
  'Store mix shows how assortment varies by channel.',
  'Use charts to compare price positioning across stores.',
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
  if (value === null || value === undefined) return 0;
  const raw = value.toString().replace(/\s/g, '');
  let numeric = raw.replace(/[^0-9.,]/g, '');
  if (!numeric) return 0;

  const lastComma = numeric.lastIndexOf(',');
  const lastDot = numeric.lastIndexOf('.');
  if (lastComma > -1 || lastDot > -1) {
    if (lastComma > lastDot) {
      numeric = numeric.replace(/\./g, '').replace(',', '.');
    } else if (lastDot > lastComma) {
      numeric = numeric.replace(/,/g, '');
    } else {
      numeric = numeric.replace(',', '.');
    }
  }

  const parsed = parseFloat(numeric);
  return Number.isFinite(parsed) ? parsed : 0;
}

function parseAvailability(value) {
  if (value === null || value === undefined) return 0;
  const text = value.toString().toLowerCase();
  const match = text.match(/([0-9]+(?:[.,][0-9]+)?)(\s*k)?/);
  if (!match) return 0;
  let amount = parseFloat(match[1].replace(',', '.'));
  if (match[2]) amount *= 1000;
  return Number.isFinite(amount) ? Math.round(amount) : 0;
}

function parseRating(value) {
  if (value === null || value === undefined) return 0;
  const normalized = value.toString().replace(',', '.');
  const match = normalized.match(/([0-9]+(?:\.[0-9]+)?)/);
  if (!match) return 0;
  const parsed = parseFloat(match[1]);
  return Number.isFinite(parsed) ? parsed : 0;
}

function deriveStoreName(url) {
  if (!url) return 'Unknown';
  try {
    const { hostname } = new URL(url);
    const clean = hostname.replace('www.', '');
    const base = clean.split('.')[0];
    return base.charAt(0).toUpperCase() + base.slice(1);
  } catch (err) {
    return 'Unknown';
  }
}

function normalizeRecord(record) {
  const storeFromCategory = normalizeStoreFromCategory(record.category);
  let store = normalizeStoreName(record.store || deriveStoreName(record.Page ? record.Page.url : null));
  if (storeFromCategory) {
    store = storeFromCategory;
  }
  const date = record.createdAt ? record.createdAt.toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10);

  return {
    id: record.id,
    store,
    category: record.category || 'Без категории',
    name: record.title || 'Без названия',
    price: parsePrice(record.price),
    rating: parseRating(record.rating),
    availability: parseAvailability(record.unitsSold),
    date,
  };
}

async function loadProducts() {
  await sequelize.sync();
  const items = await ParsedData.findAll({ include: Page, order: [['createdAt', 'DESC']] });
  if (items.length === 0) {
    return parseSampleProducts();
  }
  const normalized = items.map(normalizeRecord);
  const deduped = dedupeProducts(normalized);
  if (deduped.length === 0) {
    return parseSampleProducts();
  }
  return deduped;
}

function buildOverview(products) {
  const total = products.length;
  const stores = new Set(products.map((item) => item.store));
  const averagePrice = total ? products.reduce((acc, item) => acc + item.price, 0) / total : 0;
  const totalAvailability = products.reduce((acc, item) => acc + (item.availability || 0), 0);
  const ratedItems = products.filter((item) => Number.isFinite(item.rating) && item.rating > 0);
  const averageRating = ratedItems.length
    ? ratedItems.reduce((acc, item) => acc + item.rating, 0) / ratedItems.length
    : 0;

  const topProducts = products
    .filter((item) => (item.price || 0) > 0)
    .sort((a, b) => (b.price || 0) - (a.price || 0))
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
  const isKnownStore = (item) => item.store && item.store !== 'Unknown';
  const storeSource = products.filter(isKnownStore);
  const storeProducts = storeSource.length ? storeSource : products;
  const pricedProducts = products.filter((item) => (item.price || 0) > 0);
  const pricedStoreSource = pricedProducts.filter(isKnownStore);
  const pricedStoreProducts = pricedStoreSource.length ? pricedStoreSource : pricedProducts;
  const monthlySource = pricedProducts.length ? pricedProducts : products;
  const byMonth = groupBy(monthlySource, (item) => (item.date || '').slice(0, 7));
  const monthlyLabels = Object.keys(byMonth).sort();
  const monthlyValues = monthlyLabels.map((month) => {
    const items = byMonth[month];
    return items.reduce((acc, item) => acc + item.price, 0) / (items.length || 1);
  });

  const byStore = groupBy(storeProducts, (item) => item.store || 'Unknown');
  const storeLabels = Object.keys(byStore);
  const storeValues = storeLabels.map((store) => byStore[store].length);

  const byCategory = groupBy(products, (item) => item.category || 'Без категории');
  const categoryLabels = Object.keys(byCategory);
  const categoryValues = categoryLabels.map((key) => byCategory[key].length);

  const byStoreForAvg = groupBy(pricedStoreProducts.length ? pricedStoreProducts : storeProducts, (item) => item.store || 'Unknown');
  const avgPriceLabels = Object.keys(byStoreForAvg);
  const avgPriceValues = avgPriceLabels.map((store) => {
    const items = byStoreForAvg[store];
    const priced = items.filter((item) => (item.price || 0) > 0);
    const source = priced.length ? priced : items;
    const total = source.reduce((acc, item) => acc + (item.price || 0), 0);
    return source.length ? total / source.length : 0;
  });

  const scatter = Object.entries(byStore).map(([store, items]) => {
    const filtered = items.filter((item) => (item.price || 0) > 0 && (item.rating || 0) > 0);
    return {
      store,
      prices: filtered.map((item) => item.price),
      ratings: filtered.map((item) => item.rating),
      names: filtered.map((item) => item.name),
    };
  });

  return {
    monthlyTrend: { labels: monthlyLabels, values: monthlyValues },
    inventory: { labels: storeLabels, values: storeValues },
    categoryShare: { labels: categoryLabels, values: categoryValues },
    avgPriceByStore: { labels: avgPriceLabels, values: avgPriceValues },
    categoryCounts: { labels: categoryLabels, values: categoryValues },
    priceRating: scatter,
  };
}

module.exports = {
  loadProducts,
  buildOverview,
  buildCharts,
};
