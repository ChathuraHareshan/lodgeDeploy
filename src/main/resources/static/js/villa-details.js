

let slug = '';
let detail = null;
let nights = 1;
let selected = {};
let lightboxIndex = 0;
let firstRender = true;

document.addEventListener('DOMContentLoaded', async () => {
    readSearchFromUrl();

    const params = new URLSearchParams(location.search);
    slug = params.get('slug') || params.get('id') || '';
    if (!slug) {
        showFatal('No villa selected.');
        return;
    }

    initSearchBar(() => {
        history.replaceState(null, '', `?slug=${encodeURIComponent(slug)}&${searchQuery()}`);
        loadVilla();
    });

    $('availability-table-body').addEventListener('change', (e) => {
        const select = e.target.closest('select[data-room]');
        if (!select) return;
        selected[select.dataset.room] = parseInt(select.value, 10) || 0;
        updateSummary();
    });

    $('sticky-reserve-btn').addEventListener('click', openBookingModal);

    document.querySelector('.share-btn')?.addEventListener('click', shareVilla);
    document.querySelector('.fav-btn')?.addEventListener('click', (e) => {
        const icon = e.currentTarget.querySelector('i');
        icon.classList.toggle('fa-regular');
        icon.classList.toggle('fa-solid');
        showToast(icon.classList.contains('fa-solid') ? 'Saved to your wishlist' : 'Removed from wishlist', 'info');
    });

    document.addEventListener('keydown', (e) => {
        if ($('gallery-lightbox-modal').classList.contains('hidden')) return;
        if (e.key === 'Escape') closeLightbox();
        if (e.key === 'ArrowLeft') prevLightboxImage();
        if (e.key === 'ArrowRight') nextLightboxImage();
    });

    await loadVilla();
});



async function loadVilla() {
    setRoomsLoading();
    try {
        const data = await apiGet(`villa/${encodeURIComponent(slug)}`, {
            checkIn: search.checkIn, checkOut: search.checkOut
        });
        if (!data.status) {
            showFatal(data.message || 'Villa not found.');
            return;
        }
        detail = data.detail;
        nights = data.nights;


        search.checkIn = data.checkIn;
        search.checkOut = data.checkOut;
        $('date-range-display').textContent = `${fmtDay(fromIso(search.checkIn))} — ${fmtDay(fromIso(search.checkOut))}`;

        if (firstRender) {
            renderStatic(detail);
            firstRender = false;
        }
        renderRooms();
        renderGeniusBanner();
    } catch (err) {
        console.error(err);
        showFatal('Could not load this villa. Is the server running and the database connected?');
    }
}

function showFatal(message) {
    document.querySelector('main').innerHTML = `
        <div class="max-w-xl mx-auto text-center py-24">
            <i class="fa-regular fa-face-frown text-4xl text-gray-400"></i>
            <h1 class="text-2xl font-extrabold mt-4">${esc(message)}</h1>
            <a href="index.html" class="inline-block mt-6 bg-booking-blue text-white font-bold text-sm py-2.5 px-6 rounded">Back to all villas</a>
        </div>`;
}


