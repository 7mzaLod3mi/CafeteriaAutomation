const bakiyeRepo = require('../repositories/bakiyeRepository');
const { UygulamaHatasi } = require('../middleware/errorMiddleware');

async function bakiyeBilgisiGetir(kullaniciId) {
  // Güncel bakiye tutarlılık için Primary'den, hareket geçmişi Replica'dan okunur
  const [bakiye, hareketler] = await Promise.all([
    bakiyeRepo.guncelBakiyePrimaryGetir(kullaniciId),
    bakiyeRepo.hareketleriGetir(kullaniciId)
  ]);

  if (bakiye === null) {
    throw new UygulamaHatasi(404, 'Kullanıcı bulunamadı.');
  }

  return {
    bakiye,
    bakiye_kaynak: 'mysql-primary',
    hareketler_kaynak: 'mysql-replica',
    hareketler: hareketler.map((h) => ({
      ...h,
      tutar: Number(h.tutar)
    }))
  };
}

async function bakiyeYukle(kullaniciId, tutar) {
  const sayisalTutar = Number(tutar);
  if (!Number.isFinite(sayisalTutar)) {
    throw new UygulamaHatasi(400, 'Geçerli bir yükleme tutarı giriniz.');
  }

  // İş kuralı (10-1000 TL aralığı dahil) sp_bakiye_yukle tarafından Primary'de doğrulanır
  const spSonuc = await bakiyeRepo.bakiyeYukle(kullaniciId, sayisalTutar);
  const guncelBakiye = await bakiyeRepo.guncelBakiyePrimaryGetir(kullaniciId);

  return {
    mesaj: `${sayisalTutar.toFixed(2)} TL bakiyenize yüklendi.`,
    hareket_id: spSonuc.hareket_id,
    bakiye: guncelBakiye !== null ? guncelBakiye : Number(spSonuc.bakiye),
    bakiye_kaynak: 'mysql-primary'
  };
}

module.exports = {
  bakiyeBilgisiGetir,
  bakiyeYukle
};
