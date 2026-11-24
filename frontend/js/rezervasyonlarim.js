document.addEventListener('DOMContentLoaded', async () => {
  const kullanici = await Yemekhane.oturumKontrol({
    zorunlu: true,
    aktifSayfa: 'rezervasyonlarim'
  });
  if (!kullanici) return;

  const govde = document.getElementById('rez-govde');
  const bildirim = document.getElementById('rez-bildirim');
  const sekmeler = document.querySelectorAll('.sekme');
  let aktifDurum = '';

  function durumRozeti(durum) {
    if (durum === 'aktif') return '<span class="rozet rozet-aktif">Aktif</span>';
    if (durum === 'kullanildi') return '<span class="rozet rozet-kullanildi">Kullanıldı</span>';
    return '<span class="rozet rozet-iptal">İptal</span>';
  }

  async function listele() {
    govde.innerHTML = '<tr><td colspan="5" class="bos-durum">Yükleniyor…</td></tr>';
    try {
      const url = aktifDurum ? `/api/rezervasyonlar?durum=${aktifDurum}` : '/api/rezervasyonlar';
      const { rezervasyonlar } = await Yemekhane.apiIstek(url);

      if (!rezervasyonlar || rezervasyonlar.length === 0) {
        govde.innerHTML = '<tr><td colspan="5" class="bos-durum">Bu kategoride rezervasyon bulunmuyor.</td></tr>';
        return;
      }

      govde.innerHTML = rezervasyonlar
        .map((r) => {
          let islemHtml = '<small>-</small>';
          if (r.durum === 'aktif') {
            if (r.iptal_edilebilir) {
              islemHtml = `<button type="button" class="dugme dugme-tehlike dugme-kucuk iptal-btn" data-id="${r.id}">İptal Et</button>`;
            } else {
              islemHtml = '<button type="button" class="dugme dugme-kucuk" disabled>İptal Süresi Doldu</button>';
            }
          } else if (r.durum === 'kullanildi') {
            islemHtml = r.degerlendirildi
              ? '<small>Değerlendirildi</small>'
              : '<a href="/degerlendirme.html" class="dugme dugme-ikincil dugme-kucuk">Değerlendir</a>';
          } else if (r.iptal_zamani) {
            islemHtml = `<small>İptal: ${Yemekhane.escapeHtml(Yemekhane.zamanBicimle(r.iptal_zamani))}</small>`;
          }

          const porsiyonRozet =
            r.porsiyon === 'yarim'
              ? '<span class="rozet rozet-yarim">Yarım (%60)</span>'
              : '<span class="rozet rozet-kalori">Tam</span>';

          return `
            <tr>
              <td>
                <strong>${Yemekhane.escapeHtml(Yemekhane.tarihBicimle(r.tarih))}</strong><br>
                <small>${Yemekhane.escapeHtml(r.ogun)} (Son: ${Yemekhane.escapeHtml(Yemekhane.zamanBicimle(r.rezervasyon_son))})</small>
              </td>
              <td>${Yemekhane.escapeHtml(r.yemekhane)}</td>
              <td>
                <strong>${Yemekhane.paraBicimle(r.ucret)}</strong><br>
                ${porsiyonRozet}
              </td>
              <td>${durumRozeti(r.durum)}</td>
              <td>${islemHtml}</td>
            </tr>
          `;
        })
        .join('');

      govde.querySelectorAll('.iptal-btn').forEach((btn) => {
        btn.addEventListener('click', async () => {
          const id = Number(btn.dataset.id);
          btn.disabled = true;
          Yemekhane.bildirimGizle(bildirim);

          try {
            const sonuc = await Yemekhane.apiIstek(`/api/rezervasyonlar/${id}`, {
              method: 'DELETE'
            });
            Yemekhane.bakiyeRozetiGuncelle(sonuc.bakiye);
            Yemekhane.bildirimGoster(
              bildirim,
              `${sonuc.mesaj} İade: ${Yemekhane.paraBicimle(sonuc.iade)} · Güncel bakiye (Primary): ${Yemekhane.paraBicimle(sonuc.bakiye)}`,
              'basari'
            );
            await listele();
          } catch (err) {
            Yemekhane.bildirimGoster(bildirim, err.message, 'hata');
            btn.disabled = false;
          }
        });
      });
    } catch (err) {
      Yemekhane.bildirimGoster(bildirim, err.message, 'hata');
      govde.innerHTML = '';
    }
  }

  sekmeler.forEach((btn) => {
    btn.addEventListener('click', () => {
      sekmeler.forEach((s) => s.classList.remove('aktif'));
      btn.classList.add('aktif');
      aktifDurum = btn.dataset.durum;
      listele();
    });
  });

  await listele();
});