function renderStatic(d) {
    const v = d.villa;
    document.title = `${v.name} | Lodge - Luxury Villas Sri Lanka`;


    $('villa-breadcrumb').innerHTML = `
        <a href="index.html" class="text-booking-blue hover:underline">Home</a>
        <i class="fa-solid fa-chevron-right text-[9px] text-gray-400"></i>
        <span>Sri Lanka</span>
        <i class="fa-solid fa-chevron-right text-[9px] text-gray-400"></i>
        <span>${esc(v.regionName)}</span>
        <i class="fa-solid fa-chevron-right text-[9px] text-gray-400"></i>
        <span>${esc(v.city)}</span>
        <i class="fa-solid fa-chevron-right text-[9px] text-gray-400"></i>
        <span class="font-semibold text-gray-800">${esc(v.name)}</span>`;


    $('villa-stars').innerHTML = starsHtml(v.stars)
        + (v.hasThumbsUp ? '<span class="bg-booking-yellow text-booking-navy font-bold text-[10px] px-1.5 py-0.5 rounded ml-1"><i class="fa-solid fa-thumbs-up"></i></span>' : '');
    $('villa-title').textContent = v.name;
    $('villa-address').innerHTML = `
        <i class="fa-solid fa-location-dot text-booking-blue"></i>
        <span>${esc(d.address)}</span> –
        <a href="#map-section" class="text-booking-blue font-semibold hover:underline">${locationLabel(v.locationScore)} - show on map</a>`;

    $('nav-reviews-link').textContent = `Guest reviews (${v.reviewCount.toLocaleString('en-US')})`;

    renderGallery(d);
    renderReviewCard(d);


    $('villa-tagline').textContent = v.tagline;
    $('villa-overview').innerHTML = String(d.overview || '')
        .split(/\n{2,}/).filter(Boolean).map((p) => `<p>${esc(p)}</p>`).join('');


    $('villa-facilities-list').innerHTML = d.facilities.length
        ? d.facilities.map((f) => `
            <div class="flex items-center gap-2 text-xs text-gray-800">
                <i class="fa-solid ${esc(f.icon)} text-booking-green w-4 text-center"></i><span>${esc(f.name)}</span>
            </div>`).join('')
        : '<p class="text-xs text-booking-muted col-span-full">Facility details coming soon.</p>';

    renderHighlights(d);

    $('villa-nearby-locations-grid').innerHTML = d.nearby.length
        ? d.nearby.map((n) => `
            <div class="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-2xs hover:shadow-md transition">
                <img src="${esc(n.imageUrl)}" alt="${esc(n.name)}" loading="lazy" onerror="this.onerror=null;this.src=FALLBACK_IMG" class="w-full h-28 object-cover">
                <div class="p-3">
                    <h4 class="font-bold text-xs text-gray-900">${esc(n.name)}</h4>
                    <p class="text-[11px] text-booking-muted mt-0.5">${esc(n.locationType)}</p>
                    <p class="text-[11px] text-booking-blue font-semibold mt-1.5"><i class="fa-solid fa-person-walking mr-1"></i>${esc(n.distanceText)} away</p>
                </div>
            </div>`).join('')
        : '<p class="text-xs text-booking-muted col-span-full">No nearby attractions listed yet.</p>';

    renderReviews(d);
    initVillaMap(d.latitude, d.longitude, v.name, d.address);

    if (location.hash) document.querySelector(location.hash)?.scrollIntoView();
}


function renderGallery(d) {
    const imgs = d.images.length ? d.images : [{ url: d.villa.heroImage, caption: d.villa.name, hero: true }];
    const n = imgs.length;


    const layouts = {
        1: [[4, 2]],
        2: [[2, 2], [2, 2]],
        3: [[2, 2], [2, 1], [2, 1]],
        4: [[2, 2], [2, 1], [1, 1], [1, 1]]
    };
    const layout = layouts[Math.min(n, 5)] || [[2, 2], [1, 1], [1, 1], [1, 1], [1, 1]];
    const shown = Math.min(n, layout.length);
    const extra = Math.max(d.totalPhotos, n) - shown;

    $('villa-gallery-grid').innerHTML = imgs.slice(0, shown).map((img, i) => {
        const [cs, rs] = layout[i];
        const overlay = (i === shown - 1 && extra > 0)
            ? `<div class="absolute inset-0 bg-black/50 flex items-center justify-center text-white font-bold text-sm">+${extra} photos</div>` : '';
        return `
        <button type="button" onclick="openLightbox(${i})"
                class="relative overflow-hidden rounded-lg group ${i === 0 ? 'col-span-2' : ''} md:col-span-${cs} md:row-span-${rs} h-48 md:h-auto">
            <img src="${esc(img.url)}" alt="${esc(img.caption || d.villa.name)}" onerror="this.onerror=null;this.src=FALLBACK_IMG"
                 class="w-full h-full object-cover group-hover:scale-105 transition duration-500">
            ${overlay}
        </button>`;
    }).join('');
}

