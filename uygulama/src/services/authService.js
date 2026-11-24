const bcrypt = require('bcryptjs');
const kullaniciRepo = require('../repositories/kullaniciRepository');
const sessionStore = require('./sessionStore');
const { UygulamaHatasi } = require('../middleware/errorMiddleware');

async function girisYap(eposta, sifre) {
  const temizEposta = String(eposta || '').trim().toLowerCase();
  if (!temizEposta || !sifre) {
    throw new UygulamaHatasi(400, 'E-posta ve şifre zorunludur.');
  }

  const kullanici = await kullaniciRepo.epostaIleGetir(temizEposta);
  if (!kullanici) {
    throw new UygulamaHatasi(401, 'E-posta veya şifre hatalı.');
  }
  if (!kullanici.aktif) {
    throw new UygulamaHatasi(403, 'Hesabınız pasif durumda.');
  }

  const eslesti = await bcrypt.compare(String(sifre), kullanici.sifre_hash);
  if (!eslesti) {
    throw new UygulamaHatasi(401, 'E-posta veya şifre hatalı.');
  }

  const token = await sessionStore.oturumOlustur(kullanici);
  // Giriş sonrası güncel bakiye Primary'den okunur
  const guncel = await kullaniciRepo.idIlePrimaryGetir(kullanici.id);

  return {
    token,
    kullanici: {
      id: guncel.id,
      ad: guncel.ad,
      soyad: guncel.soyad,
      eposta: guncel.eposta,
      rol: guncel.rol,
      ogrenci_no: guncel.ogrenci_no,
      bakiye: Number(guncel.bakiye)
    }
  };
}

async function cikisYap(token) {
  await sessionStore.oturumSil(token);
}

async function mevcutKullaniciGetir(kullaniciId) {
  // Oturum bilgisindeki bakiye Primary üzerinden taze okunur
  const kullanici = await kullaniciRepo.idIlePrimaryGetir(kullaniciId);
  if (!kullanici) {
    throw new UygulamaHatasi(404, 'Kullanıcı bulunamadı.');
  }
  return {
    id: kullanici.id,
    ad: kullanici.ad,
    soyad: kullanici.soyad,
    eposta: kullanici.eposta,
    rol: kullanici.rol,
    ogrenci_no: kullanici.ogrenci_no,
    bakiye: Number(kullanici.bakiye)
  };
}

module.exports = {
  girisYap,
  cikisYap,
  mevcutKullaniciGetir
};
