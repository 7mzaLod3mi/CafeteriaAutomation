const menuRepo = require('../repositories/menuRepository');
const { UygulamaHatasi } = require('../middleware/errorMiddleware');

function kullaniciFiyatiHesapla(rol, ogrenciFiyati, personelFiyati) {
  // İş kuralı: öğrenci indirimli fiyat, personel ve yönetici personel fiyatı öder
  return rol === 'ogrenci' ? Number(ogrenciFiyati) : Number(personelFiyati);
}

function tarihEkle(tarihStr, gun) {
  const [yil, ay, gunNo] = tarihStr.split('-').map(Number);
  const dt = new Date(Date.UTC(yil, ay - 1, gunNo + gun));
  return dt.toISOString().slice(0, 10);
}

function yemekSatiriniBicimle(s) {
  return {
    yemek_id: s.yemek_id,
    yemek: s.yemek,
    kategori: s.kategori,
    kategori_sira: s.kategori_sira,
    kalori: Number(s.kalori),
    vejetaryen: Boolean(s.vejetaryen),
    alerjenler: s.alerjenler ? s.alerjenler.split(', ') : [],
    alerjen_idler: s.alerjen_idler ? s.alerjen_idler.split(',').map(Number) : []
  };
}

async function filtreleriGetir() {
  const [yemekhaneler, ogunler, tarihBilgi] = await Promise.all([
    menuRepo.yemekhaneleriGetir(),
    menuRepo.ogunleriGetir(),
    menuRepo.bugunTarihiGetir()
  ]);
  return {
    bugun: tarihBilgi.bugun,
    simdi: tarihBilgi.simdi,
    yemekhaneler,
    ogunler
  };
}

async function gununMenusuGetir({ yemekhaneId, tarih, ogunId, kullaniciRol }) {
  const yId = Number(yemekhaneId || 1);
  const oId = Number(ogunId || 2);

  let hedefTarih = tarih;
  if (!hedefTarih) {
    const t = await menuRepo.bugunTarihiGetir();
    hedefTarih = t.bugun;
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(hedefTarih)) {
    throw new UygulamaHatasi(400, 'Geçersiz tarih biçimi (YYYY-AA-GG).');
  }

  const sonuc = await menuRepo.gununMenusuGetir(yId, hedefTarih, oId);
  if (!sonuc) {
    return null;
  }

  const ilk = sonuc.detaySatirlari[0];
  const yemekler = sonuc.detaySatirlari.map(yemekSatiriniBicimle);
  const toplamKalori = yemekler.reduce((toplam, y) => toplam + y.kalori, 0);

  return {
    menu_id: ilk.menu_id,
    tarih: ilk.tarih,
    yemekhane_id: ilk.yemekhane_id,
    yemekhane: ilk.yemekhane,
    ogun_id: ilk.ogun_id,
    ogun: ilk.ogun,
    rezervasyon_son: ilk.rezervasyon_son,
    rezervasyon_acik: Boolean(sonuc.doluluk && sonuc.doluluk.rezervasyon_acik),
    ogrenci_fiyati: Number(ilk.ogrenci_fiyati),
    personel_fiyati: Number(ilk.personel_fiyati),
    kullanici_fiyati: kullaniciFiyatiHesapla(kullaniciRol, ilk.ogrenci_fiyati, ilk.personel_fiyati),
    kapasite: sonuc.doluluk ? Number(sonuc.doluluk.kapasite) : 0,
    rezerve: sonuc.doluluk ? Number(sonuc.doluluk.rezerve) : 0,
    bos_yer: sonuc.doluluk ? Number(sonuc.doluluk.bos_yer) : 0,
    doluluk_yuzde: sonuc.doluluk ? Number(sonuc.doluluk.doluluk_yuzde) : 0,
    oy_sayisi: Number(sonuc.puan.oy_sayisi || 0),
    ortalama_puan: sonuc.puan.ortalama_puan !== null ? Number(sonuc.puan.ortalama_puan) : null,
    toplam_kalori: toplamKalori,
    yemekler
  };
}