function renderReviewCard(d) {
    const v = d.villa;
    const top = d.reviews[0];
    $('villa-review-card').innerHTML = `
        <div class="flex items-start justify-between gap-3">
            <div>
                <div class="font-bold text-sm text-gray-900">${esc(v.reviewStatus)}</div>
                <div class="text-[11px] text-booking-muted">${v.reviewCount.toLocaleString('en-US')} reviews</div>
            </div>
            ${v.reviewCount > 0 ? scoreBadge(v.reviewScore, 'w-10 h-10 text-base') : ''}
        </div>
        ${top ? `<p class="mt-3 pt-3 border-t border-gray-100 text-[11px] text-gray-600 italic leading-relaxed line-clamp-3">"${esc(top.title)}"
                 <span class="not-italic text-gray-400">— ${esc(top.authorName)}, ${esc(top.authorCountry)}</span></p>` : ''}
        <div class="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between text-[11px]">
            <span class="text-gray-600">Location <b class="text-gray-900">${Number(v.locationScore).toFixed(1)}</b></span>
            <a href="#reviews" class="text-booking-blue font-semibold hover:underline">Read all reviews</a>
        </div>`;
}

function renderHighlights(d) {
    const v = d.villa;
    const items = d.highlights.length ? d.highlights : [{
        icon: 'fa-location-dot', title: `${locationLabel(v.locationScore)}`,
        description: `Location score ${Number(v.locationScore).toFixed(1)} · ${v.city}`, score: null
    }];

    $('villa-highlights-sidebar').innerHTML = `
        <div class="bg-blue-50 border border-blue-100 rounded-lg p-4 space-y-4">
            <h4 class="font-bold text-gray-900 text-sm">Property highlights</h4>
            ${items.map((h) => `
                <div class="flex items-start gap-3 text-xs">
                    <i class="fa-solid ${esc(h.icon)} text-booking-blue mt-0.5 w-4 text-center"></i>
                    <div class="flex-1">
                        <div class="font-bold text-gray-900">${esc(h.title)}</div>
                        ${h.description ? `<div class="text-gray-600 mt-0.5">${esc(h.description)}</div>` : ''}
                    </div>
                    ${h.score ? scoreBadge(h.score, 'w-7 h-7 text-xs') : ''}
                </div>`).join('')}
            <a href="#availability" class="block w-full text-center bg-booking-blue hover:bg-booking-blue-hover text-white font-bold py-2.5 rounded text-sm transition">Reserve</a>
        </div>`;
}

function renderReviews(d) {
    const summary = d.reviewSummary;
    const box = $('review-breakdown');
    if (!summary) {
        box.classList.add('hidden');
        box.innerHTML = '';
    } else {
        const bars = [['Cleanliness', summary.cleanliness], ['Comfort', summary.comfort], ['Location', summary.location],
            ['Facilities', summary.facilities], ['Staff', summary.staff], ['Value', summary.value]];
        box.innerHTML = bars.map(([label, score]) => `
            <div>
                <div class="flex justify-between font-bold text-gray-800 mb-1"><span>${label}</span><span>${score.toFixed(1)}</span></div>
                <div class="w-full bg-gray-200 rounded-full h-1.5"><div class="bg-booking-blue h-1.5 rounded-full" style="width:${Math.min(100, score * 10)}%"></div></div>
            </div>`).join('');
        box.classList.remove('hidden');
    }

    $('villa-reviews-container').innerHTML = d.reviews.length
        ? d.reviews.map((r) => `
            <div class="bg-white border border-gray-200 rounded-lg p-4 shadow-2xs flex flex-col gap-2">
                <div class="flex items-center justify-between">
                    <div class="flex items-center gap-2">
                        <span class="text-lg">${flagFor(r.authorCountry)}</span>
                        <div>
                            <div class="font-bold text-xs text-gray-900">${esc(r.authorName)}</div>
                            <div class="text-[11px] text-booking-muted">${esc(r.authorCountry)}</div>
                        </div>
                    </div>
                    ${scoreBadge(r.score, 'w-8 h-8 text-xs')}
                </div>
                <h5 class="font-bold text-xs text-gray-900">${esc(r.title)}</h5>
                <p class="text-xs text-gray-600 leading-relaxed">${esc(r.text)}</p>
                <span class="text-[10px] text-gray-400 mt-auto">${r.verified ? 'Verified stay' : 'Stay'} · ${esc(r.stayDate)}</span>
            </div>`).join('')
        : '<p class="text-xs text-booking-muted col-span-full">No written reviews yet. Be the first to stay and share your experience!</p>';
}


function setRoomsLoading() {
    $('availability-table-body').innerHTML =
        '<tr><td colspan="5" class="p-4"><div class="skeleton h-24 w-full"></div></td></tr>';
}

