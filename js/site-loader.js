/**
 * site-loader.js
 * Applies the baked-in restaurant data (window.SITE_DATA from data.js) to index.html.
 * Fully static — no database, no network calls.
 */

(function () {
  'use strict';

  /* ── Read baked-in data from data.js (window.SITE_DATA) ── */
  function fetchData() {
    const data = window.SITE_DATA;
    if (data && typeof data === 'object' && Object.keys(data).length) return data;
    return null; /* data.js missing/empty — keep hardcoded HTML defaults */
  }

  /* ── SECURITY: Escape HTML special characters to prevent XSS ── */
  function escapeHTML(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;');
  }

  /* ── Self-contained placeholder (no external host — CSP-safe) ── */
  const PH = "data:image/svg+xml,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%20width='300'%20height='200'%3E%3Crect%20width='100%25'%20height='100%25'%20fill='%231f1f1f'/%3E%3Ctext%20x='50%25'%20y='50%25'%20fill='%23888070'%20font-family='sans-serif'%20font-size='16'%20text-anchor='middle'%20dominant-baseline='middle'%3E%D8%B5%D9%88%D8%B1%D8%A9%3C/text%3E%3C/svg%3E";
  window.__PH = PH;

  /* ── SECURITY: allow local paths, base64 images, and https — block javascript:/vbscript: ── */
  function sanitizeURL(url) {
    const s = String(url || '').trim();
    if (!s) return PH;
    if (/^data:image\//i.test(s)) return s;   /* base64 images from admin uploads */
    if (/^https?:\/\//i.test(s)) return s;     /* remote (kept for compatibility) */
    if (/^[a-z][a-z0-9+.-]*:/i.test(s)) return PH; /* any other scheme = unsafe */
    return s;                                   /* relative/local path e.g. images/... */
  }

  /* ── Safely update text (uses textContent — immune to XSS) ── */
  function setText(id, value) {
    const el = document.getElementById(id);
    if (el && value !== undefined) el.textContent = value;
  }

  /* ── Safely update img src ── */
  function setSrc(id, src) {
    const el = document.getElementById(id);
    if (el && src) el.src = src;
  }

  /* ── Update all WhatsApp links ── */
  function updateWhatsApp(number) {
    document.querySelectorAll('a[href*="wa.me"]').forEach(a => {
      a.href = `https://wa.me/${number}`;
    });
  }

  /* ── Apply CSS color variables ── */
  function applyDesign(design) {
    const r = document.documentElement;
    if (design.primary) r.style.setProperty('--red', design.primary);
    if (design.accent)  r.style.setProperty('--gold', design.accent);
    if (design.dark)    r.style.setProperty('--dark', design.dark);
  }

  /* ── Re-attach scroll-reveal observer ── */
  function attachReveal(elements) {
    const obs = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting) { e.target.classList.add('visible'); obs.unobserve(e.target); }
      });
    }, { threshold: 0.1 });
    elements.forEach((el, i) => {
      el.style.transitionDelay = (i % 6) * 0.07 + 's';
      obs.observe(el);
    });
  }

  /* ── Cart controls helper ── */
  function cartCtrl(name, price) {
    const n = escapeHTML(name), p = Number(price);
    return `<div class="cart-controls-inline">
      <button class="cart-btn minus" onclick="window.cartChange(this.dataset.n,+this.dataset.p,-1)" data-n="${n}" data-p="${p}">−</button>
      <span class="cart-qty" data-item-qty="${n}">0</span>
      <button class="cart-btn plus" onclick="window.cartChange(this.dataset.n,+this.dataset.p,1)" data-n="${n}" data-p="${p}">+</button>
    </div>`;
  }

  /* ── Render menu grid ── */
  function renderMenuGrid(items) {
    const grid = document.getElementById('menuGrid');
    if (!grid || !items) return;
    const sorted = [...items].sort((a, b) => a.order - b.order);
    /* SECURITY: escapeHTML() on all user data, sanitizeURL() on images */
    grid.innerHTML = sorted.map(item => `
      <div class="menu-card reveal"
           data-category="${escapeHTML(item.category)}"
           data-name="${escapeHTML(item.name)}">
        ${item.popular ? '<span class="pop-badge">⭐ الأكثر طلباً</span>' : ''}
        <img src="${sanitizeURL(item.image)}"
             alt="${escapeHTML(item.name)}" loading="lazy"
             onerror="this.src=window.__PH"/>
        <div class="card-body">
          <div class="card-name">${escapeHTML(item.name)}</div>
          <div class="card-price">${Number(item.price).toLocaleString()} ل.ل</div>
        </div>
        <div class="cart-controls">
          <button class="cart-btn minus" onclick="window.cartChange(this.dataset.name,+this.dataset.price,-1)" data-name="${escapeHTML(item.name)}" data-price="${Number(item.price)}">−</button>
          <span class="cart-qty" data-item-qty="${escapeHTML(item.name)}">0</span>
          <button class="cart-btn plus" onclick="window.cartChange(this.dataset.name,+this.dataset.price,1)" data-name="${escapeHTML(item.name)}" data-price="${Number(item.price)}">+</button>
        </div>
      </div>`).join('');
    attachReveal(grid.querySelectorAll('.reveal'));
    rewireMenuControls();
    window.syncCartQty?.();
  }

  /* ── Render meals ── */
  function renderMeals(meals) {
    const grid = document.getElementById('mealsGrid');
    if (!grid || !meals) return;
    /* SECURITY: escapeHTML() on all user-supplied strings */
    grid.innerHTML = meals.map(meal => `
      <div class="meal-cat reveal">
        <div class="meal-cat-head"><h3>${escapeHTML(meal.name)}</h3></div>
        <div class="meal-cat-body">
          <div class="meal-items-list">
            ${meal.items.map(item => `
              <div class="meal-row">
                <span class="meal-row-name">${escapeHTML(item.name)}</span>
                ${cartCtrl(item.name, item.price)}
                <span class="meal-row-price">${Number(item.price).toLocaleString()}</span>
              </div>`).join('')}
          </div>
          <img src="${sanitizeURL(meal.image)}"
               alt="${escapeHTML(meal.name)}" class="meal-cat-img"
               onerror="this.style.display='none'"/>
        </div>
      </div>`).join('');
    attachReveal(grid.querySelectorAll('.reveal'));
  }

  /* ── Render grills ── */
  function renderGrills(grills) {
    const grid = document.getElementById('grillsGrid');
    if (!grid || !grills) return;
    /* SECURITY: escapeHTML() + sanitizeURL() on all data */
    grid.innerHTML = grills.map(g => `
      <div class="grill-card reveal">
        ${g.popular ? '<span class="pop-badge">⭐ الأكثر طلباً</span>' : ''}
        <img src="${sanitizeURL(g.image)}"
             alt="${escapeHTML(g.name)}" loading="lazy"
             onerror="this.src=window.__PH"/>
        <div class="grill-card-body">
          <div class="grill-card-name">${escapeHTML(g.name)}</div>
          <div class="grill-card-price">${Number(g.price).toLocaleString()} ل.ل</div>
        </div>
        <div class="cart-controls">
          <button class="cart-btn minus" onclick="window.cartChange(this.dataset.name,+this.dataset.price,-1)" data-name="${escapeHTML(g.name)}" data-price="${Number(g.price)}">−</button>
          <span class="cart-qty" data-item-qty="${escapeHTML(g.name)}">0</span>
          <button class="cart-btn plus" onclick="window.cartChange(this.dataset.name,+this.dataset.price,1)" data-name="${escapeHTML(g.name)}" data-price="${Number(g.price)}">+</button>
        </div>
      </div>`).join('');
    attachReveal(grid.querySelectorAll('.reveal'));
    window.syncCartQty?.();
  }

  /* ── Render features ── */
  function renderFeatures(features) {
    const row = document.getElementById('featuresRow');
    if (!row || !features) return;
    /* SECURITY: escapeHTML() on title and desc; icon is emoji only — safe */
    row.innerHTML = features.map(f => `
      <div class="feat-card reveal">
        <div class="feat-icon">${escapeHTML(f.icon)}</div>
        <h3>${escapeHTML(f.title)}</h3>
        <p>${escapeHTML(f.desc)}</p>
      </div>`).join('');
    attachReveal(row.querySelectorAll('.reveal'));
  }

  /* ── Render offers section ── */
  function renderOffers(offers) {
    const grid = document.getElementById('offersGrid');
    if (!grid || !offers || !offers.length) return;
    grid.innerHTML = offers.map(offer => `
      <div class="offer-card reveal">
        <img src="${sanitizeURL(offer.image)}" alt="${escapeHTML(offer.name)}" loading="lazy"
             onerror="this.src=window.__PH"/>
        <div class="offer-card-body">
          <div class="offer-card-name">${escapeHTML(offer.name)}</div>
          <div class="offer-card-desc">${escapeHTML(offer.description||'')}</div>
          ${offer.price ? `<span class="offer-card-price">${Number(offer.price).toLocaleString()} ل.ل</span>` : ''}
        </div>
        ${offer.price ? `<div class="cart-controls">
          <button class="cart-btn minus" onclick="window.cartChange(this.dataset.name,+this.dataset.price,-1)" data-name="${escapeHTML(offer.name)}" data-price="${Number(offer.price)}">−</button>
          <span class="cart-qty" data-item-qty="${escapeHTML(offer.name)}">0</span>
          <button class="cart-btn plus" onclick="window.cartChange(this.dataset.name,+this.dataset.price,1)" data-name="${escapeHTML(offer.name)}" data-price="${Number(offer.price)}">+</button>
        </div>` : ''}
      </div>`).join('');
    attachReveal(grid.querySelectorAll('.reveal'));
    window.syncCartQty?.();
  }

  /* ── Render mansaf section ── */
  function renderMansaf(items) {
    const grid = document.getElementById('mansafGrid');
    if (!grid || !items || !items.length) return;
    grid.innerHTML = items.map(item => `
      <div class="fatoor-card reveal">
        <img src="${sanitizeURL(item.image)}" alt="${escapeHTML(item.name)}" loading="lazy"
             onerror="this.src=window.__PH"/>
        <div class="fatoor-card-body">
          <div class="fatoor-card-name">${escapeHTML(item.name)}</div>
          <div class="fatoor-sizes">
            ${(item.sizes||[]).map(s => `
              <div class="fatoor-size-row">
                <span class="fatoor-size-label">${escapeHTML(s.label)}</span>
                ${cartCtrl(item.name + ' - ' + s.label, s.price)}
                <span class="fatoor-size-price">${Number(s.price).toLocaleString()} ل.ل</span>
              </div>`).join('')}
          </div>
        </div>
      </div>`).join('');
    attachReveal(grid.querySelectorAll('.reveal'));
    window.syncCartQty?.();
  }

  /* ── Render fatoor section ── */
  function renderFatoor(items) {
    const grid = document.getElementById('fatoorGrid');
    if (!grid || !items) return;
    grid.innerHTML = items.map(item => `
      <div class="fatoor-card reveal">
        <img src="${sanitizeURL(item.image)}" alt="${escapeHTML(item.name)}" loading="lazy"
             onerror="this.src=window.__PH"/>
        <div class="fatoor-card-body">
          <div class="fatoor-card-name">${escapeHTML(item.emoji||'')} ${escapeHTML(item.name)}</div>
          <div class="fatoor-sizes">
            ${(item.sizes||[]).map(s => `
              <div class="fatoor-size-row">
                <span class="fatoor-size-label">${escapeHTML(s.label)}</span>
                ${cartCtrl(item.name + ' - ' + s.label, s.price)}
                <span class="fatoor-size-price">${Number(s.price).toLocaleString()} ل.ل</span>
              </div>`).join('')}
          </div>
        </div>
      </div>`).join('');
    attachReveal(grid.querySelectorAll('.reveal'));
    window.syncCartQty?.();
  }

  /* ── Render drinks section ── */
  function renderDrinks(cats) {
    const grid = document.getElementById('drinksGrid');
    if (!grid || !cats || !cats.length) return;
    grid.innerHTML = cats.map(cat => {
      const itemCards = (cat.items||[]).map(item => {
        const sizeRows = (cat.sizes||[]).map((s,i) => `
          <div class="drink-size-row">
            <span class="drink-size-label">${escapeHTML(s)}</span>
            ${cartCtrl(item.name + ' - ' + s, (item.prices||[])[i]||0)}
            <span class="drink-size-price">${Number((item.prices||[])[i]||0).toLocaleString()} ل.ل</span>
          </div>`).join('');
        const img = item.image ? `<img src="${sanitizeURL(item.image)}" alt="${escapeHTML(item.name)}" loading="lazy" onerror="this.src=window.__PH"/>` : `<img src="${PH}" alt="${escapeHTML(item.name)}"/>`;
        return `<div class="drink-card reveal">
          ${img}
          <div class="drink-card-body">
            <div class="drink-card-name">${escapeHTML(item.name)}</div>
            <div class="drink-sizes">${sizeRows}</div>
          </div>
        </div>`;
      }).join('');

      let extrasHTML = '';
      if (cat.extras && cat.extras.length) {
        extrasHTML = `<div class="drinks-extras">${cat.extras.map(e =>
          e.image
            ? `<div class="drinks-extra-item" style="display:flex;align-items:center;gap:8px;flex-direction:column;text-align:center">
                <img src="${sanitizeURL(e.image)}" alt="${escapeHTML(e.name)}" style="width:80px;height:80px;object-fit:cover;border-radius:10px;border:2px solid rgba(232,160,32,.3)" onerror="this.style.display='none'"/>
                <span>${escapeHTML(e.name)}: <span class="drinks-extra-price">${Number(e.price).toLocaleString()} ل.ل</span></span>
                ${cartCtrl(e.name, e.price)}
               </div>`
            : `<span class="drinks-extra-item" style="display:inline-flex;align-items:center;gap:6px">${escapeHTML(e.name)}: <span class="drinks-extra-price">${Number(e.price).toLocaleString()} ل.ل</span>${cartCtrl(e.name, e.price)}</span>`
        ).join('<span style="color:var(--muted)"> | </span>')}</div>`;
      }

      let kiloHTML = '';
      if (cat.kiloItems && cat.kiloItems.length) {
        const kiloSizes = cat.kiloSizes||[];
        const kiloCards = cat.kiloItems.map(item => {
          const sizeRows = kiloSizes.map((s,i) => `
            <div class="drink-size-row">
              <span class="drink-size-label">${escapeHTML(s)}</span>
              ${cartCtrl(item.name + ' - ' + s, (item.prices||[])[i]||0)}
              <span class="drink-size-price">${Number((item.prices||[])[i]||0).toLocaleString()} ل.ل</span>
            </div>`).join('');
          const img = item.image ? `<img src="${sanitizeURL(item.image)}" alt="${escapeHTML(item.name)}" loading="lazy" onerror="this.src=window.__PH"/>` : `<img src="${PH}" alt="${escapeHTML(item.name)}"/>`;
          return `<div class="drink-card reveal">${img}<div class="drink-card-body"><div class="drink-card-name">${escapeHTML(item.name)}</div><div class="drink-sizes">${sizeRows}</div></div></div>`;
        }).join('');
        kiloHTML = `<div class="drinks-kilo"><div class="drinks-kilo-title">نصف كيلو / كيلو</div><div class="drinks-grid">${kiloCards}</div></div>`;
      }

      return `<div class="drinks-cat">
        <div class="drinks-cat-head reveal">
          <span style="font-size:28px">${escapeHTML(cat.icon||'🥤')}</span>
          <div><h3>${escapeHTML(cat.name)}</h3><div class="drinks-cat-en">${escapeHTML(cat.nameEn||'')}</div></div>
        </div>
        <div class="drinks-grid">${itemCards}</div>
        ${extrasHTML}${kiloHTML}
      </div>`;
    }).join('');
    attachReveal(grid.querySelectorAll('.reveal'));
    window.syncCartQty?.();
  }

  /* ── Re-wire category filter & search after menu re-render ── */
  function rewireMenuControls() {
    const searchInput = document.getElementById('searchInput');
    const catButtons  = document.querySelectorAll('.cat-btn');

    if (searchInput) {
      searchInput.oninput = function () {
        const q = this.value.trim().toLowerCase();
        catButtons.forEach(b => b.classList.remove('active'));
        catButtons[0]?.classList.add('active');
        document.querySelectorAll('#menuGrid .menu-card').forEach(card => {
          card.classList.toggle('hidden', q && !card.dataset.name.includes(q));
        });
      };
    }

    catButtons.forEach(btn => {
      btn.onclick = function () {
        const match = this.getAttribute('onclick')?.match(/'([^']+)'/);
        const cat = match ? match[1] : 'all';
        catButtons.forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        if (searchInput) searchInput.value = '';
        document.querySelectorAll('#menuGrid .menu-card').forEach(card => {
          card.classList.toggle('hidden', cat !== 'all' && card.dataset.category !== cat);
        });
      };
    });
  }

  /* ═══════════════════════════════════════════
     MAIN — fetch data then apply to page
  ═══════════════════════════════════════════ */
  async function applyData() {
    const d = await fetchData();
    if (!d) return; /* nothing saved yet — keep hardcoded defaults */

    if (d.design)   applyDesign(d.design);

    /* Navbar */
    if (d.navbar) {
      setText('navLogo1', d.navbar.logo1);
      setText('navLogo2', d.navbar.logo2);
      setText('footerLogo1', d.navbar.logo1);
      setText('footerLogo2', d.navbar.logo2);
      document.querySelectorAll('.nav-cta').forEach(btn => {
        const icon = btn.querySelector('i')?.cloneNode(true);
        btn.textContent = ' ' + d.navbar.cta;
        if (icon) btn.prepend(icon);
      });
    }

    /* Hero */
    if (d.hero) {
      setText('heroTitle1', d.hero.title1);
      setText('heroTitle2', d.hero.title2);
      setText('heroWelcome', d.hero.welcome);
      const descEl = document.getElementById('heroDesc');
      if (descEl) descEl.innerHTML = d.hero.description.replace(/\n/g, '<br>');
      const btnMenu = document.getElementById('heroBtnMenu');
      if (btnMenu) btnMenu.innerHTML = `<i class="fas fa-utensils"></i> ${d.hero.btnMenu}`;
      const btnOrder = document.getElementById('heroBtnOrder');
      if (btnOrder) btnOrder.innerHTML = `<i class="fab fa-whatsapp"></i> ${d.hero.btnOrder}`;
      setSrc('heroImg1', d.hero.img1);
      setSrc('heroImg2', d.hero.img2);
      setSrc('heroImg3', d.hero.img3);
    }

    /* About */
    if (d.about) {
      setText('aboutTitle', d.about.title);
      setText('aboutP1', d.about.p1);
      setText('aboutP2', d.about.p2);
      setText('stat1Num', d.about.stat1);   setText('stat1Label', d.about.stat1L);
      setText('stat2Num', d.about.stat2);   setText('stat2Label', d.about.stat2L);
      setText('stat3Num', d.about.stat3);   setText('stat3Label', d.about.stat3L);
      setSrc('aboutImg', d.about.img);
    }

    /* Contact */
    if (d.contact) {
      updateWhatsApp(d.contact.whatsapp);
      setText('footerPhone', d.contact.phone);
      setText('footerWaText', d.contact.phone);
      setText('footerAddr1', d.contact.address1);
      setText('footerAddr2', d.contact.address2);
      setText('footerHours1', d.contact.hoursFrom);
      setText('footerHours2', d.contact.hoursTo);
      const phoneLink = document.getElementById('footerPhoneLink');
      if (phoneLink) phoneLink.href = `tel:${d.contact.phone.replace(/\s/g, '')}`;
      const waLink = document.getElementById('footerWaLink');
      if (waLink) waLink.href = `https://wa.me/${d.contact.whatsapp}`;
    }

    /* Dynamic sections */
    if (d.menuItems) renderMenuGrid(d.menuItems);
    if (d.meals)     renderMeals(d.meals);
    if (d.grills)    renderGrills(d.grills);
    if (d.features)  renderFeatures(d.features);
    if (d.offers)    renderOffers(d.offers);
    if (d.mansaf)    renderMansaf(d.mansaf);
    if (d.fatoor)    renderFatoor(d.fatoor);
    if (d.drinks)    renderDrinks(d.drinks);
  }

  /* Run after DOM is ready */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applyData);
  } else {
    applyData();
  }

})();
