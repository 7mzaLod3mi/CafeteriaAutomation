document.addEventListener('DOMContentLoaded', async () => {
  const kullanici = await Yemekhane.oturumKontrol({
    zorunlu: true,
    aktifSayfa: 'profil'
  });
  if (!kullanici) return;

  const ozetEl = document.getElementById('profil-ozet');
  const izgara = document.getElementById('alerjen-izgara');
  const sayacEl = document.getElementById('secili-sayac');
  const form = document.getElementById('alerjen-form');
  const temizleBtn = document.getElementById('temizle-btn');
  const kaydetBtn = document.getElementById('alerjen-kaydet-btn');
  const bildirim = document.getElementById('profil-bildirim');

  function sayaciGuncelle() {
    const secili = izgara.querySelectorAll('input[type="checkbox"]:checked').length;
    sayacEl.textContent = `${secili} alerjen seçili`;
    izgara.querySelectorAll('.alerjen-kutu').forEach((kutu) => {
      const cb = kutu.querySelector('input[type="checkbox"]');
      kutu.classList.toggle('secili', Boolean(cb && cb.checked));
    });
  }

  async function yukle() {
    try {
      const veri = await Yemekhane.apiIstek('/api/profil');
      const k = veri.kullanici;

      ozetEl.innerHTML = `
        <div class="ozet-kutu">
          <span>Ad Soyad</span>
          <strong>${Yemekhane.escapeHtml(k.ad)} ${Yemekhane.escapeHtml(k.soyad)}</strong>
        </div>
        <div class="ozet-kutu">
          <span>E-posta</span>
          <strong style="font-size: 0.9rem; word-break: break-all;">${Yemekhane.escapeHtml(k.eposta)}</strong>
        </div>
        <div class="ozet-kutu altin">
          <span>Rol</span>
          <strong>${Yemekhane.escapeHtml(Yemekhane.rolEtiketi(k.rol))}</strong>
        </div>
        <div class="ozet-kutu">
          <span>${k.ogrenci_no ? 'Öğrenci No' : 'Güncel Bakiye'}</span>
          <strong>${k.ogrenci_no ? Yemekhane.escapeHtml(k.ogrenci_no) : Yemekhane.paraBicimle(k.bakiye)}</strong>
        </div>
      `;

      const seciliSet = new Set((veri.secili_alerjen_idler || []).map(Number));

      izgara.innerHTML = veri.alerjenler
        .map((a) => {
          const secili = seciliSet.has(Number(a.id));
          return `
            <label class="alerjen-kutu ${secili ? 'secili' : ''}">
              <input type="checkbox" name="alerjen_idler" value="${a.id}" ${secili ? 'checked' : ''}>
              <span>${Yemekhane.escapeHtml(a.ad)}</span>
            </label>
          `;
        })
        .join('');

      izgara.querySelectorAll('input[type="checkbox"]').forEach((cb) => {
        cb.addEventListener('change', sayaciGuncelle);
      });
      sayaciGuncelle();
    } catch (err) {
      Yemekhane.bildirimGoster(bildirim, err.message, 'hata');
    }
  }

  temizleBtn.addEventListener('click', () => {
    izgara.querySelectorAll('input[type="checkbox"]').forEach((cb) => {
      cb.checked = false;
    });
    sayaciGuncelle();
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    Yemekhane.bildirimGizle(bildirim);
    kaydetBtn.disabled = true;
    kaydetBtn.textContent = 'Kaydediliyor…';

    const seciliIdler = Array.from(
      izgara.querySelectorAll('input[type="checkbox"]:checked')
    ).map((cb) => Number(cb.value));

    try {
      const sonuc = await Yemekhane.apiIstek('/api/profil/alerjenler', {
        method: 'PUT',
        body: { alerjen_idler: seciliIdler }
      });
      Yemekhane.bildirimGoster(
        bildirim,
        `${sonuc.mesaj} (${sonuc.secili_alerjen_idler.length} alerjen aktif)`,
        'basari'
      );
    } catch (err) {
      Yemekhane.bildirimGoster(bildirim, err.message, 'hata');
    } finally {
      kaydetBtn.disabled = false;
      kaydetBtn.textContent = 'Alerjen Tercihlerimi Kaydet';
    }
  });

  await yukle();
});
