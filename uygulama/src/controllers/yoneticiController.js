const yoneticiService = require('../services/yoneticiService');

async function panel(req, res, next) {
  try {
    const { yemekhane_id } = req.query;
    const veri = await yoneticiService.yoneticiPanelVerileriGetir(yemekhane_id);
    return res.json(veri);
  } catch (err) {
    return next(err);
  }
}

async function menuGetir(req, res, next) {
  try {
    const menu = await yoneticiService.menuDetayGetir(req.params.id);
    return res.json({ menu });
  } catch (err) {
    return next(err);
  }
}

async function menuOlustur(req, res, next) {
  try {
    const sonuc = await yoneticiService.menuOlustur(req.body || {});
    return res.status(201).json(sonuc);
  } catch (err) {
    return next(err);
  }
}

async function menuGuncelle(req, res, next) {
  try {
    const sonuc = await yoneticiService.menuGuncelle(req.params.id, req.body || {});
    return res.json(sonuc);
  } catch (err) {
    return next(err);
  }
}

async function turnikeGecis(req, res, next) {
  try {
    const sonuc = await yoneticiService.turnikeGecisYap(req.body || {});
    return res.json(sonuc);
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  panel,
  menuGetir,
  menuOlustur,
  menuGuncelle,
  turnikeGecis
};
