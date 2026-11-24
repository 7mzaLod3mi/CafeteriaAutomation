const { primaryPool, replicaPool } = require('../config/db');

// Kullanıcının rezervasyonlarını listele: okuma -> Replica
async function kullaniciRezervasyonlariGetir(kullaniciId, durum) {
  const params = [kullaniciId];
  let durumKosul = '';
  if (durum && ['aktif', 'kullanildi', 'iptal'].includes(durum)) {
    durumKosul = ' AND r.durum = ?';
    params.push(durum);
  }

  const [rows] = await replicaPool.query(
    `SELECT r.id, r.menu_id, r.durum, r.porsiyon, r.ucret, r.olusturma, r.kullanma_zamani, r.iptal_zamani,
            m.tarih, yh.id AS yemekhane_id, yh.ad AS yemekhane,
            o.id AS ogun_id, o.ad AS ogun, o.sira AS ogun_sira,
            TIMESTAMP(m.tarih, o.son_saat) AS rezervasyon_son,
            (r.durum = 'aktif' AND NOW() < TIMESTAMP(m.tarih, o.son_saat)) AS iptal_edilebilir,
            (d.id IS NOT NULL) AS degerlendirildi
       FROM rezervasyonlar r
       JOIN menuler m ON m.id = r.menu_id
       JOIN yemekhaneler yh ON yh.id = m.yemekhane_id
       JOIN ogunler o ON o.id = m.ogun_id
       LEFT JOIN degerlendirmeler d ON d.menu_id = r.menu_id AND d.kullanici_id = r.kullanici_id
      WHERE r.kullanici_id = ?${durumKosul}
      ORDER BY m.tarih DESC, o.sira ASC, r.olusturma DESC`,
    params
  );
  return rows;
}

// Rezervasyon oluşturma: Stored Procedure -> Primary (autocommit açıkken CALL)
async function rezervasyonYap(kullaniciId, menuId, porsiyon = 'tam') {
  const [resultSets] = await primaryPool.query(
    `CALL sp_rezervasyon_yap(?, ?, ?)`,
    [kullaniciId, menuId, porsiyon]
  );
  return resultSets[0][0];
}

// Rezervasyon iptali: Stored Procedure -> Primary (autocommit açıkken CALL)
async function rezervasyonIptal(kullaniciId, rezervasyonId) {
  const [resultSets] = await primaryPool.query(
    `CALL sp_rezervasyon_iptal(?, ?)`,
    [kullaniciId, rezervasyonId]
  );
  return resultSets[0][0];
}

// Turnike geçişi: Stored Procedure -> Primary
async function turnikeGecis(kullaniciId, yemekhaneId, zaman) {
  const [resultSets] = await primaryPool.query(
    `CALL sp_turnike_gecis(?, ?, ?)`,
    [kullaniciId, yemekhaneId, zaman || null]
  );
  return resultSets[0][0];
}

// Kullanıcının belirli bir menü için kullanılmış rezervasyonu var mı kontrolü (Primary - değerlendirme öncesi)
async function kullanilmisRezervasyonVarMi(kullaniciId, menuId) {
  const [[row]] = await primaryPool.query(
    `SELECT id, durum
       FROM rezervasyonlar
      WHERE kullanici_id = ? AND menu_id = ?
      LIMIT 1`,
    [kullaniciId, menuId]
  );
  return row || null;
}

module.exports = {
  kullaniciRezervasyonlariGetir,
  rezervasyonYap,
  rezervasyonIptal,
  turnikeGecis,
  kullanilmisRezervasyonVarMi
};
