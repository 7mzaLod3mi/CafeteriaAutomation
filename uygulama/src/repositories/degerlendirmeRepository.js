const { primaryPool, replicaPool } = require('../config/db');

// Kullanıcının değerlendirebileceği (durum='kullanildi' ve henüz oy verilmemiş) menüler (Replica)
async function degerlendirilebilirMenuleriGetir(kullaniciId) {
  const [rows] = await replicaPool.query(
    `SELECT r.id AS rezervasyon_id, r.menu_id, r.kullanma_zamani,
            m.tarih, yh.ad AS yemekhane, o.ad AS ogun, o.sira AS ogun_sira
       FROM rezervasyonlar r
       JOIN menuler m ON m.id = r.menu_id
       JOIN yemekhaneler yh ON yh.id = m.yemekhane_id
       JOIN ogunler o ON o.id = m.ogun_id
       LEFT JOIN degerlendirmeler d ON d.menu_id = r.menu_id AND d.kullanici_id = r.kullanici_id
      WHERE r.kullanici_id = ?
        AND r.durum = 'kullanildi'
        AND d.id IS NULL
      ORDER BY m.tarih DESC, o.sira ASC`,
    [kullaniciId]
  );
  return rows;
}

// Kullanıcının geçmiş değerlendirmeleri (Replica)
async function kullaniciDegerlendirmeleriGetir(kullaniciId) {
  const [rows] = await replicaPool.query(
    `SELECT d.id, d.menu_id, d.puan, d.yorum, d.olusturma,
            m.tarih, yh.ad AS yemekhane, o.ad AS ogun
       FROM degerlendirmeler d
       JOIN menuler m ON m.id = d.menu_id
       JOIN yemekhaneler yh ON yh.id = m.yemekhane_id
       JOIN ogunler o ON o.id = m.ogun_id
      WHERE d.kullanici_id = ?
      ORDER BY d.olusturma DESC`,
    [kullaniciId]
  );
  return rows;
}

// Değerlendirme kaydetme: yazma -> Primary
async function degerlendirmeEkle(kullaniciId, menuId, puan, yorum) {
  const [result] = await primaryPool.query(
    `INSERT INTO degerlendirmeler (kullanici_id, menu_id, puan, yorum)
     VALUES (?, ?, ?, ?)`,
    [kullaniciId, menuId, puan, yorum || null]
  );
  return result.insertId;
}

module.exports = {
  degerlendirilebilirMenuleriGetir,
  kullaniciDegerlendirmeleriGetir,
  degerlendirmeEkle
};
