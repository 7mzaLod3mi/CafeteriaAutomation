const menuService = require('../services/menuService');

async function filtreler(req, res, next) {
  try {
    const veri = await menuService.filtreleriGetir();
    return res.json(veri);
  } catch (err) {
    return next(err);
  }
}

async function gununMenusu(req, res, next) {
  try {
    const { yemekhane_id, tarih, ogun_id } = req.query;
    const menu = await menuService.gununMenusuGetir({
      yemekhaneId: yemekhane_id,
      tarih,
      ogunId: ogun_id,
      kullanici: req.kullanici || null
    });
    if (menu && menu.cache_durum) {
      res.set('X-Cache', menu.cache_durum);
    }
    return res.json({ menu });
  } catch (err) {
    return next(err);
  }
}

async function haftalikMenuler(req, res, next) {
  try {
    const { yemekhane_id, baslangic, gun } = req.query;
    const sonuc = await menuService.haftalikMenuleriGetir({
      yemekhaneId: yemekhane_id,
      baslangic,
      gunSayisi: gun,
      kullanici: req.kullanici || null
    });
    return res.json(sonuc);
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  filtreler,
  gununMenusu,
  haftalikMenuler
};
