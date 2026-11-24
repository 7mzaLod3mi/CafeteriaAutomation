const { primaryPool, replicaPool } = require('../config/db');

async function yemekhaneleriGetir() {
  const [rows] = await replicaPool.query(
    `SELECT id, ad, konum, kapasite FROM yemekhaneler ORDER BY id`
  );
  return rows;
}

async function ogunleriGetir() {
  const [rows] = await replicaPool.query(
    `SELECT id, ad, sira, son_saat, servis_baslangic, servis_bitis
       FROM ogunler
      ORDER BY sira`
  );
  return rows;
}

async function bugunTarihiGetir() {
  const [[row]] = await replicaPool.query(`SELECT CURDATE() AS bugun, NOW() AS simdi`);
  return row;
}

async function tumYemekleriGetir() {
  const [rows] = await replicaPool.query(
    `SELECT y.id, y.ad, y.kalori, y.vejetaryen,
            k.id AS kategori_id, k.ad AS kategori, k.sira AS kategori_sira
       FROM yemekler y
       JOIN yemek_kategorileri k ON k.id = y.kategori_id
      ORDER BY k.sira, y.ad`
  );
  return rows;
}

// Günün menüsü: v_menu_detay + v_menu_doluluk + v_menu_puan (Replica)
async function gununMenusuGetir(yemekhaneId, tarih, ogunId) {
  const [detaySatirlari] = await replicaPool.query(
    `SELECT menu_id, tarih, yemekhane_id, yemekhane, ogun_id, ogun, ogun_sira,
            yarim_porsiyon_izinli,
            rezervasyon_son, ogrenci_fiyati, personel_fiyati,
            yemek_id, yemek, kategori_id, kategori, kategori_sira,
            kalori, vejetaryen, alerjenler, alerjen_idler
       FROM v_menu_detay
      WHERE yemekhane_id = ? AND tarih = ? AND ogun_id = ?
      ORDER BY kategori_sira, yemek`,
    [yemekhaneId, tarih, ogunId]
  );

  if (detaySatirlari.length === 0) {
    return null;
  }

  const menuId = detaySatirlari[0].menu_id;
  const [[doluluk]] = await replicaPool.query(
    `SELECT kapasite, rezerve, bos_yer, doluluk_yuzde, rezervasyon_son,
            (NOW() < rezervasyon_son) AS rezervasyon_acik
       FROM v_menu_doluluk
      WHERE menu_id = ?`,
    [menuId]
  );
  const [[puan]] = await replicaPool.query(
    `SELECT oy_sayisi, ortalama_puan
       FROM v_menu_puan
      WHERE menu_id = ?`,
    [menuId]
  );

  return {
    detaySatirlari,
    doluluk: doluluk || null,
    puan: puan || { oy_sayisi: 0, ortalama_puan: null }
  };
}

// Haftalık menü: v_menu_doluluk + v_menu_puan + menuler + v_menu_detay (Replica)
async function haftalikMenuleriGetir(yemekhaneId, baslangicTarih, bitisTarih, kullaniciId) {
  const params = [baslangicTarih, bitisTarih];
  let yemekhaneKosul = '';
  if (yemekhaneId) {
    yemekhaneKosul = ' AND d.yemekhane_id = ?';
    params.push(yemekhaneId);
  }

  const [menuler] = await replicaPool.query(
    `SELECT d.menu_id, d.tarih, d.yemekhane_id, d.yemekhane, d.ogun_id, d.ogun,
            o.sira AS ogun_sira, o.son_saat, o.yarim_porsiyon_izinli,
            m.ogrenci_fiyati, m.personel_fiyati,
            d.kapasite, d.rezerve, d.bos_yer, d.doluluk_yuzde, d.rezervasyon_son,
            (NOW() < d.rezervasyon_son) AS rezervasyon_acik,
            p.oy_sayisi, p.ortalama_puan,
            r.id AS kullanici_rezervasyon_id,
            r.durum AS kullanici_rezervasyon_durumu,
            r.porsiyon AS kullanici_rezervasyon_porsiyon
       FROM v_menu_doluluk d
       JOIN menuler m ON m.id = d.menu_id
       JOIN ogunler o ON o.id = d.ogun_id
       LEFT JOIN v_menu_puan p ON p.menu_id = d.menu_id
       LEFT JOIN rezervasyonlar r ON r.menu_id = d.menu_id AND r.kullanici_id = ?
      WHERE d.tarih BETWEEN ? AND ?${yemekhaneKosul}
      ORDER BY d.tarih ASC, d.yemekhane_id ASC, o.sira ASC`,
    [kullaniciId || 0, ...params]
  );

  if (menuler.length === 0) {
    return { menuler: [], yemekler: [] };
  }

  const menuIdler = menuler.map((m) => m.menu_id);
  const [yemekler] = await replicaPool.query(
    `SELECT menu_id, yemek_id, yemek, kategori, kategori_sira, kalori, vejetaryen, alerjenler, alerjen_idler
       FROM v_menu_detay
      WHERE menu_id IN (?)
      ORDER BY menu_id, kategori_sira, yemek`,
    [menuIdler]
  );

  return { menuler, yemekler };
}

