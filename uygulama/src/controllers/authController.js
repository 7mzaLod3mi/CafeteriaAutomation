const authService = require('../services/authService');
const { COOKIE_ADI, tokenAl } = require('../middleware/authMiddleware');
const { OTURUM_SURESI_MS } = require('../services/sessionStore');

async function giris(req, res, next) {
  try {
    const { eposta, sifre } = req.body || {};
    const { token, kullanici } = await authService.girisYap(eposta, sifre);

    res.cookie(COOKIE_ADI, token, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: OTURUM_SURESI_MS
    });

    return res.json({
      mesaj: 'Giriş başarılı.',
      kullanici
    });
  } catch (err) {
    return next(err);
  }
}

async function cikis(req, res, next) {
  try {
    const token = tokenAl(req);
    await authService.cikisYap(token);
    res.clearCookie(COOKIE_ADI, { path: '/' });
    return res.json({ mesaj: 'Çıkış yapıldı.' });
  } catch (err) {
    return next(err);
  }
}

async function ben(req, res, next) {
  try {
    const kullanici = await authService.mevcutKullaniciGetir(req.kullanici.id);
    return res.json({ kullanici });
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  giris,
  cikis,
  ben
};
