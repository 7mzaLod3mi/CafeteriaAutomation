document.addEventListener('DOMContentLoaded', async () => {
  const kullanici = await Yemekhane.oturumKontrol({
    zorunlu: true,
    aktifSayfa: 'gunun-menusu'
  });
  if (!kullanici) return;

  const yemekhaneSec = document.getElementById('yemekhane-sec');
  const ogunSec = document.getElementById('ogun-sec');
  const tarihSec = document.getElementById('tarih-sec');
  const menuAlani = document.getElementById('menu-alani');
  const bildirim = document.getElementById('gunun-bildirim');

  async function menuYukle() {
    Yemekhane.bildirimGizle(bildirim);
    menuAlani.innerHTML = '<p class="bos-durum">Menü yükleniyor…</p>';

    try {
      const qs = new URLSearchParams({
        yemekhane_id: yemekhaneSec.value,
        ogun_id: ogunSec.value,
        tarih: tarihSec.value
      });
      const { menu } = await Yemekhane.apiIstek(`/api/menuler/gunun?${qs.toString()}`);

      if (!menu) {
        menuAlani.innerHTML = '<p class="bos-durum">Seçilen yemekhane, tarih ve öğün için tanımlı menü bulunamadı.</p>';
        return;
      }

      const yemekHtml = menu.yemekler
        .map((y) => {
          const alerjenRozetleri = y.alerjenler.length
            ? y.alerjenler
                .map((a) => `<span class="rozet rozet-alerjen">${Yemekhane.escapeHtml(a)}</span>`)
                .join('')
            : '';

          const vejetaryenRozet = y.vejetaryen
            ? '<span class="rozet rozet-vejetaryen">Vejetaryen</span>'
            : '';

          return `
            <article class="yemek-kart">
              <div class="yemek-ikon">${Yemekhane.kategoriIkonu(y.kategori)}</div>
              <span class="yemek-kategori">${Yemekhane.escapeHtml(y.kategori)}</span>
              <h3 class="yemek-ad">${Yemekhane.escapeHtml(y.yemek)}</h3>
              <div class="rozet-satir">
                <span class="rozet rozet-kalori">${y.kalori} kcal</span>
                ${vejetaryenRozet}
                ${alerjenRozetleri}
              </div>
            </article>
          `;
        })
        .join('');

      const puanMetni =
        menu.ortalama_puan !== null
          ? `${menu.ortalama_puan.toFixed(2)} / 5 (${menu.oy_sayisi} oy)`
          : 'Henüz oy yok';

      menuAlani.innerHTML = `
        <div class="kart-baslik">
          <div class="menu-kart-ust">
            <div class="yemek-ikon">${Yemekhane.ogunIkonu(menu.ogun)}</div>
            <div>
              <h2>${Yemekhane.escapeHtml(menu.yemekhane)} · ${Yemekhane.escapeHtml(menu.ogun)}</h2>
              <small>${Yemekhane.escapeHtml(Yemekhane.tarihBicimle(menu.tarih))} · Son rezervasyon: ${Yemekhane.escapeHtml(Yemekhane.zamanBicimle(menu.rezervasyon_son))}</small>
            </div>
          </div>
          <span class="rozet rozet-fiyat">${Yemekhane.paraBicimle(menu.kullanici_fiyati)}</span>
        </div>

        <div class="ozet-kutular">
          <div class="ozet-kutu altin">
            <span>Toplam Kalori</span>
            <strong>${menu.toplam_kalori} kcal</strong>
          </div>
          <div class="ozet-kutu">
            <span>Boş Yer</span>
            <strong>${menu.bos_yer} / ${menu.kapasite}</strong>
          </div>
          <div class="ozet-kutu">
            <span>Öğrenci / Personel</span>
            <strong>${Yemekhane.paraBicimle(menu.ogrenci_fiyati)} / ${Yemekhane.paraBicimle(menu.personel_fiyati)}</strong>
          </div>
          <div class="ozet-kutu">
            <span>Ortalama Puan</span>
            <strong>${Yemekhane.escapeHtml(puanMetni)}</strong>
          </div>
        </div>

        <div class="yemek-izgara">${yemekHtml}</div>

        <div class="menu-kart-alt" style="margin-top: 1.1rem;">
          <small>Rezervasyon Primary sunucuda <code>sp_rezervasyon_yap</code> ile yapılır.</small>
          <button type="button" id="hizli-rezerve-btn" class="dugme" ${menu.rezervasyon_acik && menu.bos_yer > 0 ? '' : 'disabled'}>
            ${!menu.rezervasyon_acik ? 'Rezervasyon Süresi Doldu' : menu.bos_yer <= 0 ? 'Kapasite Dolu' : 'Rezervasyon Yap'}
          </button>
        </div>
      `;

      const rezBtn = document.getElementById('hizli-rezerve-btn');
      if (rezBtn && !rezBtn.disabled) {
        rezBtn.addEventListener('click', async () => {
          rezBtn.disabled = true;
          try {
            const sonuc = await Yemekhane.apiIstek('/api/rezervasyonlar', {
              method: 'POST',
              body: { menu_id: menu.menu_id }
            });
            Yemekhane.bakiyeRozetiGuncelle(sonuc.bakiye);
            Yemekhane.bildirimGoster(
              bildirim,
              `${sonuc.mesaj} Ücret: ${Yemekhane.paraBicimle(sonuc.ucret)} · Güncel bakiye: ${Yemekhane.paraBicimle(sonuc.bakiye)}`,
              'basari'
            );
            await menuYukle();
          } catch (err) {
            Yemekhane.bildirimGoster(bildirim, err.message, 'hata');
            rezBtn.disabled = false;
          }
        });
      }
    } catch (err) {
      Yemekhane.bildirimGoster(bildirim, err.message, 'hata');
      menuAlani.innerHTML = '';
    }
  }

  try {
    const filtre = await Yemekhane.apiIstek('/api/menuler/filtreler');
    yemekhaneSec.innerHTML = filtre.yemekhaneler
      .map((y) => `<option value="${y.id}">${Yemekhane.escapeHtml(y.ad)} (${y.kapasite} kişi)</option>`)
      .join('');
    ogunSec.innerHTML = filtre.ogunler
      .map((o) => `<option value="${o.id}" ${o.id === 2 ? 'selected' : ''}>${Yemekhane.escapeHtml(o.ad)} (Son: ${String(o.son_saat).slice(0, 5)})</option>`)
      .join('');
    tarihSec.value = filtre.bugun;

    yemekhaneSec.addEventListener('change', menuYukle);
    ogunSec.addEventListener('change', menuYukle);
    tarihSec.addEventListener('change', menuYukle);

    await menuYukle();
  } catch (err) {
    Yemekhane.bildirimGoster(bildirim, err.message, 'hata');
  }
});