function renderRooms() {
    const rooms = detail.rooms;
    const guests = search.adults + search.children;


    selected = {};
    const rec = pickRecommended(rooms, guests);
    if (rec) selected[rec.id] = Math.min(search.rooms, rec.availableQuantity);

    renderRecommendedBanner(rec, guests);

    $('availability-table-body').innerHTML = rooms.length
        ? rooms.map(roomRow).join('')
        : '<tr><td colspan="5" class="p-6 text-center text-xs text-booking-muted">No rooms are listed for this villa yet.</td></tr>';

    updateSummary();
}


function onCurrencyChange() {
    if (!detail) return;
    const rooms = detail.rooms;
    renderRecommendedBanner(pickRecommended(rooms, search.adults + search.children), search.adults + search.children);
    if (rooms.length) $('availability-table-body').innerHTML = rooms.map(roomRow).join('');
    updateSummary();
    const form = $('booking-form-step');
    if (form && !form.classList.contains('hidden') && !$('easy-booking-modal').classList.contains('hidden')) openBookingModal();
}

function pickRecommended(rooms, guests) {
    const perRoom = Math.ceil(guests / search.rooms);
    const open = rooms.filter((r) => r.availableQuantity > 0);
    const fits = open.filter((r) => r.maxGuests >= perRoom)
        .sort((a, b) => a.discountPriceLkr - b.discountPriceLkr);
    return fits[0] || open[0] || null;
}

function renderRecommendedBanner(rec, guests) {
    const banner = $('recommended-room-banner');
    if (!rec) {
        banner.innerHTML = `
            <div class="bg-red-50 border border-red-200 rounded-lg p-4 text-xs text-booking-red font-semibold">
                <i class="fa-solid fa-circle-exclamation mr-1"></i>
                No rooms are available for ${fmtDay(fromIso(search.checkIn))} — ${fmtDay(fromIso(search.checkOut))}. Please try different dates.
            </div>`;
        return;
    }
    banner.innerHTML = `
        <div class="bg-blue-50 border border-blue-200 rounded-lg p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
                <div class="text-[10px] uppercase font-bold text-booking-blue tracking-wider">Recommended for your group</div>
                <div class="font-bold text-sm text-gray-900 mt-0.5">${plural(Math.min(search.rooms, rec.availableQuantity), 'room')} · ${esc(rec.name)}</div>
                <div class="text-[11px] text-booking-muted">${plural(search.adults, 'adult')}${search.children ? ' · ' + plural(search.children, 'child', 'children') : ''} · sleeps ${rec.maxGuests} per room</div>
            </div>
            <div class="text-left sm:text-right">
                <div class="text-lg font-extrabold text-gray-900">${money(rec.discountPriceLkr * nights)}</div>
                <div class="text-[11px] text-booking-muted">${plural(nights, 'night')} · per room</div>
            </div>
        </div>`;
}

