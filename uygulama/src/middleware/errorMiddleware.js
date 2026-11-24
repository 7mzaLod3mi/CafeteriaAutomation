class UygulamaHatasi extends Error {
  constructor(status, mesaj) {
    super(mesaj);
    this.status = status;
  }
}

function hataYakalayici(err, req, res, next) {
  // Uygulama katmanından gelen kontrollü iş kuralı hataları
  if (err instanceof UygulamaHatasi) {
    return res.status(err.status).json({ hata: err.message });
  }

  // Stored procedure SIGNAL SQLSTATE '45000' (MySQL errno 1644):
  // Yordamın Türkçe mesajını değiştirmeden arayüze ilet.
  if (err && (err.sqlState === '45000' || err.errno === 1644)) {
    return res.status(400).json({ hata: err.sqlMessage || err.message });
  }

  // Unique key ihlali (ör. aynı tarih/öğün/yemekhane için ikinci menü veya ikinci değerlendirme)
  if (err && err.errno === 1062) {
    return res.status(409).json({ hata: 'Bu kayıt zaten mevcut.' });
  }

  // CHECK kısıtı ihlali (errno 3819): ham SQL hatası kullanıcıya gösterilmez
  if (err && err.errno === 3819) {
    console.error('[CHECK_CONSTRAINT_ERROR]', err.sqlMessage || err.message);
    return res.status(400).json({ hata: 'Girilen değerler sistem kurallarına uygun değil.' });
  }

  console.error('[SERVER_ERROR]', err);
  return res.status(500).json({ hata: 'Sunucu tarafında beklenmeyen bir hata oluştu.' });
}

module.exports = {
  UygulamaHatasi,
  hataYakalayici
};
