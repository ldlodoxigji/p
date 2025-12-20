module.exports = {
  apps: [{
    name: 'scheduled-scraper',
    script: './schedule.js',
    instances: 1,
    autorestart: true, // Включаем авторестарт для постоянной работы
    watch: false,
    max_memory_restart: '1G',
    time: true,
    merge_logs: true,
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
    out_file: './logs/scheduled-scraper-out.log',
    error_file: './logs/scheduled-scraper-error.log',
    env: {
      NODE_ENV: 'production'
    }
  }]
};