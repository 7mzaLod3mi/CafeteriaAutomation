const bakiyeService = require('../services/bakiyeService');

async function getir(req, res, next) {
  try {
    const veri = await bakiyeService.bakiyeBilgisiGetir(req.kullanici.id);
    return res.json(veri);
  } catch (err) {
    return next(err);
  }
}

async function yukle(req, res, next) {
  try {
    const { tutar } = req.body || {};
    const sonuc = await bakiyeService.bakiyeYukle(req.kullanici.id, tutar);
    return res.status(201).json(sonuc);
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  getir,
  yukle
};
