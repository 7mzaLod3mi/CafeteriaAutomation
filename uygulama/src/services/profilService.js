const alerjenRepo = require('../repositories/alerjenRepository');
const kullaniciRepo = require('../repositories/kullaniciRepository');
const { UygulamaHatasi } = require('../middleware/errorMiddleware');

async function profilGetir(kullaniciId) {
  const [kullanici, alerjenler, seciliAlerjenIdler] = await Promise.all([
    kullaniciRepo.idIlePrimaryGetir(kullaniciId),
    alerjenRepo.tumAlerjenleriGetir(),
    alerjenRepo.kullaniciAlerjenIdleriGetir(kullaniciId)
  ]);

  if (!kullanici) {
    throw new UygulamaHatasi(404, 'Kullanıcı bulunamadı.');
  }

  return {
    kullanici: {
      id: kullanici.id,
      ad: kullanici.ad,
      soyad: kullanici.soyad,
      eposta: kullanici.eposta,
      rol: kullanici.rol,
      ogrenci_no: kullanici.ogrenci_no,
      bakiye: Number(kullanici.bakiye)
    },
    alerjenler,
    secili_alerjen_idler: seciliAlerjenIdler
  };
}

async function alerjenleriGuncelle(kullaniciId, alerjenIdler) {
  if (!Array.isArray(alerjenIdler)) {
    throw new UygulamaHatasi(400, 'Geçerli bir alerjen listesi gönderiniz.');
  }

  const tumAlerjenler = await alerjenRepo.tumAlerjenleriGetir();
  const gecerliIdSet = new Set(tumAlerjenler.map((a) => Number(a.id)));

  const temizIdler = Array.from(
    new Set(alerjenIdler.map(Number).filter((id) => Number.isInteger(id) && gecerliIdSet.has(id)))
  ).sort((a, b) => a - b);

  await alerjenRepo.kullaniciAlerjenleriGuncelle(kullaniciId, temizIdler);

  return {
    mesaj: 'Alerjen tercihleriniz güncellendi.',
    secili_alerjen_idler: temizIdler
  };
}

module.exports = {
  profilGetir,
  alerjenleriGuncelle
};
