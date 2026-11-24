const profilService = require('../services/profilService');

async function getir(req, res, next) {
  try {
    const veri = await profilService.profilGetir(req.kullanici.id);
    return res.json(veri);
  } catch (err) {
    return next(err);
  }
}

async function alerjenleriGuncelle(req, res, next) {
  try {
    const { alerjen_idler } = req.body || {};
    const sonuc = await profilService.alerjenleriGuncelle(req.kullanici.id, alerjen_idler);
    return res.json(sonuc);
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  getir,
  alerjenleriGuncelle
};
