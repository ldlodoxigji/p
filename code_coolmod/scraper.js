const puppeteer = require('puppeteer');
const cheerio = require('cheerio');

// ===== БД =====
const ParsedData = require('../models/ParsedData');
// ==============

async function scrapePageWithPuppeteer(url) {
    console.log('?-??????????? ?+???????????? ?????????? Puppeteer...');

    const browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    let page;
    try {
        page = await browser.newPage();
        await page.setViewport({ width: 1920, height: 1080 });
        await page.setUserAgent(
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        );

        page.setDefaultNavigationTimeout(60000);
        page.setDefaultTimeout(60000);

        const attempts = [
            { waitUntil: 'domcontentloaded', timeout: 60000 },
            { waitUntil: 'networkidle2', timeout: 60000 }
        ];

        let lastError;
        for (const options of attempts) {
            try {
                await page.goto(url, options);
                const html = await page.content();
                return html;
            } catch (err) {
                lastError = err;
            }
        }

        throw lastError;
    } finally {
        if (page) {
            try {
                await page.close();
            } catch (err) {
                // ignore close errors
            }
        }
        await browser.close();
    }
}


async function parseProducts(html, pageRecord) {
    const $ = cheerio.load(html);

    const cards = $('.product-card, [data-code^="PROD-"]');
    let saved = 0;

    const normalizePrice = (raw) => {
        if (!raw) return '';
        const cleaned = raw.replace(/\s+/g, ' ').trim();
        const currencyMatch = cleaned.match(/(\d[\d.,]*)\s*(?:EUR|\u20AC)/i);
        const numberMatch = currencyMatch ? currencyMatch[1] : cleaned.match(/\d[\d.,]*/)?.[0];
        if (!numberMatch) return '';

        let normalized = numberMatch.replace(/\s+/g, '');
        if (normalized.includes('.') && normalized.includes(',')) {
            normalized = normalized.replace(/\./g, '').replace(',', '.');
        } else if (normalized.includes(',')) {
            normalized = normalized.replace(',', '.');
        }

        return `${normalized} EUR`;
    };

    const extractPriceFromCard = (card) => {
        const dataPrice = card.find('[data-price]').attr('data-price') || card.attr('data-price');
        let price = normalizePrice(dataPrice);
        if (price) return price;

        const priceNodes = card.find('.price, [class*="price"], [id*="price"]');
        for (let j = 0; j < priceNodes.length; j++) {
            price = normalizePrice($(priceNodes[j]).text());
            if (price) return price;
        }

        return normalizePrice(card.text());
    };

    for (let i = 0; i < cards.length; i++) {
        const el = $(cards[i]);

        const title = el.find('h2, h3, .card-title').first().text().trim();
        const price = extractPriceFromCard(el);

        if (!title || !price) continue;

        await ParsedData.create({
            title,
            price,
            rating: '',
            unitsSold: '',
            category: 'Coolmod',
            PageId: pageRecord.id
        });

        saved++;
        console.log(`Saved: ${title.substring(0, 50)}... | ${price}`);
    }

    console.log(`Parsed items saved: ${saved}`);
}


async function scrapeCoolmod(pageRecord, url = 'https://www.coolmod.com/coolpcs-black/') {
    console.log('=== Парсинг Coolmod ===');

    try {
        const html = await scrapePageWithPuppeteer(url);
        await parseProducts(html, pageRecord);
        console.log('Данные сохранены в БД');

    } catch (error) {
        console.error('Ошибка:', error.message);
    }

    console.log('=== ЗАВЕРШЕНО ===');
}

module.exports = { scrapeCoolmod };
