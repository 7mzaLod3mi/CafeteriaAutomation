const menuRepo = require('../repositories/menuRepository');
const alerjenRepo = require('../repositories/alerjenRepository');
const menuCache = require('./menuCache');
const { UygulamaHatasi } = require('../middleware/errorMiddleware');

function kullaniciFiyatiHesapla(rol, ogrenciFiyati, personelFiyati) {
  // İş kuralı: öğrenci indirimli fiyat, personel ve yönetici personel fiyatı öder
  return rol === 'ogrenci' ? Number(ogrenciFiyati) : Number(personelFiyati);
}

function yarimFiyatHesapla(tamFiyat) {
  // İş kuralı (Aşama 4): yarım porsiyon tam fiyatın %60'ıdır
  return Math.round(Number(tamFiyat) * 60) / 100;
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

// Kullanıcının seçtiği alerjenlere göre her yemeğe uyarı bilgisi ekler.
// Alerjen bilgisi olmayan yemekler için asla yanlış uyarı üretilmez.
async function kullaniciAlerjenBilgisiAl(kullanici) {
  if (!kullanici) {
    return { seciliSet: new Set(), adHarita: new Map() };
  }
  const [seciliIdler, tumAlerjenler] = await Promise.all([
    alerjenRepo.kullaniciAlerjenIdleriGetir(kullanici.id),
    alerjenRepo.tumAlerjenleriGetir()
  ]);
  const seciliSet = new Set(seciliIdler);
  const adHarita = new Map(tumAlerjenler.map((a) => [Number(a.id), a.ad]));
  return { seciliSet, adHarita };
}

function yemeklereAlerjenUyarisiEkle(yemekler, seciliSet, adHarita) {
  let uyariliSayisi = 0;
  const guncelYemekler = yemekler.map((y) => {
    const yemekAlerjenIdler = Array.isArray(y.alerjen_idler) ? y.alerjen_idler : [];
    const eslesenler =
      seciliSet.size > 0 && yemekAlerjenIdler.length > 0
        ? yemekAlerjenIdler
            .filter((id) => seciliSet.has(Number(id)))
            .map((id) => adHarita.get(Number(id)))
            .filter(Boolean)
        : [];

    const uyariVar = eslesenler.length > 0;
    if (uyariVar) uyariliSayisi += 1;

    return {
      ...y,
      alerjen_uyarisi: uyariVar,
      eslesen_alerjenler: eslesenler
    };
  });

  return { yemekler: guncelYemekler, uyariliSayisi };
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

async function gununMenusuGetir({ yemekhaneId, tarih, ogunId, kullanici }) {
  const yId = Number(yemekhaneId || 1);
  const oId = Number(ogunId || 2);
  const kullaniciRol = kullanici ? kullanici.rol : 'ogrenci';

  let hedefTarih = tarih;
  if (!hedefTarih) {
    const t = await menuRepo.bugunTarihiGetir();
    hedefTarih = t.bugun;
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(hedefTarih)) {
    throw new UygulamaHatasi(400, 'Geçersiz tarih biçimi (YYYY-AA-GG).');
  }

  const { seciliSet, adHarita } = await kullaniciAlerjenBilgisiAl(kullanici);

  // 1. Önce Redis önbelleğini kontrol et: menu:{yemekhane_id}:{tarih}:{ogun_id}
  const onbellekVeri = await menuCache.menuGetir(yId, hedefTarih, oId);
  if (onbellekVeri && onbellekVeri.cache_surum === 2) {
    const sonTarih = new Date(String(onbellekVeri.rezervasyon_son).replace(' ', 'T') + '+03:00');
    const kullaniciFiyati = kullaniciFiyatiHesapla(
      kullaniciRol,
      onbellekVeri.ogrenci_fiyati,
      onbellekVeri.personel_fiyati
    );
    const yarimIzinli = Boolean(onbellekVeri.yarim_porsiyon_izinli);
    const { yemekler, uyariliSayisi } = yemeklereAlerjenUyarisiEkle(
      onbellekVeri.yemekler,
      seciliSet,
      adHarita
    );

    return {
      ...onbellekVeri,
      yemekler,
      alerjen_uyarili_yemek_sayisi: uyariliSayisi,
      rezervasyon_acik: Date.now() < sonTarih.getTime(),
      kullanici_fiyati: kullaniciFiyati,
      yarim_kullanici_fiyati: yarimIzinli ? yarimFiyatHesapla(kullaniciFiyati) : null,
      cache_durum: 'HIT',
      kaynak: 'redis'
    };
  }

  // 2. Cache Miss (veya eski şema önbellek) -> MySQL Replica veritabanından oku
  const sonuc = await menuRepo.gununMenusuGetir(yId, hedefTarih, oId);
  if (!sonuc) {
    return null;
  }

  const ilk = sonuc.detaySatirlari[0];
  const hamYemekler = sonuc.detaySatirlari.map(yemekSatiriniBicimle);
  const toplamKalori = hamYemekler.reduce((toplam, y) => toplam + y.kalori, 0);
  const yarimIzinli = Boolean(ilk.yarim_porsiyon_izinli);
  const ogrenciFiyati = Number(ilk.ogrenci_fiyati);
  const personelFiyati = Number(ilk.personel_fiyati);

  const temelMenu = {
    cache_surum: 2,
    menu_id: ilk.menu_id,
    tarih: ilk.tarih,
    yemekhane_id: ilk.yemekhane_id,
    yemekhane: ilk.yemekhane,
    ogun_id: ilk.ogun_id,
    ogun: ilk.ogun,
    yarim_porsiyon_izinli: yarimIzinli,
    rezervasyon_son: ilk.rezervasyon_son,
    ogrenci_fiyati: ogrenciFiyati,
    personel_fiyati: personelFiyati,
    yarim_ogrenci_fiyati: yarimIzinli ? yarimFiyatHesapla(ogrenciFiyati) : null,
    yarim_personel_fiyati: yarimIzinli ? yarimFiyatHesapla(personelFiyati) : null,
    kapasite: sonuc.doluluk ? Number(sonuc.doluluk.kapasite) : 0,
    rezerve: sonuc.doluluk ? Number(sonuc.doluluk.rezerve) : 0,
    bos_yer: sonuc.doluluk ? Number(sonuc.doluluk.bos_yer) : 0,
    doluluk_yuzde: sonuc.doluluk ? Number(sonuc.doluluk.doluluk_yuzde) : 0,
    oy_sayisi: Number(sonuc.puan.oy_sayisi || 0),
    ortalama_puan: sonuc.puan.ortalama_puan !== null ? Number(sonuc.puan.ortalama_puan) : null,
    toplam_kalori: toplamKalori,
    yemekler: hamYemekler
  };

  // 3. Yeni şemaya uygun menü kaydını gün sonuna kadar Redis'e kaydet
  await menuCache.menuKaydet(yId, hedefTarih, oId, temelMenu);

  const kullaniciFiyati = kullaniciFiyatiHesapla(kullaniciRol, ogrenciFiyati, personelFiyati);
  const { yemekler, uyariliSayisi } = yemeklereAlerjenUyarisiEkle(hamYemekler, seciliSet, adHarita);

  return {
    ...temelMenu,
    yemekler,
    alerjen_uyarili_yemek_sayisi: uyariliSayisi,
    rezervasyon_acik: Boolean(sonuc.doluluk && sonuc.doluluk.rezervasyon_acik),
    kullanici_fiyati: kullaniciFiyati,
    yarim_kullanici_fiyati: yarimIzinli ? yarimFiyatHesapla(kullaniciFiyati) : null,
    cache_durum: 'MISS',
    kaynak: 'veritabani'
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

  const [{ menuler, yemekler }, { seciliSet, adHarita }] = await Promise.all([
    menuRepo.haftalikMenuleriGetir(yId, baslangicTarih, bitisTarih, kullanici ? kullanici.id : null),
    kullaniciAlerjenBilgisiAl(kullanici)
  ]);

  const yemekHarita = new Map();
  for (const s of yemekler) {
    if (!yemekHarita.has(s.menu_id)) {
      yemekHarita.set(s.menu_id, []);
    }
    yemekHarita.get(s.menu_id).push(yemekSatiriniBicimle(s));
  }

  const rol = kullanici ? kullanici.rol : 'ogrenci';
  const hazirMenuler = menuler.map((m) => {
    const hamYemekler = yemekHarita.get(m.menu_id) || [];
    const { yemekler: menuYemekleri, uyariliSayisi } = yemeklereAlerjenUyarisiEkle(
      hamYemekler,
      seciliSet,
      adHarita
    );
    const toplamKalori = menuYemekleri.reduce((top, y) => top + y.kalori, 0);
    const bosYer = Number(m.bos_yer);
    const sureAcik = Boolean(m.rezervasyon_acik);
    const yarimIzinli = Boolean(m.yarim_porsiyon_izinli);
    const zatenRezerve =
      m.kullanici_rezervasyon_durumu === 'aktif' || m.kullanici_rezervasyon_durumu === 'kullanildi';
    const kullaniciFiyati = kullaniciFiyatiHesapla(rol, m.ogrenci_fiyati, m.personel_fiyati);

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
      yarim_porsiyon_izinli: yarimIzinli,
      rezervasyon_son: m.rezervasyon_son,
      rezervasyon_acik: sureAcik,
      rezervasyon_yapilabilir: sureAcik && bosYer > 0 && !zatenRezerve,
      rezerve_durum_notu: rezerveDurumNotu,
      kullanici_rezervasyon_durumu: m.kullanici_rezervasyon_durumu || null,
      kullanici_rezervasyon_porsiyon: m.kullanici_rezervasyon_porsiyon || null,
      ogrenci_fiyati: Number(m.ogrenci_fiyati),
      personel_fiyati: Number(m.personel_fiyati),
      kullanici_fiyati: kullaniciFiyati,
      yarim_kullanici_fiyati: yarimIzinli ? yarimFiyatHesapla(kullaniciFiyati) : null,
      kapasite: Number(m.kapasite),
      rezerve: Number(m.rezerve),
      bos_yer: bosYer,
      doluluk_yuzde: Number(m.doluluk_yuzde),
      oy_sayisi: Number(m.oy_sayisi || 0),
      ortalama_puan: m.ortalama_puan !== null ? Number(m.ortalama_puan) : null,
      toplam_kalori: toplamKalori,
      alerjen_uyarili_yemek_sayisi: uyariliSayisi,
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
