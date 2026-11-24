document.addEventListener('DOMContentLoaded', async () => {
  const kullanici = await Yemekhane.oturumKontrol({
    zorunlu: true,
    aktifSayfa: 'haftalik-menu'
  });
  if (!kullanici) return;

  const yemekhaneSec = document.getElementById('haftalik-yemekhane');
  const baslangicInput = document.getElementById('haftalik-baslangic');
  const listeAlani = document.getElementById('haftalik-liste');
  const bildirim = document.getElementById('haftalik-bildirim');

  async function haftalikYukle() {
    listeAlani.innerHTML = '<p class="bos-durum">Haftalık menüler yükleniyor…</p>';

    try {
      const qs = new URLSearchParams({
        yemekhane_id: yemekhaneSec.value,
        baslangic: baslangicInput.value,
        gun: '7'
      });
      const veri = await Yemekhane.apiIstek(`/api/menuler/haftalik?${qs.toString()}`);

      if (!veri.menuler || veri.menuler.length === 0) {
        listeAlani.innerHTML =
          '<section class="kart"><p class="bos-durum">Seçilen aralıkta menü bulunamadı.</p></section>';
        return;
      }

      // Tarihe göre grupla
      const gruplar = new Map();
      for (const m of veri.menuler) {
        if (!gruplar.has(m.tarih)) {
          gruplar.set(m.tarih, []);
        }
        gruplar.get(m.tarih).push(m);
      }

      let html = '';
      for (const [tarih, gunMenuleri] of gruplar.entries()) {
        const kartlarHtml = gunMenuleri
          .map((m) => {
            const yemekListesi = m.yemekler
              .map((y) => {
                const uyariRozet =
                  y.alerjen_uyarisi && y.eslesen_alerjenler && y.eslesen_alerjenler.length
                    ? ` <span class="rozet rozet-uyari">⚠ ${Yemekhane.escapeHtml(y.eslesen_alerjenler.join(', '))}</span>`
                    : '';
                return `<li>
                  <span>${Yemekhane.escapeHtml(y.yemek)}${y.vejetaryen ? ' <span class="rozet rozet-vejetaryen">V</span>' : ''}${uyariRozet}</span>
                  <small>${y.kalori} kcal</small>
                </li>`;
              })
              .join('');

            const butonMetin = m.rezervasyon_yapilabilir
              ? `Rezervasyon Yap (${Yemekhane.paraBicimle(m.kullanici_fiyati)})`
              : m.rezerve_durum_notu || 'Rezervasyon Kapalı';

            const durumRozet =
              m.kullanici_rezervasyon_durumu === 'aktif'
                ? `<span class="rozet rozet-aktif">Aktif (${m.kullanici_rezervasyon_porsiyon === 'yarim' ? 'Yarım' : 'Tam'})</span>`
                : m.kullanici_rezervasyon_durumu === 'kullanildi'
                  ? '<span class="rozet rozet-kullanildi">Kullanıldı</span>'
                  : '';

            const alerjenOzetRozet =
              m.alerjen_uyarili_yemek_sayisi > 0
                ? `<span class="rozet rozet-uyari">⚠ ${m.alerjen_uyarili_yemek_sayisi} alerjen uyarısı</span>`
                : '';

            // Öğle ve akşamda yarım porsiyon seçimi açık; kahvaltıda kapalı
            const porsiyonSecimHtml = m.yarim_porsiyon_izinli
              ? `<div class="porsiyon-secici" data-menu-id="${m.menu_id}">
                   <button type="button" class="porsiyon-btn secili" data-porsiyon="tam" data-fiyat="${m.kullanici_fiyati}">
                     Tam · ${Yemekhane.paraBicimle(m.kullanici_fiyati)}
                   </button>
                   <button type="button" class="porsiyon-btn" data-porsiyon="yarim" data-fiyat="${m.yarim_kullanici_fiyati}">
                     Yarım (%60) · ${Yemekhane.paraBicimle(m.yarim_kullanici_fiyati)}
                   </button>
                 </div>`
              : `<span class="porsiyon-bilgi">Kahvaltıda yalnızca tam porsiyon</span>`;

            return `
              <article class="kart menu-kart" data-kart-menu="${m.menu_id}">
                <div>
                  <div class="menu-kart-ust" style="margin-bottom: 0.85rem;">
                    <div class="yemek-ikon">${Yemekhane.ogunIkonu(m.ogun)}</div>
                    <div>
                      <h3>${Yemekhane.escapeHtml(m.ogun)}</h3>
                      <small>${Yemekhane.escapeHtml(m.yemekhane)} · Son: ${String(m.son_saat).slice(0, 5)}</small>
                    </div>
                    <span class="rozet rozet-fiyat" data-fiyat-rozet="${m.menu_id}">${Yemekhane.paraBicimle(m.kullanici_fiyati)}</span>
                  </div>

                  <div class="rozet-satir" style="margin-bottom: 0.65rem;">
                    <span class="rozet rozet-kalori">Boş yer: ${m.bos_yer} / ${m.kapasite}</span>
                    <span class="rozet rozet-kalori">${m.toplam_kalori} kcal</span>
                    ${durumRozet}
                    ${alerjenOzetRozet}
                  </div>

                  <ul class="menu-mini-yemekler">${yemekListesi}</ul>
                </div>

                <div class="menu-kart-alt">
                  ${porsiyonSecimHtml}
                  <button
                    type="button"
                    class="dugme dugme-tam rezerve-et-btn"
                    data-menu-id="${m.menu_id}"
                    data-porsiyon="tam"
                    ${m.rezervasyon_yapilabilir ? '' : 'disabled'}
                  >
                    ${Yemekhane.escapeHtml(butonMetin)}
                  </button>
                </div>
              </article>
            `;
          })
          .join('');

        html += `
          <h2 class="gun-baslik">${Yemekhane.escapeHtml(Yemekhane.tarihBicimle(tarih))}</h2>
          <div class="izgara izgara-3">${kartlarHtml}</div>
        `;
      }

      listeAlani.innerHTML = html;

      // Porsiyon seçici etkileşimleri (Tam vs Yarım %60)
      listeAlani.querySelectorAll('.porsiyon-secici').forEach((secici) => {
        const menuId = secici.dataset.menuId;
        const kart = listeAlani.querySelector(`[data-kart-menu="${menuId}"]`);
        const rezBtn = kart ? kart.querySelector('.rezerve-et-btn') : null;
        const fiyatRozet = kart ? kart.querySelector(`[data-fiyat-rozet="${menuId}"]`) : null;

        secici.querySelectorAll('.porsiyon-btn').forEach((btn) => {
          btn.addEventListener('click', () => {
            const porsiyon = btn.dataset.porsiyon;
            const fiyat = Number(btn.dataset.fiyat);
            secici.querySelectorAll('.porsiyon-btn').forEach((b) => {
              b.classList.toggle('secili', b === btn);
            });
            if (fiyatRozet) {
              fiyatRozet.textContent = Yemekhane.paraBicimle(fiyat);
            }
            if (rezBtn) {
              rezBtn.dataset.porsiyon = porsiyon;
              if (!rezBtn.disabled) {
                const etiket = porsiyon === 'yarim' ? 'Yarım Porsiyon Rezerve Et' : 'Rezervasyon Yap';
                rezBtn.textContent = `${etiket} (${Yemekhane.paraBicimle(fiyat)})`;
              }
            }
          });
        });
      });

      listeAlani.querySelectorAll('.rezerve-et-btn').forEach((btn) => {
        btn.addEventListener('click', async () => {
          const menuId = Number(btn.dataset.menuId);
          const porsiyon = btn.dataset.porsiyon || 'tam';
          btn.disabled = true;
          Yemekhane.bildirimGizle(bildirim);

          try {
            const sonuc = await Yemekhane.apiIstek('/api/rezervasyonlar', {
              method: 'POST',
              body: { menu_id: menuId, porsiyon }
            });
            Yemekhane.bakiyeRozetiGuncelle(sonuc.bakiye);
            Yemekhane.bildirimGoster(
              bildirim,
              `${sonuc.mesaj} Kesilen ücret: ${Yemekhane.paraBicimle(sonuc.ucret)} · Güncel bakiye (Primary): ${Yemekhane.paraBicimle(sonuc.bakiye)}`,
              'basari'
            );
            window.scrollTo({ top: 0, behavior: 'smooth' });
            await haftalikYukle();
          } catch (err) {
            Yemekhane.bildirimGoster(bildirim, err.message, 'hata');
            window.scrollTo({ top: 0, behavior: 'smooth' });
            btn.disabled = false;
          }
        });
      });
    } catch (err) {
      Yemekhane.bildirimGoster(bildirim, err.message, 'hata');
      listeAlani.innerHTML = '';
    }
  }

  try {
    const filtre = await Yemekhane.apiIstek('/api/menuler/filtreler');
    yemekhaneSec.innerHTML = filtre.yemekhaneler
      .map((y) => `<option value="${y.id}">${Yemekhane.escapeHtml(y.ad)} (${y.kapasite} kişi)</option>`)
      .join('');
    baslangicInput.value = filtre.bugun;

    yemekhaneSec.addEventListener('change', haftalikYukle);
    baslangicInput.addEventListener('change', haftalikYukle);

    await haftalikYukle();
  } catch (err) {
    Yemekhane.bildirimGoster(bildirim, err.message, 'hata');
  }
});
