const https = require('https');
const cheerio = require('cheerio');

// ===== БД =====
const ParsedData = require('../models/ParsedData');
// ==============

function fetchUlankaHtml(pathname) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'ulanka.com',
      path: pathname,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    };

    https.get(options, (response) => {
      let html = '';

      response.on('data', (chunk) => {
        html += chunk;
      });

      response.on('end', () => resolve(html));
    }).on('error', (error) => reject(error));
  });
}

async function parseUlankaPrecise(html, pageRecord) {
  const $ = cheerio.load(html);

  const uniqueLinks = new Set();
  let productCount = 0;

  // Ищем контейнеры товаров
  const productContainers = $('div').filter((i, el) => {
    const $el = $(el);
    return (
      $el.find('a[href*="/products/"]').length > 0 &&
      $el.find('.money').length > 0
    );
  });

  console.log(`Найдено потенциальных товаров: ${productContainers.length}`);

  for (let i = 0; i < productContainers.length; i++) {
    const container = productContainers[i];
    const $container = $(container);

    const linkEl = $container.find('a[href*="/products/"]').first();
    const href = linkEl.attr('href');
    if (!href || uniqueLinks.has(href)) continue;

    uniqueLinks.add(href);

    const title = linkEl.attr('title') || linkEl.text().trim();
    const price = $container.find('.money').first().text().trim();

    if (!title || !price) continue;

    productCount++;

    console.log(`Товар ${productCount}: ${title}`);
    console.log(`  Цена: ${price}`);
    console.log(`  Ссылка: https://ulanka.com${href}`);
    console.log('---');

    // ===== СОХРАНЕНИЕ В БД =====
    await ParsedData.create({
      title,
      price,
      rating: '',
      unitsSold: '',
      category: 'Ulanka',
      pageId: pageRecord.id
    });
    // ==========================
  }

  console.log(`Успешно сохранено товаров: ${productCount}`);
  console.log('Данные сохранены в БД');
}

async function scrapeUlanka(pageRecord, url = 'https://ulanka.com/en-eu/pages/look-1') {
  console.log('=== Парсинг Ulanka ===');
  console.log('=====================\n');

  try {
    const html = await fetchUlankaHtml(new URL(url).pathname);
    await parseUlankaPrecise(html, pageRecord);
  } catch (error) {
    console.error('Ошибка:', error.message);
  }
}

module.exports = { scrapeUlanka };
