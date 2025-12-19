const sequelize = require('./models');
const Page = require('./models/Page');
const ParsedData = require('./models/ParsedData');

module.exports = async function saveToDb(url, products) {
  await sequelize.sync();

  const page = await Page.create({
    url,
    html: 'HTML сохранён в рамках практической работы №3',
  });

  for (const product of products) {
    await ParsedData.create({
      title: product.title,
      price: product.price,
      rating: product.rating,
      unitsSold: product.unitsSold,
      category: product.category,
      PageId: page.id,
    });
  }
};
