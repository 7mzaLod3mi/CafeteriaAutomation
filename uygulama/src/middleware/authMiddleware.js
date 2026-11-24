const sessionStore = require('../services/sessionStore');

const COOKIE_ADI = 'yemekhane_oturum';

function tokenAl(req) {
  if (req.cookies && req.cookies[COOKIE_ADI]) {
    return req.cookies[COOKIE_ADI];
  }
  const auth = req.headers.authorization;
  if (auth && auth.startsWith('Bearer ')) {
    return auth.slice(7).trim();
  }
  return null;
}

async function oturumZorunlu(req, res, next) {
  try {
    const token = tokenAl(req);
    const oturum = await sessionStore.oturumGetir(token);
    if (!oturum) {
      return res.status(401).json({ hata: 'Oturum açmanız gerekiyor.' });
    }
    req.oturumToken = token;
    req.kullanici = oturum;
    return next();
  } catch (err) {
    return next(err);
  }
}

async function oturumOpsiyonel(req, res, next) {
  try {
    const token = tokenAl(req);
    if (token) {
      const oturum = await sessionStore.oturumGetir(token);
      if (oturum) {
        req.oturumToken = token;
        req.kullanici = oturum;
      }
    }
    return next();
  } catch (err) {
    return next(err);
  }
}

function rolZorunlu(...roller) {
  return (req, res, next) => {
    if (!req.kullanici) {
      return res.status(401).json({ hata: 'Oturum açmanız gerekiyor.' });
    }
    if (!roller.includes(req.kullanici.rol)) {
      return res.status(403).json({ hata: 'Bu işlem için yetkiniz bulunmuyor.' });
    }
    return next();
  };
}

module.exports = {
  COOKIE_ADI,
  tokenAl,
  oturumZorunlu,
  oturumOpsiyonel,
  rolZorunlu
};