function roomRow(r) {
    const soldOut = r.availableQuantity < 1;
    const maxOption = Math.min(r.availableQuantity, 9);
    const current = selected[r.id] || 0;
    const options = Array.from({ length: maxOption + 1 }, (_, i) => {
        const label = i === 0 ? '0' : `${i}  (${money(r.discountPriceLkr * i * nights)})`;
        return `<option value="${i}" ${i === current ? 'selected' : ''}>${label}</option>`;
    }).join('');

    return `
    <tr>
        <td class="py-3 px-3 w-64">
            <div class="font-bold text-booking-blue text-sm">${esc(r.name)}</div>
            ${r.badge ? `<span class="inline-block mt-1 bg-booking-green text-white text-[10px] font-bold px-1.5 py-0.5 rounded">${esc(r.badge)}</span>` : ''}
            <div class="mt-2 text-[11px] text-gray-700 space-y-1">
                <div><i class="fa-solid fa-bed text-gray-500 w-4"></i> ${esc(r.bedInfo)}</div>
                <div><i class="fa-solid fa-ruler-combined text-gray-500 w-4"></i> ${esc(r.sizeSqm)}</div>
            </div>
            <div class="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-gray-700">
                ${r.features.map((f) => `<span><i class="fa-solid fa-check text-booking-green mr-1"></i>${esc(f)}</span>`).join('')}
            </div>
            ${(!soldOut && r.availableQuantity <= 3) ? `<div class="mt-2 text-[11px] font-bold text-booking-red">Only ${r.availableQuantity} left on our site</div>` : ''}
        </td>
        <td class="py-3 px-2 text-center text-gray-700">
            <div class="text-xs">${'<i class="fa-solid fa-user"></i>'.repeat(Math.min(r.maxGuests, 5))}</div>
            <div class="text-[10px] text-booking-muted mt-1">Max ${r.maxGuests}</div>
        </td>
        <td class="py-3 px-3 w-44">
            ${r.discountPercent > 0 ? `<span class="bg-booking-red text-white text-[10px] font-bold px-1.5 py-0.5 rounded">-${r.discountPercent}%</span>` : ''}
            <div class="text-[11px] text-booking-red line-through font-semibold">${money(r.originalPriceLkr * nights)}</div>
            <div class="text-base font-extrabold text-gray-900">${money(r.discountPriceLkr * nights)}</div>
            <div class="text-[10px] text-booking-muted">+${money(r.taxesLkr * nights)} taxes and charges</div>
            <div class="text-[10px] text-booking-muted mt-0.5">${plural(nights, 'night')}</div>
        </td>
        <td class="py-3 px-3 text-[11px] text-gray-700 space-y-1.5 w-72">
            <div class="${r.breakfastIncluded ? 'text-booking-green font-semibold' : 'text-gray-600'}">
                <i class="fa-solid fa-mug-saucer mr-1"></i>${esc(r.breakfastDesc)}
            </div>
            <div><i class="fa-solid fa-ban text-gray-500 mr-1"></i>${esc(r.cancellationPolicy)}</div>
            <div class="text-booking-green font-semibold"><i class="fa-solid fa-check mr-1"></i>${esc(r.prepaymentPolicy)}</div>
            <div class="text-gray-500">${esc(r.perks)}</div>
        </td>
        <td class="py-3 px-2 text-center w-40">
            ${soldOut
                ? '<span class="text-[11px] font-bold text-booking-red">Sold out</span>'
                : `<select data-room="${r.id}" class="border border-gray-300 rounded px-2 py-1.5 text-xs font-semibold bg-white focus:ring-2 focus:ring-booking-blue outline-none max-w-[9.5rem]">${options}</select>`}
        </td>
    </tr>`;
}


function chosenRooms() {
    return detail.rooms
        .map((r) => ({ room: r, qty: selected[r.id] || 0 }))
        .filter((x) => x.qty > 0);
}

function totals() {
    let rooms = 0, total = 0, taxes = 0, strike = 0;
    chosenRooms().forEach(({ room, qty }) => {
        rooms += qty;
        total += room.discountPriceLkr * qty * nights;
        taxes += room.taxesLkr * qty * nights;
        strike += room.originalPriceLkr * qty * nights;
    });
    return { rooms, total, taxes, strike };
}

function updateSummary() {
    const t = totals();
    $('sticky-summary-text').textContent = t.rooms === 0
        ? 'No rooms selected'
        : `${plural(t.rooms, 'room')} for ${plural(nights, 'night')}`;
    $('sticky-strike-price').textContent = t.strike > t.total ? money(t.strike) : '';
    $('sticky-total-price').textContent = money(t.total);
    $('sticky-total-taxes').textContent = t.rooms === 0 ? 'Choose a room to see the price' : `+${money(t.taxes)} taxes and charges`;
}


function openBookingModal() {
    const picked = chosenRooms();
    if (picked.length === 0) {
        showToast('Please select at least one room first', 'error');
        $('availability').scrollIntoView({ behavior: 'smooth' });
        return;
    }
    const capacity = picked.reduce((sum, x) => sum + x.qty * x.room.maxGuests, 0);
    const guests = search.adults + search.children;
    if (guests > capacity) {
        showToast(`Selected rooms sleep ${capacity} guests at most. Add more rooms for ${guests} guests.`, 'error');
        return;
    }

    const t = totals();
    $('booking-modal-villa-name').textContent = detail.villa.name;
    $('booking-modal-dates').textContent = `${fmtDay(fromIso(search.checkIn))} — ${fmtDay(fromIso(search.checkOut))} (${plural(nights, 'night')})`;
    $('booking-modal-guests').textContent = `${plural(search.adults, 'Adult')}${search.children ? ' · ' + plural(search.children, 'Child', 'Children') : ''} · ${plural(t.rooms, 'Room')}`;
    $('booking-modal-room-summary').innerHTML = picked.map(({ room, qty }) => `
        <div class="flex justify-between"><span>${qty} × ${esc(room.name)}</span><span class="font-semibold">${money(room.discountPriceLkr * qty * nights)}</span></div>`).join('');
    $('booking-modal-total').textContent = money(t.total);
    $('booking-modal-taxes').textContent = `+${money(t.taxes)} taxes`;

    $('booking-form-step').classList.remove('hidden');
    $('booking-success-step').classList.add('hidden');
    prepareBookingForm();
    $('easy-booking-modal').classList.remove('hidden');
    refreshAuth();
}

