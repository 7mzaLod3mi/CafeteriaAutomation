document.addEventListener('DOMContentLoaded', async () => {
  // Zaten oturum açıksa doğrudan Günün Menüsü ekranına yönlendir
  const mevcut = await Yemekhane.oturumKontrol({ zorunlu: false });
  if (mevcut) {
    window.location.href = '/gunun-menusu.html';
    return;
  }

  const form = document.getElementById('giris-formu');
  const epostaInput = document.getElementById('eposta');
  const sifreInput = document.getElementById('sifre');
  const bildirim = document.getElementById('giris-bildirim');
  const girisBtn = document.getElementById('giris-btn');

  document.querySelectorAll('.demo-hesap-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      epostaInput.value = btn.dataset.eposta;
      sifreInput.value = 'Yemek2026!';
      Yemekhane.bildirimGizle(bildirim);
    });
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    Yemekhane.bildirimGizle(bildirim);
    girisBtn.disabled = true;
    girisBtn.textContent = 'Giriş yapılıyor…';

    try {
      await Yemekhane.apiIstek('/api/auth/giris', {
        method: 'POST',
        body: {
          eposta: epostaInput.value.trim(),
          sifre: sifreInput.value
        }
      });
      window.location.href = '/gunun-menusu.html';
    } catch (err) {
      Yemekhane.bildirimGoster(bildirim, err.message, 'hata');
      girisBtn.disabled = false;
      girisBtn.textContent = 'Giriş Yap';
    }
  });
});
