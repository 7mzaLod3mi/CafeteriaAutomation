/* =====================================================================
   Yemekhane Otomasyonu · Ortak İstemci Yardımcıları
   ===================================================================== */

const Yemekhane = (() => {
  function escapeHtml(metin) {
    return String(metin ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function paraBicimle(tutar) {
    const sayi = Number(tutar || 0);
    return sayi.toLocaleString('tr-TR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }) + ' TL';
  }

  function tarihBicimle(tarihStr) {
    if (!tarihStr) return '-';
    const parcalar = String(tarihStr).slice(0, 10).split('-').map(Number);
    if (parcalar.length !== 3) return tarihStr;
    const dt = new Date(parcalar[0], parcalar[1] - 1, parcalar[2]);
    return dt.toLocaleDateString('tr-TR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      weekday: 'short'
    });
  }

  function zamanBicimle(zamanStr) {
    if (!zamanStr) return '-';
    const s = String(zamanStr).replace('T', ' ').slice(0, 16);
    const [tarih, saat] = s.split(' ');
    if (!tarih) return s;
    const [yil, ay, gun] = tarih.split('-');
    return `${gun}.${ay}.${yil}${saat ? ' ' + saat : ''}`;
  }

  function rolEtiketi(rol) {
    if (rol === 'ogrenci') return 'Öğrenci';
    if (rol === 'personel') return 'Personel';
    if (rol === 'yonetici') return 'Yönetici';
    return rol || '';
  }

  async function apiIstek(yol, secenekler = {}) {
    const ayar = {
      credentials: 'same-origin',
      headers: {
        Accept: 'application/json',
        ...(secenekler.body ? { 'Content-Type': 'application/json' } : {}),
        ...(secenekler.headers || {})
      },
      ...secenekler
    };
    if (ayar.body && typeof ayar.body !== 'string') {
      ayar.body = JSON.stringify(ayar.body);
    }

    const yanit = await fetch(yol, ayar);
    let veri = null;
    try {
      veri = await yanit.json();
    } catch {
      veri = null;
    }

    if (!yanit.ok) {
      const hata = new Error(
        (veri && veri.hata) || `İstek başarısız oldu (HTTP ${yanit.status}).`
      );
      hata.status = yanit.status;
      hata.veri = veri;
      throw hata;
    }
    return veri;
  }

  function bildirimGoster(kutu, mesaj, tur = 'basari') {
    if (!kutu) return;
    kutu.textContent = mesaj;
    kutu.className = `bildirim ${tur === 'hata' ? 'bildirim-hata' : 'bildirim-basari'}`;
    kutu.classList.remove('gizli');
    kutu.setAttribute('role', tur === 'hata' ? 'alert' : 'status');
  }

  function bildirimGizle(kutu) {
    if (!kutu) return;
    kutu.classList.add('gizli');
    kutu.textContent = '';
  }

  function bakiyeRozetiGuncelle(yeniBakiye) {
    const el = document.getElementById('ust-bakiye');
    if (el && yeniBakiye !== undefined && yeniBakiye !== null) {
      el.textContent = paraBicimle(yeniBakiye);
    }
  }

  // ---------- SVG simgeler (çizgi stili, renk: currentColor) ----------
  const IKONLAR = {
    hamburger: '<path d="M4 7h16M4 12h16M4 17h10"/>',
    catal: '<path d="M7 3v7a2 2 0 0 0 2 2v9M5 3v5M9 3v5M17 21V12c-1.7 0-3-1.5-3-4.5S15.3 3 17 3z"/>',
    takvim: '<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M3 10h18M8 3v4M16 3v4"/>',
    liste: '<rect x="5" y="4" width="14" height="17" rx="3"/><path d="M9 9h6M9 13h6M9 17h3"/>',
    cuzdan: '<rect x="3" y="6" width="18" height="14" rx="3"/><path d="M3 10h18M16 15h2"/>',
    yildiz: '<path d="M12 3l2.8 5.7 6.2.9-4.5 4.4 1 6.2L12 17.3l-5.5 2.9 1-6.2L3 9.6l6.2-.9z"/>',
    kalkan: '<path d="M12 3l8 3v6c0 4.5-3.4 8.3-8 9-4.6-.7-8-4.5-8-9V6z"/><path d="M9 12l2 2 4-4"/>',
    cikis: '<path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 17l-5-5 5-5M5 12h11"/>',
    corba: '<path d="M3 11h18a9 9 0 0 1-18 0z"/><path d="M8 7c0-1.5 1-1.5 1-3M12 7c0-1.5 1-1.5 1-3M16 7c0-1.5 1-1.5 1-3"/>',
    cloche: '<path d="M3 18h18M5 18a7 7 0 0 1 14 0M12 9V7M10 7h4"/>',
    kase: '<path d="M4 12h16a8 8 0 0 1-16 0z"/><path d="M7.5 12a4.5 4.5 0 0 1 9 0"/>',
    yaprak: '<path d="M5 19C5 11 10 5 20 5c0 10-6 15-14 15"/><path d="M5 19l8-8"/>',
    tatli: '<path d="M6 12h12l-1.5 8h-9z"/><path d="M6 12a6 6 0 0 1 12 0M12 3v3"/>',
    yumurta: '<path d="M12 3c3.5 0 6.5 5.5 6.5 10a6.5 6.5 0 0 1-13 0C5.5 8.5 8.5 3 12 3z"/>',
    fincan: '<path d="M5 8h12v6a5 5 0 0 1-5 5h-2a5 5 0 0 1-5-5z"/><path d="M17 10h1.5a2.5 2.5 0 0 1 0 5H17M9 3v2M13 3v2"/>',
    gunes: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
    ay: '<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/>'
  };

  function ikon(ad) {
    return `<svg class="ikon" viewBox="0 0 24 24" aria-hidden="true">${IKONLAR[ad] || IKONLAR.cloche}</svg>`;
  }

  // Yemek kategorisine göre simge (yalnızca görsel amaçlı)
  function kategoriIkonu(kategori) {
    const k = String(kategori || '').toLocaleLowerCase('tr-TR');
    if (k.includes('çorba')) return ikon('corba');
    if (k.includes('ana')) return ikon('cloche');
    if (k.includes('yardımcı')) return ikon('kase');
    if (k.includes('salata') || k.includes('meze')) return ikon('yaprak');
    if (k.includes('tatlı') || k.includes('meyve')) return ikon('tatli');
    if (k.includes('kahvaltı')) return ikon('yumurta');
    if (k.includes('içecek')) return ikon('fincan');
    return ikon('cloche');
  }

  // Öğüne göre simge
  function ogunIkonu(ogun) {
    const o = String(ogun || '').toLocaleLowerCase('tr-TR');
    if (o.includes('kahvaltı')) return ikon('fincan');
    if (o.includes('akşam')) return ikon('ay');
    return ikon('gunes');
  }

  function ustCubukCiz(kullanici, aktifSayfa) {
    const hedef = document.getElementById('ust-cubuk-alani');
    if (!hedef) return;

    const baglantilar = [
      { id: 'gunun-menusu', ad: 'Günün Menüsü', kisa: 'Menü', ikon: 'catal', href: '/gunun-menusu.html' },
      { id: 'haftalik-menu', ad: 'Haftalık Menü', kisa: 'Haftalık', ikon: 'takvim', href: '/haftalik-menu.html' },
      { id: 'rezervasyonlarim', ad: 'Rezervasyonlarım', kisa: 'Rezervasyon', ikon: 'liste', href: '/rezervasyonlarim.html' },
      { id: 'bakiye', ad: 'Bakiye', kisa: 'Bakiye', ikon: 'cuzdan', href: '/bakiye.html' },
      { id: 'degerlendirme', ad: 'Değerlendirme', kisa: 'Puanla', ikon: 'yildiz', href: '/degerlendirme.html' }
    ];

    const yonetici = kullanici && kullanici.rol === 'yonetici';
    if (yonetici) {
      baglantilar.push({ id: 'yonetici', ad: 'Yönetici Paneli', kisa: 'Yönetici', ikon: 'kalkan', href: '/yonetici.html' });
    }

    const linkHtml = baglantilar
      .map(
        (b) =>
          `<a href="${b.href}" class="${aktifSayfa === b.id ? 'aktif' : ''}">${ikon(b.ikon)}<span>${escapeHtml(b.ad)}</span></a>`
      )
      .join('');

    // Alt menüde 5 sekme: yönetici için 5. sekme Yönetici Paneli olur
    const altBaglantilar = yonetici
      ? [baglantilar[0], baglantilar[1], baglantilar[2], baglantilar[3], baglantilar[5]]
      : baglantilar.slice(0, 5);
    const altMenuHtml = altBaglantilar
      .map(
        (b) =>
          `<a href="${b.href}" class="${aktifSayfa === b.id ? 'aktif' : ''}">${ikon(b.ikon)}<span>${escapeHtml(b.kisa)}</span></a>`
      )
      .join('');

    const basHarfler = `${(kullanici.ad || '?')[0]}${(kullanici.soyad || '')[0] || ''}`.toUpperCase();

    hedef.innerHTML = `
      <header class="ust-cubuk">
        <div class="kapsayici">
          <div class="ust-cubuk-ic">
            <button type="button" id="menu-ac-btn" class="ikon-dugme" aria-label="Menüyü aç" aria-expanded="false">${ikon('hamburger')}</button>
            <a href="/gunun-menusu.html" class="marka">Yemek<span>hane</span></a>
            <span id="ust-bakiye" class="bakiye-rozet" title="Güncel bakiye">${paraBicimle(kullanici.bakiye)}</span>
          </div>
          <nav id="ana-gezinme" class="cekmece" aria-label="Ana menü">
            <div class="cekmece-ic">
              <div class="cekmece-kullanici">
                <div class="avatar">${escapeHtml(basHarfler)}</div>
                <div>
                  <strong>${escapeHtml(kullanici.ad)} ${escapeHtml(kullanici.soyad)}</strong>
                  <small>${escapeHtml(rolEtiketi(kullanici.rol))} · ${escapeHtml(kullanici.eposta || '')}</small>
                </div>
              </div>
              <div class="gezinme-baglantilar">${linkHtml}</div>
              <button type="button" id="cikis-btn" class="cikis-dugme">${ikon('cikis')}<span>Çıkış</span></button>
            </div>
          </nav>
        </div>
      </header>
      <nav class="alt-menu" aria-label="Hızlı menü">${altMenuHtml}</nav>
    `;
    document.body.classList.add('alt-menulu');

    const menuBtn = document.getElementById('menu-ac-btn');
    const navEl = document.getElementById('ana-gezinme');
    if (menuBtn && navEl) {
      menuBtn.addEventListener('click', () => {
        const acik = navEl.classList.toggle('acik');
        menuBtn.setAttribute('aria-expanded', String(acik));
      });
    }

    const cikisBtn = document.getElementById('cikis-btn');
    if (cikisBtn) {
      cikisBtn.addEventListener('click', async () => {
        try {
          await apiIstek('/api/auth/cikis', { method: 'POST' });
        } finally {
          window.location.href = '/';
        }
      });
    }
  }

  async function oturumKontrol({ zorunlu = true, yoneticiZorunlu = false, aktifSayfa = '' } = {}) {
    try {
      const veri = await apiIstek('/api/auth/ben');
      const kullanici = veri.kullanici;

      if (yoneticiZorunlu && kullanici.rol !== 'yonetici') {
        window.location.href = '/gunun-menusu.html';
        return null;
      }

      if (aktifSayfa) {
        ustCubukCiz(kullanici, aktifSayfa);
      }
      return kullanici;
    } catch {
      if (zorunlu) {
        window.location.href = '/';
      }
      return null;
    }
  }

  function tabloEtiketleriniGuncelle(tablo) {
    const basliklar = Array.from(tablo.querySelectorAll('thead th')).map((th) =>
      th.textContent.trim()
    );
    tablo.querySelectorAll('tbody tr').forEach((tr) => {
      tr.querySelectorAll('td').forEach((td, i) => {
        if (td.hasAttribute('colspan')) return;
        if (basliklar[i]) {
          td.setAttribute('data-label', basliklar[i]);
        }
        if (!td.querySelector(':scope > .hucre-deger')) {
          const sarici = document.createElement('div');
          sarici.className = 'hucre-deger';
          while (td.firstChild) {
            sarici.appendChild(td.firstChild);
          }
          td.appendChild(sarici);
        }
      });
    });
  }

  function mobilTablolariIzle() {
    document.querySelectorAll('.veri-tablo').forEach((tablo) => {
      tabloEtiketleriniGuncelle(tablo);
      const tbody = tablo.querySelector('tbody');
      if (!tbody || tbody.dataset.izleniyor) return;
      tbody.dataset.izleniyor = '1';
      const izleyici = new MutationObserver(() => {
        izleyici.disconnect();
        tabloEtiketleriniGuncelle(tablo);
        izleyici.observe(tbody, { childList: true });
      });
      izleyici.observe(tbody, { childList: true });
    });
  }

  if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', mobilTablolariIzle);
  }

  return {
    escapeHtml,
    paraBicimle,
    tarihBicimle,
    zamanBicimle,
    rolEtiketi,
    apiIstek,
    bildirimGoster,
    bildirimGizle,
    bakiyeRozetiGuncelle,
    ikon,
    kategoriIkonu,
    ogunIkonu,
    ustCubukCiz,
    oturumKontrol
  };
})();