function prepareBookingForm() {
    const member = authUser;
    $('member-box').classList.toggle('hidden', !member);
    $('guest-fields').classList.toggle('hidden', !!member);
    ['guest-name', 'guest-email', 'guest-password'].forEach((id) => { $(id).disabled = !!member; });
    $('booking-account-exists').classList.add('hidden');

    if (member) {
        $('member-initials').textContent = initialsOf(member.fullName);
        $('member-name').textContent = member.fullName;
        $('member-email').textContent = member.email;
        $('member-phone-wrap').classList.toggle('hidden', !!member.phone);
    } else {
        const next = encodeURIComponent(currentPageUrl());
        $('booking-signin-link').href = 'login.html?next=' + next;
        $('booking-exists-link').href = 'login.html?next=' + next;
    }
}

function onAuthChange() {
    const modal = $('easy-booking-modal');
    if (modal && !modal.classList.contains('hidden') && !$('booking-form-step').classList.contains('hidden')) prepareBookingForm();
    renderGeniusBanner();
}


const GENIUS_LEVEL_PERK = { 1: '10% discount', 2: '15% discount and free breakfast', 3: '20% discount' };

function renderGeniusBanner() {
    const banner = $('genius-banner');
    const text = $('genius-banner-text');
    if (!banner || !detail) return;

    if (!authUser) {
        text.innerHTML = `<span class="font-bold text-booking-navy">Check for Genius discounts:</span> <a href="login.html?next=${encodeURIComponent(currentPageUrl())}" class="text-booking-blue font-semibold hover:underline">Sign in</a> to see if deals at this property are available for your booked dates.`;
        banner.classList.remove('hidden');
        return;
    }
    if (!detail.villa.geniusEligible) {
        banner.classList.add('hidden');
        return;
    }
    const perk = GENIUS_LEVEL_PERK[authUser.geniusLevel] || GENIUS_LEVEL_PERK[1];
    text.innerHTML = `<span class="font-bold text-booking-navy">You're a Genius member:</span> this property gives you a ${esc(perk)} on this stay.`;
    banner.classList.remove('hidden');
}

function closeBookingModal() {
    $('easy-booking-modal').classList.add('hidden');
}

function resetBookingModal() {
    closeBookingModal();
    ['guest-name', 'guest-email', 'guest-phone', 'guest-password', 'member-phone', 'guest-requests'].forEach((id) => { $(id).value = ''; });
    $('booking-form-step').classList.remove('hidden');
    $('booking-success-step').classList.add('hidden');
}

