const crypto = require('crypto');

// Aşama 2 bellek içi oturum deposu (Aşama 3'te Redis "oturum:{token}" yapısına geçirilecektir)
const OTURUM_SURESI_MS = 30 * 60 * 1000; // 30 dakika
const oturumlar = new Map();

function oturumOlustur(kullanici) {
  const token = crypto.randomBytes(32).toString('hex');
  const veri = {
    id: kullanici.id,
    ad: kullanici.ad,
    soyad: kullanici.soyad,
    eposta: kullanici.eposta,
    rol: kullanici.rol,
    ogrenci_no: kullanici.ogrenci_no
  };
  oturumlar.set(token, {
    veri,
    sonKullanma: Date.now() + OTURUM_SURESI_MS
  });
  return token;
}

function oturumGetir(token) {
  if (!token) return null;
  const kayit = oturumlar.get(token);
  if (!kayit) return null;

  if (Date.now() > kayit.sonKullanma) {
    oturumlar.delete(token);
    return null;
  }

  // Sliding expiration: her geçerli istekte süreyi 30 dakika yenile
  kayit.sonKullanma = Date.now() + OTURUM_SURESI_MS;
  return kayit.veri;
}

function oturumSil(token) {
  if (!token) return;
  oturumlar.delete(token);
}

module.exports = {
  oturumOlustur,
  oturumGetir,
  oturumSil,
  OTURUM_SURESI_MS
};
