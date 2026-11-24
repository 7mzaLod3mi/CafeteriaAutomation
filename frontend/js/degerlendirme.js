document.addEventListener('DOMContentLoaded', async () => {
  const kullanici = await Yemekhane.oturumKontrol({
    zorunlu: true,
    aktifSayfa: 'degerlendirme'
  });
  if (!kullanici) return;

  const bekleyenAlani = document.getElementById('bekleyen-alani');
  const gecmisGovde = document.getElementById('gecmis-govde');
  const bildirim = document.getElementById('deg-bildirim');

  function yildizMetni(puan) {
    return '★'.repeat(puan) + '☆'.repeat(5 - puan);
  }

  async function yukle() {
    try {
      const veri = await Yemekhane.apiIstek('/api/degerlendirmeler');

      if (!veri.degerlendirilebilir || veri.degerlendirilebilir.length === 0) {
        bekleyenAlani.innerHTML =
          '<p class="bos-durum">Şu an değerlendirme bekleyen kullanılmış menünüz bulunmuyor.</p>';
      } else {
        bekleyenAlani.innerHTML = `
          <div class="izgara izgara-2">
            ${veri.degerlendirilebilir
              .map(
                (m) => `
              <form class="kart deg-form" data-menu-id="${m.menu_id}" style="margin-bottom: 0;">
                <div class="kart-baslik">
                  <div>
                    <h3>${Yemekhane.escapeHtml(m.yemekhane)} · ${Yemekhane.escapeHtml(m.ogun)}</h3>
                    <small>${Yemekhane.escapeHtml(Yemekhane.tarihBicimle(m.tarih))}</small>
                  </div>
                  <span class="rozet rozet-kullanildi">Kullanıldı</span>
                </div>

                <div class="form-grup">
                  <label>Puanınız (1–5)</label>
                  <div class="yildiz-secici" data-secili="5">
                    ${[1, 2, 3, 4, 5]
                      .map(
                        (p) =>
                          `<button type="button" class="yildiz-btn secili" data-puan="${p}" aria-label="${p} puan">★</button>`
                      )
                      .join('')}
                  </div>
                  <input type="hidden" name="puan" value="5">
                </div>

                <div class="form-grup">
                  <label>Yorumunuz (İsteğe bağlı)</label>
                  <textarea name="yorum" rows="2" maxlength="500" placeholder="Yemekler hakkındaki görüşünüz…"></textarea>
                </div>

                <button type="submit" class="dugme dugme-tam">Değerlendirmeyi Gönder</button>
              </form>
            `
              )
              .join('')}
          </div>
        `;

        bekleyenAlani.querySelectorAll('.deg-form').forEach((form) => {
          const secici = form.querySelector('.yildiz-secici');
          const puanInput = form.querySelector('input[name="puan"]');
          const yildizlar = secici.querySelectorAll('.yildiz-btn');

          yildizlar.forEach((btn) => {
            btn.addEventListener('click', () => {
              const secilen = Number(btn.dataset.puan);
              puanInput.value = String(secilen);
              yildizlar.forEach((y) => {
                y.classList.toggle('secili', Number(y.dataset.puan) <= secilen);
              });
            });
          });

          form.addEventListener('submit', async (e) => {
            e.preventDefault();
            Yemekhane.bildirimGizle(bildirim);
            const submitBtn = form.querySelector('button[type="submit"]');
            submitBtn.disabled = true;

            try {
              const sonuc = await Yemekhane.apiIstek('/api/degerlendirmeler', {
                method: 'POST',
                body: {
                  menu_id: Number(form.dataset.menuId),
                  puan: Number(puanInput.value),
                  yorum: form.querySelector('textarea[name="yorum"]').value.trim()
                }
              });
              Yemekhane.bildirimGoster(bildirim, sonuc.mesaj, 'basari');
              await yukle();
            } catch (err) {
              Yemekhane.bildirimGoster(bildirim, err.message, 'hata');
              submitBtn.disabled = false;
            }
          });
        });
      }

      if (!veri.gecmis || veri.gecmis.length === 0) {
        gecmisGovde.innerHTML =
          '<tr><td colspan="4" class="bos-durum">Henüz gönderilmiş değerlendirmeniz yok.</td></tr>';
      } else {
        gecmisGovde.innerHTML = veri.gecmis
          .map(
            (g) => `
            <tr>
              <td>
                <strong>${Yemekhane.escapeHtml(Yemekhane.tarihBicimle(g.tarih))}</strong><br>
                <small>${Yemekhane.escapeHtml(g.yemekhane)} · ${Yemekhane.escapeHtml(g.ogun)}</small>
              </td>
              <td><span class="rozet rozet-fiyat">${yildizMetni(g.puan)} (${g.puan}/5)</span></td>
              <td>${Yemekhane.escapeHtml(g.yorum || '—')}</td>
              <td><small>${Yemekhane.escapeHtml(Yemekhane.zamanBicimle(g.olusturma))}</small></td>
            </tr>
          `
          )
          .join('');
      }
    } catch (err) {
      Yemekhane.bildirimGoster(bildirim, err.message, 'hata');
    }
  }

  await yukle();
});
