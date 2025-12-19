const puppeteer = require('puppeteer');
const cheerio = require('cheerio');

// ===== БД =====
const sequelize = require('../models');
const Page = require('../models/Page');
const ParsedData = require('../models/ParsedData');
// ==============

async function scrapePageWithPuppeteer(url, pageRecord) {
    console.log('Запускаем браузер через Puppeteer...');

    const browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });
    await page.setUserAgent(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    );

    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    const html = await page.content();
    await browser.close();

    return await parseProducts(html, pageRecord);
}

async function parseProducts(html, pageRecord) {
    const $ = cheerio.load(html);

    const cards = $('.product-card, [data-code^="PROD-"]');
    let saved = 0;

    for (let i = 0; i < cards.length; i++) {
        const el = $(cards[i]);

        const title = el.find('h2, h3, .card-title').first().text().trim();
        const priceMatch = el.text().match(/([\d.,]+)\s*€/);

        if (!title || !priceMatch) continue;

        const price = priceMatch[1].replace(',', '.') + ' €';

        await ParsedData.create({
            title,
            price,
            rating: '',
            unitsSold: '',
            category: 'Coolmod',
            PageId: pageRecord.id
        });

        saved++;
        console.log(`Добавлен: ${title.substring(0, 50)}... | ${price}`);
    }

    console.log(`Успешно спарсено товаров: ${saved}`);
}

async function main() {
    console.log('=== Парсинг Coolmod ===');

    const url = 'https://www.coolmod.com/coolpcs-black/';

    try {
        await sequelize.sync();

        const pageRecord = await Page.create({
            url,
            html: 'HTML получен через Puppeteer (Coolmod)'
        });

        await scrapePageWithPuppeteer(url, pageRecord);
        console.log('Данные сохранены в БД');

    } catch (error) {
        console.error('Ошибка:', error.message);
    }

    console.log('=== ЗАВЕРШЕНО ===');
}

main();
