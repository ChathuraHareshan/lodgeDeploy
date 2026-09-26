
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sept', 'Oct', 'Nov', 'Dec'];
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const FALLBACK_IMG = 'data:image/svg+xml;utf8,' + encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300"><rect width="100%" height="100%" fill="#e5e7eb"/>' +
    '<text x="50%" y="50%" fill="#9ca3af" font-family="sans-serif" font-size="18" text-anchor="middle">Photo unavailable</text></svg>');

const $ = (id) => document.getElementById(id);

function esc(value) {
    return String(value ?? '').replace(/[&<>"']/g, (c) => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
}

const CURRENCY_KEY = 'lodge.currency';
const RATE_KEY = 'lodge.lkrPerUsd';
const currency = { code: 'LKR', lkrPerUsd: 330 };

try {
    if (localStorage.getItem(CURRENCY_KEY) === 'USD') currency.code = 'USD';
    const cached = parseFloat(localStorage.getItem(RATE_KEY));
    if (cached > 0) currency.lkrPerUsd = cached;
} catch (e) { }

function money(n) {
    const lkr = Number(n) || 0;
    if (currency.code === 'USD') {
        const usd = lkr / currency.lkrPerUsd;
        const digits = Math.abs(usd) < 100 ? 2 : 0;
        return 'US$' + usd.toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits });
    }
    return 'LKR ' + Math.round(lkr).toLocaleString('en-US');
}

function applyCurrencyToChrome() {
    document.querySelectorAll('#currency-label').forEach((el) => { el.textContent = currency.code; });
    document.querySelectorAll('[data-cur-name]').forEach((el) => { el.textContent = currency.code; });
    document.querySelectorAll('[data-usd-note]').forEach((el) => el.classList.toggle('hidden', currency.code !== 'USD'));
    document.querySelectorAll('#currency-menu button[data-cur]').forEach((b) => {
        const on = b.dataset.cur === currency.code;
        b.classList.toggle('bg-blue-50', on);
        b.querySelector('.cur-tick').classList.toggle('invisible', !on);
    });
}

function setCurrency(code) {
    currency.code = code === 'USD' ? 'USD' : 'LKR';
    try { localStorage.setItem(CURRENCY_KEY, currency.code); } catch (e) {  }
    applyCurrencyToChrome();
    if (typeof onCurrencyChange === 'function') onCurrencyChange();
}

function initCurrency() {
    const btn = document.getElementById('currency-btn');
    if (btn && !document.getElementById('currency-menu')) {
        const menu = document.createElement('div');
        menu.id = 'currency-menu';
        menu.className = 'hidden absolute left-0 top-full mt-1 w-56 bg-white text-gray-900 rounded-lg shadow-xl border border-gray-200 py-1 z-50';
        menu.innerHTML = `
            <p class="px-3 pt-2 pb-1 text-[10px] font-extrabold uppercase tracking-wider text-gray-400">Select your currency</p>
            <button type="button" data-cur="LKR" class="w-full flex items-center justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-gray-50">
                <span><b>LKR</b> <span class="text-gray-500 text-xs">Sri Lankan rupee</span></span><i class="cur-tick fa-solid fa-check text-booking-blue text-xs"></i></button>
            <button type="button" data-cur="USD" class="w-full flex items-center justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-gray-50">
                <span><b>USD</b> <span class="text-gray-500 text-xs">US dollar</span></span><i class="cur-tick fa-solid fa-check text-booking-blue text-xs"></i></button>
            <p class="px-3 pt-1 pb-2 text-[10px] text-gray-500 border-t border-gray-100 mt-1">Payment at the villa is taken in LKR. USD amounts are approximate.</p>`;
        btn.parentElement.classList.add('relative');
        btn.parentElement.appendChild(menu);
        btn.setAttribute('aria-haspopup', 'true');
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            menu.classList.toggle('hidden');
            if (!menu.classList.contains('hidden')) {
                menu.style.left = '0px';
                const over = menu.getBoundingClientRect().right - (window.innerWidth - 8);
                if (over > 0) menu.style.left = -over + 'px';
            }
        });
        menu.addEventListener('click', (e) => {
            const b = e.target.closest('button[data-cur]');
            if (!b) return;
            menu.classList.add('hidden');
            setCurrency(b.dataset.cur);
        });
        document.addEventListener('click', (e) => { if (!menu.contains(e.target)) menu.classList.add('hidden'); });
        document.addEventListener('keydown', (e) => { if (e.key === 'Escape') menu.classList.add('hidden'); });
    }
    applyCurrencyToChrome();

    fetch('api/currency').then((r) => r.json()).then((d) => {
        const rate = Number(d && d.lkrPerUsd);
        if (!(d && d.status && rate > 0) || rate === currency.lkrPerUsd) return;
        currency.lkrPerUsd = rate;
        try { localStorage.setItem(RATE_KEY, String(rate)); } catch (e) { }
        if (currency.code === 'USD' && typeof onCurrencyChange === 'function') onCurrencyChange();
    }).catch(() => {  });
}

