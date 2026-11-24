document.addEventListener('DOMContentLoaded', async () => {
  const kullanici = await Yemekhane.oturumKontrol({
    zorunlu: true,
    yoneticiZorunlu: true,
    aktifSayfa: 'yonetici'
  });
  if (!kullanici) return;

  const bildirim = document.getElementById('yonetici-bildirim');
  const formBaslik = document.getElementById('form-baslik');
  const duzenleIptalBtn = document.getElementById('duzenleme-iptal-btn');
  const menuForm = document.getElementById('menu-form');
  const menuIdInput = document.getElementById('duzenlenen-menu-id');
  const mYemekhane = document.getElementById('m-yemekhane');
  const mOgun = document.getElementById('m-ogun');
  const mTarih = document.getElementById('m-tarih');
  const mOgrFiyat = document.getElementById('m-ogr-fiyat');
  const mPerFiyat = document.getElementById('m-per-fiyat');
  const yemekSecimAlani = document.getElementById('yemek-secim-alani');
  const menuKaydetBtn = document.getElementById('menu-kaydet-btn');

  const raporFiltre = document.getElementById('rapor-yemekhane-filtre');
  const raporGovde = document.getElementById('rapor-govde');

  const turnikeForm = document.getElementById('turnike-form');
  const tKullanici = document.getElementById('t-kullanici');
  const tYemekhane = document.getElementById('t-yemekhane');
  const tZaman = document.getElementById('t-zaman');
  const turnikeBtn = document.getElementById('turnike-btn');

  let ilkYuklemeTamam = false;

  function yemekCheckboxesCiz(yemekler) {
    const gruplar = new Map();
    for (const y of yemekler) {
      if (!gruplar.has(y.kategori)) gruplar.set(y.kategori, []);
      gruplar.get(y.kategori).push(y);
    }

    let html = '';
    for (const [kat, liste] of gruplar.entries()) {
      html += `<div class="yemek-secim-kategori">${Yemekhane.escapeHtml(kat)}</div><div class="yemek-secim-izgara">`;
      html += liste
        .map(
          (y) => `
          <label class="yemek-secim-satir">
            <input type="checkbox" name="yemek_idler" value="${y.id}">
            <span>${Yemekhane.escapeHtml(y.ad)} <small>(${y.kalori} kcal)</small></span>
          </label>
        `
        )
        .join('');
      html += '</div>';
    }
    yemekSecimAlani.innerHTML = html;
  }

  function formuSifirla() {
    menuIdInput.value = '';
    formBaslik.textContent = 'Yeni Menü Oluştur';
    menuKaydetBtn.textContent = 'Menüyü Oluştur';
    duzenleIptalBtn.classList.add('gizli');
    mYemekhane.disabled = false;
    mOgun.disabled = false;
    mTarih.disabled = false;
    yemekSecimAlani.querySelectorAll('input[type="checkbox"]').forEach((cb) => {
      cb.checked = false;
    });
  }

  async function paneliYukle() {
    try {
      const yId = raporFiltre.value;
      const url = yId ? `/api/yonetici/panel?yemekhane_id=${yId}` : '/api/yonetici/panel';
      const veri = await Yemekhane.apiIstek(url);

      if (!ilkYuklemeTamam) {
        const yemekhaneOpt = veri.yemekhaneler
          .map((y) => `<option value="${y.id}">${Yemekhane.escapeHtml(y.ad)}</option>`)
          .join('');
        mYemekhane.innerHTML = yemekhaneOpt;
        tYemekhane.innerHTML = yemekhaneOpt;
        raporFiltre.innerHTML = `<option value="">Tüm Yemekhaneler</option>${yemekhaneOpt}`;

        mOgun.innerHTML = veri.ogunler
          .map((o) => `<option value="${o.id}">${Yemekhane.escapeHtml(o.ad)}</option>`)
          .join('');

        tKullanici.innerHTML = veri.kullanicilar
          .map(
            (k) =>
              `<option value="${k.id}">#${k.id} ${Yemekhane.escapeHtml(k.ad)} ${Yemekhane.escapeHtml(k.soyad)} (${Yemekhane.escapeHtml(k.rol)})</option>`
          )
          .join('');

        yemekCheckboxesCiz(veri.yemekler);

        const filtre = await Yemekhane.apiIstek('/api/menuler/filtreler');
        mTarih.value = filtre.bugun;
        ilkYuklemeTamam = true;
      }

      if (!veri.rapor || veri.rapor.length === 0) {
        raporGovde.innerHTML = '<tr><td colspan="6" class="bos-durum">Kayıtlı menü bulunamadı.</td></tr>';
        return;
      }

      raporGovde.innerHTML = veri.rapor
        .map((r) => {
          const puanHtml =
            r.ortalama_puan !== null
              ? `<span class="rozet rozet-fiyat">★ ${r.ortalama_puan.toFixed(2)} (${r.oy_sayisi} oy)</span>`
              : '<small>Oy yok</small>';

          return `
            <tr>
              <td>
                <strong>${Yemekhane.escapeHtml(Yemekhane.tarihBicimle(r.tarih))}</strong><br>
                <small>${Yemekhane.escapeHtml(r.ogun)} (${r.yemek_sayisi} yemek)</small>
              </td>
              <td>${Yemekhane.escapeHtml(r.yemekhane)}</td>
              <td>${Yemekhane.paraBicimle(r.ogrenci_fiyati)} / ${Yemekhane.paraBicimle(r.personel_fiyati)}</td>
              <td>
                <strong>${r.rezerve} / ${r.kapasite}</strong> <small>(%${r.doluluk_yuzde})</small>
                <div class="doluluk-cubuk">
                  <div class="doluluk-ic" style="width: ${Math.min(100, r.doluluk_yuzde)}%;"></div>
                </div>
              </td>
              <td>${puanHtml}</td>
              <td>
                <button type="button" class="dugme dugme-ikincil dugme-kucuk menu-duzenle-btn" data-id="${r.menu_id}">Düzenle</button>
              </td>
            </tr>
          `;
        })
        .join('');

      raporGovde.querySelectorAll('.menu-duzenle-btn').forEach((btn) => {
        btn.addEventListener('click', async () => {
          const id = Number(btn.dataset.id);
          Yemekhane.bildirimGizle(bildirim);
          try {
            const { menu } = await Yemekhane.apiIstek(`/api/yonetici/menuler/${id}`);
            menuIdInput.value = String(menu.menu_id);
            formBaslik.textContent = `Menüyü Düzenle (#${menu.menu_id})`;
            menuKaydetBtn.textContent = 'Değişiklikleri Kaydet';
            duzenleIptalBtn.classList.remove('gizli');

            mYemekhane.value = String(menu.yemekhane_id);
            mOgun.value = String(menu.ogun_id);
            mTarih.value = String(menu.tarih).slice(0, 10);
            mYemekhane.disabled = true;
            mOgun.disabled = true;
            mTarih.disabled = true;

            mOgrFiyat.value = String(menu.ogrenci_fiyati);
            mPerFiyat.value = String(menu.personel_fiyati);

            const seciliSet = new Set(menu.yemek_idler);
            yemekSecimAlani.querySelectorAll('input[type="checkbox"]').forEach((cb) => {
              cb.checked = seciliSet.has(Number(cb.value));
            });

            window.scrollTo({ top: 0, behavior: 'smooth' });
          } catch (err) {
            Yemekhane.bildirimGoster(bildirim, err.message, 'hata');
          }
        });
      });
    } catch (err) {
      Yemekhane.bildirimGoster(bildirim, err.message, 'hata');
    }
  }

  duzenleIptalBtn.addEventListener('click', formuSifirla);
  raporFiltre.addEventListener('change', paneliYukle);

  menuForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    Yemekhane.bildirimGizle(bildirim);
    menuKaydetBtn.disabled = true;

    const seciliYemekler = Array.from(
      yemekSecimAlani.querySelectorAll('input[type="checkbox"]:checked')
    ).map((cb) => Number(cb.value));

    const duzenlenenId = menuIdInput.value;

    try {
      let sonuc;
      if (duzenlenenId) {
        sonuc = await Yemekhane.apiIstek(`/api/yonetici/menuler/${duzenlenenId}`, {
          method: 'PUT',
          body: {
            ogrenci_fiyati: Number(mOgrFiyat.value),
            personel_fiyati: Number(mPerFiyat.value),
            yemek_idler: seciliYemekler
          }
        });
        formuSifirla();
      } else {
        sonuc = await Yemekhane.apiIstek('/api/yonetici/menuler', {
          method: 'POST',
          body: {
            yemekhane_id: Number(mYemekhane.value),
            ogun_id: Number(mOgun.value),
            tarih: mTarih.value,
            ogrenci_fiyati: Number(mOgrFiyat.value),
            personel_fiyati: Number(mPerFiyat.value),
            yemek_idler: seciliYemekler
          }
        });
        formuSifirla();
      }

      Yemekhane.bildirimGoster(bildirim, sonuc.mesaj, 'basari');
      await paneliYukle();
    } catch (err) {
      Yemekhane.bildirimGoster(bildirim, err.message, 'hata');
    } finally {
      menuKaydetBtn.disabled = false;
    }
  });

  turnikeForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    Yemekhane.bildirimGizle(bildirim);
    turnikeBtn.disabled = true;

    try {
      const sonuc = await Yemekhane.apiIstek('/api/yonetici/turnike-gecis', {
        method: 'POST',
        body: {
          kullanici_id: Number(tKullanici.value),
          yemekhane_id: Number(tYemekhane.value),
          zaman: tZaman.value.trim() || null
        }
      });
      Yemekhane.bildirimGoster(bildirim, sonuc.mesaj, 'basari');
      await paneliYukle();
    } catch (err) {
      Yemekhane.bildirimGoster(bildirim, err.message, 'hata');
    } finally {
      turnikeBtn.disabled = false;
    }
  });

  await paneliYukle();
});
