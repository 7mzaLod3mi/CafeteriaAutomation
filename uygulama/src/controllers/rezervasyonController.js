const rezervasyonService = require('../services/rezervasyonService');

async function listele(req, res, next) {
  try {
    const { durum } = req.query;
    const rezervasyonlar = await rezervasyonService.rezervasyonlariListele(req.kullanici.id, durum);
    return res.json({ rezervasyonlar });
  } catch (err) {
    return next(err);
  }
}

async function olustur(req, res, next) {
  try {
    const { menu_id } = req.body || {};
    const sonuc = await rezervasyonService.rezervasyonYap(req.kullanici.id, menu_id);
    return res.status(201).json(sonuc);
  } catch (err) {
    return next(err);
  }
}

async function iptal(req, res, next) {
  try {
    const sonuc = await rezervasyonService.rezervasyonIptalEt(req.kullanici.id, req.params.id);
    return res.json(sonuc);
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  listele,
  olustur,
  iptal
};
