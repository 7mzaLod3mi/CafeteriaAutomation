const { primaryPool, replicaPool } = require('../config/db');

// Tüm 14 alerjeni listele: okuma -> Replica
async function tumAlerjenleriGetir() {
  const [rows] = await replicaPool.query(
    `SELECT id, ad FROM alerjenler ORDER BY id`
  );
  return rows;
}

// Kullanıcının seçtiği alerjen ID'leri: profil güncellendikten hemen sonra
// menüde gecikmesiz uyarı gösterilmesi için Primary'den okunur.
async function kullaniciAlerjenIdleriGetir(kullaniciId) {
  const [rows] = await primaryPool.query(
    `SELECT alerjen_id
       FROM kullanici_alerjenleri
      WHERE kullanici_id = ?
      ORDER BY alerjen_id`,
    [kullaniciId]
  );
  return rows.map((r) => Number(r.alerjen_id));
}

// Kullanıcının alerjen tercihlerini kaydet: yazma -> Primary (transaction)
async function kullaniciAlerjenleriGuncelle(kullaniciId, alerjenIdler) {
  const conn = await primaryPool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.query(
      `DELETE FROM kullanici_alerjenleri WHERE kullanici_id = ?`,
      [kullaniciId]
    );

    if (alerjenIdler.length > 0) {
      const degerler = alerjenIdler.map((aId) => [kullaniciId, aId]);
      await conn.query(
        `INSERT INTO kullanici_alerjenleri (kullanici_id, alerjen_id) VALUES ?`,
        [degerler]
      );
    }

    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

module.exports = {
  tumAlerjenleriGetir,
  kullaniciAlerjenIdleriGetir,
  kullaniciAlerjenleriGuncelle
};