async function submitEasyReservation(event) {
    event.preventDefault();
    const button = event.target.querySelector('button[type="submit"]');
    const label = button.textContent;
    button.disabled = true;
    button.textContent = 'Confirming...';

    try {
        const payload = {
            villaSlug: detail.villa.slug,
            checkIn: search.checkIn,
            checkOut: search.checkOut,
            adults: search.adults,
            children: search.children,
            specialRequests: $('guest-requests').value.trim(),
            rooms: chosenRooms().map(({ room, qty }) => ({ roomTypeId: room.id, quantity: qty })),
            paymentMethod: document.querySelector('input[name="payment-choice"]:checked')?.value || 'PayAtVilla'
        };
        if (authUser) {
            payload.guestPhone = $('member-phone').value.trim();
        } else {
            payload.leadGuestName = $('guest-name').value.trim();
            payload.guestEmail = $('guest-email').value.trim();
            payload.guestPhone = $('guest-phone').value.trim();
            payload.password = $('guest-password').value;
        }
        const data = await apiPost('booking', payload);

        if (data.status) {
            if (payload.paymentMethod === 'PayNow') {
                const details = data.paymentDetails;
                if (!details) throw new Error('PayHere checkout details were not returned.');
                const form = document.createElement('form');
                form.method = 'post';
                form.action = details.sandbox ? 'https://sandbox.payhere.lk/pay/checkout' : 'https://www.payhere.lk/pay/checkout';
                Object.entries(details).forEach(([key, value]) => {
                    if (key === 'sandbox') return;
                    const input = document.createElement('input'); input.type = 'hidden'; input.name = key; input.value = String(value ?? ''); form.appendChild(input);
                });
                document.body.appendChild(form);
                form.submit();
                return;
            }
            $('booking-reference-id').textContent = data.reference;
            $('confirmed-guest-name').textContent = data.guestName;
            $('confirmed-cancellation').textContent = data.cancellation || '-';
            $('booking-account-note').classList.toggle('hidden', !data.accountCreated);
            $('booking-form-step').classList.add('hidden');
            $('booking-success-step').classList.remove('hidden');

            const t = totals();
            window.lastBookingInvoice = {
                reference: data.reference,
                guestName: data.guestName,
                guestEmail: authUser ? authUser.email : $('guest-email').value.trim(),
                guestPhone: authUser ? ($('member-phone').value.trim() || authUser.phone || authUser.phoneNumber || '') : $('guest-phone').value.trim(),
                villaName: detail.villa.name,
                city: detail.villa.city,
                checkIn: search.checkIn,
                checkOut: search.checkOut,
                nights,
                adults: search.adults,
                children: search.children,
                rooms: chosenRooms().map(({ room, qty }) => ({ name: room.name, quantity: qty, price: room.discountPriceLkr })),
                total: t.total,
                taxes: t.taxes,
                paymentMethod: 'Pay at Villa',
                paymentStatus: 'PayAtProperty',
                bookingStatus: 'Confirmed',
                specialRequests: $('guest-requests').value.trim()
            };

            if (data.accountCreated) refreshAuth();
            loadVilla();
        } else {
            showToast(data.message || 'Reservation failed', 'error');
            $('booking-account-exists').classList.toggle('hidden', !data.accountExists);
            if (/sold out|left for|not available/i.test(data.message || '')) loadVilla();
        }
    } catch (err) {
        console.error(err);
        showToast('Something went wrong. Please try again.', 'error');
    } finally {
        button.disabled = false;
        button.textContent = label;
    }
}


function galleryImages() {
    return detail.images.length ? detail.images : [{ url: detail.villa.heroImage, caption: detail.villa.name }];
}

function openLightbox(index) {
    lightboxIndex = index;
    $('lightbox-thumbnails').innerHTML = galleryImages().map((img, i) => `
        <button type="button" onclick="showLightboxImage(${i})" data-thumb="${i}" class="shrink-0 rounded overflow-hidden border-2 border-transparent">
            <img src="${esc(img.url)}" alt="" onerror="this.onerror=null;this.src=FALLBACK_IMG" class="h-14 w-20 object-cover">
        </button>`).join('');
    showLightboxImage(index);
    $('gallery-lightbox-modal').classList.remove('hidden');
}

function showLightboxImage(index) {
    const imgs = galleryImages();
    lightboxIndex = (index + imgs.length) % imgs.length;
    const img = imgs[lightboxIndex];
    $('lightbox-main-img').src = img.url;
    $('lightbox-main-img').alt = img.caption || detail.villa.name;
    $('lightbox-counter').textContent = `${lightboxIndex + 1} / ${imgs.length}${img.caption ? ' · ' + img.caption : ''}`;
    document.querySelectorAll('#lightbox-thumbnails [data-thumb]').forEach((b) => {
        const active = Number(b.dataset.thumb) === lightboxIndex;
        b.classList.toggle('border-booking-yellow', active);
        b.classList.toggle('border-transparent', !active);
    });
}

function closeLightbox() { $('gallery-lightbox-modal').classList.add('hidden'); }
function prevLightboxImage() { showLightboxImage(lightboxIndex - 1); }
function nextLightboxImage() { showLightboxImage(lightboxIndex + 1); }



async function shareVilla() {
    const url = location.href;
    try {
        if (navigator.share) {
            await navigator.share({ title: detail?.villa.name || 'Lodge villa', url });
        } else {
            await navigator.clipboard.writeText(url);
            showToast('Link copied to clipboard', 'success');
        }
    } catch (_) {}
}
