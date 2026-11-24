const crypto = require('crypto');
const redis = require('../config/redis');

// Aşama 3: Oturumlar Redis'te "oturum:{token}" anahtarıyla 30 dakika TTL ile saklanır.
// Her geçerli istekte EXPIRE ile süre yenilenir; uygulama container'ı yeniden başlasa da oturum düşmez.
const OTURUM_SURESI_SN = 30 * 60; // 1800 saniye (30 dakika)
const OTURUM_SURESI_MS = OTURUM_SURESI_SN * 1000;

function oturumAnahtari(token) {
  return `oturum:${token}`;
}

async function oturumOlustur(kullanici) {
  const token = crypto.randomBytes(32).toString('hex');
  const veri = {
    id: kullanici.id,
    ad: kullanici.ad,
    soyad: kullanici.soyad,
    eposta: kullanici.eposta,
    rol: kullanici.rol,
    ogrenci_no: kullanici.ogrenci_no,
    giris_zamani: new Date().toISOString()
  };

  const anahtar = oturumAnahtari(token);
  await redis.set(anahtar, JSON.stringify(veri), 'EX', OTURUM_SURESI_SN);
  console.log(`[REDIS SESSION SET] key=${anahtar} kullanici=${kullanici.eposta} ttl=${OTURUM_SURESI_SN}s`);
  return token;
}

async function oturumGetir(token) {
  if (!token) return null;
  const anahtar = oturumAnahtari(token);
  const ham = await redis.get(anahtar);
  if (!ham) return null;

  // Sliding expiration: her geçerli istekte oturum süresini 30 dakikaya yenile
  await redis.expire(anahtar, OTURUM_SURESI_SN);
  return JSON.parse(ham);
}

async function oturumSil(token) {
  if (!token) return;
  const anahtar = oturumAnahtari(token);
  const silinen = await redis.del(anahtar);
  console.log(`[REDIS SESSION DEL] key=${anahtar} silinen=${silinen}`);
}

module.exports = {
  oturumOlustur,
  oturumGetir,
  oturumSil,
  OTURUM_SURESI_SN,
  OTURUM_SURESI_MS
};
