const express = require('express');
const cookieParser = require('cookie-parser');

const authRoutes = require('./routes/authRoutes');
const menuRoutes = require('./routes/menuRoutes');
const rezervasyonRoutes = require('./routes/rezervasyonRoutes');
const bakiyeRoutes = require('./routes/bakiyeRoutes');
const degerlendirmeRoutes = require('./routes/degerlendirmeRoutes');
const yoneticiRoutes = require('./routes/yoneticiRoutes');
const profilRoutes = require('./routes/profilRoutes');
const kullaniciRepo = require('./repositories/kullaniciRepository');
const { hataYakalayici } = require('./middleware/errorMiddleware');

const app = express();
const PORT = Number(process.env.PORT || 8000);

app.use(express.json());
app.use(cookieParser());

// Basit istek günlüğü
app.use((req, res, next) => {
  console.log(`[API] ${req.method} ${req.originalUrl}`);
  next();
});

// Sağlık ve bağlantı durumu uç noktaları
app.get('/api/', (req, res) => {
  res.json({
    durum: 'ok',
    servis: 'yemekhane-uygulama',
    mimari: 'Web API + Frontend'
  });
});

app.get('/api/sistem/db-durum', async (req, res, next) => {
  try {
    const durum = await kullaniciRepo.dbDurumGetir();
    res.json({
      yazma_host: process.env.DB_YAZMA_HOST || 'mysql-primary',
      okuma_host: process.env.DB_OKUMA_HOST || 'mysql-replica',
      ...durum
    });
  } catch (err) {
    next(err);
  }
});

// Uygulama rotaları
app.use('/api/auth', authRoutes);
app.use('/api/menuler', menuRoutes);
app.use('/api/rezervasyonlar', rezervasyonRoutes);
app.use('/api/bakiye', bakiyeRoutes);
app.use('/api/degerlendirmeler', degerlendirmeRoutes);
app.use('/api/yonetici', yoneticiRoutes);
app.use('/api/profil', profilRoutes);

// Tanımsız API yolları
app.use('/api', (req, res) => {
  res.status(404).json({ hata: 'İstenen API uç noktası bulunamadı.' });
});

// Merkezi hata yakalayıcı
app.use(hataYakalayici);

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[uygulama] Web API ${PORT} portunda çalışıyor.`);
  console.log(
    `[uygulama] Yazma: ${process.env.DB_YAZMA_HOST || 'mysql-primary'} | Okuma: ${process.env.DB_OKUMA_HOST || 'mysql-replica'}`
  );
});
