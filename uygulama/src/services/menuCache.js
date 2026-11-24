const redis = require('../config/redis');

// Anahtar biçimi: menu:{yemekhane_id}:{tarih}:{ogun_id}
function menuAnahtari(yemekhaneId, tarih, ogunId) {
  const temizTarih = String(tarih).slice(0, 10);
  return `menu:${yemekhaneId}:${temizTarih}:${ogunId}`;
}

// İlgili günün sonuna (23:59:59 +03:00) kadar kalan saniye
function gunSonunaKalanSaniye(tarih) {
  const temizTarih = String(tarih).slice(0, 10);
  const gunSonu = new Date(`${temizTarih}T23:59:59+03:00`);
  const kalanSn = Math.floor((gunSonu.getTime() - Date.now()) / 1000);
  return kalanSn;
}

async function menuGetir(yemekhaneId, tarih, ogunId) {
  const anahtar = menuAnahtari(yemekhaneId, tarih, ogunId);
  const ham = await redis.get(anahtar);
  if (!ham) {
    console.log(`[REDIS CACHE MISS] key=${anahtar} -> MySQL Replica'dan okunuyor`);
    return null;
  }
  console.log(`[REDIS CACHE HIT] key=${anahtar} -> Redis önbelleğinden sunuldu`);
  return JSON.parse(ham);
}

async function menuKaydet(yemekhaneId, tarih, ogunId, menuVerisi) {
  const anahtar = menuAnahtari(yemekhaneId, tarih, ogunId);
  const ttl = gunSonunaKalanSaniye(tarih);
  if (ttl <= 0) {
    console.log(`[REDIS CACHE SKIP] key=${anahtar} geçmiş tarih (ttl=${ttl}s)`);
    return;
  }
  await redis.set(anahtar, JSON.stringify(menuVerisi), 'EX', ttl);
  console.log(`[REDIS CACHE SET] key=${anahtar} ttl=${ttl}s (gün sonuna kadar)`);
}

async function menuSil(yemekhaneId, tarih, ogunId) {
  const anahtar = menuAnahtari(yemekhaneId, tarih, ogunId);
  const silinen = await redis.del(anahtar);
  console.log(`[REDIS CACHE INVALIDATE] key=${anahtar} silinen=${silinen}`);
  return silinen;
}

module.exports = {
  menuAnahtari,
  gunSonunaKalanSaniye,
  menuGetir,
  menuKaydet,
  menuSil
};
