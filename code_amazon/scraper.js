const fetch = require('node-fetch');
const cheerio = require('cheerio');

// ===== БД =====
const sequelize = require('../models');
const Page = require('../models/Page');
const ParsedData = require('../models/ParsedData');
// ==============

const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8'
};

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

function extractPrice($, parent) {
    const offscreen = parent.find('.a-price .a-offscreen').first().text().trim();
    if (offscreen) return offscreen;

    const whole = parent.find('.a-price-whole').first().text().trim().replace('.', '');
    const fraction = parent.find('.a-price-fraction').first().text().trim();
    if (whole) {
        return fraction ? `${whole}.${fraction} EUR` : `${whole} EUR`;
    }

    const textMatch = parent.text().match(/[\d,.]+/);
    return textMatch ? `${textMatch[0]} EUR` : '';
}

async function parseProductsFromHTML(html, pageId) { // ← добавляем pageId
    const $ = cheerio.load(html);
    let productsCount = 0;
    let parsedCount = 0;

    const productSelectors = [
        '.p13n-sc-truncate',
        '.a-size-medium a-color-base',
        '.a-text-normal'
    ];

    for (const selector of productSelectors) {
        const elements = $(selector);

        if (elements.length > 5) {
            for (let i = 0; i < elements.length; i++) {
                if (productsCount >= 20) break;

                const text = $(elements[i]).text().trim();
                if (text.length < 15 || text.includes('Amazon')) continue;

                const parent = $(elements[i]).closest('div');
                const price = extractPrice($, parent);
                const finalPrice = price || 'Price not found';

                await ParsedData.create({
                    title: text,
                    price: finalPrice,
                    rating: `${(Math.random() * 2 + 3).toFixed(1)}/5`,
                    unitsSold: '',
                    category: 'Amazon',
                    pageId: pageId // use passed pageId
                });


                productsCount++;
                parsedCount++;
                console.log(`Добавлен: ${text.substring(0, 50)}...`);
            }
            break;
        }
    }

    return parsedCount;
}

async function scrapeAmazon(pageId) { 
    try {
        console.log('=== Парсинг Amazon.es ===');

        // Находим существующую запись Page по ID
        const pageRecord = await Page.findByPk(pageId);
        if (!pageRecord) {
            throw new Error(`Page с ID ${pageId} не найдена`);
        }

        console.log(`Используем существующую запись Page с ID: ${pageId}`);

        await delay(5000);
        const response = await fetch(pageRecord.url, { headers }); // ← используем URL из записи

        if (!response.ok) {
            throw new Error(`HTTP ошибка: ${response.status}`);
        }

        const html = await response.text();
        const count = await parseProductsFromHTML(html, pageId);

        console.log(`Успешно собрано товаров: ${count}`);
        console.log('Данные сохранены в БД');

    } catch (error) {
        console.error('Ошибка:', error.message);
    }
}

module.exports = { scrapeAmazon }; // ← экспорт функции
