const mysql = require('mysql2/promise');

const ortakAyarlar = {
  port: Number(process.env.DB_PORT || 3306),
  database: process.env.DB_ADI || 'yemekhane',
  user: process.env.DB_KULLANICI || 'yemekhane_app',
  password: process.env.DB_SIFRE || 'Uyg_2026',
  charset: 'utf8mb4',
  timezone: '+03:00',
  dateStrings: true,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

// Yazma (Primary / Kaynak) havuzu: INSERT, UPDATE, DELETE, Stored Procedure'ler ve
// yazma sonrası anlık tutarlılık gereken bakiye okumaları için kullanılır.
const primaryPool = mysql.createPool({
  ...ortakAyarlar,
  host: process.env.DB_YAZMA_HOST || 'mysql-primary'
});

// Okuma (Replica / Salt okunur) havuzu: listeleme, menü görüntüleme ve raporlar için kullanılır.
const replicaPool = mysql.createPool({
  ...ortakAyarlar,
  host: process.env.DB_OKUMA_HOST || 'mysql-replica'
});

module.exports = {
  primaryPool,
  replicaPool
};