document.addEventListener('DOMContentLoaded', initCurrency);

function pad2(n) { return String(n).padStart(2, '0'); }
function toIso(d) { return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`; }
function fromIso(s) { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); }
function addDays(d, n) { const x = new Date(d); x.setDate(x.getDate() + n); return x; }
function nightsBetween(a, b) { return Math.max(1, Math.round((fromIso(b) - fromIso(a)) / 86400000)); }
function fmtDay(d) { return `${DAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`; }
function plural(n, one, many) { return `${n} ${n === 1 ? one : (many || one + 's')}`; }

function starsHtml(n) { return '<i class="fa-solid fa-star"></i>'.repeat(Math.max(0, Number(n) || 0)); }

function scoreBadge(score, sizeClasses) {
    return `<div class="booking-score-badge ${sizeClasses || 'w-8 h-8 text-sm'}">${Number(score).toFixed(1)}</div>`;
}

const COUNTRY_CODES = {
    'Sri Lanka': 'LK', 'Australia': 'AU', 'Germany': 'DE', 'India': 'IN', 'United Kingdom': 'GB', 'UK': 'GB',
    'United States': 'US', 'USA': 'US', 'France': 'FR', 'Canada': 'CA', 'Japan': 'JP', 'Singapore': 'SG',
    'Netherlands': 'NL', 'Italy': 'IT', 'China': 'CN', 'Russia': 'RU', 'Maldives': 'MV', 'New Zealand': 'NZ',
    'Switzerland': 'CH', 'Sweden': 'SE', 'Spain': 'ES', 'United Arab Emirates': 'AE', 'Malaysia': 'MY',
    'Bangladesh': 'BD', 'Pakistan': 'PK', 'Norway': 'NO', 'Denmark': 'DK', 'Belgium': 'BE', 'Austria': 'AT'
};
function flagFor(country) {
    const code = COUNTRY_CODES[country];
    if (!code) return '🌍';
    return String.fromCodePoint(...[...code].map((c) => 127397 + c.charCodeAt(0)));
}

function locationLabel(score) {
    const s = Number(score);
    if (s >= 9) return 'Excellent location';
    if (s >= 8.5) return 'Fabulous location';
    if (s >= 8) return 'Very good location';
    return 'Good location';
}

async function apiGet(path, params = {}) {
    const qs = new URLSearchParams(
        Object.entries(params).filter(([, v]) => v !== '' && v !== null && v !== undefined)
    ).toString();
    const response = await fetch(`api/${path}${qs ? '?' + qs : ''}`);
    if (!response.ok) throw new Error('HTTP ' + response.status);
    return response.json();
}

async function apiPost(path, body) {
    const response = await fetch(`api/${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    });
    if (!response.ok) throw new Error('HTTP ' + response.status);
    return response.json();
}

const CHECKIN_TIME = '14:00';
const CHECKOUT_TIME = '12:00';

