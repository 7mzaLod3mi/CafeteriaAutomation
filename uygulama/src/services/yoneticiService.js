const menuRepo = require('../repositories/menuRepository');
const menuCache = require('./menuCache');
const rezervasyonRepo = require('../repositories/rezervasyonRepository');
const kullaniciRepo = require('../repositories/kullaniciRepository');
const { UygulamaHatasi } = require('../middleware/errorMiddleware');

function menuVerisiDogrula({ ogrenci_fiyati, personel_fiyati, yemek_idler }) {
  const ogrFiyat = Number(ogrenci_fiyati);
  const perFiyat = Number(personel_fiyati);

  if (!Number.isFinite(ogrFiyat) || ogrFiyat < 0) {
    throw new UygulamaHatasi(400, 'Geçerli bir öğrenci fiyatı giriniz.');
  }
  if (!Number.isFinite(perFiyat) || perFiyat < 0) {
    throw new UygulamaHatasi(400, 'Geçerli bir personel fiyatı giriniz.');
  }

  const benzersizYemekler = Array.from(
    new Set((Array.isArray(yemek_idler) ? yemek_idler : []).map(Number).filter((n) => Number.isInteger(n) && n > 0))
  );
  if (benzersizYemekler.length === 0) {
    throw new UygulamaHatasi(400, 'Menü için en az bir yemek seçmelisiniz.');
  }

  return {
    ogrenci_fiyati: ogrFiyat,
    personel_fiyati: perFiyat,
    yemek_idler: benzersizYemekler
  };
}

async function yoneticiPanelVerileriGetir(yemekhaneId) {
  const yId = yemekhaneId ? Number(yemekhaneId) : null;
  const [rapor, yemekhaneler, ogunler, yemekler, kullanicilar] = await Promise.all([
    menuRepo.yoneticiMenuRaporuGetir(yId),
    menuRepo.yemekhaneleriGetir(),
    menuRepo.ogunleriGetir(),
    menuRepo.tumYemekleriGetir(),
    kullaniciRepo.tumKullanicilariGetir()
  ]);

  return {
    rapor: rapor.map((r) => ({
      ...r,
      ogrenci_fiyati: Number(r.ogrenci_fiyati),
      personel_fiyati: Number(r.personel_fiyati),
      kapasite: Number(r.kapasite),
      rezerve: Number(r.rezerve),
      bos_yer: Number(r.bos_yer),
      doluluk_yuzde: Number(r.doluluk_yuzde),
      oy_sayisi: Number(r.oy_sayisi || 0),
      ortalama_puan: r.ortalama_puan !== null ? Number(r.ortalama_puan) : null
    })),
    yemekhaneler,
    ogunler,
    yemekler,
    kullanicilar
  };
}

async function menuDetayGetir(menuId) {
  const id = Number(menuId);
  if (!Number.isInteger(id) || id <= 0) {
    throw new UygulamaHatasi(400, 'Geçersiz menü numarası.');
  }
  const menu = await menuRepo.menuDetayIdIleGetir(id);
  if (!menu) {
    throw new UygulamaHatasi(404, 'Menü bulunamadı.');
  }
  return {
    ...menu,
    ogrenci_fiyati: Number(menu.ogrenci_fiyati),
    personel_fiyati: Number(menu.personel_fiyati)
  };
}

async function menuOlustur(veri) {
  const yemekhaneId = Number(veri.yemekhane_id);
  const ogunId = Number(veri.ogun_id);
  const tarih = String(veri.tarih || '').trim();

  if (!Number.isInteger(yemekhaneId) || yemekhaneId <= 0) {
    throw new UygulamaHatasi(400, 'Geçerli bir yemekhane seçiniz.');
  }
  if (!Number.isInteger(ogunId) || ogunId <= 0) {
    throw new UygulamaHatasi(400, 'Geçerli bir öğün seçiniz.');
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(tarih)) {
    throw new UygulamaHatasi(400, 'Geçerli bir tarih seçiniz (YYYY-AA-GG).');
  }

  const dogrulanmis = menuVerisiDogrula(veri);
  try {
    const menuId = await menuRepo.menuOlustur({
      yemekhane_id: yemekhaneId,
      tarih,
      ogun_id: ogunId,
      ...dogrulanmis
    });
    await menuCache.menuSil(yemekhaneId, tarih, ogunId);
    return {
      mesaj: 'Yeni menü başarıyla oluşturuldu.',
      menu_id: menuId
    };
  } catch (err) {
    if (err && err.errno === 1062) {
      throw new UygulamaHatasi(409, 'Bu yemekhane, tarih ve öğün için zaten bir menü mevcut.');
    }
    throw err;
  }
}

async function menuGuncelle(menuId, veri) {
  const id = Number(menuId);
  if (!Number.isInteger(id) || id <= 0) {
    throw new UygulamaHatasi(400, 'Geçersiz menü numarası.');
  }
  const dogrulanmis = menuVerisiDogrula(veri);
  const guncellenen = await menuRepo.menuGuncelle(id, dogrulanmis);
  if (!guncellenen) {
    throw new UygulamaHatasi(404, 'Güncellenecek menü bulunamadı.');
  }
  // Yönetici menüyü değiştirdiğinde ilgili Redis önbellek kaydını sil
  await menuCache.menuSil(guncellenen.yemekhane_id, guncellenen.tarih, guncellenen.ogun_id);
  return {
    mesaj: 'Menü başarıyla güncellendi.',
    menu_id: id,
    yemekhane_id: guncellenen.yemekhane_id,
    tarih: guncellenen.tarih,
    ogun_id: guncellenen.ogun_id
  };
}

async function turnikeGecisYap({ kullanici_id, yemekhane_id, zaman }) {
  const kId = Number(kullanici_id);
  const yId = Number(yemekhane_id);
  if (!Number.isInteger(kId) || kId <= 0 || !Number.isInteger(yId) || yId <= 0) {
    throw new UygulamaHatasi(400, 'Geçerli kullanıcı ve yemekhane seçiniz.');
  }
  const sonuc = await rezervasyonRepo.turnikeGecis(kId, yId, zaman || null);
  return {
    mesaj: `${sonuc.ogun} öğünü turnike geçişi onaylandı (Rezervasyon #${sonuc.rezervasyon_id}).`,
    ...sonuc
  };
}

module.exports = {
  yoneticiPanelVerileriGetir,
  menuDetayGetir,
  menuOlustur,
  menuGuncelle,
  turnikeGecisYap
};
