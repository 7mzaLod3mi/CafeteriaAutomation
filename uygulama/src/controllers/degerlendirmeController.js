const degerlendirmeService = require('../services/degerlendirmeService');

async function listele(req, res, next) {
  try {
    const veri = await degerlendirmeService.degerlendirmeVerileriniGetir(req.kullanici.id);
    return res.json(veri);
  } catch (err) {
    return next(err);
  }
}

async function olustur(req, res, next) {
  try {
    const { menu_id, puan, yorum } = req.body || {};
    const sonuc = await degerlendirmeService.degerlendirmeOlustur(req.kullanici.id, {
      menu_id,
      puan,
      yorum
    });
    return res.status(201).json(sonuc);
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  listele,
  olustur
};