function openInvoice(b) {
    if (!b) return;
    const customerName = b.guestName || b.leadGuestName || b.customerName || '-';
    const customerEmail = b.guestEmail || b.email || '-';
    const customerMobile = b.guestPhone || b.phone || b.mobile || '';
    const rooms = b.rooms || [];
    const nights = b.nights || nightsBetween(b.checkIn, b.checkOut);
    const total = Number(b.total ?? b.totalAmountLkr ?? 0);
    const taxes = Number(b.taxes ?? b.totalTaxesLkr ?? 0);
    const subtotal = Math.max(0, total - taxes);
    const reference = b.reference || b.bookingReference || '-';
    const issuedOn = new Date();
    const guests = `${plural(b.adults || 0, 'adult')}${b.children ? ', ' + plural(b.children, 'child', 'children') : ''}`;

    const roomRows = rooms.length ? rooms.map((r) => {
        const qty = r.quantity || 1;
        const lineTotal = r.price != null ? (Number(r.price) * qty * nights) : null;
        return `<tr>
            <td>${esc(r.name)}</td>
            <td class="c">${qty}</td>
            <td class="c">${plural(nights, 'night')}</td>
            <td class="r">${lineTotal != null ? money(lineTotal) : '-'}</td>
        </tr>`;
    }).join('') : `<tr><td colspan="4" class="muted">Room details not available</td></tr>`;

    const win = window.open('', '_blank', 'width=860,height=1000');
    if (!win) { if (typeof showToast === 'function') showToast('Please allow pop-ups to view the invoice.', 'error'); return; }

    win.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Invoice ${esc(reference)} · Lodge</title>
    <style>
        * { box-sizing: border-box; }
        body { font-family: Arial, Helvetica, sans-serif; color: #1f2937; margin: 0; padding: 32px; font-size: 13px; }
        .head { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #003580; padding-bottom: 16px; }
        .brand { font-size: 22px; font-weight: 800; color: #003580; }
        .brand span { color: #006ce4; }
        .muted { color: #6b7280; }
        .doc-title { text-align: right; }
        .doc-title h1 { margin: 0; font-size: 20px; color: #111827; }
        .doc-title p { margin: 2px 0 0; font-size: 12px; }
        .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin: 20px 0; }
        .box { background: #f8fafc; border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px 14px; }
        .box h3 { margin: 0 0 6px; font-size: 11px; text-transform: uppercase; letter-spacing: .04em; color: #64748b; }
        .box p { margin: 2px 0; }
        table { width: 100%; border-collapse: collapse; margin-top: 6px; }
        th { text-align: left; background: #003580; color: #fff; font-size: 11px; text-transform: uppercase; padding: 8px 10px; }
        td { padding: 8px 10px; border-bottom: 1px solid #e5e7eb; }
        td.c, th.c { text-align: center; } td.r, th.r { text-align: right; }
        .totals { width: 280px; margin-left: auto; margin-top: 14px; }
        .totals div { display: flex; justify-content: space-between; padding: 5px 0; }
        .totals .grand { border-top: 2px solid #003580; margin-top: 4px; padding-top: 8px; font-size: 15px; font-weight: 800; color: #003580; }
        .status-pill { display: inline-block; padding: 2px 10px; border-radius: 999px; font-size: 11px; font-weight: 700; background: #dcfce7; color: #166534; }
        .foot { margin-top: 30px; padding-top: 14px; border-top: 1px solid #e5e7eb; font-size: 11px; color: #6b7280; text-align: center; }
        .print-bar { text-align: right; margin-bottom: 14px; }
        .print-bar button { background: #006ce4; color: #fff; border: 0; padding: 8px 16px; border-radius: 6px; font-weight: 700; cursor: pointer; font-size: 12px; }
        @media print { .print-bar { display: none; } body { padding: 0; } }
    </style></head><body>
        <div class="print-bar"><button onclick="window.print()">Print / Save as PDF</button></div>
        <div class="head">
            <div>
                <div class="brand">Lodge <span>Sri Lanka</span></div>
                <p class="muted">support@lodge.lk · www.lodge.lk</p>
            </div>
            <div class="doc-title">
                <h1>INVOICE</h1>
                <p>Ref: <b>${esc(reference)}</b></p>
                <p class="muted">Issued ${esc(toIso(issuedOn))}</p>
            </div>
        </div>
        <div class="grid">
            <div class="box">
                <h3>Billed to</h3>
                <p>Name: <b>${esc(customerName)}</b></p>
                <p>Email: <b>${esc(customerEmail)}</b></p>
                <p>Mobile: <b>${esc(customerMobile || 'Not provided')}</b></p>
            </div>
            <div class="box">
                <h3>Stay details</h3>
                <p><b>${esc(b.villaName || '-')}</b>${b.city ? ' · ' + esc(b.city) : ''}</p>
                <p>Check-in: <b>${esc(fmtDay(fromIso(b.checkIn)))}</b> from ${CHECKIN_TIME}</p>
                <p>Check-out: <b>${esc(fmtDay(fromIso(b.checkOut)))}</b> until ${CHECKOUT_TIME}</p>
                <p class="muted">${plural(nights, 'night')} · ${guests}</p>
            </div>
        </div>
        <table>
            <thead><tr><th>Room</th><th class="c">Qty</th><th class="c">Duration</th><th class="r">Amount</th></tr></thead>
            <tbody>${roomRows}</tbody>
        </table>
        <div class="totals">
            <div><span>Subtotal</span><span>${money(subtotal)}</span></div>
            <div><span>Taxes &amp; fees</span><span>${money(taxes)}</span></div>
            <div class="grand"><span>Total payable</span><span>${money(total)}</span></div>
        </div>
        <div class="grid" style="margin-top:20px">
            <div class="box">
                <h3>Payment</h3>
                <p>Method: <b>${esc(b.paymentMethod || 'Pay at Villa')}</b></p>
                <p>Status: <span class="status-pill">${esc(b.paymentStatus || 'Pending')}</span></p>
            </div>
            <div class="box">
                <h3>Booking status</h3>
                <p><span class="status-pill">${esc(b.bookingStatus || 'Confirmed')}</span></p>
                ${b.specialRequests ? `<p class="muted">Notes: ${esc(b.specialRequests)}</p>` : ''}
            </div>
        </div>
        <div class="foot">This is a computer-generated invoice from Lodge Sri Lanka. Keep it for your records.<br>Thank you for choosing Lodge!</div>
    </body></html>`);
    win.document.close();
}

function showToast(message, type = 'info') {
    const colors = { success: 'bg-booking-green', error: 'bg-booking-red', info: 'bg-booking-navy' };
    const el = document.createElement('div');
    el.className = `fixed top-4 left-1/2 -translate-x-1/2 z-[100] ${colors[type] || colors.info} text-white text-sm font-semibold px-4 py-2.5 rounded-lg shadow-xl animate-fade-in max-w-[90vw]`;
    el.textContent = message;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 3500);
}

const search = { checkIn: '', checkOut: '', adults: 2, children: 0, rooms: 1 };

function readSearchFromUrl() {
    const p = new URLSearchParams(location.search);
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const todayIso = toIso(today);

    let inIso = /^\d{4}-\d{2}-\d{2}$/.test(p.get('checkIn') || '') ? p.get('checkIn') : todayIso;
    if (inIso < todayIso) inIso = todayIso;
    let outIso = /^\d{4}-\d{2}-\d{2}$/.test(p.get('checkOut') || '') ? p.get('checkOut') : toIso(addDays(fromIso(inIso), 1));
    if (outIso <= inIso) outIso = toIso(addDays(fromIso(inIso), 1));

    search.checkIn = inIso;
    search.checkOut = outIso;
    search.adults = clamp(parseInt(p.get('adults'), 10) || 2, 1, 30);
    search.children = clamp(parseInt(p.get('children'), 10) || 0, 0, 10);
    search.rooms = clamp(parseInt(p.get('rooms'), 10) || 1, 1, 9);
}

function clamp(n, min, max) { return Math.min(max, Math.max(min, n)); }

function searchQuery() {
    return new URLSearchParams({
        checkIn: search.checkIn, checkOut: search.checkOut,
        adults: search.adults, children: search.children, rooms: search.rooms
    }).toString();
}

function initSearchBar(onSearch) {
    const input = $('date-range-input');
    const display = $('date-range-display');
    const paintDates = () => {
        display.textContent = `${fmtDay(fromIso(search.checkIn))} — ${fmtDay(fromIso(search.checkOut))}`;
    };
    paintDates();

    if (window.flatpickr && input) {
        flatpickr(input, {
            mode: 'range',
            minDate: 'today',
            dateFormat: 'Y-m-d',
            showMonths: window.innerWidth >= 768 ? 2 : 1,
            defaultDate: [search.checkIn, search.checkOut],
            onClose(selected, _str, instance) {
                if (selected.length === 1) {
                    search.checkIn = toIso(selected[0]);
                    search.checkOut = toIso(addDays(selected[0], 1));
                    instance.setDate([search.checkIn, search.checkOut], false);
                } else if (selected.length === 2) {
                    search.checkIn = toIso(selected[0]);
                    search.checkOut = toIso(selected[1]);
                }
                paintDates();
            }
        });
    }

    const button = $('occupancy-btn');
    const popover = $('occupancy-popover');
    const text = $('occupancy-text');
    const paintOccupancy = () => {
        text.textContent = `${plural(search.adults, 'adult')} · ${plural(search.children, 'child', 'children')} · ${plural(search.rooms, 'room')}`;
        $('adult-count').textContent = search.adults;
        $('child-count').textContent = search.children;
        $('room-count').textContent = search.rooms;
    };
    paintOccupancy();

    button.addEventListener('click', (e) => {
        if (e.target.closest('#occupancy-popover')) return;
        popover.classList.toggle('hidden');
    });
    document.addEventListener('click', (e) => {
        if (!button.contains(e.target)) popover.classList.add('hidden');
    });

    const bind = (id, key, delta, min, max) => $(id).addEventListener('click', (e) => {
        e.stopPropagation();
        search[key] = clamp(search[key] + delta, min, max);
        paintOccupancy();
    });
    bind('adult-minus', 'adults', -1, 1, 30);
    bind('adult-plus', 'adults', 1, 1, 30);
    bind('child-minus', 'children', -1, 0, 10);
    bind('child-plus', 'children', 1, 0, 10);
    bind('room-minus', 'rooms', -1, 1, 9);
    bind('room-plus', 'rooms', 1, 1, 9);
    $('occupancy-done-btn').addEventListener('click', (e) => { e.stopPropagation(); popover.classList.add('hidden'); });

    $('main-search-btn').addEventListener('click', () => onSearch(search));
}

const COUNTRIES = [
    ['LK', 'Sri Lanka'], ['AU', 'Australia'], ['CA', 'Canada'], ['CN', 'China'], ['FR', 'France'], ['DE', 'Germany'],
    ['IN', 'India'], ['IT', 'Italy'], ['JP', 'Japan'], ['MV', 'Maldives'], ['NL', 'Netherlands'], ['NZ', 'New Zealand'],
    ['PK', 'Pakistan'], ['RU', 'Russia'], ['SG', 'Singapore'], ['ZA', 'South Africa'], ['ES', 'Spain'], ['SE', 'Sweden'],
    ['CH', 'Switzerland'], ['AE', 'United Arab Emirates'], ['GB', 'United Kingdom'], ['US', 'United States']
];

const AUTH_CACHE_KEY = 'lodge.user';
let authUser = null;
try {
    const cached = JSON.parse(sessionStorage.getItem(AUTH_CACHE_KEY) || 'null');
    if (cached && cached.fullName) authUser = cached;
} catch (e) {  }

function safeNext(value) {
    return /^[A-Za-z0-9][A-Za-z0-9_-]*\.html(\?[^\s]*)?(#[^\s]*)?$/.test(value || '') ? value : 'index.html';
}

function currentPageUrl() {
    return (location.pathname.split('/').pop() || 'index.html') + location.search + location.hash;
}

function initialsOf(name) {
    const parts = String(name || '?').trim().split(/\s+/);
    return ((parts[0] || '?')[0] + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
}

function setAuthUser(user) {
    authUser = user || null;
    try {
        if (authUser) sessionStorage.setItem(AUTH_CACHE_KEY, JSON.stringify(authUser));
        else sessionStorage.removeItem(AUTH_CACHE_KEY);
    } catch (e) {  }
    renderAuthSlot();
    if (typeof onAuthChange === 'function') onAuthChange();
}

function renderAuthSlot() {
    const slot = document.getElementById('auth-slot');
    if (!slot) return;

    if (!authUser) {
        const next = /(^|\/)index\.html$|\/$/.test(location.pathname) && !location.search ? '' : '?next=' + encodeURIComponent(currentPageUrl());
        const btn = 'bg-white text-booking-blue hover:bg-gray-100 px-3.5 py-1.5 rounded text-xs sm:text-sm font-bold transition shadow-xs';
        slot.innerHTML = `<a href="register.html${next}" class="${btn}">Register</a><a href="login.html${next}" class="${btn}">Sign in</a>`;
        return;
    }

    const first = String(authUser.fullName).trim().split(/\s+/)[0];
    const item = 'flex items-center gap-2.5 px-3 py-2 text-sm text-gray-800 hover:bg-gray-50';
    slot.innerHTML = `
        <div class="relative">
            <button id="user-btn" type="button" aria-haspopup="true" class="flex items-center gap-2 hover:bg-white/10 pl-1 pr-2 py-1 rounded-full transition">
                <span class="w-8 h-8 rounded-full bg-booking-yellow text-booking-navy font-extrabold text-xs flex items-center justify-center">${esc(initialsOf(authUser.fullName))}</span>
                <span class="hidden sm:block max-w-[140px] truncate text-sm">${esc(first)}</span>
                <i class="fa-solid fa-chevron-down text-[9px] opacity-70"></i>
            </button>
            <div id="user-menu" class="hidden absolute right-0 top-full mt-1 w-64 bg-white text-gray-900 rounded-lg shadow-xl border border-gray-200 py-1 z-50">
                <div class="px-3 py-2.5 border-b border-gray-100">
                    <p class="font-bold text-sm truncate">${esc(authUser.fullName)}</p>
                    <p class="text-xs text-gray-500 truncate">${esc(authUser.email)}</p>
                </div>
                <a href="my-reservations.html" class="${item}"><i class="fa-solid fa-suitcase-rolling w-4 text-booking-blue"></i>My reservations</a>
                <a href="my-profile.html" class="${item}"><i class="fa-regular fa-user w-4 text-booking-blue"></i>My profile</a>
                ${authUser.role === 'admin' ? `<a href="admin.html" class="${item}"><i class="fa-solid fa-gauge w-4 text-booking-blue"></i>Admin panel</a>` : ''}
                <button type="button" id="logout-btn" class="${item} w-full text-left border-t border-gray-100 mt-1"><i class="fa-solid fa-right-from-bracket w-4 text-gray-500"></i>Log out</button>
            </div>
        </div>`;

    const menu = document.getElementById('user-menu');
    document.getElementById('user-btn').addEventListener('click', (e) => { e.stopPropagation(); menu.classList.toggle('hidden'); });
    document.getElementById('logout-btn').addEventListener('click', logout);
}

async function logout() {
    try { await fetch('api/auth/logout', { method: 'POST' }); } catch (e) {}
    setAuthUser(null);
    if (document.body.dataset.auth === 'required') { location.href = 'index.html'; return; }
    showToast('You have been signed out', 'info');
}

async function refreshAuth() {
    try {
        const response = await fetch('api/auth/me');
        const data = await response.json();
        setAuthUser(data && data.loggedIn ? data.user : null);
    } catch (e) { }
    return authUser;
}

async function authCall(method, url, body) {
    const response = await fetch(url, {
        method,
        headers: body === undefined ? { Accept: 'application/json' } : { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: body === undefined ? undefined : JSON.stringify(body)
    });
    let data = null;
    try { data = await response.json(); } catch (e) {}
    if (response.status === 401) {
        setAuthUser(null);
        location.href = 'login.html?next=' + encodeURIComponent(currentPageUrl());
        throw new Error('Please sign in to continue.');
    }
    if (!data || data.status !== true) throw new Error((data && data.message) || 'Something went wrong. Please try again.');
    return data;
}

document.addEventListener('click', (e) => {
    const menu = document.getElementById('user-menu');
    if (menu && !menu.contains(e.target)) menu.classList.add('hidden');
});
document.addEventListener('DOMContentLoaded', () => {
    renderAuthSlot();
    refreshAuth().then((user) => {
        if (!user && document.body.dataset.auth === 'required') location.href = 'login.html?next=' + encodeURIComponent(currentPageUrl());
    });
});
