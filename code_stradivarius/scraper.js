const puppeteer = require('puppeteer');
const cheerio = require('cheerio');
const fs = require('fs');

// ===== БД =====
const sequelize = require('../models');
const Page = require('../models/Page');
const ParsedData = require('../models/ParsedData');
// ==============

async function scrapeStradivarius(url, pageRecord) {
    console.log('Запускаем браузер для парсинга Stradivarius...');

    let browser;
    try {
        browser = await puppeteer.launch({
            headless: 'new',
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });

        const page = await browser.newPage();
        await page.setViewport({ width: 1920, height: 1080 });
        await page.setUserAgent(
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) ' +
            'AppleWebKit/537.36 (KHTML, like Gecko) ' +
            'Chrome/120.0.0.0 Safari/537.36'
        );

        console.log(`Переходим на: ${url}`);
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

        await page.waitForSelector('[data-cy^="grid-product"]', { timeout: 15000 })
            .catch(() => console.log('Таймаут ожидания, продолжаем...'));

        await autoScroll(page);

        const html = await page.content();
        await browser.close();

        return await parseStradivariusProducts(html, pageRecord);

    } catch (error) {
        console.error('Ошибка Puppeteer:', error.message);
        if (browser) await browser.close();
        return [];
    }
}

async function autoScroll(page) {
    await page.evaluate(async () => {
        await new Promise(resolve => {
            let total = 0;
            const step = 200;
            const timer = setInterval(() => {
                window.scrollBy(0, step);
                total += step;
                if (total >= document.body.scrollHeight) {
                    clearInterval(timer);
                    resolve();
                }
            }, 100);
        });
    });
}

async function parseStradivariusProducts(html, pageRecord) {
    const $ = cheerio.load(html);
    const products = [];

    const cards = $('[data-cy^="grid-product"]');

    if (cards.length === 0) {
        console.log('Карточки товаров не найдены');
        return [];
    }

    console.log(`Парсим ${cards.length} товаров...`);

    for (let i = 0; i < cards.length; i++) {
        const el = cards[i];

        const title = $(el).find('[data-cy="grid-product-title"]').first().text().trim();
        const price = $(el).find('[data-cy="grid-product-price"]').first().text().trim();
        const link = $(el).find('a[href]').attr('href');

        if (!title || !price) continue;

        const product = {
            название: title,
            цена: price,
            ссылка: link?.startsWith('http')
                ? link
                : `https://www.stradivarius.com${link || ''}`
        };

        products.push(product);

        // ===== СОХРАНЕНИЕ В БД =====
        await ParsedData.create({
            title: product.название,
            price: product.цена,
            rating: '',
            unitsSold: '',
            category: 'Stradivarius',
            PageId: pageRecord.id
        });
        // ==========================

        console.log(`[${i + 1}] ${title.substring(0, 40)}... - ${price}`);
    }

    console.log(`Успешно спарсено товаров: ${products.length}`);
    return products;
}

function saveToTSV(data, filename) {
    if (data.length === 0) return;

    const headers = ['Название', 'Цена', 'Ссылка'];
    const rows = data.map(p =>
        [p.название, p.цена, p.ссылка].join('\t')
    );

    fs.writeFileSync(filename, [headers.join('\t'), ...rows].join('\n'), 'utf8');

    console.log(`Данные сохранены в БД и в файл: ${filename}`);
}

async function main() {
    console.log('=== Парсинг Stradivarius ===');
    console.log('================================\n');

    const url = 'https://www.stradivarius.com/ic/mujer/ropa/sudaderas-n1989';

    try {
        await sequelize.sync();

        const pageRecord = await Page.create({
            url,
            html: 'HTML получен через Puppeteer (Stradivarius)'
        });

        const products = await scrapeStradivarius(url, pageRecord);

        if (products.length === 0) {
            console.log('Данные не получены');
            return;
        }

        saveToTSV(products, 'stradivarius_products.tsv');

    } catch (error) {
        console.error('Ошибка:', error.message);
    }

    console.log('\n=== ЗАВЕРШЕНО ===');
}

main();