async function haftalikMenuleriGetir({ yemekhaneId, baslangic, gunSayisi, kullanici }) {
  const yId = yemekhaneId ? Number(yemekhaneId) : null;
  const gun = Math.min(Math.max(Number(gunSayisi || 7), 1), 14);

  let baslangicTarih = baslangic;
  if (!baslangicTarih) {
    const t = await menuRepo.bugunTarihiGetir();
    baslangicTarih = t.bugun;
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(baslangicTarih)) {
    throw new UygulamaHatasi(400, 'Geçersiz başlangıç tarihi.');
  }
  const bitisTarih = tarihEkle(baslangicTarih, gun - 1);

  const { menuler, yemekler } = await menuRepo.haftalikMenuleriGetir(
    yId,
    baslangicTarih,
    bitisTarih,
    kullanici ? kullanici.id : null
  );

  const yemekHarita = new Map();
  for (const s of yemekler) {
    if (!yemekHarita.has(s.menu_id)) {
      yemekHarita.set(s.menu_id, []);
    }
    yemekHarita.get(s.menu_id).push(yemekSatiriniBicimle(s));
  }

  const rol = kullanici ? kullanici.rol : 'ogrenci';
  const hazirMenuler = menuler.map((m) => {
    const menuYemekleri = yemekHarita.get(m.menu_id) || [];
    const toplamKalori = menuYemekleri.reduce((top, y) => top + y.kalori, 0);
    const bosYer = Number(m.bos_yer);
    const sureAcik = Boolean(m.rezervasyon_acik);
    const zatenRezerve = m.kullanici_rezervasyon_durumu === 'aktif' || m.kullanici_rezervasyon_durumu === 'kullanildi';

    let rezerveDurumNotu = null;
    if (zatenRezerve) {
      rezerveDurumNotu = m.kullanici_rezervasyon_durumu === 'kullanildi' ? 'Kullanıldı' : 'Rezerve edildi';
    } else if (!sureAcik) {
      rezerveDurumNotu = 'Son saat geçti';
    } else if (bosYer <= 0) {
      rezerveDurumNotu = 'Kapasite dolu';
    }

    return {
      menu_id: m.menu_id,
      tarih: m.tarih,
      yemekhane_id: m.yemekhane_id,
      yemekhane: m.yemekhane,
      ogun_id: m.ogun_id,
      ogun: m.ogun,
      son_saat: m.son_saat,
      rezervasyon_son: m.rezervasyon_son,
      rezervasyon_acik: sureAcik,
      rezervasyon_yapilabilir: sureAcik && bosYer > 0 && !zatenRezerve,
      rezerve_durum_notu: rezerveDurumNotu,
      kullanici_rezervasyon_durumu: m.kullanici_rezervasyon_durumu || null,
      ogrenci_fiyati: Number(m.ogrenci_fiyati),
      personel_fiyati: Number(m.personel_fiyati),
      kullanici_fiyati: kullaniciFiyatiHesapla(rol, m.ogrenci_fiyati, m.personel_fiyati),
      kapasite: Number(m.kapasite),
      rezerve: Number(m.rezerve),
      bos_yer: bosYer,
      doluluk_yuzde: Number(m.doluluk_yuzde),
      oy_sayisi: Number(m.oy_sayisi || 0),
      ortalama_puan: m.ortalama_puan !== null ? Number(m.ortalama_puan) : null,
      toplam_kalori: toplamKalori,
      yemekler: menuYemekleri
    };
  });

  return {
    baslangic: baslangicTarih,
    bitis: bitisTarih,
    menuler: hazirMenuler
  };
}

module.exports = {
  filtreleriGetir,
  gununMenusuGetir,
  haftalikMenuleriGetir
};
