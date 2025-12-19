module.exports = {
  apps: [{
    name: 'scheduled-scraper',
    script: './schedule.js',
    instances: 1,
    autorestart: true, // Включаем авторестарт для постоянной работы
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production'
    }
  }]
};