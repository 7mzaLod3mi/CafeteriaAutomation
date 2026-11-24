const degerlendirmeRepo = require('../repositories/degerlendirmeRepository');
const rezervasyonRepo = require('../repositories/rezervasyonRepository');
const { UygulamaHatasi } = require('../middleware/errorMiddleware');

async function degerlendirmeVerileriniGetir(kullaniciId) {
  const [degerlendirilebilir, gecmis] = await Promise.all([
    degerlendirmeRepo.degerlendirilebilirMenuleriGetir(kullaniciId),
    degerlendirmeRepo.kullaniciDegerlendirmeleriGetir(kullaniciId)
  ]);

  return {
    degerlendirilebilir,
    gecmis
  };
}

async function degerlendirmeOlustur(kullaniciId, { menu_id, puan, yorum }) {
  const mId = Number(menu_id);
  const puanSayi = Number(puan);
  const temizYorum = yorum ? String(yorum).trim() : null;

  if (!Number.isInteger(mId) || mId <= 0) {
    throw new UygulamaHatasi(400, 'Geçerli bir menü seçiniz.');
  }
  if (!Number.isInteger(puanSayi) || puanSayi < 1 || puanSayi > 5) {
    throw new UygulamaHatasi(400, 'Puan 1 ile 5 arasında bir tam sayı olmalıdır.');
  }
  if (temizYorum && temizYorum.length > 500) {
    throw new UygulamaHatasi(400, 'Yorum en fazla 500 karakter olabilir.');
  }

  // Uygulama iş kuralı: yalnızca 'kullanildi' durumundaki menüler değerlendirilebilir
  const rez = await rezervasyonRepo.kullanilmisRezervasyonVarMi(kullaniciId, mId);
  if (!rez || rez.durum !== 'kullanildi') {
    throw new UygulamaHatasi(400, 'Yalnızca kullandığınız menüleri değerlendirebilirsiniz.');
  }

  try {
    const id = await degerlendirmeRepo.degerlendirmeEkle(kullaniciId, mId, puanSayi, temizYorum);
    return {
      mesaj: 'Değerlendirmeniz kaydedildi. Teşekkür ederiz.',
      id
    };
  } catch (err) {
    if (err && err.errno === 1062) {
      throw new UygulamaHatasi(409, 'Bu menüyü daha önce değerlendirdiniz.');
    }
    throw err;
  }
}

module.exports = {
  degerlendirmeVerileriniGetir,
  degerlendirmeOlustur
};
