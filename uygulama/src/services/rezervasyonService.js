const rezervasyonRepo = require('../repositories/rezervasyonRepository');
const bakiyeRepo = require('../repositories/bakiyeRepository');
const { UygulamaHatasi } = require('../middleware/errorMiddleware');

async function rezervasyonlariListele(kullaniciId, durum) {
  const satirlar = await rezervasyonRepo.kullaniciRezervasyonlariGetir(kullaniciId, durum);
  return satirlar.map((r) => ({
    ...r,
    ucret: Number(r.ucret),
    iptal_edilebilir: Boolean(r.iptal_edilebilir),
    degerlendirildi: Boolean(r.degerlendirildi)
  }));
}

async function rezervasyonYap(kullaniciId, menuId) {
  const mId = Number(menuId);
  if (!Number.isInteger(mId) || mId <= 0) {
    throw new UygulamaHatasi(400, 'Geçerli bir menü seçiniz.');
  }

  // Yazma: sp_rezervasyon_yap Primary üzerinde çalışır
  const spSonuc = await rezervasyonRepo.rezervasyonYap(kullaniciId, mId);

  // Replikasyon gecikmesine karşı güncel bakiye doğrudan Primary'den okunur
  const guncelBakiye = await bakiyeRepo.guncelBakiyePrimaryGetir(kullaniciId);

  return {
    mesaj: 'Rezervasyonunuz başarıyla oluşturuldu.',
    rezervasyon_id: spSonuc.rezervasyon_id,
    ucret: Number(spSonuc.ucret),
    bakiye: guncelBakiye !== null ? guncelBakiye : Number(spSonuc.bakiye),
    bakiye_kaynak: 'mysql-primary'
  };
}

async function rezervasyonIptalEt(kullaniciId, rezervasyonId) {
  const rId = Number(rezervasyonId);
  if (!Number.isInteger(rId) || rId <= 0) {
    throw new UygulamaHatasi(400, 'Geçerli bir rezervasyon numarası gereklidir.');
  }

  // Yazma: sp_rezervasyon_iptal Primary üzerinde çalışır
  const spSonuc = await rezervasyonRepo.rezervasyonIptal(kullaniciId, rId);

  // İptal ve iade sonrası güncel bakiye doğrudan Primary'den okunur
  const guncelBakiye = await bakiyeRepo.guncelBakiyePrimaryGetir(kullaniciId);

  return {
    mesaj: 'Rezervasyonunuz iptal edildi ve ücret bakiyenize iade edildi.',
    rezervasyon_id: spSonuc.rezervasyon_id,
    iade: Number(spSonuc.iade),
    bakiye: guncelBakiye !== null ? guncelBakiye : Number(spSonuc.bakiye),
    bakiye_kaynak: 'mysql-primary'
  };
}

module.exports = {
  rezervasyonlariListele,
  rezervasyonYap,
  rezervasyonIptalEt
};
