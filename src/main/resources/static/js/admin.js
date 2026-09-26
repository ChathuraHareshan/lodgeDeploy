
(function () {
  'use strict';

  async function call(method, url, body) {
    let res;
    try {
      res = await fetch(url, {
        method,
        headers: body === undefined ? { Accept: 'application/json' } : { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: body === undefined ? undefined : JSON.stringify(body)
      });
    } catch (e) {
      throw new Error('Cannot reach the server. Is the Lodge application running?');
    }
    let json;
    try { json = await res.json(); } catch (e) { throw new Error('Unexpected response from the server (HTTP ' + res.status + ')'); }
    if (!json || json.status !== true) throw new Error((json && json.message) || 'Request failed');
    return json;
  }

  const api = {
    meta: () => call('GET', 'api/admin/meta'),
    villas: {
      list: () => call('GET', 'api/admin/villa/all').then((r) => r.villas),
      get: (id) => call('GET', 'api/admin/villa/' + id).then((r) => r.villa),
      save: (v) => (v.id ? call('PUT', 'api/admin/villa/' + v.id, v) : call('POST', 'api/admin/villa', v)).then((r) => r.villa),
      setStatus: (id, status) => call('PUT', 'api/admin/villa/' + id + '/status', { status }),
      remove: (id) => call('DELETE', 'api/admin/villa/' + id)
    },
    rooms: {
      list: () => call('GET', 'api/admin/room/all').then((r) => r.rooms),
      save: (r) => (r.id ? call('PUT', 'api/admin/room/' + r.id, r) : call('POST', 'api/admin/room', r)).then((x) => x.room),
      remove: (id) => call('DELETE', 'api/admin/room/' + id)
    },
    facilities: {
      list: () => call('GET', 'api/admin/facility/all').then((r) => r.facilities),
      create: (f) => call('POST', 'api/admin/facility', f).then((r) => r.facility),
      update: (id, f) => call('PUT', 'api/admin/facility/' + id, f).then((r) => r.facility),
      remove: (id) => call('DELETE', 'api/admin/facility/' + id)
    },
    bookings: {
      list: () => call('GET', 'api/admin/booking/all').then((r) => r.bookings),
      update: (id, body) => call('PUT', 'api/admin/booking/' + id + '/status', body).then((r) => r.booking)
    },
    reviews: {
      list: () => call('GET', 'api/admin/review/all').then((r) => r.reviews),
      setStatus: (id, status) => call('PUT', 'api/admin/review/' + id + '/status', { status }),
      remove: (id) => call('DELETE', 'api/admin/review/' + id)
    },
    offers: {
      list: () => call('GET', 'api/admin/offer/all').then((r) => r.offers),
      save: (o) => (o.id ? call('PUT', 'api/admin/offer/' + o.id, o) : call('POST', 'api/admin/offer', o)).then((r) => r.offer),
      setActive: (id, active) => call('PUT', 'api/admin/offer/' + id + '/active', { active }),
      remove: (id) => call('DELETE', 'api/admin/offer/' + id)
    },
    roomFeatures: {
      list: () => call('GET', 'api/admin/room-feature/all').then((r) => r.roomFeatures),
      create: (f) => call('POST', 'api/admin/room-feature', f).then((r) => r.roomFeature),
      update: (id, f) => call('PUT', 'api/admin/room-feature/' + id, f),
      remove: (id) => call('DELETE', 'api/admin/room-feature/' + id)
    },
    users: {
      list: () => call('GET', 'api/admin/user/all').then((r) => r.users),
      setRole: (id, role) => call('PUT', 'api/admin/user/' + id + '/role', { role }),
      setStatus: (id, status) => call('PUT', 'api/admin/user/' + id + '/status', { status }),
      remove: (id) => call('DELETE', 'api/admin/user/' + id)
    }
  };

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

  const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const norm = (s) => String(s || '').trim().toLowerCase();

  const ADMIN_CURRENCY_KEY = 'lodge.admin.currency';
  const ADMIN_RATE_KEY = 'lodge.admin.lkrPerUsd';
  const adminCurrency = { code: 'LKR', lkrPerUsd: 330 };
  try {
    if (localStorage.getItem(ADMIN_CURRENCY_KEY) === 'USD') adminCurrency.code = 'USD';
    const cachedRate = parseFloat(localStorage.getItem(ADMIN_RATE_KEY));
    if (cachedRate > 0) adminCurrency.lkrPerUsd = cachedRate;
  } catch (e) { }

  function setAdminCurrency(code) {
    adminCurrency.code = code === 'USD' ? 'USD' : 'LKR';
    try { localStorage.setItem(ADMIN_CURRENCY_KEY, adminCurrency.code); } catch (e) { }
  }

  const money = (n) => {
    const lkr = Number(n) || 0;
    if (adminCurrency.code === 'USD') {
      const usd = lkr / (adminCurrency.lkrPerUsd || 330);
      const digits = Math.abs(usd) < 100 ? 2 : 0;
      return 'US$' + usd.toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits });
    }
    return 'LKR ' + Math.round(lkr).toLocaleString('en-US');
  };
  const num = (v) => { const n = parseFloat(v); return Number.isNaN(n) ? 0 : n; };
  const slugify = (s) => String(s || '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  const safeIcon = (v) => (/^fa-[a-z0-9-]+$/.test(v || '') ? v : 'fa-circle-check');
  const statusClass = (s) => slugify(s);
  const isUrl = (s) => /^https?:\/\/\S+$/i.test(String(s || '').trim());
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const fmtDate = (iso) => { if (!iso) return '-'; const [y, m, d] = iso.split('-').map(Number); return `${MONTHS[m - 1]} ${d}, ${y}`; };
  const plural = (n, one, many) => `${n} ${n === 1 ? one : (many || one + 's')}`;
  const discountOf = (base, price) => (num(base) > 0 && num(price) > 0 && num(price) <= num(base) ? Math.round((1 - num(price) / num(base)) * 100) : 0);
  const debounce = (fn, ms = 150) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };

  const data = {
    regions: [], categories: [], facilities: [], roomFeatures: [], villas: [], rooms: [], bookings: [], reviews: [], offers: [], users: [],

    propertyTypes: [], dealTypes: [], nearbyTypes: [], cancellationPolicies: [], prepaymentPolicies: [], highlightPresets: []
  };
  const ui = {
    propertySearch: '', propertyStatus: 'All status', propertyRegion: '',
    roomSearch: '', roomVilla: '',
    facilityCat: 'All', facilitySearch: '', featureSearch: '',
    bookingTab: 'All', bookingSearch: '', bookingDate: 'All dates', bookingPay: '', reviewTab: 'Pending', revRange: '30',
    userSearch: '', userRole: '', userStatus: ''
  };
  const villaById = (id) => data.villas.find((v) => v.id === Number(id));
  const coverOf = (v) => v.heroImage || '';

  function villaStats() {
    const map = new Map();
    data.bookings.filter((b) => b.bookingStatus !== 'Cancelled').forEach((b) => {
      const s = map.get(b.villaId) || { count: 0, revenue: 0 };
      s.count += 1; s.revenue += Number(b.total) || 0;
      map.set(b.villaId, s);
    });
    return map;
  }

  async function refreshCurrencyRate() {
    const status = $('#rate-status'), btn = $('#refresh-rate');
    if (!status) return;
    if (btn) btn.disabled = true;
    status.textContent = 'Checking today\'s rate...';
    try {
      const res = await fetch('api/currency');
      const d = await res.json();
      if (!d || d.status !== true) throw new Error('lookup failed');
      const rate = Number(d.lkrPerUsd);
      adminCurrency.lkrPerUsd = rate;
      try { localStorage.setItem(ADMIN_RATE_KEY, String(rate)); } catch (e) {  }
      const when = d.updatedAt ? ` · updated ${d.updatedAt}` : '';
      status.textContent = `1 USD = ${rate.toFixed(2)} LKR (${d.source === 'live' ? "today's live rate" : 'configured rate'}${when})`;
      renderDashboard(); renderBookings(); renderProperties(); renderUsers();
    } catch (e) {
      status.textContent = "Couldn't fetch today's rate — using the last known rate.";
    }
    if (btn) btn.disabled = false;
  }

  function toast(message, type = 'success') {
    const box = $('#admin-toast-container');
    const icons = { success: 'fa-circle-check', error: 'fa-circle-exclamation', info: 'fa-circle-info' };
    const el = document.createElement('div');
    el.className = 'admin-toast ' + type;
    el.innerHTML = `<i class="fa-solid ${icons[type] || icons.info}"></i><span></span>`;
    el.querySelector('span').textContent = message;
    box.appendChild(el);
    setTimeout(() => el.remove(), 3600);
  }

  function confirmDialog({ title, message, confirmLabel = 'Confirm', danger = false }) {
    return new Promise((resolve) => {
      const wrap = document.createElement('div');
      wrap.className = 'admin-modal-backdrop';
      wrap.style.zIndex = '160';
      wrap.innerHTML = `<div class="admin-modal sm" role="alertdialog" aria-modal="true">
        <div class="admin-modal-heading"><div><h2>${esc(title)}</h2></div></div>
        <div style="padding:18px 24px;color:#475467;line-height:1.55">${message}</div>
        <div class="admin-modal-actions"><span class="left"></span>
          <button type="button" class="admin-secondary-button" data-r="0">Cancel</button>
          <button type="button" class="${danger ? 'admin-danger-button' : 'admin-primary-button'}" data-r="1">${esc(confirmLabel)}</button></div></div>`;
      const finish = (v) => { document.removeEventListener('keydown', onKey, true); wrap.remove(); resolve(v); };
      const onKey = (e) => { if (e.key === 'Escape') { e.stopPropagation(); finish(false); } };
      wrap.addEventListener('click', (e) => { const b = e.target.closest('[data-r]'); if (b) finish(b.dataset.r === '1'); else if (e.target === wrap) finish(false); });
      document.addEventListener('keydown', onKey, true);
      document.body.appendChild(wrap);
      wrap.querySelector('[data-r="1"]').focus();
    });
  }

  const modal = { backdrop: $('#admin-modal-backdrop'), box: $('.admin-modal'), onSubmit: null };

  function openModal({ eyebrow, title, size = '', html, submitLabel = 'Save changes', submitIcon = 'fa-check', hint = '', onSubmit, onOpen }) {
    modal.box.className = 'admin-modal ' + size;
    $('#modal-eyebrow').textContent = eyebrow;
    $('#modal-title').textContent = title;
    $('#modal-fields').innerHTML = html;
    $('#modal-fields').scrollTop = 0;
    $('#modal-hint').textContent = hint;
    const submit = $('#admin-form button[type="submit"]');
    submit.innerHTML = `<i class="fa-solid ${submitIcon}"></i> ${esc(submitLabel)}`;
    submit.disabled = false;
    modal.onSubmit = onSubmit;
    modal.backdrop.classList.remove('hidden');
    if (onOpen) onOpen();
  }

  function closeModal() {
    closePopovers();
    modal.backdrop.classList.add('hidden');
    $('#modal-fields').innerHTML = '';
    modal.onSubmit = null;
    ctx = null;
  }

  async function submitWith(task) {
    const btn = $('#admin-form button[type="submit"]');
    btn.disabled = true;
    try { await task(); closeModal(); return true; } catch (err) { toast(err.message || 'Something went wrong', 'error'); btn.disabled = false; return false; }
  }

  const ICONS = ('fa-wifi|wifi internet network,fa-person-swimming|pool swimming,fa-water-ladder|pool ladder,fa-hot-tub-person|jacuzzi hot tub,fa-spa|spa massage wellness,' +
    'fa-utensils|restaurant dining food,fa-martini-glass-citrus|bar cocktail,fa-martini-glass|bar drink,fa-wine-glass|wine,fa-beer-mug-empty|beer,fa-mug-hot|tea coffee,' +
    'fa-mug-saucer|breakfast tea,fa-bowl-food|meal food,fa-burger|burger snack,fa-ice-cream|dessert,fa-bell-concierge|room service concierge,fa-van-shuttle|shuttle transfer airport,' +
    'fa-plane|airport flight,fa-car|car parking taxi,fa-taxi|taxi,fa-bus|bus,fa-motorcycle|scooter bike,fa-bicycle|bicycle cycling,fa-square-parking|parking,fa-snowflake|air conditioning cool,' +
    'fa-fan|fan,fa-fire|heating fire,fa-dumbbell|gym fitness,fa-umbrella-beach|beach,fa-umbrella|umbrella,fa-water|sea ocean water,fa-sailboat|boat sail,fa-ship|ship cruise,fa-anchor|anchor,' +
    'fa-fish|fishing fish,fa-person-hiking|hiking trek,fa-mountain|mountain view,fa-tree|tree garden nature,fa-leaf|leaf eco,fa-seedling|garden eco,fa-sun|sun sunny,fa-moon|night moon,' +
    'fa-cloud-sun|weather,fa-wind|wind,fa-droplet|water drop,fa-tv|tv television,fa-bed|bed room,fa-couch|sofa living room,fa-bath|bath tub,fa-shower|shower,fa-soap|soap toiletries,' +
    'fa-kitchen-set|kitchen,fa-blender|blender kitchen,fa-shirt|laundry clothes,fa-broom|cleaning housekeeping,fa-key|key access,fa-lock|safe lock,fa-shield-halved|security safe,' +
    'fa-door-open|door entrance,fa-window-maximize|window view,fa-volume-xmark|quiet soundproof,fa-lightbulb|light,fa-plug|power plug,fa-bolt|electric power,fa-phone|phone,fa-headset|support help,' +
    'fa-location-dot|location map pin,fa-map|map,fa-compass|compass explore,fa-binoculars|view safari,fa-camera|photo camera,fa-monument|monument heritage,fa-landmark|landmark museum,' +
    'fa-vihara|temple buddhist,fa-om|temple hindu,fa-torii-gate|gate,fa-tent|tent camping,fa-campground|camp,fa-house|house home,fa-building|building city,fa-city|city,fa-elevator|lift elevator,' +
    'fa-wheelchair|accessible,fa-baby|baby family,fa-child|kids child,fa-paw|pets dog cat,fa-heart|romantic love couples,fa-champagne-glasses|celebration party,fa-cake-candles|birthday,' +
    'fa-gift|gift welcome,fa-music|music,fa-guitar|live music,fa-gamepad|games,fa-book|library books,fa-golf-ball-tee|golf,fa-table-tennis-paddle-ball|table tennis,fa-person-kayaking|kayak,' +
    'fa-calendar-check|booking calendar,fa-clock|time,fa-star|star favourite,fa-thumbs-up|recommended,fa-award|award,fa-gem|luxury,fa-crown|premium,fa-check|tick,fa-ban-smoking|no smoking,' +
    'fa-smoking|smoking,fa-umbrella|rain,fa-glass-water|water drink,fa-wine-bottle|bottle wine,fa-fan|ceiling fan').split(',')
    .map((s) => { const [slug, kw] = s.split('|'); return { slug, kw: slug.replace('fa-', '').replace(/-/g, ' ') + ' ' + kw }; });

  const iconPicker = (id, value) => {
    const v = safeIcon(value);
    return `<div class="icon-picker" data-picker="${esc(id)}" data-value="${v}"><button type="button" class="icon-picker-btn" aria-expanded="false" title="Choose icon"><i class="fa-solid ${v}"></i></button></div>`;
  };
  const pickerValue = (id, root = document) => { const el = root.querySelector(`.icon-picker[data-picker="${id}"]`); return el ? el.dataset.value : 'fa-star'; };

  let openPopover = null;
  function closePopovers() {
    if (!openPopover) return;
    $('.icon-picker-btn', openPopover.picker)?.setAttribute('aria-expanded', 'false');
    openPopover.pop.remove();
    openPopover = null;
  }

  function openIconPopover(picker) {
    closePopovers();
    const btn = $('.icon-picker-btn', picker);
    btn.setAttribute('aria-expanded', 'true');
    const pop = document.createElement('div');
    pop.className = 'icon-popover';
    pop.innerHTML = '<input type="text" placeholder="Search icons (pool, wifi, spa...)" aria-label="Search icons"><div class="icon-grid"></div>';
    document.body.appendChild(pop);

    const rect = btn.getBoundingClientRect();
    const up = window.innerHeight - rect.bottom < 320 && rect.top > 320;
    pop.style.position = 'fixed';
    pop.style.left = Math.max(8, Math.min(rect.left, window.innerWidth - 346)) + 'px';
    pop.style.top = up ? Math.max(8, rect.top - pop.offsetHeight - 6) + 'px' : rect.bottom + 6 + 'px';

    const grid = $('.icon-grid', pop);
    const input = $('input', pop);
    const draw = () => {
      const q = norm(input.value);
      const list = ICONS.filter((i) => !q || i.kw.includes(q));
      grid.innerHTML = list.length
        ? list.map((i) => `<button type="button" data-icon="${i.slug}" title="${esc(i.slug.replace('fa-', ''))}" class="${i.slug === picker.dataset.value ? 'selected' : ''}"><i class="fa-solid ${i.slug}"></i></button>`).join('')
        : '<div class="icon-empty">No icon found</div>';
    };
    draw();
    input.addEventListener('input', draw);
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') e.preventDefault(); });
    pop.addEventListener('click', (e) => {
      const b = e.target.closest('button[data-icon]');
      if (!b) return;
      e.preventDefault();
      setPicker(picker, b.dataset.icon);
      closePopovers();
    });
    openPopover = { picker, pop };
    if (up) pop.style.top = Math.max(8, rect.top - pop.offsetHeight - 6) + 'px';
    input.focus();
  }

  function setPicker(picker, icon) {
    picker.dataset.value = safeIcon(icon);
    $('.icon-picker-btn i', picker).className = 'fa-solid ' + safeIcon(icon);
    picker.dispatchEvent(new CustomEvent('iconchange', { bubbles: true, detail: { id: picker.dataset.picker, value: safeIcon(icon) } }));
  }

  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.icon-picker-btn');
    if (btn) { e.preventDefault(); const picker = btn.closest('.icon-picker'); if (openPopover && openPopover.picker === picker) closePopovers(); else openIconPopover(picker); return; }
    if (openPopover && !openPopover.pop.contains(e.target)) closePopovers();
  });
  window.addEventListener('resize', closePopovers);
  document.addEventListener('scroll', (e) => { if (openPopover && !openPopover.pop.contains(e.target)) closePopovers(); }, true);

  const TITLES = {
    dashboard: 'Dashboard', properties: 'Villas & properties', rooms: 'Rooms & inventory', bookings: 'Bookings', reviews: 'Reviews',
    offers: 'Offers & promotions', guests: 'Guests & partners', settings: 'Settings', facilities: 'Facilities catalog', 'room-features': 'Room features'
  };

  function showSection(name) {
    if (!TITLES[name]) name = 'dashboard';
    $$('.admin-section').forEach((s) => s.classList.toggle('active', s.id === 'section-' + name));
    $$('.admin-nav-item').forEach((b) => b.classList.toggle('active', b.dataset.section === name));
    $('#breadcrumb-title').textContent = TITLES[name];
    $('#admin-sidebar').classList.remove('open');
    if (location.hash !== '#' + name) history.replaceState(null, '', '#' + name);
    window.scrollTo(0, 0);
  }

  function renderCounts() {
    const set = (section, value, alert) => {
      const item = $(`.admin-nav-item[data-section="${section}"]`); if (!item) return;
      let b = $('b', item);
      if (!b) { b = document.createElement('b'); item.appendChild(b); }
      b.textContent = value; b.classList.toggle('alert-count', !!alert); b.hidden = value === 0 || value === '0';
    };
    set('properties', data.villas.length);
    set('facilities', data.facilities.length);
    set('room-features', data.roomFeatures.length);
    set('bookings', data.bookings.filter((b) => b.bookingStatus === 'Pending').length, true);
    set('reviews', data.reviews.filter((r) => r.status === 'Pending').length, true);

    const active = data.rooms.filter((r) => r.status !== 'Inactive');
    const low = active.filter((r) => r.stock <= 2).length;
    const units = active.reduce((n, r) => n + r.stock, 0);
    const el = (id) => document.getElementById(id);
    if (el('inventory-title')) el('inventory-title').textContent = data.rooms.length ? `${plural(data.rooms.length, 'room type')} across ${plural(data.villas.length, 'villa')}` : 'No room types yet';
    if (el('inventory-text')) el('inventory-text').textContent = data.rooms.length
      ? `${units} bookable room units in stock. ${low ? plural(low, 'room type') + ' running low (2 or fewer left).' : 'No room type is running low.'}`
      : 'Add a villa, then add its first room type so guests can book it.';
    renderDashboard();
  }

  const rowActions = (buttons) => `<div class="row-actions">${buttons.map((b) =>
    `<button type="button" class="row-btn ${b.danger ? 'danger' : ''}" data-act="${b.act}" data-id="${b.id}" title="${esc(b.title)}" aria-label="${esc(b.title)}"><i class="fa-solid ${b.icon}"></i></button>`).join('')}</div>`;

  function renderProperties() {
    const q = norm(ui.propertySearch);
    const stats = villaStats();
    const list = data.villas.filter((v) =>
      (!q || [v.name, v.city, v.regionName, v.propertyType].join(' ').toLowerCase().includes(q)) &&
      (ui.propertyStatus === 'All status' || v.status === ui.propertyStatus) &&
      (!ui.propertyRegion || String(v.regionId) === String(ui.propertyRegion)));

    $('#properties-table').innerHTML = list.length ? list.map((v) => {
      const s = stats.get(v.id) || { count: 0, revenue: 0 };
      return `
      <tr>
        <td><div class="property-cell"><img src="${esc(coverOf(v))}" alt="" onerror="this.style.visibility='hidden'"><span><strong>${esc(v.name)}</strong><small>${esc(v.propertyType)} · ${v.stars} star</small></span></div></td>
        <td>${esc(v.city)}<small>${esc(v.regionName)}</small></td>
        <td>${v.roomCount ? plural(v.roomCount, 'room') : '<span class="soft-warn">No rooms yet</span>'}<small>${plural(v.facilityCount, 'facility', 'facilities')}</small></td>
        <td>${v.reviewCount ? `<strong>${Number(v.reviewScore).toFixed(1)}</strong><small>${v.reviewCount} reviews</small>` : '<small>New</small>'}</td>
        <td><strong>${s.count}</strong><small>bookings</small></td>
        <td><strong>${money(s.revenue)}</strong><small>lifetime</small></td>
        <td><span class="status-pill ${statusClass(v.status)}">${esc(v.status)}</span></td>
        <td>${fmtDate(v.updatedAt)}</td>
        <td>${rowActions([
          { act: 'edit-villa', id: v.id, title: 'Edit villa', icon: 'fa-pen' },
          { act: 'add-villa-room', id: v.id, title: 'Add a room to this villa', icon: 'fa-plus' },
          { act: 'villa-rooms', id: v.id, title: 'View rooms', icon: 'fa-bed' },
          { act: 'toggle-villa', id: v.id, title: v.status === 'Published' ? 'Pause villa' : 'Publish villa', icon: v.status === 'Published' ? 'fa-eye-slash' : 'fa-eye' },
          { act: 'delete-villa', id: v.id, title: 'Delete villa', icon: 'fa-trash', danger: true }])}</td>
      </tr>`;
    }).join('') : `<tr class="empty-row"><td colspan="9">${data.villas.length ? 'No villas match your filters.' : 'No villas in the database yet. Click "Add new villa" to create the first one.'}</td></tr>`;
  }

  const roomState = (r) => (r.status === 'Inactive' ? ['Paused', 'paused'] : r.stock <= 0 ? ['Sold out', 'sold-out'] : r.stock <= 2 ? ['Low stock', 'low'] : ['Available', 'available']);

  function renderRooms() {
    const q = norm(ui.roomSearch);
    const list = data.rooms.filter((r) =>
      (!q || (r.name + ' ' + r.villaName).toLowerCase().includes(q)) && (!ui.roomVilla || String(r.villaId) === String(ui.roomVilla)));

    $('#rooms-table').innerHTML = list.length ? list.map((r) => {
      const [label, cls] = roomState(r);
      return `<tr>
        <td><strong>${esc(r.name)}</strong><small>${r.features.length} features · ${esc(r.bedInfo)}</small></td>
        <td>${esc(r.villaName)}</td>
        <td>${plural(r.maxGuests, 'guest')}<small>${esc(r.sizeSqm)}</small></td>
        <td><strong>${money(r.discountPrice)}</strong><small>${r.discountPercent ? `<s>${money(r.originalPrice)}</s> · -${r.discountPercent}%` : ''}</small></td>
        <td>${r.stock} units</td>
        <td><span class="status-pill ${cls}">${label}</span></td>
        <td>${rowActions([{ act: 'edit-room', id: r.id, title: 'Edit room', icon: 'fa-pen' }, { act: 'delete-room', id: r.id, title: 'Delete room', icon: 'fa-trash', danger: true }])}</td>
      </tr>`;
    }).join('') : `<tr class="empty-row"><td colspan="7">${data.rooms.length ? 'No room types match your filters.' : 'No room types in the database yet. Use "Add room type" to create one.'}</td></tr>`;
  }

  const isoDay = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const todayIso = () => isoDay(new Date());
  const addDays = (iso, n) => { const [y, m, d] = iso.split('-').map(Number); return isoDay(new Date(y, m - 1, d + n)); };
  const payLabel = (p) => (p === 'PayAtProperty' ? 'Pay at Villa · unpaid' : p === 'Pending' ? 'Payment pending' : p === 'Failed' ? 'Payment failed' : p);
  const guestsText = (b) => `${plural(b.adults, 'adult')}${b.children ? ' · ' + plural(b.children, 'child', 'children') : ''}`;

  function bookingMatchesDate(b) {
    const t = todayIso();
    switch (ui.bookingDate) {
      case 'today': return b.checkIn === t;
      case 'week': return b.checkIn >= t && b.checkIn <= addDays(t, 6);
      case 'month': return b.checkIn.slice(0, 7) === t.slice(0, 7);
      default: return true;
    }
  }

  function filteredBookings() {
    const q = norm(ui.bookingSearch);
    return data.bookings.filter((b) => (ui.bookingTab === 'All' || b.bookingStatus === ui.bookingTab) &&
      (!q || [b.reference, b.guestName, b.guestEmail, b.villaName].join(' ').toLowerCase().includes(q)) &&
      (!ui.bookingPay || b.paymentStatus === ui.bookingPay) && bookingMatchesDate(b));
  }

  function renderBookings() {
    const tabs = ['All', 'Pending', 'Confirmed', 'Completed', 'Cancelled'];
    const count = (t) => (t === 'All' ? data.bookings.length : data.bookings.filter((b) => b.bookingStatus === t).length);
    $$('#booking-tabs button').forEach((btn) => {
      const t = btn.dataset.tab;
      btn.classList.toggle('active', t === ui.bookingTab);
      const b = $('b', btn); if (b && tabs.includes(t)) b.textContent = count(t);
    });
    const list = filteredBookings();
    $('#bookings-table').innerHTML = list.length ? list.map((b) => `
      <tr>
        <td><strong>${esc(b.reference)}</strong><small>${esc(b.paymentMethod || 'Pay at Villa')} · ${esc(payLabel(b.paymentStatus))}</small></td>
        <td>${esc(b.guestName)}<small>${esc(b.guestEmail)}</small></td>
        <td>${esc(b.villaName)}<small>${b.rooms.map((r) => `${r.quantity} × ${esc(r.name)}`).join(', ')}</small></td>
        <td>${fmtDate(b.checkIn)} → ${fmtDate(b.checkOut)}<small>${plural(b.nights, 'night')} · ${guestsText(b)}</small></td>
        <td><strong>${money(b.total)}</strong><small>+${money(b.taxes)} taxes</small></td>
        <td><span class="status-pill ${statusClass(b.bookingStatus)}">${esc(b.bookingStatus)}</span></td>
        <td>${rowActions([{ act: 'view-booking', id: b.id, title: 'View / manage booking', icon: 'fa-eye' }])}</td>
      </tr>`).join('') : `<tr class="empty-row"><td colspan="7">${data.bookings.length ? 'No bookings match your filters.' : 'No bookings yet. Reservations made by guests appear here.'}</td></tr>`;
  }

  function openBookingModal(id) {
    const b = data.bookings.find((x) => x.id === id);
    if (!b) return;
    ctx = { type: 'booking', state: b };
    const row = (l, v, full) => `<div class="field ${full ? 'full' : ''}"><span class="field-label">${l}</span><div>${v}</div></div>`;
    const muted = (t) => `<small style="color:var(--muted)">${t}</small>`;
    const cancelled = b.bookingStatus === 'Cancelled';
    const started = b.checkIn <= todayIso();
    openModal({
      eyebrow: 'Reservation', title: b.reference, submitLabel: 'Close', submitIcon: 'fa-check', size: '',
      html: `<div class="fg">
        ${row('Guest', `<b>${esc(b.guestName)}</b><br>${muted(esc(b.guestEmail) + (b.guestPhone ? ' · ' + esc(b.guestPhone) : ''))}<br>${muted(b.hasAccount ? 'Has a Lodge account' : 'Guest checkout')}`)}
        ${row('Property', `${esc(b.villaName)}<br>${muted(b.rooms.map((r) => `${r.quantity} × ${esc(r.name)}`).join(', '))}`)}
        ${row('Stay', `${fmtDate(b.checkIn)} → ${fmtDate(b.checkOut)}<br>${muted(plural(b.nights, 'night') + ' · ' + guestsText(b))}`)}
        ${row('Check-in / Check-out time', `From <b>${CHECKIN_TIME}</b> &nbsp;·&nbsp; Until <b>${CHECKOUT_TIME}</b>`)}
        ${row('Amount', `<b>${money(b.total)}</b><br>${muted('+' + money(b.taxes) + ' taxes · ' + esc(b.paymentMethod || 'Pay at Villa'))}`)}
        ${row('Booking status', `<span class="status-pill ${statusClass(b.bookingStatus)}">${esc(b.bookingStatus)}</span>${b.createdAt ? '<br>' + muted('Booked ' + fmtDate(b.createdAt)) : ''}`)}
        ${row('Payment', `<b>${esc(b.paymentMethod || 'Pay at Villa')}</b><br><span class="status-pill ${statusClass(b.paymentStatus === 'Paid' ? 'confirmed' : ['Cancelled', 'Failed'].includes(b.paymentStatus) ? 'cancelled' : 'pending')}">${esc(payLabel(b.paymentStatus))}</span>`)}
        ${b.specialRequests ? row('Special requests', esc(b.specialRequests), true) : ''}
        ${b.reviewed ? row('Review', 'The guest has reviewed this stay.', true) : ''}
      </div>
      <div style="display:flex;gap:8px;margin-top:16px;flex-wrap:wrap">
        ${(b.paymentMethod !== 'PayHere' || b.paymentStatus === 'Paid') ? '<button type="button" class="admin-secondary-button" data-invoice="1"><i class="fa-solid fa-file-invoice"></i> Generate / print invoice</button>' : '<p style="font-size:13px;color:var(--muted)">Accept the PayHere payment to enable the invoice.</p>'}
      </div>
      ${cancelled ? `<p style="margin-top:16px;color:var(--muted);font-size:13px">This booking was cancelled. Its rooms are available to other guests again and it can't be changed.</p>` : `
      <div style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap">
        ${b.bookingStatus === 'Pending' ? '<button type="button" class="admin-primary-button" data-bk="Confirmed"><i class="fa-solid fa-check"></i> Confirm booking</button>' : ''}
        ${b.bookingStatus === 'Confirmed' && started ? '<button type="button" class="admin-primary-button" data-bk="Completed"><i class="fa-solid fa-flag-checkered"></i> Mark completed</button>' : ''}
        ${b.paymentStatus !== 'Paid' ? `<button type="button" class="admin-secondary-button" data-pay="Paid"><i class="fa-solid fa-money-bill-wave"></i> ${b.paymentMethod === 'PayHere' ? 'Accept payment / mark as paid' : 'Mark as paid'}</button>` : ''}
        <button type="button" class="admin-danger-button" data-bk="Cancelled"><i class="fa-solid fa-ban"></i> Cancel booking</button>
      </div>`}`,
      onSubmit: closeModal
    });
    ctx.onClick = async (e) => {
      if (e.target.closest('[data-invoice]')) { if (typeof openInvoice === 'function') openInvoice(b); return; }
      const btn = e.target.closest('[data-bk], [data-pay]');
      if (!btn) return;
      const body = btn.dataset.bk ? { bookingStatus: btn.dataset.bk } : { paymentStatus: btn.dataset.pay };
      if (body.bookingStatus === 'Cancelled') {
        const sure = await confirmDialog({ title: 'Cancel this booking?', danger: true, confirmLabel: 'Cancel booking',
          message: `<b>${esc(b.reference)}</b> for ${esc(b.guestName)} will be cancelled and its rooms released. This can't be undone.` });
        if (!sure) return;
      }
      btn.disabled = true;
      try {
        await api.bookings.update(b.id, body);
        data.bookings = await api.bookings.list();
        renderBookings(); renderCounts();
        toast(body.bookingStatus ? `${b.reference} is now ${body.bookingStatus.toLowerCase()}` : `${b.reference} marked as paid`);
        closeModal();
      } catch (err) { toast(err.message, 'error'); btn.disabled = false; }
    };
  }

  function exportBookings() {
    const list = filteredBookings();
    if (!list.length) return toast('No bookings to export', 'info');
    const cell = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const rows = [['Reference', 'Guest', 'Email', 'Phone', 'Villa', 'Rooms', 'Check-in', 'Check-out', 'Nights', 'Adults', 'Children', 'Total LKR', 'Taxes LKR', 'Payment', 'Status', 'Booked on']]
      .concat(list.map((b) => [b.reference, b.guestName, b.guestEmail, b.guestPhone, b.villaName, b.rooms.map((r) => `${r.quantity}x ${r.name}`).join('; '),
        b.checkIn, b.checkOut, b.nights, b.adults, b.children, b.total, b.taxes, payLabel(b.paymentStatus), b.bookingStatus, b.createdAt]));
    const blob = new Blob(['\uFEFF' + rows.map((r) => r.map(cell).join(',')).join('\r\n')], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = `lodge-bookings-${todayIso()}.csv`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    toast(`Exported ${plural(list.length, 'booking')}`);
  }

  function renderReviews() {
    const count = (st) => data.reviews.filter((r) => r.status === st).length;
    $$('#review-tabs button').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.tab === ui.reviewTab);
      const b = $('b', btn); if (b) b.textContent = count(btn.dataset.tab);
    });
    const published = data.reviews.filter((r) => r.status === 'Approved');
    const avg = published.length ? published.reduce((n, r) => n + Number(r.score), 0) / published.length : 0;
    $('#reviews-pending-metric').textContent = count('Pending');
    $('#rv-avg').innerHTML = `${published.length ? avg.toFixed(1) : '-'} <small>/ 10</small>`;
    $('#rv-stars').textContent = published.length ? '★'.repeat(Math.round(avg / 2)) + '☆'.repeat(5 - Math.round(avg / 2)) : '';
    $('#rv-published').textContent = published.length;
    $('#rv-rejected').textContent = count('Rejected');

    const list = data.reviews.filter((r) => r.status === ui.reviewTab);
    const cats = (r) => [['Cleanliness', r.cleanliness], ['Comfort', r.comfort], ['Location', r.location], ['Facilities', r.facilities], ['Staff', r.staff], ['Value', r.value]]
      .filter(([, v]) => v != null).map(([n, v]) => `${n} ${Number(v).toFixed(0)}`).join(' · ');
    const actions = (r) => r.status === 'Pending'
      ? `<button type="button" class="admin-secondary-button" data-act="reject-review" data-id="${r.id}"><i class="fa-solid fa-xmark"></i> Reject</button>
         <button type="button" class="admin-primary-button" data-act="approve-review" data-id="${r.id}"><i class="fa-solid fa-check"></i> Approve</button>`
      : r.status === 'Approved'
        ? `<button type="button" class="admin-secondary-button" data-act="reject-review" data-id="${r.id}"><i class="fa-solid fa-eye-slash"></i> Unpublish</button>`
        : `<button type="button" class="admin-secondary-button" data-act="approve-review" data-id="${r.id}"><i class="fa-solid fa-rotate-left"></i> Approve</button>
           <button type="button" class="row-btn danger" data-act="delete-review" data-id="${r.id}" title="Delete review"><i class="fa-solid fa-trash"></i></button>`;
    $('#reviews-list').innerHTML = list.length ? list.map((r) => `
      <div class="review-card">
        <div class="review-score">${Number(r.score).toFixed(1)}</div>
        <div class="review-body">
          <header><strong>${esc(r.title)}</strong><span>${esc(r.authorName)} · ${esc(r.authorCountry)}</span><span>${esc(r.villaName)} · ${esc(r.stayDate)}${r.verified ? ' · <i class="fa-solid fa-circle-check" style="color:var(--green)"></i> verified stay' : ''}</span></header>
          <p>${esc(r.text)}</p>
          ${cats(r) ? `<p style="color:var(--muted);font-size:12px;margin-top:6px">${cats(r)}</p>` : ''}
        </div>
        <div class="review-actions">${actions(r)}</div>
      </div>`).join('') : `<div class="empty-state"><i class="fa-regular fa-circle-check"></i> ${ui.reviewTab === 'Pending' ? 'All caught up. No reviews waiting for approval.' : ui.reviewTab === 'Approved' ? 'No published reviews yet.' : 'No rejected reviews.'}</div>`;
  }

  async function setReviewStatus(id, status) {
    await api.reviews.setStatus(id, status);

    [data.reviews, data.villas] = await Promise.all([api.reviews.list(), api.villas.list()]);
    renderReviews(); renderProperties(); renderCounts();
    toast(status === 'Approved' ? 'Review approved and published' : 'Review hidden from guests', status === 'Approved' ? 'success' : 'info');
  }

  function renderOffers() {
    const st = (s) => data.offers.filter((o) => o.state === s).length;
    $('#offer-live').textContent = st('Active');
    $('#offer-scheduled').textContent = st('Scheduled');
    $('#offer-ended').textContent = st('Expired') + st('Inactive');
    $('#offers-table').innerHTML = data.offers.length ? data.offers.map((o) => `
      <tr>
        <td><div class="property-cell"><img src="${esc(o.imageUrl)}" alt="" onerror="this.style.visibility='hidden'"><span><strong>${esc(o.title)}</strong><small>${esc(o.badge)}</small></span></div></td>
        <td><strong>${o.discountPercent}%</strong> off</td>
        <td>${fmtDate(o.validFrom)}<small>to ${fmtDate(o.validTo)}</small></td>
        <td><span class="status-pill ${o.state === 'Active' ? 'active' : o.state === 'Scheduled' ? 'pending' : 'inactive'}">${esc(o.state)}</span></td>
        <td>${rowActions([
          { act: 'edit-offer', id: o.id, title: 'Edit offer', icon: 'fa-pen' },
          { act: 'toggle-offer', id: o.id, title: o.active ? 'Switch off' : 'Switch on', icon: o.active ? 'fa-eye-slash' : 'fa-eye' },
          { act: 'delete-offer', id: o.id, title: 'Delete offer', icon: 'fa-trash', danger: true }])}</td>
      </tr>`).join('') : '<tr class="empty-row"><td colspan="5">No offers yet. Click "Create offer" to add the first promotion.</td></tr>';
  }

  const roleLabel = (r) => (r === 'host' ? 'Partner' : r === 'admin' ? 'Admin' : 'Guest');
  const roleClass = (r) => (r === 'host' ? 'pending' : r === 'admin' ? 'active' : 'available');

  function filteredUsers() {
    const q = norm(ui.userSearch);
    return data.users.filter((u) =>
      (!q || [u.fullName, u.email].join(' ').toLowerCase().includes(q)) &&
      (!ui.userRole || u.role === ui.userRole) &&
      (!ui.userStatus || u.accountStatus === ui.userStatus));
  }

  function renderUsers() {
    const guests = data.users.filter((u) => u.role === 'guest').length;
    const partners = data.users.filter((u) => u.role === 'host').length;
    const suspended = data.users.filter((u) => u.accountStatus === 'Suspended').length;
    if ($('#people-guests')) {
      $('#people-guests').textContent = guests.toLocaleString('en-US');
      $('#people-guests-note').textContent = `${data.users.length} accounts total`;
      $('#people-partners').textContent = partners.toLocaleString('en-US');
      $('#people-partners-note').textContent = partners ? 'Listing villas on Lodge' : 'No partners yet';
      $('#people-suspended').textContent = suspended.toLocaleString('en-US');
      $('#people-suspended-note').textContent = suspended ? 'Blocked from signing in' : 'All accounts active';
    }

    const list = filteredUsers();
    const table = $('#users-table');
    if (!table) return;
    table.innerHTML = list.length ? list.map((u) => `
      <tr>
        <td><div class="property-cell"><span style="width:38px;height:38px;border-radius:50%;background:#e6f0ff;color:var(--blue);display:flex;align-items:center;justify-content:center;font-weight:800;font-size:13px;flex-shrink:0">${esc((u.fullName || '?').trim().split(/\s+/).map((p) => p[0]).slice(0, 2).join('').toUpperCase())}</span><span><strong>${esc(u.fullName)}</strong><small>${esc(u.countryFlag || '')} ${esc(u.countryName || '')}</small></span></div></td>
        <td>${esc(u.email)}<small>${esc(u.phoneNumber || 'No phone on file')}</small></td>
        <td><span class="status-pill ${roleClass(u.role)}">${roleLabel(u.role)}</span></td>
        <td>${plural(u.bookingCount, 'booking')}<small>${plural(u.reviewCount, 'review')}</small></td>
        <td><strong>${money(u.totalSpend)}</strong></td>
        <td><span class="status-pill ${u.accountStatus === 'Suspended' ? 'cancelled' : 'active'}">${esc(u.accountStatus)}</span></td>
        <td>${u.createdAt ? fmtDate(u.createdAt) : '-'}</td>
        <td>${rowActions(u.role === 'admin' ? [
          { act: 'view-user', id: u.id, title: 'View details', icon: 'fa-eye' }
        ] : [
          { act: 'toggle-user-role', id: u.id, title: u.role === 'host' ? 'Make guest' : 'Make partner', icon: u.role === 'host' ? 'fa-user' : 'fa-handshake' },
          { act: 'toggle-user-status', id: u.id, title: u.accountStatus === 'Suspended' ? 'Reactivate account' : 'Suspend account', icon: u.accountStatus === 'Suspended' ? 'fa-user-check' : 'fa-user-slash' },
          { act: 'delete-user', id: u.id, title: 'Delete account', icon: 'fa-trash', danger: true }
        ])}</td>
      </tr>`).join('') : `<tr class="empty-row"><td colspan="8">${data.users.length ? 'No accounts match your filters.' : 'No registered accounts yet.'}</td></tr>`;
  }

  function openOfferModal(id) {
    const existing = id ? data.offers.find((o) => o.id === id) : null;
    const s = existing ? { ...existing } : { id: 0, title: '', badge: data.dealTypes[0] || '', description: '', discountPercent: 15, imageUrl: '', validFrom: todayIso(), validTo: '', active: true };
    ctx = { type: 'offer', state: s, isNew: !existing };
    openModal({
      eyebrow: 'Offers & promotions', title: existing ? 'Edit offer' : 'Create offer', hint: 'Fields marked * are required',
      submitLabel: existing ? 'Save changes' : 'Create offer',
      html: `<div class="fg">
        ${fieldInput({ id: 'o-title', f: 'title', label: 'Offer title', value: s.title, req: true, full: true, maxlength: 150, ph: '15% or more off end-of-year stays' })}
        ${fieldInput({ id: 'o-badge', f: 'badge', label: 'Badge', value: s.badge, req: true, maxlength: 50, list: 'dl-deals2', hint: 'Small label above the title' })}
        <datalist id="dl-deals2">${[...new Set(data.dealTypes.concat(data.offers.map((o) => o.badge)))].map((t) => `<option value="${esc(t)}">`).join('')}</datalist>
        <div class="field"><span class="field-label">Discount %</span>${stepper('discountPercent', s.discountPercent, 1, 90)}</div>
        ${textArea({ id: 'o-desc', f: 'description', label: 'Description', value: s.description, req: true, rows: 3 })}
        ${fieldInput({ id: 'o-img', f: 'imageUrl', label: 'Image link', value: s.imageUrl, req: true, full: true, maxlength: 255, ph: 'https://...' })}
        ${fieldInput({ id: 'o-from', f: 'validFrom', label: 'Valid from', value: s.validFrom, type: 'date', req: true })}
        ${fieldInput({ id: 'o-to', f: 'validTo', label: 'Valid until', value: s.validTo, type: 'date', req: true })}
        <div class="field full">${switchRow('active', 'Offer is switched on', 'Off = hidden from the home page even inside its dates', s.active)}</div>
      </div>`,
      onSubmit: () => {
        if (!s.title.trim()) return showError(null, '#o-title', 'Enter the offer title');
        if (!s.badge.trim()) return showError(null, '#o-badge', 'Enter a badge');
        if (!s.description.trim()) return showError(null, '#o-desc', 'Enter a description');
        if (!isUrl(s.imageUrl)) return showError(null, '#o-img', 'Image link must start with http:// or https://');
        if (!s.validFrom) return showError(null, '#o-from', 'Choose the start date');
        if (!s.validTo) return showError(null, '#o-to', 'Choose the end date');
        if (s.validTo < s.validFrom) return showError(null, '#o-to', 'End date must be after the start date');
        submitWith(async () => {
          const saved = await api.offers.save({ id: s.id, title: s.title.trim(), badge: s.badge.trim(), description: s.description.trim(), imageUrl: s.imageUrl.trim(),
            discountPercent: Number(s.discountPercent), validFrom: s.validFrom, validTo: s.validTo, active: !!s.active });
          data.offers = await api.offers.list();
          renderOffers(); renderCounts();
          toast(existing ? `"${saved.title}" saved` : `"${saved.title}" created`);
        });
      }
    });
  }

  const shortMoney = (n) => (n >= 1e6 ? (n / 1e6).toFixed(n >= 1e7 ? 0 : 1) + 'M' : n >= 1e3 ? Math.round(n / 1e3) + 'K' : String(Math.round(n)));
  const niceMax = (v) => { if (v <= 0) return 1000; const p = 10 ** Math.floor(Math.log10(v)); return Math.ceil(v / p * 2) / 2 * p; };
  const liveBookings = () => data.bookings.filter((b) => b.bookingStatus !== 'Cancelled');

  function renderDashboard() {
    const el = (id) => document.getElementById(id); if (!el('stat-total-bookings')) return;
    const live = liveBookings();
    const t = todayIso(), month = t.slice(0, 7);
    const last = isoDay(new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1)).slice(0, 7);
    const sum = (list) => list.reduce((n, b) => n + Number(b.total), 0);
    const thisMonth = live.filter((b) => (b.createdAt || '').slice(0, 7) === month);
    const prevMonth = live.filter((b) => (b.createdAt || '').slice(0, 7) === last);

    el('stat-total-bookings').textContent = data.bookings.length.toLocaleString('en-US');
    el('stat-total-bookings-note').textContent = `${thisMonth.length} new this month`;
    el('stat-revenue').textContent = money(sum(thisMonth));
    el('stat-revenue-note').textContent = prevMonth.length ? `${sum(thisMonth) >= sum(prevMonth) ? '+' : ''}${((sum(thisMonth) - sum(prevMonth)) / sum(prevMonth) * 100).toFixed(1)}% vs last month` : 'No bookings last month';

    const live2 = data.villas.filter((v) => v.status === 'Published').length, pendVillas = data.villas.filter((v) => v.status === 'Pending review').length;
    el('stat-active-villas').innerHTML = `${live2} <em>/ ${data.villas.length}</em>`;
    el('stat-active-villas-note').textContent = pendVillas ? `${pendVillas} awaiting approval` : 'All villas reviewed';

    const pendB = data.bookings.filter((b) => b.bookingStatus === 'Pending').length, pendR = data.reviews.filter((r) => r.status === 'Pending').length;
    el('stat-attention').textContent = pendB + pendR;
    el('stat-attention-note').textContent = `${plural(pendR, 'review')} · ${plural(pendB, 'booking')}`;
    el('queue-count').textContent = pendVillas + pendR;
    el('queue-villas-note').textContent = pendVillas ? plural(pendVillas, 'villa') + ' to review' : 'Nothing waiting';
    el('queue-reviews-note').textContent = pendR ? plural(pendR, 'review') + ' to approve' : 'Nothing waiting';
    const liveOffers = data.offers.filter((o) => o.state === 'Active').length;
    el('queue-offers-note').textContent = `${plural(liveOffers, 'offer')} live now`;

    const icon = { Confirmed: ['blue', 'fa-check'], Pending: ['yellow', 'fa-clock'], Completed: ['green', 'fa-flag-checkered'], Cancelled: ['red', 'fa-xmark'] };
    el('activity-list').innerHTML = data.bookings.length ? data.bookings.slice(0, 5).map((b) => `
      <div class="activity-row"><div class="activity-icon ${icon[b.bookingStatus][0]}"><i class="fa-solid ${icon[b.bookingStatus][1]}"></i></div>
      <div><strong>${esc(b.reference)} ${esc(b.bookingStatus.toLowerCase())}</strong><span>${esc(b.villaName)} · ${b.rooms.reduce((n, r) => n + r.quantity, 0)} room(s)</span></div><time>${b.createdAt ? fmtDate(b.createdAt) : ''}</time></div>`).join('')
      : '<div class="empty-state">No reservations yet.</div>';

    const byVilla = new Map();
    live.forEach((b) => { const v = byVilla.get(b.villaId) || { name: b.villaName, n: 0, total: 0, id: b.villaId }; v.n += 1; v.total += Number(b.total); byVilla.set(b.villaId, v); });
    const top = [...byVilla.values()].sort((a, b) => b.total - a.total).slice(0, 8);
    el('top-villas').innerHTML = top.length ? top.map((v) => {
      const villa = villaById(v.id) || {};
      return `<div class="mini-table-row"><div class="property-cell"><img src="${esc(villa.heroImage || '')}" alt="" onerror="this.style.visibility='hidden'"><span><strong>${esc(v.name)}</strong><small>${esc(villa.city || '')}${villa.stars ? ' · ' + villa.stars + ' star' : ''}</small></span></div><strong>${v.n}</strong><strong>${money(v.total)}</strong></div>`;
    }).join('') : '<div class="empty-state">No bookings yet.</div>';

    drawRevenue(live);
  }

  function drawRevenue(live) {
    const now = new Date(); const range = ui.revRange;
    let buckets = [];
    if (range === 'year') {
      for (let m = 0; m < 12; m++) { const key = `${now.getFullYear()}-${String(m + 1).padStart(2, '0')}`; buckets.push({ label: MONTHS[m], match: (d) => d.slice(0, 7) === key, value: 0 }); }
    } else {
      const days = Number(range);
      const step = days > 30 ? 7 : 1;
      const start = addDays(todayIso(), -(days - 1));
      for (let i = 0; i < days; i += step) { const from = addDays(start, i), to = addDays(start, Math.min(i + step - 1, days - 1)); buckets.push({ label: fmtDate(from).replace(/, \d{4}$/, ''), match: (d) => d >= from && d <= to, value: 0 }); }
    }
    let total = 0;
    live.forEach((b) => { const d = b.createdAt || ''; const bk = buckets.find((x) => x.match(d)); if (bk) { bk.value += Number(b.total); total += Number(b.total); } });
    const max = niceMax(Math.max(...buckets.map((b) => b.value)));
    const W = 720, H = 230, pad = 12;
    const pts = buckets.map((b, i) => [buckets.length === 1 ? W / 2 : (i / (buckets.length - 1)) * W, H - pad - (b.value / max) * (H - pad * 2)]);
    let line = `M${pts[0][0]},${pts[0][1]}`;
    for (let i = 1; i < pts.length; i++) { const [x0, y0] = pts[i - 1], [x1, y1] = pts[i], mx = (x0 + x1) / 2; line += ` C${mx},${y0} ${mx},${y1} ${x1},${y1}`; }
    document.getElementById('rev-line').setAttribute('d', line);
    document.getElementById('rev-fill').setAttribute('d', `${line} V${H} H${pts[0][0]} Z`);
    document.getElementById('rev-total').textContent = money(total);
    document.getElementById('rev-note').textContent = plural(live.filter((b) => buckets.some((x) => x.match(b.createdAt || ''))).length, 'booking');
    document.getElementById('rev-y').innerHTML = [1, 0.75, 0.5, 0.25, 0].map((f) => `<span>${shortMoney(max * f)}</span>`).join('');
    const idx = [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(f * (buckets.length - 1)));
    document.getElementById('rev-x').innerHTML = idx.map((i) => `<span>${esc(buckets[i].label)}</span>`).join('');
  }

  let ctx = null;

  const facilityUsage = (id) => (data.facilities.find((f) => f.id === id) || {}).usage || 0;
  const featureUsage = (name) => (data.roomFeatures.find((f) => norm(f.name) === norm(name)) || {}).usage || 0;

  async function reloadAll() {
    [data.villas, data.rooms, data.facilities, data.roomFeatures] = await Promise.all([
      api.villas.list(), api.rooms.list(), api.facilities.list(), api.roomFeatures.list()]);
    fillFilterSelects();
    renderProperties(); renderRooms(); renderFacilities(); renderFeatures(); renderCounts();
    if (data.bookings.length) { data.bookings = await api.bookings.list(); renderBookings(); }
  }

  async function createFacility(name, icon, category) {
    const row = await api.facilities.create({ name, icon, category });
    data.facilities.push(row);
    data.facilities.sort((a, b) => a.name.localeCompare(b.name));
    renderFacilities(); renderCounts();
    return row;
  }

  function renderFacilityQuickAdd() {
    $('#facility-quick-add').innerHTML = `
      <div class="admin-panel quick-add-card">
        <div class="field icon"><span class="field-label">Icon</span>${iconPicker('catfac', 'fa-star')}</div>
        <div class="field"><label for="catfac-name">New facility name</label><input id="catfac-name" class="field-input" maxlength="100" placeholder="e.g. Rooftop Yoga Deck" autocomplete="off"></div>
        <div class="field small"><label for="catfac-cat">Category</label><select id="catfac-cat" class="field-input">${data.categories.map((c) => `<option>${esc(c)}</option>`).join('')}</select></div>
        <button type="button" class="admin-primary-button" id="catfac-add"><i class="fa-solid fa-plus"></i> Add facility</button>
      </div>`;
    const add = async () => {
      const name = $('#catfac-name').value.trim();
      if (!name) { $('#catfac-name').classList.add('invalid'); $('#catfac-name').focus(); toast('Enter a facility name', 'error'); return; }
      try {
        await createFacility(name, pickerValue('catfac'), $('#catfac-cat').value);
        $('#catfac-name').value = ''; $('#catfac-name').classList.remove('invalid'); $('#catfac-name').focus();
        toast(`"${name}" added. It is now available when adding or editing a villa`);
      } catch (err) { toast(err.message, 'error'); }
    };
    $('#catfac-add').addEventListener('click', add);
    $('#catfac-name').addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); add(); } });
    $('#catfac-name').addEventListener('input', (e) => e.target.classList.remove('invalid'));
  }

  function renderFacilities() {
    const q = norm(ui.facilitySearch);
    const cats = ['All', ...data.categories];
    $('#facility-tabs').innerHTML = cats.map((c) => {
      const n = c === 'All' ? data.facilities.length : data.facilities.filter((f) => f.category === c).length;
      return `<button type="button" data-cat="${esc(c)}" class="${c === ui.facilityCat ? 'active' : ''}">${esc(c)} <b>${n}</b></button>`;
    }).join('');

    const groups = data.categories
      .filter((c) => ui.facilityCat === 'All' || ui.facilityCat === c)
      .map((c) => ({ c, items: data.facilities.filter((f) => f.category === c && (!q || f.name.toLowerCase().includes(q))) }))
      .filter((g) => g.items.length);

    $('#facility-groups').innerHTML = groups.length ? groups.map((g) => `
      <div class="catalog-group"><h3>${esc(g.c)} <span>${g.items.length}</span></h3>
        <div class="catalog-grid">${g.items.map((f) => `
          <div class="catalog-card">
            <div class="catalog-icon"><i class="fa-solid ${safeIcon(f.icon)}"></i></div>
            <div class="info"><strong>${esc(f.name)}</strong><small>Used by ${plural(facilityUsage(f.id), 'villa')}</small></div>
            ${rowActions([{ act: 'edit-facility', id: f.id, title: 'Edit facility', icon: 'fa-pen' }, { act: 'delete-facility', id: f.id, title: 'Delete facility', icon: 'fa-trash', danger: true }])}
          </div>`).join('')}</div></div>`).join('')
      : '<div class="empty-state">No facilities match. Use the form above to add a new one.</div>';
  }

  function openFacilityModal(id) {
    const f = data.facilities.find((x) => x.id === id);
    if (!f) return;
    openModal({
      eyebrow: 'Facilities catalog', title: 'Edit facility', size: 'sm',
      html: `<div class="fg">
        <div class="field full"><span class="field-label">Icon</span>${iconPicker('editfac', f.icon)}</div>
        <div class="field full"><label for="ef-name">Name <span class="req">*</span></label><input id="ef-name" class="field-input" maxlength="100" value="${esc(f.name)}"></div>
        <div class="field full"><label for="ef-cat">Category</label><select id="ef-cat" class="field-input">${data.categories.map((c) => `<option ${c === f.category ? 'selected' : ''}>${esc(c)}</option>`).join('')}</select></div>
      </div>`,
      hint: `Used by ${plural(facilityUsage(f.id), 'villa')}`,
      onSubmit: () => {
        const name = $('#ef-name').value.trim();
        if (!name) { $('#ef-name').classList.add('invalid'); toast('Name is required', 'error'); return; }
        submitWith(async () => {
          const row = await api.facilities.update(f.id, { name, icon: pickerValue('editfac'), category: $('#ef-cat').value });
          Object.assign(f, row);
          renderFacilities();
          toast('Facility updated');
        });
      }
    });
  }

  async function deleteFacility(id) {
    const f = data.facilities.find((x) => x.id === id);
    if (!f) return;
    const used = facilityUsage(id);
    const ok = await confirmDialog({
      title: 'Delete facility?', danger: true, confirmLabel: 'Delete facility',
      message: `<b>${esc(f.name)}</b> will be removed from the catalog${used ? ` and unticked from <b>${plural(used, 'villa')}</b>` : ''}.`
    });
    if (!ok) return;
    await api.facilities.remove(id);
    await reloadAll();
    toast('Facility deleted');
  }

  async function createRoomFeatures(text) {
    const names = [...new Set(String(text).split(/[,\n]/).map((s) => s.trim()).filter(Boolean))];
    const added = [], skipped = [];
    for (const name of names) {
      if (name.length > 100) { skipped.push(name); continue; }
      try { const row = await api.roomFeatures.create({ name }); data.roomFeatures.push(row); added.push(row); } catch (e) { skipped.push(name); }
    }
    if (added.length) {
      data.roomFeatures.sort((a, b) => a.name.localeCompare(b.name));
    }
    renderFeatures(); renderCounts();
    return { added, skipped };
  }

  function renderFeatureQuickAdd() {
    $('#feature-quick-add').innerHTML = `
      <div class="admin-panel quick-add-card">
        <div class="field"><label for="catfeat-name">New room feature</label>
          <input id="catfeat-name" class="field-input" maxlength="300" placeholder="e.g. Private plunge pool  (add several at once with commas)" autocomplete="off"></div>
        <button type="button" class="admin-primary-button" id="catfeat-add"><i class="fa-solid fa-plus"></i> Add feature</button>
      </div>`;
    const add = async () => {
      const input = $('#catfeat-name');
      if (!input.value.trim()) { input.classList.add('invalid'); input.focus(); toast('Type a feature name first', 'error'); return; }
      const { added, skipped } = await createRoomFeatures(input.value);
      if (added.length) { input.value = ''; toast(added.length === 1 ? `"${added[0].name}" added to the library` : `${added.length} features added to the library`); }
      if (skipped.length) toast(`Skipped (already exists or too long): ${skipped.join(', ')}`, added.length ? 'info' : 'error');
      input.focus();
    };
    $('#catfeat-add').addEventListener('click', add);
    $('#catfeat-name').addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); add(); } });
    $('#catfeat-name').addEventListener('input', (e) => e.target.classList.remove('invalid'));
  }

  function renderFeatures() {
    const q = norm(ui.featureSearch);
    const list = data.roomFeatures.filter((f) => !q || f.name.toLowerCase().includes(q));
    $('#feature-list').innerHTML = list.length ? list.map((f) => `
      <div class="feature-chip"><i class="fa-solid fa-check" style="color:var(--green)"></i><span>${esc(f.name)}</span><span class="use" title="Rooms using this feature">${featureUsage(f.name)}</span>
        <button type="button" class="row-btn" data-act="edit-feature" data-id="${f.id}" title="Rename" aria-label="Rename ${esc(f.name)}"><i class="fa-solid fa-pen"></i></button>
        <button type="button" class="row-btn danger" data-act="delete-feature" data-id="${f.id}" title="Delete" aria-label="Delete ${esc(f.name)}"><i class="fa-solid fa-xmark"></i></button>
      </div>`).join('') : '<div class="empty-state" style="width:100%">No features match your search.</div>';

    $('#feature-suggestions').innerHTML = '';
  }

  function openFeatureModal(id) {
    const f = data.roomFeatures.find((x) => x.id === id);
    if (!f) return;
    openModal({
      eyebrow: 'Room features', title: 'Rename feature', size: 'sm',
      html: `<div class="field"><label for="rf-name">Feature name <span class="req">*</span></label><input id="rf-name" class="field-input" maxlength="100" value="${esc(f.name)}">
             <span class="hint">Renaming also updates every room that uses it (${plural(featureUsage(f.name), 'room')}).</span></div>`,
      onSubmit: () => {
        const name = $('#rf-name').value.trim();
        if (!name) { $('#rf-name').classList.add('invalid'); toast('Name is required', 'error'); return; }
        submitWith(async () => {
          await api.roomFeatures.update(f.id, { name });
          await reloadAll();
          toast('Feature renamed');
        });
      }
    });
  }

  async function deleteFeature(id) {
    const f = data.roomFeatures.find((x) => x.id === id);
    if (!f) return;
    const used = featureUsage(f.name);
    const ok = await confirmDialog({
      title: 'Delete room feature?', danger: true, confirmLabel: 'Delete feature',
      message: `<b>${esc(f.name)}</b> will be removed from the library${used ? ` and from <b>${plural(used, 'room')}</b>` : ''}.`
    });
    if (!ok) return;
    await api.roomFeatures.remove(id);
    await reloadAll();
    toast('Feature deleted');
  }

  const fieldInput = ({ id, f, label, value = '', type = 'text', req = false, full = false, ph = '', maxlength = 0, hint = '', extra = '', list = '' }) =>
    `<div class="field ${full ? 'full' : ''}"><label for="${id}">${label}${req ? ' <span class="req">*</span>' : ''}</label>
      <input id="${id}" class="field-input" data-f="${f}" type="${type}" value="${esc(value)}" ${ph ? `placeholder="${esc(ph)}"` : ''} ${maxlength ? `maxlength="${maxlength}"` : ''} ${list ? `list="${list}"` : ''} ${extra}>
      ${hint ? `<span class="hint">${hint}</span>` : ''}</div>`;

  const moneyField = (o) => `<div class="field ${o.full ? 'full' : ''}"><label for="${o.id}">${o.label}${o.req ? ' <span class="req">*</span>' : ''}</label>
      <div class="input-prefix"><span>LKR</span><input id="${o.id}" class="field-input" data-f="${o.f}" type="number" min="0" step="1" value="${esc(o.value)}" placeholder="0"></div>${o.hint ? `<span class="hint">${o.hint}</span>` : ''}</div>`;

  const textArea = ({ id, f, label, value = '', req = false, ph = '', maxlength = 0, rows = 5 }) =>
    `<div class="field full"><label for="${id}">${label}${req ? ' <span class="req">*</span>' : ''}</label>
      <textarea id="${id}" class="field-input" data-f="${f}" rows="${rows}" ${ph ? `placeholder="${esc(ph)}"` : ''} ${maxlength ? `maxlength="${maxlength}"` : ''}>${esc(value)}</textarea></div>`;

  const selectField = ({ id, f, label, options, value, full = false }) =>
    `<div class="field ${full ? 'full' : ''}"><label for="${id}">${label}</label><select id="${id}" class="field-input" data-f="${f}">
      ${options.map(([v, t]) => `<option value="${esc(v)}" ${String(v) === String(value) ? 'selected' : ''}>${esc(t)}</option>`).join('')}</select></div>`;

  const switchRow = (f, label, desc, checked) =>
    `<div class="switch-row"><div><strong>${label}</strong><span>${desc}</span></div><button type="button" class="toggle ${checked ? 'active' : ''}" data-switch="${f}" role="switch" aria-checked="${!!checked}" aria-label="${esc(label)}"><i></i></button></div>`;

  const stepper = (f, value, min, max) =>
    `<div class="stepper"><button type="button" data-step="-1" data-for="${f}" aria-label="Decrease">&minus;</button><input type="number" data-f="${f}" data-min="${min}" data-max="${max}" value="${value}" min="${min}" max="${max}"><button type="button" data-step="1" data-for="${f}" aria-label="Increase">+</button></div>`;

  const tabsHtml = (tabs, active) => `<div class="admin-tabs" role="tablist">${tabs.map(([id, label, icon]) =>
    `<button type="button" class="admin-tab ${id === active ? 'active' : ''}" role="tab" data-tab="${id}"><i class="fa-solid ${icon}"></i>${label}<span class="count" data-count="${id}" hidden></span></button>`).join('')}</div>`;

  function switchTab(id) {
    $$('.admin-tab', $('#modal-fields')).forEach((t) => t.classList.toggle('active', t.dataset.tab === id));
    $$('.tab-panel', $('#modal-fields')).forEach((p) => p.classList.toggle('active', p.dataset.panel === id));
    $('#modal-fields').scrollTop = 0;
  }

  function setCount(id, n) {
    const el = $(`.admin-tab .count[data-count="${id}"]`, $('#modal-fields'));
    if (el) { el.textContent = n; el.hidden = !n; }
  }

  function showError(tab, selector, message) {
    if (tab) switchTab(tab);
    const el = $(selector, $('#modal-fields'));
    if (el) { el.classList.add('invalid'); el.focus({ preventScroll: true }); el.scrollIntoView({ block: 'center' }); }
    toast(message, 'error');
    return false;
  }

  function onFormInput(e) {
    const el = e.target;
    el.classList.remove('invalid');
    const f = el.dataset.f;
    if (!f || !ctx) return;
    ctx.state[f] = el.type === 'checkbox' ? el.checked : el.value;
    if (ctx.onField) ctx.onField(f, el);
  }

  function onFormClick(e) {
    if (!ctx) return;
    const tab = e.target.closest('.admin-tab');
    if (tab) { switchTab(tab.dataset.tab); return; }

    const sw = e.target.closest('[data-switch]');
    if (sw) {
      const f = sw.dataset.switch;
      ctx.state[f] = !ctx.state[f];
      sw.classList.toggle('active', ctx.state[f]);
      sw.setAttribute('aria-checked', String(ctx.state[f]));
      if (ctx.onField) ctx.onField(f, sw);
      return;
    }
    const step = e.target.closest('[data-step]');
    if (step) {
      const input = $(`input[data-f="${step.dataset.for}"]`, $('#modal-fields'));
      const min = Number(input.dataset.min), max = Number(input.dataset.max);
      input.value = Math.min(max, Math.max(min, (parseInt(input.value, 10) || min) + Number(step.dataset.step)));
      input.dispatchEvent(new Event('input', { bubbles: true }));
      return;
    }
    if (ctx.onClick) ctx.onClick(e);
  }

  document.addEventListener('DOMContentLoaded', () => {
    const fields = $('#modal-fields');
    fields.addEventListener('input', onFormInput);
    fields.addEventListener('change', (e) => { if (e.target.matches('select[data-f]')) onFormInput(e); if (ctx && ctx.onChange) ctx.onChange(e); });
    fields.addEventListener('click', onFormClick);
    fields.addEventListener('iconchange', (e) => { if (ctx && ctx.onIcon) ctx.onIcon(e.detail); });
  });

  const HL_MAX = 10;

  function blankVilla() {
    return { id: 0, slug: '', name: '', propertyType: data.propertyTypes[0] || 'Resort Villa', stars: 5, hasThumbsUp: true, tagline: '', overview: '', address: '', city: '',
      regionId: data.regions[0] ? data.regions[0].id : 0, latitude: '', longitude: '', locationScore: 8, basePrice: '', discountPrice: '', taxes: '', discountPercent: 0,
      dealType: '', geniusEligible: true, featured: false, status: 'Published', facilityIds: [], highlights: [], nearby: [], images: [] };
  }

  async function editVilla(id) {
    try { openVillaModal(id, await api.villas.get(id)); } catch (err) { toast(err.message, 'error'); }
  }

  function openVillaModal(id, loaded) {
    const existing = id ? loaded : null;
    const state = existing ? JSON.parse(JSON.stringify(existing)) : blankVilla();
    if (existing) state.discountPercent = discountOf(state.basePrice, state.discountPrice);
    ctx = { type: 'villa', state, isNew: !existing, slugTouched: !!existing, facCat: 'All', facQuery: '' };

    const s = state;
    const panels = {
      basics: `<div class="fg">
        ${fieldInput({ id: 'v-name', f: 'name', label: 'Villa name', value: s.name, req: true, full: true, maxlength: 200, ph: 'e.g. Amaya Hills Kandy' })}
        ${fieldInput({ id: 'v-slug', f: 'slug', label: 'URL slug', value: s.slug, req: true, maxlength: 100, hint: 'Used in the link: villa-details.html?slug=<b>' + esc(s.slug || 'your-villa') + '</b>' })}
        ${fieldInput({ id: 'v-type', f: 'propertyType', label: 'Property type', value: s.propertyType, list: 'dl-types', maxlength: 80, hint: 'Pick one used before, or type a new type' })}
        <datalist id="dl-types">${data.propertyTypes.map((t) => `<option value="${esc(t)}">`).join('')}</datalist>
        ${selectField({ id: 'v-stars', f: 'stars', label: 'Star rating', value: s.stars, options: [5, 4, 3, 2, 1].map((n) => [n, '★'.repeat(n) + ' ' + n + ' star']) })}
        ${selectField({ id: 'v-region', f: 'regionId', label: 'Region', value: s.regionId, options: data.regions.map((r) => [r.id, r.name]) })}
        ${fieldInput({ id: 'v-city', f: 'city', label: 'City / town', value: s.city, req: true, maxlength: 100, ph: 'e.g. Kandy' })}
        ${fieldInput({ id: 'v-address', f: 'address', label: 'Full address', value: s.address, req: true, full: true, maxlength: 255 })}
        ${fieldInput({ id: 'v-lat', f: 'latitude', label: 'Latitude', value: s.latitude, type: 'number', extra: 'step="any"', ph: '7.2564', req: true })}
        ${fieldInput({ id: 'v-lng', f: 'longitude', label: 'Longitude', value: s.longitude, type: 'number', extra: 'step="any"', ph: '80.6099', req: true })}
        ${fieldInput({ id: 'v-locscore', f: 'locationScore', label: 'Location score (0-10)', value: s.locationScore, type: 'number', extra: 'step="0.1" min="0" max="10"', hint: 'Shown as "Excellent location 9.0" on the villa page' })}
        ${fieldInput({ id: 'v-tagline', f: 'tagline', label: 'Tagline', value: s.tagline, req: true, full: true, maxlength: 255, hint: 'One line shown on the villa card and under the description title.' })}
        ${textArea({ id: 'v-overview', f: 'overview', label: 'Overview', value: s.overview, req: true, rows: 6, ph: 'Describe the property. Leave a blank line to start a new paragraph.' })}
        <div class="field full">${switchRow('hasThumbsUp', 'Show "recommended" thumbs-up', 'Displays the thumbs-up badge next to the star rating', s.hasThumbsUp)}</div>
      </div>`,

      pricing: `<div class="fg three">
        ${moneyField({ id: 'v-base', f: 'basePrice', label: 'Original price / night', value: s.basePrice, req: true, hint: 'Struck-through price' })}
        ${moneyField({ id: 'v-disc', f: 'discountPrice', label: 'Sale price / night', value: s.discountPrice, req: true, hint: '"From" price on the villa card. Follows the cheapest active room once rooms are added.' })}
        ${moneyField({ id: 'v-tax', f: 'taxes', label: 'Taxes & charges / night', value: s.taxes, req: true })}
      </div>
      <div class="fg" style="margin-top:14px">
        <div class="field"><span class="field-label">Discount (calculated)</span><div class="computed-box"><span>Guests save</span><strong id="v-pct">${discountOf(s.basePrice, s.discountPrice)}%</strong></div></div>
        ${fieldInput({ id: 'v-deal', f: 'dealType', label: 'Deal badge', value: s.dealType, list: 'dl-deals', maxlength: 80, hint: 'Leave empty for no badge' })}
        <datalist id="dl-deals">${data.dealTypes.map((t) => `<option value="${esc(t)}">`).join('')}</datalist>
        ${selectField({ id: 'v-status', f: 'status', label: 'Listing status', value: s.status, options: [['Published', 'Published (visible to guests)'], ['Pending review', 'Pending review (hidden)'], ['Paused', 'Paused (hidden)']], full: true })}
        <div class="field full">${switchRow('geniusEligible', 'Genius discounts', 'Signed-in Genius members get their level discount at this villa', s.geniusEligible)}</div>
        <div class="field full">${switchRow('featured', 'Featured on home page', 'Shown first in the villa list', s.featured)}</div>
      </div>`,

      facilities: `<div class="section-note"><i class="fa-solid fa-circle-info"></i><div>Tick every facility this villa offers. Missing one? Add it at the bottom - it is saved to the catalog and ticked for you.</div></div>
        <div class="tick-toolbar">
          <div class="admin-search"><i class="fa-solid fa-magnifying-glass"></i><input id="fac-search" placeholder="Search facilities" autocomplete="off"></div>
          <div class="cat-chips" id="fac-cats"></div>
          <div class="tick-counter" id="fac-counter"></div>
        </div>
        <div id="fac-groups"></div>
        <div class="inline-add"><h5><i class="fa-solid fa-circle-plus"></i> Can't find a facility? Add a new one</h5>
          <div class="inline-add-row">${iconPicker('nf-icon', 'fa-star')}
            <input id="nf-name" class="field-input" maxlength="100" placeholder="Facility name, e.g. Yoga Pavilion" autocomplete="off">
            <select id="nf-cat" class="field-input">${data.categories.map((c) => `<option>${esc(c)}</option>`).join('')}</select>
            <button type="button" class="admin-primary-button" id="nf-add"><i class="fa-solid fa-plus"></i> Add &amp; tick</button></div></div>`,

      highlights: `<div class="section-note"><i class="fa-solid fa-lightbulb"></i><div>Highlights appear in the <b>Property highlights</b> box beside the description. Pick 3-6 of the most useful. Tap a suggestion to add it, then edit the wording - the preview on the right updates live.</div></div>
        <div class="two-col"><div>
          <div class="field-label">Quick add</div><div class="preset-row" id="hl-presets"></div>
          <div id="hl-fac-wrap"></div>
          <div class="rep-list" id="hl-rows"></div>
          <button type="button" class="admin-secondary-button" id="hl-add-blank" style="margin-top:12px"><i class="fa-solid fa-plus"></i> Add custom highlight</button>
        </div><aside class="hl-preview" id="hl-preview"></aside></div>`,

      nearby: `<div class="section-note"><i class="fa-solid fa-circle-info"></i><div>Attractions guests can reach from the villa. Shown as cards under <b>Nearby attractions</b>.</div></div>
        <div class="rep-list" id="nb-rows"></div>
        <datalist id="dl-nbtypes">${data.nearbyTypes.map((t) => `<option value="${esc(t)}">`).join('')}</datalist>
        <button type="button" class="admin-secondary-button" id="nb-add" style="margin-top:12px"><i class="fa-solid fa-plus"></i> Add nearby place</button>`,

      photos: `<div class="section-note"><i class="fa-solid fa-circle-info"></i><div>Paste image links (https://...). Choose one <b>cover photo</b> - it is used on the villa card and as the main gallery image.</div></div>
        <div class="rep-list" id="ph-rows"></div>
        <div class="fg" style="margin-top:12px">
          <div class="field full"><label for="ph-bulk">Add several photos at once</label><textarea id="ph-bulk" class="field-input" rows="3" placeholder="Paste one image link per line"></textarea></div>
        </div>
        <div style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap"><button type="button" class="admin-secondary-button" id="ph-add"><i class="fa-solid fa-plus"></i> Add photo</button>
        <button type="button" class="admin-secondary-button" id="ph-add-bulk"><i class="fa-solid fa-list"></i> Add pasted links</button></div>`
    };

    const tabs = [['basics', 'Basics', 'fa-circle-info'], ['pricing', 'Pricing', 'fa-tag'], ['facilities', 'Facilities', 'fa-list-check'],
      ['highlights', 'Highlights', 'fa-wand-magic-sparkles'], ['nearby', 'Nearby', 'fa-location-dot'], ['photos', 'Photos', 'fa-images']];

    openModal({
      eyebrow: 'Property management', title: existing ? 'Edit villa' : 'Add new villa', size: 'xl',
      submitLabel: existing ? 'Save changes' : 'Create villa', hint: 'Fields marked * are required',
      html: tabsHtml(tabs, 'basics') + tabs.map(([t]) => `<div class="tab-panel ${t === 'basics' ? 'active' : ''}" data-panel="${t}">${panels[t]}</div>`).join(''),
      onSubmit: saveVilla,
      onOpen: () => { bindVillaForm(); drawFacCats(); drawFacGroups(); updateFacCounter(); renderHighlightsTab(); drawNearby(); drawPhotos(); refreshVillaCounts(); }
    });
  }

  function refreshVillaCounts() {
    const s = ctx.state;
    setCount('facilities', s.facilityIds.length);
    setCount('highlights', s.highlights.length);
    setCount('nearby', s.nearby.length);
    setCount('photos', s.images.length);
  }

  function bindVillaForm() {
    const s = ctx.state;
    ctx.onField = (f) => {
      if (f === 'name' && !ctx.slugTouched) { s.slug = slugify(s.name); $('#v-slug').value = s.slug; }
      if (f === 'slug') ctx.slugTouched = true;
      if (f === 'basePrice' || f === 'discountPrice') $('#v-pct').textContent = discountOf(s.basePrice, s.discountPrice) + '%';
    };
    ctx.onIcon = ({ id, value }) => {
      if (id.startsWith('hl-')) { const i = Number(id.slice(3)); if (s.highlights[i]) { s.highlights[i].icon = value; drawHlPreview(); } }
    };
    ctx.onChange = (e) => {
      const t = e.target;
      if (t.matches('input[data-fac]')) toggleFacility(Number(t.dataset.fac), t.checked, t.closest('.tick-tile'));
      if (t.matches('input[data-phhero]')) { s.images.forEach((im, i) => { im.hero = i === Number(t.dataset.phhero); }); }
    };
    ctx.onClick = (e) => {
      const t = e.target;
      let b;
      if ((b = t.closest('[data-faccat]'))) { ctx.facCat = b.dataset.faccat; drawFacCats(); drawFacGroups(); return; }
      if ((b = t.closest('[data-facgroup]'))) { facGroupAll(b.dataset.facgroup, b.dataset.mode === 'all'); return; }
      if (t.closest('#nf-add')) { addInlineFacility(); return; }
      if ((b = t.closest('[data-hlpreset]'))) { addHighlight(data.highlightPresets[Number(b.dataset.hlpreset)]); return; }
      if ((b = t.closest('[data-hlfac]'))) { const f = data.facilities.find((x) => x.id === Number(b.dataset.hlfac)); if (f) addHighlight({ icon: f.icon, title: f.name, description: '' }); return; }
      if (t.closest('#hl-add-blank')) { addHighlight({ icon: 'fa-star', title: '', description: '' }, true); return; }
      if ((b = t.closest('[data-hlact]'))) { hlAction(b.dataset.hlact, Number(b.dataset.i)); return; }
      if (t.closest('#nb-add')) { s.nearby.push({ name: '', distanceText: '', locationType: '', imageUrl: '' }); drawNearby(true); return; }
      if ((b = t.closest('[data-nbdel]'))) { s.nearby.splice(Number(b.dataset.nbdel), 1); drawNearby(); return; }
      if (t.closest('#ph-add')) { s.images.push({ url: '', caption: '', hero: !s.images.length }); drawPhotos(true); return; }
      if (t.closest('#ph-add-bulk')) { addBulkPhotos(); return; }
      if ((b = t.closest('[data-phdel]'))) { removePhoto(Number(b.dataset.phdel)); return; }
    };
    $('#fac-search').addEventListener('input', (e) => { ctx.facQuery = e.target.value; drawFacGroups(); });
  }

  function drawFacCats() {
    $('#fac-cats').innerHTML = ['All', ...data.categories].map((c) => `<button type="button" class="cat-chip ${c === ctx.facCat ? 'active' : ''}" data-faccat="${esc(c)}">${esc(c)}</button>`).join('');
  }

  function visibleFacilities(cat) {
    const q = norm(ctx.facQuery);
    return data.facilities.filter((f) => f.category === cat && (!q || f.name.toLowerCase().includes(q)));
  }

  function drawFacGroups() {
    const ids = new Set(ctx.state.facilityIds);
    const groups = data.categories.filter((c) => ctx.facCat === 'All' || ctx.facCat === c).map((c) => ({ c, items: visibleFacilities(c) })).filter((g) => g.items.length);
    $('#fac-groups').innerHTML = groups.length ? groups.map((g) => {
      const on = g.items.filter((f) => ids.has(f.id)).length;
      return `<div class="tick-group"><div class="tick-group-head"><h4>${esc(g.c)} <small>${on}/${g.items.length}</small></h4>
        <span class="mini-links"><button type="button" data-facgroup="${esc(g.c)}" data-mode="all">Select all</button><button type="button" data-facgroup="${esc(g.c)}" data-mode="none">Clear</button></span></div>
        <div class="tick-grid">${g.items.map((f) => `
          <label class="tick-tile ${ids.has(f.id) ? 'checked' : ''}"><input type="checkbox" data-fac="${f.id}" ${ids.has(f.id) ? 'checked' : ''}>
            <span class="tick-box"><i class="fa-solid fa-check"></i></span><span class="t-icon"><i class="fa-solid ${safeIcon(f.icon)}"></i></span><span class="t-name">${esc(f.name)}</span></label>`).join('')}</div></div>`;
    }).join('') : '<div class="empty-state">No facilities match. Add a new one below.</div>';
  }

  function updateFacCounter() {
    $('#fac-counter').innerHTML = `<b>${ctx.state.facilityIds.length}</b> of ${data.facilities.length} selected`;
    setCount('facilities', ctx.state.facilityIds.length);
  }

  function toggleFacility(id, on, tile) {
    const ids = ctx.state.facilityIds;
    const i = ids.indexOf(id);
    if (on && i < 0) ids.push(id);
    if (!on && i >= 0) ids.splice(i, 1);
    if (tile) tile.classList.toggle('checked', on);
    updateFacCounter();
    drawHlFacilityChips();
  }

  function facGroupAll(cat, on) {
    const ids = ctx.state.facilityIds;
    visibleFacilities(cat).forEach((f) => { const i = ids.indexOf(f.id); if (on && i < 0) ids.push(f.id); if (!on && i >= 0) ids.splice(i, 1); });
    drawFacGroups(); updateFacCounter(); drawHlFacilityChips();
  }

  async function addInlineFacility() {
    const name = $('#nf-name').value.trim();
    if (!name) { $('#nf-name').classList.add('invalid'); $('#nf-name').focus(); toast('Enter the new facility name', 'error'); return; }
    try {
      const row = await createFacility(name, pickerValue('nf-icon'), $('#nf-cat').value);
      ctx.state.facilityIds.push(row.id);
      if (ctx.facCat !== 'All' && ctx.facCat !== row.category) ctx.facCat = row.category;
      ctx.facQuery = ''; $('#fac-search').value = '';
      $('#nf-name').value = '';
      drawFacCats(); drawFacGroups(); updateFacCounter(); drawHlFacilityChips();
      toast(`"${row.name}" added to the catalog and ticked`);
    } catch (err) { toast(err.message, 'error'); }
  }

  function renderHighlightsTab() { drawHlPresets(); drawHlFacilityChips(); drawHlRows(); drawHlPreview(); }

  function drawHlPresets() {
    const used = new Set(ctx.state.highlights.map((h) => norm(h.title)));
    $('#hl-presets').innerHTML = !data.highlightPresets.length ? '<span class="hint" style="color:var(--muted);font-size:12px">No saved suggestions yet. Highlights you save on any villa show up here.</span>' : data.highlightPresets.map((p, i) =>
      `<button type="button" class="preset-chip ${used.has(norm(p.title)) ? 'used' : ''}" data-hlpreset="${i}"><i class="fa-solid ${p.icon}"></i>${esc(p.title.replace(/:.*/, ''))}</button>`).join('');
  }

  function drawHlFacilityChips() {
    const wrap = $('#hl-fac-wrap');
    if (!wrap) return;
    const used = new Set(ctx.state.highlights.map((h) => norm(h.title)));
    const chips = ctx.state.facilityIds.map((id) => data.facilities.find((f) => f.id === id)).filter((f) => f && !used.has(norm(f.name))).slice(0, 10);
    wrap.innerHTML = chips.length ? `<div class="field-label">From this villa's facilities</div><div class="preset-row">${chips.map((f) =>
      `<button type="button" class="preset-chip" data-hlfac="${f.id}"><i class="fa-solid ${safeIcon(f.icon)}"></i>${esc(f.name)}</button>`).join('')}</div>` : '';
  }

  function drawHlRows(focusLast) {
    const list = ctx.state.highlights;
    $('#hl-rows').innerHTML = list.length ? list.map((h, i) => `
      <div class="rep-row" data-i="${i}">
        ${iconPicker('hl-' + i, h.icon)}
        <input class="field-input" data-hl="title" data-i="${i}" maxlength="150" placeholder="Title, e.g. Free private parking" value="${esc(h.title)}" aria-label="Highlight title">
        <input class="field-input" data-hl="description" data-i="${i}" maxlength="255" placeholder="Short description (optional)" value="${esc(h.description)}" aria-label="Highlight description">
        <input class="field-input" data-hl="score" data-i="${i}" maxlength="10" placeholder="Score" value="${esc(h.score)}" aria-label="Score (optional)">
        <div class="rep-btns">
          <button type="button" class="row-btn" data-hlact="up" data-i="${i}" title="Move up" ${i === 0 ? 'disabled' : ''}><i class="fa-solid fa-arrow-up"></i></button>
          <button type="button" class="row-btn" data-hlact="down" data-i="${i}" title="Move down" ${i === list.length - 1 ? 'disabled' : ''}><i class="fa-solid fa-arrow-down"></i></button>
          <button type="button" class="row-btn danger" data-hlact="del" data-i="${i}" title="Remove"><i class="fa-solid fa-trash"></i></button>
        </div>
      </div>`).join('') + (list.length > 6 ? '<p class="soft-warn"><i class="fa-solid fa-triangle-exclamation"></i> More than 6 highlights: guests mostly read the first few.</p>' : '')
      : '<div class="empty-state">No highlights yet. Tap a suggestion above or add a custom one.</div>';
    if (focusLast) { const inputs = $$('#hl-rows [data-hl="title"]'); if (inputs.length) inputs[inputs.length - 1].focus(); }
  }

  function drawHlPreview() {
    const list = ctx.state.highlights.filter((h) => h.title.trim());
    $('#hl-preview').innerHTML = `<h4>Property highlights</h4>` + (list.length ? list.map((h) => `
      <div class="hl-preview-row"><i class="fa-solid ${safeIcon(h.icon)}"></i><div><strong>${esc(h.title)}</strong>${h.description ? `<span>${esc(h.description)}</span>` : ''}</div>${h.score ? `<div class="hl-score">${esc(h.score)}</div>` : ''}</div>`).join('')
      : '<p style="font-size:12px;color:var(--muted)">Your highlights will appear here.</p>') + '<span class="fake-btn">Reserve</span>';
  }

  function addHighlight(h, focus) {
    const list = ctx.state.highlights;
    if (list.length >= HL_MAX) { toast(`You can add up to ${HL_MAX} highlights`, 'error'); return; }
    if (h.title && list.some((x) => norm(x.title) === norm(h.title))) { toast('That highlight is already added', 'info'); return; }
    list.push({ icon: h.icon, title: h.title, description: h.description || '', score: h.score || '' });
    renderHighlightsTab(); refreshVillaCounts();
    if (focus) { const inputs = $$('#hl-rows [data-hl="title"]'); if (inputs.length) inputs[inputs.length - 1].focus(); }
  }

  function hlAction(act, i) {
    const list = ctx.state.highlights;
    if (act === 'del') list.splice(i, 1);
    if (act === 'up' && i > 0) [list[i - 1], list[i]] = [list[i], list[i - 1]];
    if (act === 'down' && i < list.length - 1) [list[i + 1], list[i]] = [list[i], list[i + 1]];
    renderHighlightsTab(); refreshVillaCounts();
  }

  function drawNearby(focusLast) {
    const list = ctx.state.nearby;
    $('#nb-rows').innerHTML = list.length ? list.map((n, i) => `
      <div class="rep-row nearby">
        <input class="field-input" data-nb="name" data-i="${i}" maxlength="150" placeholder="Place name" value="${esc(n.name)}" aria-label="Place name">
        <input class="field-input" data-nb="distanceText" data-i="${i}" maxlength="50" placeholder="2.1 km" value="${esc(n.distanceText)}" aria-label="Distance">
        <input class="field-input" data-nb="locationType" data-i="${i}" maxlength="100" list="dl-nbtypes" placeholder="Type" value="${esc(n.locationType)}" aria-label="Type">
        <input class="field-input" data-nb="imageUrl" data-i="${i}" maxlength="255" placeholder="Image link (https:
        <button type="button" class="row-btn danger" data-nbdel="${i}" title="Remove"><i class="fa-solid fa-trash"></i></button>
      </div>`).join('') : '<div class="empty-state">No nearby places yet.</div>';
    setCount('nearby', list.length);
    if (focusLast) { const inputs = $$('#nb-rows [data-nb="name"]'); if (inputs.length) inputs[inputs.length - 1].focus(); }
  }

  function drawPhotos(focusLast) {
    const list = ctx.state.images;
    $('#ph-rows').innerHTML = list.length ? list.map((p, i) => `
      <div class="rep-row photo">
        <img class="thumb" src="${esc(p.url)}" alt="" onerror="this.style.visibility='hidden'" onload="this.style.visibility='visible'">
        <input class="field-input" data-ph="url" data-i="${i}" maxlength="255" placeholder="Image link (https://...)" value="${esc(p.url)}" aria-label="Image link">
        <input class="field-input" data-ph="caption" data-i="${i}" maxlength="150" placeholder="Caption (optional)" value="${esc(p.caption)}" aria-label="Caption">
        <label class="hero-radio"><input type="radio" name="ph-hero" data-phhero="${i}" ${p.hero ? 'checked' : ''}> Cover</label>
        <button type="button" class="row-btn danger" data-phdel="${i}" title="Remove"><i class="fa-solid fa-trash"></i></button>
      </div>`).join('') : '<div class="empty-state">No photos yet. Add at least one.</div>';
    setCount('photos', list.length);
    if (focusLast) { const inputs = $$('#ph-rows [data-ph="url"]'); if (inputs.length) inputs[inputs.length - 1].focus(); }
  }

  function removePhoto(i) {
    const list = ctx.state.images;
    const wasHero = list[i] && list[i].hero;
    list.splice(i, 1);
    if (wasHero && list.length) list[0].hero = true;
    drawPhotos();
  }

  function addBulkPhotos() {
    const lines = $('#ph-bulk').value.split(/\n+/).map((l) => l.trim()).filter(Boolean);
    const bad = lines.filter((l) => !isUrl(l));
    if (!lines.length) { toast('Paste at least one image link', 'error'); return; }
    lines.filter(isUrl).forEach((url) => ctx.state.images.push({ url, caption: '', hero: !ctx.state.images.length }));
    $('#ph-bulk').value = '';
    drawPhotos();
    toast(bad.length ? `${lines.length - bad.length} added, ${bad.length} skipped (not a valid link)` : `${lines.length} photo${lines.length === 1 ? '' : 's'} added`, bad.length ? 'info' : 'success');
  }

  function villaRepeaterInput(e) {
    if (!ctx || ctx.type !== 'villa') return;
    const el = e.target, i = Number(el.dataset.i);
    if (el.dataset.hl) { ctx.state.highlights[i][el.dataset.hl] = el.value; drawHlPreview(); drawHlPresets(); drawHlFacilityChips(); }
    if (el.dataset.nb) ctx.state.nearby[i][el.dataset.nb] = el.value;
    if (el.dataset.ph) {
      ctx.state.images[i][el.dataset.ph] = el.value;
      if (el.dataset.ph === 'url') { const img = el.closest('.rep-row').querySelector('.thumb'); if (img) img.src = el.value; }
    }
  }

  const parseKm = (text) => { const m = String(text).toLowerCase().match(/([\d.]+)\s*(km|m)?/); if (!m) return 0; const n = parseFloat(m[1]); return m[2] === 'm' ? +(n / 1000).toFixed(2) : n; };

  function validateVilla() {
    const s = ctx.state;
    if (!s.name.trim()) return showError('basics', '#v-name', 'Enter the villa name');
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(s.slug)) return showError('basics', '#v-slug', 'Slug may only contain lowercase letters, numbers and hyphens');
    if (!s.city.trim()) return showError('basics', '#v-city', 'Enter the city');
    if (!s.address.trim()) return showError('basics', '#v-address', 'Enter the address');
    const lat = parseFloat(s.latitude), lng = parseFloat(s.longitude);
    if (Number.isNaN(lat) || lat < -90 || lat > 90) return showError('basics', '#v-lat', 'Enter a valid latitude (-90 to 90)');
    if (Number.isNaN(lng) || lng < -180 || lng > 180) return showError('basics', '#v-lng', 'Enter a valid longitude (-180 to 180)');
    if (s.locationScore === '' || !(num(s.locationScore) >= 0 && num(s.locationScore) <= 10)) return showError('basics', '#v-locscore', 'Location score must be between 0 and 10');
    if (!s.tagline.trim()) return showError('basics', '#v-tagline', 'Enter a tagline');
    if (!s.overview.trim()) return showError('basics', '#v-overview', 'Write a short overview');
    if (num(s.basePrice) <= 0) return showError('pricing', '#v-base', 'Enter the original price');
    if (num(s.discountPrice) <= 0) return showError('pricing', '#v-disc', 'Enter the sale price');
    if (num(s.discountPrice) > num(s.basePrice)) return showError('pricing', '#v-disc', 'Sale price cannot be higher than the original price');
    if (s.taxes === '' || num(s.taxes) < 0) return showError('pricing', '#v-tax', 'Enter the taxes (0 if none)');
    const badHl = s.highlights.findIndex((h) => !h.title.trim());
    if (badHl >= 0) return showError('highlights', `[data-hl="title"][data-i="${badHl}"]`, 'Every highlight needs a title (or remove the empty row)');
    const badScore = s.highlights.findIndex((h) => h.score && !(parseFloat(h.score) >= 0 && parseFloat(h.score) <= 10));
    if (badScore >= 0) return showError('highlights', `[data-hl="score"][data-i="${badScore}"]`, 'Highlight score must be a number from 0 to 10');
    const badNb = s.nearby.findIndex((n) => !n.name.trim() || !n.distanceText.trim() || parseKm(n.distanceText) <= 0);
    if (badNb >= 0) return showError('nearby', `[data-nb="name"][data-i="${badNb}"]`, 'Each nearby place needs a name and a distance like "2.1 km"');
    if (!s.images.length) return showError('photos', '#ph-add', 'Add at least one photo');
    const badImg = s.images.findIndex((p) => !isUrl(p.url));
    if (badImg >= 0) return showError('photos', `[data-ph="url"][data-i="${badImg}"]`, 'Photo links must start with http:// or https://');
    return true;
  }

  async function saveVilla() {
    if (!validateVilla()) return;
    const s = ctx.state;
    const images = s.images.map((p) => ({ url: p.url.trim(), caption: p.caption.trim(), hero: !!p.hero }));
    if (!images.some((p) => p.hero)) images[0].hero = true;
    const villa = {
      id: s.id, slug: s.slug, name: s.name.trim(), propertyType: s.propertyType.trim() || 'Resort Villa', stars: Number(s.stars), hasThumbsUp: !!s.hasThumbsUp,
      tagline: s.tagline.trim(), overview: s.overview.trim(), address: s.address.trim(), city: s.city.trim(), regionId: Number(s.regionId),
      latitude: parseFloat(s.latitude), longitude: parseFloat(s.longitude), locationScore: num(s.locationScore),
      basePrice: num(s.basePrice), discountPrice: num(s.discountPrice), taxes: num(s.taxes),
      dealType: s.dealType.trim(), geniusEligible: !!s.geniusEligible, featured: !!s.featured, status: s.status,
      facilityIds: [...new Set(s.facilityIds)],
      highlights: s.highlights.map((h) => ({ icon: safeIcon(h.icon), title: h.title.trim(), description: h.description.trim(), score: String(h.score || '').trim() })),
      nearby: s.nearby.map((n) => ({ name: n.name.trim(), distanceText: n.distanceText.trim(), distanceKm: parseKm(n.distanceText), locationType: n.locationType.trim(), imageUrl: n.imageUrl.trim() })),
      images
    };
    const wasNew = ctx.isNew;
    let saved = null;
    const ok = await submitWith(async () => {
      saved = await api.villas.save(villa);
      await reloadAll().catch(() => toast('Saved, but the lists could not be refreshed. Reload the page.', 'info'));
      toast(wasNew ? `"${saved.name}" created` : `"${saved.name}" saved`);
    });

    if (ok && wasNew && saved) openRoomModal(0, saved.id, { afterVilla: true });
  }

  function blankRoom(villaId) {
    return { id: 0, villaId, slug: '', name: '', badge: '', bedInfo: '', sizeSqm: '', maxGuests: 2, originalPrice: '', discountPrice: '', taxes: '',
      discountPercent: 0, breakfastIncluded: true, breakfastDesc: 'Breakfast included', perks: '', cancellationPolicy: data.cancellationPolicies[0] || '',
      prepaymentPolicy: data.prepaymentPolicies[0] || '', stock: 5, features: [], active: true, addAnother: false };
  }

  function openRoomModal(id, villaId, opts = {}) {
    if (!data.villas.length) { toast('Add a villa first, then add its rooms', 'error'); return; }
    const existing = id ? data.rooms.find((r) => r.id === id) : null;
    const state = existing ? JSON.parse(JSON.stringify(existing)) : blankRoom(villaId || Number(ui.roomVilla) || data.villas[0].id);
    state.active = state.status !== 'Inactive';
    ctx = { type: 'room', state, isNew: !existing, slugTouched: !!existing, featQuery: '' };
    const fromVilla = opts.afterVilla ? (villaById(state.villaId) || {}).name : '';
    const s = state;

    const panels = {
      details: `<div class="fg">
        ${selectField({ id: 'r-villa', f: 'villaId', label: 'Villa', value: s.villaId, full: true, options: data.villas.map((v) => [v.id, v.name + ' - ' + v.city + (v.status === 'Published' ? '' : ' (' + v.status + ')')]) })}
        ${fieldInput({ id: 'r-name', f: 'name', label: 'Room type name', value: s.name, req: true, maxlength: 150, ph: 'e.g. Deluxe Room with Free Breakfast' })}
        ${fieldInput({ id: 'r-slug', f: 'slug', label: 'URL slug', value: s.slug, req: true, maxlength: 100 })}
        ${fieldInput({ id: 'r-badge', f: 'badge', label: 'Badge', value: s.badge, maxlength: 100, hint: 'Optional, e.g. Most Popular, Recommended for 3 adults' })}
        ${fieldInput({ id: 'r-bed', f: 'bedInfo', label: 'Bed information', value: s.bedInfo, req: true, maxlength: 150, ph: '1 extra-large double bed or 2 single beds' })}
        ${fieldInput({ id: 'r-size', f: 'sizeSqm', label: 'Room size', value: s.sizeSqm, req: true, maxlength: 20, ph: '23 m²' })}
        <div class="field"><span class="field-label">Max guests</span>${stepper('maxGuests', s.maxGuests, 1, 20)}</div>
        <div class="field"><span class="field-label">Rooms in stock</span>${stepper('stock', s.stock, 0, 999)}<span class="hint">How many of this room can be booked on one night</span></div>
        <div class="field"><span class="field-label">&nbsp;</span>${switchRow('active', 'Available for booking', 'Turn off to hide this room type', s.active)}</div>
        ${existing ? '' : `<div class="field full">${switchRow('addAnother', 'Add another room to this villa after saving', 'Keeps the dialog flow going so you can enter every room type in one go', s.addAnother)}</div>`}
      </div>`,

      pricing: `<div class="fg three">
        ${moneyField({ id: 'r-orig', f: 'originalPrice', label: 'Original price / night', value: s.originalPrice, req: true })}
        ${moneyField({ id: 'r-price', f: 'discountPrice', label: 'Sale price / night', value: s.discountPrice, req: true })}
        ${moneyField({ id: 'r-tax', f: 'taxes', label: 'Taxes & charges / night', value: s.taxes, req: true })}
      </div>
      <div class="fg" style="margin-top:14px">
        <div class="field"><span class="field-label">Discount (calculated)</span><div class="computed-box"><span>Guests save</span><strong id="r-pct">${discountOf(s.originalPrice, s.discountPrice)}%</strong></div></div>
        <div class="field"><span class="field-label">&nbsp;</span>${switchRow('breakfastIncluded', 'Breakfast included', 'Shown in green on the room row', s.breakfastIncluded)}</div>
        ${fieldInput({ id: 'r-bfdesc', f: 'breakfastDesc', label: 'Breakfast text', value: s.breakfastDesc, maxlength: 150, full: true, hint: 'e.g. "Very good breakfast included" or "Breakfast LKR 4,977"' })}
        ${textArea({ id: 'r-perks', f: 'perks', label: 'Perks', value: s.perks, maxlength: 255, rows: 2, ph: 'Includes free parking + late check-out' })}
        ${fieldInput({ id: 'r-cancel', f: 'cancellationPolicy', label: 'Cancellation policy', value: s.cancellationPolicy, req: true, maxlength: 150, list: 'dl-cancel' })}
        <datalist id="dl-cancel">${data.cancellationPolicies.map((t) => `<option value="${esc(t)}">`).join('')}</datalist>
        ${fieldInput({ id: 'r-prepay', f: 'prepaymentPolicy', label: 'Prepayment policy', value: s.prepaymentPolicy, req: true, maxlength: 150, list: 'dl-prepay' })}
        <datalist id="dl-prepay">${data.prepaymentPolicies.map((t) => `<option value="${esc(t)}">`).join('')}</datalist>
      </div>`,

      features: `<div class="section-note"><i class="fa-solid fa-circle-info"></i><div>Tick what is inside this room. Something missing? Type it at the bottom - it is saved to your <b>Room features</b> library and ticked for you.</div></div>
        <div class="tick-toolbar">
          <div class="admin-search"><i class="fa-solid fa-magnifying-glass"></i><input id="feat-search" placeholder="Search features" autocomplete="off"></div>
          <span class="mini-links tick-group-head" style="margin:0"><span class="mini-links"><button type="button" id="feat-all">Select all</button><button type="button" id="feat-none">Clear</button></span></span>
          <div class="tick-counter" id="feat-counter"></div>
        </div>
        <div class="pill-grid" id="feat-pills"></div>
        <div class="field" style="margin-top:14px"><label for="feat-copy">Copy features from another room</label>
          <select id="feat-copy" class="field-input"><option value="">Choose a room...</option>${data.rooms.filter((r) => r.id !== s.id).map((r) => `<option value="${r.id}">${esc(r.villaName)} - ${esc(r.name)} (${r.features.length})</option>`).join('')}</select></div>
        <div class="inline-add"><h5><i class="fa-solid fa-circle-plus"></i> Add a new room feature</h5>
          <div class="inline-add-row"><input id="nfe-name" class="field-input" maxlength="300" placeholder="e.g. Private plunge pool  (separate several with commas)" autocomplete="off">
          <button type="button" class="admin-primary-button" id="nfe-add"><i class="fa-solid fa-plus"></i> Add &amp; tick</button></div></div>`
    };
    const tabs = [['details', 'Details', 'fa-bed'], ['pricing', 'Pricing & meals', 'fa-tag'], ['features', 'Room features', 'fa-list-check']];

    openModal({
      eyebrow: fromVilla ? 'Step 2 of 2 · Villa saved' : 'Rooms & inventory', title: existing ? 'Edit room type' : (fromVilla ? `Add the first room for ${fromVilla}` : 'Add room type'), size: 'xl',
      submitLabel: existing ? 'Save changes' : 'Create room type', hint: fromVilla ? 'Guests can only book a villa that has rooms. Cancel to add rooms later.' : 'Fields marked * are required',
      html: tabsHtml(tabs, 'details') + tabs.map(([t]) => `<div class="tab-panel ${t === 'details' ? 'active' : ''}" data-panel="${t}">${panels[t]}</div>`).join(''),
      onSubmit: saveRoom,
      onOpen: () => { bindRoomForm(); drawFeatPills(); }
    });
  }

  const roomFeatureNames = () => {
    const lib = data.roomFeatures.map((f) => f.name);
    const extra = ctx.state.features.filter((n) => !lib.some((l) => norm(l) === norm(n)));
    return [...lib, ...extra];
  };

  function drawFeatPills() {
    const q = norm(ctx.featQuery);
    const on = new Set(ctx.state.features);
    const names = roomFeatureNames().filter((n) => !q || n.toLowerCase().includes(q));
    $('#feat-pills').innerHTML = names.length ? names.map((n) => `
      <label class="pill-tick ${on.has(n) ? 'checked' : ''}"><input type="checkbox" data-feat="${esc(n)}" ${on.has(n) ? 'checked' : ''}>
        <span class="tick-box"><i class="fa-solid fa-check"></i></span>${esc(n)}</label>`).join('') : '<div class="empty-state" style="width:100%">No features match. Add a new one below.</div>';
    $('#feat-counter').innerHTML = `<b>${ctx.state.features.length}</b> selected`;
    setCount('features', ctx.state.features.length);
  }

  function bindRoomForm() {
    const s = ctx.state;
    ctx.onField = (f) => {
      if (f === 'name' && !ctx.slugTouched) { s.slug = slugify(s.name); $('#r-slug').value = s.slug; }
      if (f === 'slug') ctx.slugTouched = true;
      if (f === 'originalPrice' || f === 'discountPrice') $('#r-pct').textContent = discountOf(s.originalPrice, s.discountPrice) + '%';
    };
    ctx.onChange = (e) => {
      const t = e.target;
      if (t.matches('input[data-feat]')) {
        const name = t.dataset.feat, i = s.features.indexOf(name);
        if (t.checked && i < 0) s.features.push(name);
        if (!t.checked && i >= 0) s.features.splice(i, 1);
        t.closest('.pill-tick').classList.toggle('checked', t.checked);
        $('#feat-counter').innerHTML = `<b>${s.features.length}</b> selected`;
        setCount('features', s.features.length);
      }
      if (t.id === 'feat-copy' && t.value) {
        const src = data.rooms.find((r) => r.id === Number(t.value));
        if (src) { s.features = [...src.features]; drawFeatPills(); toast(`Copied ${plural(src.features.length, 'feature')} from ${src.name}`, 'info'); }
        t.value = '';
      }
    };
    ctx.onClick = (e) => {
      const t = e.target;
      if (t.closest('#feat-all')) { roomFeatureNames().filter((n) => !ctx.featQuery || n.toLowerCase().includes(norm(ctx.featQuery))).forEach((n) => { if (!s.features.includes(n)) s.features.push(n); }); drawFeatPills(); }
      if (t.closest('#feat-none')) { s.features = []; drawFeatPills(); }
      if (t.closest('#nfe-add')) addInlineFeature();
    };
    $('#feat-search').addEventListener('input', (e) => { ctx.featQuery = e.target.value; drawFeatPills(); });
    $('#feat-search').addEventListener('keydown', (e) => { if (e.key === 'Enter') e.preventDefault(); });
    $('#nfe-name').addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); addInlineFeature(); } });
  }

  async function addInlineFeature() {
    const input = $('#nfe-name');
    const text = input.value.trim();
    if (!text) { input.classList.add('invalid'); input.focus(); toast('Type the new feature first', 'error'); return; }
    const wanted = [...new Set(text.split(/[,\n]/).map((x) => x.trim()).filter(Boolean))];
    const { added } = await createRoomFeatures(text);
    let ticked = 0;
    wanted.forEach((w) => {
      const lib = data.roomFeatures.find((f) => norm(f.name) === norm(w));
      if (lib && !ctx.state.features.includes(lib.name)) { ctx.state.features.push(lib.name); ticked++; }
    });
    ctx.featQuery = ''; $('#feat-search').value = '';
    input.value = '';
    drawFeatPills();
    toast(added.length ? `${plural(added.length, 'feature')} added to the library and ticked` : (ticked ? 'Already in your library - ticked for you' : 'Nothing to add'), added.length || ticked ? 'success' : 'info');
  }

  function validateRoom() {
    const s = ctx.state;
    if (!s.name.trim()) return showError('details', '#r-name', 'Enter the room type name');
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(s.slug)) return showError('details', '#r-slug', 'Slug may only contain lowercase letters, numbers and hyphens');
    if (!s.bedInfo.trim()) return showError('details', '#r-bed', 'Enter the bed information');
    if (!s.sizeSqm.trim()) return showError('details', '#r-size', 'Enter the room size');
    if (!(Number(s.maxGuests) >= 1)) return showError('details', 'input[data-f="maxGuests"]', 'Max guests must be at least 1');
    if (!(Number(s.stock) >= 0)) return showError('details', 'input[data-f="stock"]', 'Stock cannot be negative');
    if (num(s.originalPrice) <= 0) return showError('pricing', '#r-orig', 'Enter the original price');
    if (num(s.discountPrice) <= 0) return showError('pricing', '#r-price', 'Enter the sale price');
    if (num(s.discountPrice) > num(s.originalPrice)) return showError('pricing', '#r-price', 'Sale price cannot be higher than the original price');
    if (s.taxes === '' || num(s.taxes) < 0) return showError('pricing', '#r-tax', 'Enter the taxes (0 if none)');
    if (!s.cancellationPolicy.trim()) return showError('pricing', '#r-cancel', 'Enter the cancellation policy');
    if (!s.prepaymentPolicy.trim()) return showError('pricing', '#r-prepay', 'Enter the prepayment policy');
    return true;
  }

  async function saveRoom() {
    if (!validateRoom()) return;
    const s = ctx.state, wasNew = ctx.isNew, again = !!s.addAnother;
    const room = {
      id: s.id, villaId: Number(s.villaId), slug: s.slug, name: s.name.trim(), badge: s.badge.trim(), bedInfo: s.bedInfo.trim(), sizeSqm: s.sizeSqm.trim(),
      maxGuests: Number(s.maxGuests), originalPrice: num(s.originalPrice), discountPrice: num(s.discountPrice), taxes: num(s.taxes),
      breakfastIncluded: !!s.breakfastIncluded, breakfastDesc: s.breakfastDesc.trim(),
      perks: s.perks.trim(), cancellationPolicy: s.cancellationPolicy.trim(), prepaymentPolicy: s.prepaymentPolicy.trim(),
      stock: Number(s.stock), features: [...new Set(s.features)], status: s.active ? 'Active' : 'Inactive'
    };
    let saved = null;
    const ok = await submitWith(async () => {
      saved = await api.rooms.save(room);
      await reloadAll().catch(() => toast('Saved, but the lists could not be refreshed. Reload the page.', 'info'));
      toast(wasNew ? `"${saved.name}" added to ${saved.villaName}` : `"${saved.name}" saved`);
    });
    if (ok && wasNew && again && saved) openRoomModal(0, saved.villaId);
  }

  function fillFilterSelects() {
    const region = $('#property-region-filter'), villa = $('#room-villa-filter');
    if (region) { const cur = ui.propertyRegion; region.innerHTML = '<option value="">All regions</option>' + data.regions.map((r) => `<option value="${r.id}">${esc(r.name)}</option>`).join(''); region.value = cur; }
    if (villa) { const cur = ui.roomVilla; villa.innerHTML = '<option value="">All villas</option>' + data.villas.map((v) => `<option value="${v.id}">${esc(v.name)}</option>`).join(''); villa.value = cur; }
  }

  async function handleRowAct(act, id) {
    switch (act) {
      case 'edit-villa': return editVilla(id);
      case 'add-villa-room': return openRoomModal(0, id);
      case 'villa-rooms': ui.roomVilla = String(id); $('#room-villa-filter').value = String(id); renderRooms(); return showSection('rooms');
      case 'toggle-villa': {
        const v = villaById(id); const next = v.status === 'Published' ? 'Paused' : 'Published';
        await api.villas.setStatus(id, next); v.status = next; renderProperties(); renderCounts(); return toast(`${v.name} is now ${next.toLowerCase()}`);
      }
      case 'delete-villa': {
        const v = villaById(id); const n = v.roomCount;
        if (!(await confirmDialog({ title: 'Delete villa?', danger: true, confirmLabel: 'Delete villa', message: `<b>${esc(v.name)}</b> will be permanently removed${n ? ` together with its <b>${plural(n, 'room type')}</b>` : ''}. This cannot be undone.` }))) return;
        await api.villas.remove(id); await reloadAll(); return toast('Villa deleted');
      }
      case 'edit-room': return openRoomModal(id);
      case 'delete-room': {
        const r = data.rooms.find((x) => x.id === id);
        if (!(await confirmDialog({ title: 'Delete room type?', danger: true, confirmLabel: 'Delete room', message: `<b>${esc(r.name)}</b> will be removed from ${esc(r.villaName)}.` }))) return;
        await api.rooms.remove(id); await reloadAll(); return toast('Room type deleted');
      }
      case 'view-booking': return openBookingModal(id);
      case 'approve-review': return setReviewStatus(id, 'Approved');
      case 'reject-review': return setReviewStatus(id, 'Rejected');
      case 'delete-review': {
        if (!(await confirmDialog({ title: 'Delete review?', danger: true, confirmLabel: 'Delete review', message: 'This permanently removes the review.' }))) return null;
        await api.reviews.remove(id); data.reviews = await api.reviews.list(); renderReviews(); renderCounts(); return toast('Review deleted');
      }
      case 'edit-offer': return openOfferModal(id);
      case 'toggle-offer': {
        const o = data.offers.find((x) => x.id === id);
        await api.offers.setActive(id, !o.active); data.offers = await api.offers.list(); renderOffers(); renderCounts();
        return toast(`"${o.title}" switched ${o.active ? 'off' : 'on'}`);
      }
      case 'delete-offer': {
        const o = data.offers.find((x) => x.id === id);
        if (!(await confirmDialog({ title: 'Delete offer?', danger: true, confirmLabel: 'Delete offer', message: `<b>${esc(o.title)}</b> will be removed from the home page.` }))) return null;
        await api.offers.remove(id); data.offers = await api.offers.list(); renderOffers(); renderCounts(); return toast('Offer deleted');
      }
      case 'edit-facility': return openFacilityModal(id);
      case 'delete-facility': return deleteFacility(id);
      case 'edit-feature': return openFeatureModal(id);
      case 'delete-feature': return deleteFeature(id);
      case 'view-user': {
        const u = data.users.find((x) => x.id === id); if (!u) return null;
        return openModal({
          eyebrow: 'Account', title: u.fullName, submitLabel: 'Close', submitIcon: 'fa-check',
          html: `<div class="fg">
            <div class="field full"><span class="field-label">Contact</span><div>${esc(u.email)}<br><small style="color:var(--muted)">${esc(u.phoneNumber || 'No phone on file')}</small></div></div>
            <div class="field"><span class="field-label">Role</span><div><span class="status-pill ${roleClass(u.role)}">${roleLabel(u.role)}</span></div></div>
            <div class="field"><span class="field-label">Status</span><div><span class="status-pill ${u.accountStatus === 'Suspended' ? 'cancelled' : 'active'}">${esc(u.accountStatus)}</span></div></div>
            <div class="field"><span class="field-label">Bookings</span><div>${plural(u.bookingCount, 'booking')} · ${money(u.totalSpend)}</div></div>
            <div class="field"><span class="field-label">Reviews written</span><div>${u.reviewCount}</div></div>
          </div>`,
          onSubmit: closeModal
        });
      }
      case 'toggle-user-role': {
        const u = data.users.find((x) => x.id === id); if (!u) return null;
        const next = u.role === 'host' ? 'guest' : 'host';
        await api.users.setRole(id, next); data.users = await api.users.list(); renderUsers();
        return toast(`${u.fullName} is now a ${roleLabel(next).toLowerCase()}`);
      }
      case 'toggle-user-status': {
        const u = data.users.find((x) => x.id === id); if (!u) return null;
        const next = u.accountStatus === 'Suspended' ? 'Active' : 'Suspended';
        if (next === 'Suspended' && !(await confirmDialog({ title: 'Suspend this account?', danger: true, confirmLabel: 'Suspend account', message: `<b>${esc(u.fullName)}</b> won't be able to sign in to Lodge until reactivated.` }))) return null;
        await api.users.setStatus(id, next); data.users = await api.users.list(); renderUsers();
        return toast(`${u.fullName} ${next === 'Suspended' ? 'suspended' : 'reactivated'}`);
      }
      case 'delete-user': {
        const u = data.users.find((x) => x.id === id); if (!u) return null;
        if (!(await confirmDialog({ title: 'Delete this account?', danger: true, confirmLabel: 'Delete account', message: `<b>${esc(u.fullName)}</b> will be permanently removed. Their past bookings stay on record.` }))) return null;
        await api.users.remove(id); data.users = await api.users.list(); renderUsers();
        return toast('Account deleted');
      }
      default: return null;
    }
  }

  function handleAction(action) {
    switch (action) {
      case 'add-villa': return openVillaModal(0, null);
      case 'add-room': return openRoomModal(0, Number(ui.roomVilla) || 0);
      case 'add-offer': return openOfferModal(0);
      case 'export-bookings': return exportBookings();
      case 'add-facility': showSection('facilities'); return setTimeout(() => { const el = $('#catfac-name'); if (el) el.focus(); }, 50);
      case 'add-feature': showSection('room-features'); return setTimeout(() => { const el = $('#catfeat-name'); if (el) el.focus(); }, 50);
      default: return null;
    }
  }

  function bindPage() {
    document.addEventListener('click', (e) => {
      const t = e.target;
      let el;
      if ((el = t.closest('.admin-nav-item[data-section]'))) return showSection(el.dataset.section);
      if ((el = t.closest('[data-section-link]'))) return showSection(el.dataset.sectionLink);
      if ((el = t.closest('[data-action]'))) return handleAction(el.dataset.action);
      if ((el = t.closest('[data-act]')) && !modal.backdrop.contains(el)) return handleRowAct(el.dataset.act, Number(el.dataset.id)).catch((err) => toast(err.message || 'Something went wrong', 'error'));
      if ((el = t.closest('#booking-tabs button[data-tab]'))) { ui.bookingTab = el.dataset.tab; return renderBookings(); }
      if ((el = t.closest('#review-tabs button[data-tab]'))) { ui.reviewTab = el.dataset.tab; return renderReviews(); }
      if ((el = t.closest('#facility-tabs button[data-cat]'))) { ui.facilityCat = el.dataset.cat; return renderFacilities(); }
      if ((el = t.closest('#section-settings .toggle'))) { el.classList.toggle('active'); return null; }
      if ((el = t.closest('.settings-menu button'))) { $$('.settings-menu button').forEach((b) => b.classList.toggle('active', b === el)); return null; }
      if (t.closest('#save-settings')) return toast('Settings saved');
      if (t.closest('#notification-button')) {
        const pb = data.bookings.filter((b) => b.bookingStatus === 'Pending').length, pr = data.reviews.filter((r) => r.status === 'Pending').length;
        toast(pb + pr ? `${plural(pb, 'booking')} pending · ${plural(pr, 'review')} to approve` : 'Nothing needs your attention', 'info');
        return pr ? showSection('reviews') : pb ? showSection('bookings') : null;
      }
      if (t.closest('#mobile-menu')) return $('#admin-sidebar').classList.toggle('open');
      if (t.closest('#close-modal') || t.closest('#cancel-modal')) return closeModal();
      return null;
    });

    modal.backdrop.addEventListener('mousedown', (e) => { if (e.target === modal.backdrop) closeModal(); });
    $('#admin-form').addEventListener('submit', (e) => { e.preventDefault(); if (modal.onSubmit) modal.onSubmit(); });
    document.addEventListener('keydown', (e) => {
      if (e.key !== 'Escape') return;
      if (openPopover) closePopovers(); else if (!modal.backdrop.classList.contains('hidden')) closeModal();
    });

    const fields = $('#modal-fields');
    fields.addEventListener('input', villaRepeaterInput);
    fields.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && e.target.matches('#nf-name')) { e.preventDefault(); addInlineFacility(); }
      if (e.key === 'Enter' && e.target.matches('.rep-row input, #fac-search')) e.preventDefault();
    });

    const on = (sel, ev, fn) => { const el = $(sel); if (el) el.addEventListener(ev, fn); };
    on('#property-search', 'input', debounce((e) => { ui.propertySearch = e.target.value; renderProperties(); }));
    on('#property-status-filter', 'change', (e) => { ui.propertyStatus = e.target.value; renderProperties(); });
    on('#property-region-filter', 'change', (e) => { ui.propertyRegion = e.target.value; renderProperties(); });
    on('#booking-search', 'input', debounce((e) => { ui.bookingSearch = e.target.value; renderBookings(); }));
    on('#booking-date-filter', 'change', (e) => { ui.bookingDate = e.target.value; renderBookings(); });
    on('#booking-pay-filter', 'change', (e) => { ui.bookingPay = e.target.value; renderBookings(); });
    on('#rev-range', 'change', (e) => { ui.revRange = e.target.value; renderDashboard(); });
    on('#room-search', 'input', debounce((e) => { ui.roomSearch = e.target.value; renderRooms(); }));
    on('#room-villa-filter', 'change', (e) => { ui.roomVilla = e.target.value; renderRooms(); });
    on('#facility-search', 'input', debounce((e) => { ui.facilitySearch = e.target.value; renderFacilities(); }));
    on('#feature-search', 'input', debounce((e) => { ui.featureSearch = e.target.value; renderFeatures(); }));
    on('#user-search', 'input', debounce((e) => { ui.userSearch = e.target.value; renderUsers(); }));
    on('#user-role-filter', 'change', (e) => { ui.userRole = e.target.value; renderUsers(); });
    on('#user-status-filter', 'change', (e) => { ui.userStatus = e.target.value; renderUsers(); });
    on('#refresh-rate', 'click', refreshCurrencyRate);
    on('#set-currency', 'change', (e) => {
      setAdminCurrency(e.target.value);
      renderDashboard(); renderBookings(); renderProperties(); renderUsers();
    });
    window.addEventListener('hashchange', () => showSection(location.hash.slice(1)));
  }

  async function init() {
    bindPage();
    try {
      const meta = await api.meta();
      data.regions = meta.regions;
      data.categories = meta.facilityCategories;
      data.facilities = meta.facilities;
      data.roomFeatures = meta.roomFeatures;
      data.propertyTypes = meta.propertyTypes;
      data.dealTypes = meta.dealTypes;
      data.nearbyTypes = meta.nearbyTypes;
      data.cancellationPolicies = meta.cancellationPolicies;
      data.prepaymentPolicies = meta.prepaymentPolicies;
      data.highlightPresets = meta.highlightPresets;
      [data.villas, data.rooms, data.bookings, data.reviews, data.offers, data.users] = await Promise.all([
        api.villas.list(), api.rooms.list(), api.bookings.list(), api.reviews.list(), api.offers.list(), api.users.list()]);
    } catch (err) {
      toast('Could not load data from the database: ' + err.message, 'error');
      $('#properties-table').innerHTML = `<tr class="empty-row"><td colspan="9">Could not load data: ${esc(err.message)}</td></tr>`;
      $('#rooms-table').innerHTML = `<tr class="empty-row"><td colspan="7">Could not load data: ${esc(err.message)}</td></tr>`;
      showSection(location.hash.slice(1) || 'dashboard');
      return;
    }
    fillFilterSelects();
    renderFacilityQuickAdd(); renderFeatureQuickAdd();
    renderProperties(); renderRooms(); renderBookings(); renderReviews(); renderOffers(); renderFacilities(); renderFeatures(); renderUsers(); renderCounts();
    showSection(location.hash.slice(1) || 'dashboard');

    if ($('#set-currency')) $('#set-currency').value = adminCurrency.code;
    if (typeof refreshCurrencyRate === 'function') refreshCurrencyRate();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
