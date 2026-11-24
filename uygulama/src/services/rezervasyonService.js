const rezervasyonRepo = require('../repositories/rezervasyonRepository');
const bakiyeRepo = require('../repositories/bakiyeRepository');
const { UygulamaHatasi } = require('../middleware/errorMiddleware');

async function rezervasyonlariListele(kullaniciId, durum) {
  const satirlar = await rezervasyonRepo.kullaniciRezervasyonlariGetir(kullaniciId, durum);
  return satirlar.map((r) => ({
    ...r,
    porsiyon: r.porsiyon || 'tam',
    ucret: Number(r.ucret),
    iptal_edilebilir: Boolean(r.iptal_edilebilir),
    degerlendirildi: Boolean(r.degerlendirildi)
  }));
}

async function rezervasyonYap(kullaniciId, menuId, porsiyon = 'tam') {
  const mId = Number(menuId);
  if (!Number.isInteger(mId) || mId <= 0) {
    throw new UygulamaHatasi(400, 'Geçerli bir menü seçiniz.');
  }

  const temizPorsiyon = String(porsiyon || 'tam').trim().toLowerCase();
  if (!['tam', 'yarim'].includes(temizPorsiyon)) {
    throw new UygulamaHatasi(400, 'Geçersiz porsiyon seçimi.');
  }

  // Yazma: sp_rezervasyon_yap Primary üzerinde çalışır (kahvaltı kontrolü ve %60 ücret yordamda)
  const spSonuc = await rezervasyonRepo.rezervasyonYap(kullaniciId, mId, temizPorsiyon);

  // Replikasyon gecikmesine karşı güncel bakiye doğrudan Primary'den okunur
  const guncelBakiye = await bakiyeRepo.guncelBakiyePrimaryGetir(kullaniciId);

  const porsiyonMetni = spSonuc.porsiyon === 'yarim' ? 'Yarım porsiyon' : 'Tam porsiyon';
  return {
    mesaj: `${porsiyonMetni} rezervasyonunuz başarıyla oluşturuldu.`,
    rezervasyon_id: spSonuc.rezervasyon_id,
    porsiyon: spSonuc.porsiyon,
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
