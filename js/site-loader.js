/**
 * site-loader.js
 * Fetches restaurant data from Supabase and applies it to index.html.
 * Falls back to localStorage cache if Supabase is unreachable.
 */

(function () {
  'use strict';

  /* ── Supabase config (same as admin.html) ── */
  const SB_URL = 'https://hnyzgeucabtpppyxnsel.supabase.co';
  const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhueXpnZXVjYWJ0cHBweXhuc2VsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA1MDI3ODMsImV4cCI6MjA5NjA3ODc4M30.nv0BG6B01YRL4fAPoLuBol7b9dY67nJTRI6dVCy4dc0';

  /* ── Fetch from Supabase ── */
  async function fetchData() {
    try {
      const res = await fetch(`${SB_URL}/rest/v1/site_data?id=eq.1&select=data`, {
        headers: { 'apikey': SB_KEY, 'Authorization': `Bearer ${SB_KEY}` }
      });
      const rows = await res.json();
      const data = rows[0]?.data;
      if (data && Object.keys(data).length) {
        /* Cache locally for offline fallback */
        localStorage.setItem('restaurantData', JSON.stringify(data));
        return data;
      }
    } catch (e) { /* network error — fall through to cache */ }

    /* Fallback: localStorage cache */
    try {
      const raw = localStorage.getItem('restaurantData');
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  }

  /* ── Safely update text ── */
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

  /* ── Render menu grid ── */
  function renderMenuGrid(items) {
    const grid = document.getElementById('menuGrid');
    if (!grid || !items) return;
    const sorted = [...items].sort((a, b) => a.order - b.order);
    grid.innerHTML = sorted.map(item => `
      <div class="menu-card reveal" data-category="${item.category}" data-name="${item.name}">
        ${item.popular ? '<span class="pop-badge">⭐ الأكثر طلباً</span>' : ''}
        <img src="${item.image}" alt="${item.name}" loading="lazy"
             onerror="this.src='https://placehold.co/300x160?text=${encodeURIComponent(item.name)}'"/>
        <div class="card-body">
          <div class="card-name">${item.name}</div>
          <div class="card-price">${item.price.toLocaleString()} ل.ل</div>
        </div>
      </div>`).join('');
    attachReveal(grid.querySelectorAll('.reveal'));
    rewireMenuControls();
  }

  /* ── Render meals ── */
  function renderMeals(meals) {
    const grid = document.getElementById('mealsGrid');
    if (!grid || !meals) return;
    grid.innerHTML = meals.map(meal => `
      <div class="meal-cat reveal">
        <div class="meal-cat-head"><h3>${meal.name}</h3></div>
        <div class="meal-cat-body">
          <div class="meal-items-list">
            ${meal.items.map(item => `
              <div class="meal-row">
                <span class="meal-row-name">${item.name}</span>
                <span class="meal-row-price">${item.price.toLocaleString()}</span>
              </div>`).join('')}
          </div>
          <img src="${meal.image}" alt="${meal.name}" class="meal-cat-img"
               onerror="this.style.display='none'"/>
        </div>
      </div>`).join('');
    attachReveal(grid.querySelectorAll('.reveal'));
  }

  /* ── Render grills ── */
  function renderGrills(grills) {
    const grid = document.getElementById('grillsGrid');
    if (!grid || !grills) return;
    grid.innerHTML = grills.map(g => `
      <div class="grill-card reveal">
        ${g.popular ? '<span class="pop-badge">⭐ الأكثر طلباً</span>' : ''}
        <img src="${g.image}" alt="${g.name}" loading="lazy"
             onerror="this.src='https://placehold.co/300x150?text=${encodeURIComponent(g.name)}'"/>
        <div class="grill-card-body">
          <div class="grill-card-name">${g.name}</div>
          <div class="grill-card-price">${g.price.toLocaleString()} ل.ل</div>
        </div>
      </div>`).join('');
    attachReveal(grid.querySelectorAll('.reveal'));
  }

  /* ── Render features ── */
  function renderFeatures(features) {
    const row = document.getElementById('featuresRow');
    if (!row || !features) return;
    row.innerHTML = features.map(f => `
      <div class="feat-card reveal">
        <div class="feat-icon">${f.icon}</div>
        <h3>${f.title}</h3>
        <p>${f.desc}</p>
      </div>`).join('');
    attachReveal(row.querySelectorAll('.reveal'));
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
  }

  /* Run after DOM is ready */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applyData);
  } else {
    applyData();
  }

})();