// Yönetici paneli doluluk ve puan raporu (Replica)
async function yoneticiMenuRaporuGetir(yemekhaneId) {
  const params = [];
  let kosul = '';
  if (yemekhaneId) {
    kosul = ' WHERE d.yemekhane_id = ?';
    params.push(yemekhaneId);
  }

  const [rows] = await replicaPool.query(
    `SELECT d.menu_id, d.tarih, d.yemekhane_id, d.yemekhane, d.ogun_id, d.ogun,
            o.sira AS ogun_sira,
            m.ogrenci_fiyati, m.personel_fiyati,
            d.kapasite, d.rezerve, d.bos_yer, d.doluluk_yuzde, d.rezervasyon_son,
            p.oy_sayisi, p.ortalama_puan,
            (SELECT COUNT(*) FROM menu_yemekleri my WHERE my.menu_id = d.menu_id) AS yemek_sayisi
       FROM v_menu_doluluk d
       JOIN menuler m ON m.id = d.menu_id
       JOIN ogunler o ON o.id = d.ogun_id
       LEFT JOIN v_menu_puan p ON p.menu_id = d.menu_id
       ${kosul}
      ORDER BY d.tarih DESC, d.yemekhane_id ASC, o.sira ASC`,
    params
  );
  return rows;
}

async function menuDetayIdIleGetir(menuId) {
  const [[menu]] = await replicaPool.query(
    `SELECT m.id AS menu_id, m.yemekhane_id, m.tarih, m.ogun_id,
            m.ogrenci_fiyati, m.personel_fiyati,
            yh.ad AS yemekhane, o.ad AS ogun
       FROM menuler m
       JOIN yemekhaneler yh ON yh.id = m.yemekhane_id
       JOIN ogunler o ON o.id = m.ogun_id
      WHERE m.id = ?`,
    [menuId]
  );
  if (!menu) return null;

  const [yemekRows] = await replicaPool.query(
    `SELECT yemek_id FROM menu_yemekleri WHERE menu_id = ?`,
    [menuId]
  );
  menu.yemek_idler = yemekRows.map((r) => r.yemek_id);
  return menu;
}

// Menü oluşturma: yazma -> Primary (transaction içinde menuler + menu_yemekleri)
async function menuOlustur({ yemekhane_id, tarih, ogun_id, ogrenci_fiyati, personel_fiyati, yemek_idler }) {
  const conn = await primaryPool.getConnection();
  try {
    await conn.beginTransaction();
    const [result] = await conn.query(
      `INSERT INTO menuler (yemekhane_id, tarih, ogun_id, ogrenci_fiyati, personel_fiyati)
       VALUES (?, ?, ?, ?, ?)`,
      [yemekhane_id, tarih, ogun_id, ogrenci_fiyati, personel_fiyati]
    );
    const menuId = result.insertId;

    const degerler = yemek_idler.map((yemekId) => [menuId, yemekId]);
    await conn.query(`INSERT INTO menu_yemekleri (menu_id, yemek_id) VALUES ?`, [degerler]);

    await conn.commit();
    return menuId;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

// Menü düzenleme: yazma -> Primary (fiyat ve yemek listesi güncelleme)
async function menuGuncelle(menuId, { ogrenci_fiyati, personel_fiyati, yemek_idler }) {
  const conn = await primaryPool.getConnection();
  try {
    await conn.beginTransaction();
    const [[mevcut]] = await conn.query(
      `SELECT id, yemekhane_id, tarih, ogun_id FROM menuler WHERE id = ? FOR UPDATE`,
      [menuId]
    );
    if (!mevcut) {
      await conn.rollback();
      return null;
    }

    await conn.query(
      `UPDATE menuler
          SET ogrenci_fiyati = ?, personel_fiyati = ?
        WHERE id = ?`,
      [ogrenci_fiyati, personel_fiyati, menuId]
    );

    await conn.query(`DELETE FROM menu_yemekleri WHERE menu_id = ?`, [menuId]);
    const degerler = yemek_idler.map((yemekId) => [menuId, yemekId]);
    await conn.query(`INSERT INTO menu_yemekleri (menu_id, yemek_id) VALUES ?`, [degerler]);

    await conn.commit();
    return mevcut;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

module.exports = {
  yemekhaneleriGetir,
  ogunleriGetir,
  bugunTarihiGetir,
  tumYemekleriGetir,
  gununMenusuGetir,
  haftalikMenuleriGetir,
  yoneticiMenuRaporuGetir,
  menuDetayIdIleGetir,
  menuOlustur,
  menuGuncelle
};
