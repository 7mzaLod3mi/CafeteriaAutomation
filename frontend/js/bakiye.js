document.addEventListener('DOMContentLoaded', async () => {
  const kullanici = await Yemekhane.oturumKontrol({
    zorunlu: true,
    aktifSayfa: 'bakiye'
  });
  if (!kullanici) return;

  const bakiyeEl = document.getElementById('guncel-bakiye');
  const govde = document.getElementById('hareket-govde');
  const form = document.getElementById('bakiye-form');
  const tutarInput = document.getElementById('yukleme-tutari');
  const yukleBtn = document.getElementById('yukle-btn');
  const bildirim = document.getElementById('bakiye-bildirim');

  function turRozeti(tur) {
    if (tur === 'yukleme') return '<span class="rozet rozet-aktif">Yükleme</span>';
    if (tur === 'iade') return '<span class="rozet rozet-kullanildi">İade</span>';
    return '<span class="rozet rozet-iptal">Rezervasyon</span>';
  }

  async function verileriYukle() {
    try {
      const veri = await Yemekhane.apiIstek('/api/bakiye');
      bakiyeEl.textContent = Yemekhane.paraBicimle(veri.bakiye);
      Yemekhane.bakiyeRozetiGuncelle(veri.bakiye);

      if (!veri.hareketler || veri.hareketler.length === 0) {
        govde.innerHTML = '<tr><td colspan="4" class="bos-durum">Henüz bakiye hareketiniz bulunmuyor.</td></tr>';
        return;
      }

      govde.innerHTML = veri.hareketler
        .map((h) => {
          const arti = h.tutar > 0;
          const tutarMetin = `${arti ? '+' : ''}${Yemekhane.paraBicimle(h.tutar)}`;
          return `
            <tr>
              <td>${Yemekhane.escapeHtml(Yemekhane.zamanBicimle(h.olusturma))}</td>
              <td>${turRozeti(h.tur)}</td>
              <td>${Yemekhane.escapeHtml(h.aciklama || '-')}</td>
              <td class="${arti ? 'tutar-arti' : 'tutar-eksi'}">${tutarMetin}</td>
            </tr>
          `;
        })
        .join('');
    } catch (err) {
      Yemekhane.bildirimGoster(bildirim, err.message, 'hata');
    }
  }

  document.querySelectorAll('.hizli-tutar-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      tutarInput.value = btn.dataset.tutar;
    });
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    Yemekhane.bildirimGizle(bildirim);
    yukleBtn.disabled = true;
    yukleBtn.textContent = 'Yükleniyor…';

    try {
      const sonuc = await Yemekhane.apiIstek('/api/bakiye/yukle', {
        method: 'POST',
        body: { tutar: Number(tutarInput.value) }
      });
      tutarInput.value = '';
      Yemekhane.bildirimGoster(
        bildirim,
        `${sonuc.mesaj} Güncel bakiye: ${Yemekhane.paraBicimle(sonuc.bakiye)}`,
        'basari'
      );
      await verileriYukle();
    } catch (err) {
      Yemekhane.bildirimGoster(bildirim, err.message, 'hata');
    } finally {
      yukleBtn.disabled = false;
      yukleBtn.textContent = 'Bakiye Yükle';
    }
  });

  await verileriYukle();
});
