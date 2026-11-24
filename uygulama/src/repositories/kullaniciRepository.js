const { primaryPool, replicaPool } = require('../config/db');

// Giriş sırasında kullanıcı arama: salt okuma -> Replica
async function epostaIleGetir(eposta) {
  const [rows] = await replicaPool.query(
    `SELECT id, ad, soyad, eposta, sifre_hash, rol, ogrenci_no, bakiye, aktif
       FROM kullanicilar
      WHERE eposta = ?
      LIMIT 1`,
    [eposta]
  );
  return rows[0] || null;
}

// Rezervasyon/iptal/yükleme sonrası tutarlılık için bakiye ve profil Primary'den okunur
async function idIlePrimaryGetir(kullaniciId) {
  const [rows] = await primaryPool.query(
    `SELECT id, ad, soyad, eposta, rol, ogrenci_no, bakiye, aktif
       FROM kullanicilar
      WHERE id = ?
      LIMIT 1`,
    [kullaniciId]
  );
  return rows[0] || null;
}

// Yönetici paneli turnike testi gibi listelemeler: okuma -> Replica
async function tumKullanicilariGetir() {
  const [rows] = await replicaPool.query(
    `SELECT id, ad, soyad, eposta, rol, ogrenci_no, bakiye, aktif
       FROM kullanicilar
      ORDER BY rol, ad, soyad`
  );
  return rows;
}

// Primary ve Replica bağlantı doğrulaması
async function dbDurumGetir() {
  const [[primary]] = await primaryPool.query(
    `SELECT @@server_id AS server_id, @@read_only AS read_only, @@super_read_only AS super_read_only,
            @@hostname AS hostname, NOW() AS sunucu_zamani`
  );
  const [[replica]] = await replicaPool.query(
    `SELECT @@server_id AS server_id, @@read_only AS read_only, @@super_read_only AS super_read_only,
            @@hostname AS hostname, NOW() AS sunucu_zamani`
  );
  return { primary, replica };
}

module.exports = {
  epostaIleGetir,
  idIlePrimaryGetir,
  tumKullanicilariGetir,
  dbDurumGetir
};
