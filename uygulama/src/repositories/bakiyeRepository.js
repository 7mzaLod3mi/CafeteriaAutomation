const { primaryPool, replicaPool } = require('../config/db');

// Güncel bakiye: yazma sonrası tutarlılık için Primary'den okunur
async function guncelBakiyePrimaryGetir(kullaniciId) {
  const [[row]] = await primaryPool.query(
    `SELECT bakiye FROM kullanicilar WHERE id = ? LIMIT 1`,
    [kullaniciId]
  );
  return row ? Number(row.bakiye) : null;
}

// Bakiye hareket geçmişi: listeleme -> Replica
async function hareketleriGetir(kullaniciId) {
  const [rows] = await replicaPool.query(
    `SELECT id, tur, tutar, rezervasyon_id, aciklama, olusturma
       FROM bakiye_hareketleri
      WHERE kullanici_id = ?
      ORDER BY olusturma DESC, id DESC`,
    [kullaniciId]
  );
  return rows;
}

// Bakiye yükleme: Stored Procedure -> Primary (autocommit açıkken CALL)
async function bakiyeYukle(kullaniciId, tutar) {
  const [resultSets] = await primaryPool.query(
    `CALL sp_bakiye_yukle(?, ?)`,
    [kullaniciId, tutar]
  );
  return resultSets[0][0];
}

module.exports = {
  guncelBakiyePrimaryGetir,
  hareketleriGetir,
  bakiyeYukle
};
