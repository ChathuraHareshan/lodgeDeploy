

const filters = { region: '', city: '' };
let regionsCache = [];
let villasCache = [];

document.addEventListener('DOMContentLoaded', async () => {
    readSearchFromUrl();

    initSearchBar(() => {
        filters.city = $('destination-select').value;
        filters.region = '';
        syncRegionPills();
        loadVillas();
        $('featured-villas-section').scrollIntoView({ behavior: 'smooth' });
    });

    $('destination-clear-btn').addEventListener('click', () => {
        $('destination-select').value = '';
        filters.city = '';
        loadVillas();
    });

    $('destination-select').addEventListener('change', (e) => {
        filters.city = e.target.value;
        filters.region = '';
        syncRegionPills();
    });

    $('region-filter-pills').addEventListener('click', (e) => {
        const pill = e.target.closest('.region-filter-pill');
        if (pill) applyRegion(pill.dataset.region);
    });

    $('trending-destinations-grid').addEventListener('click', (e) => {
        const tile = e.target.closest('[data-region]');
        if (!tile) return;
        applyRegion(tile.dataset.region);
        $('featured-villas-section').scrollIntoView({ behavior: 'smooth' });
    });

    showVillaSkeletons();
    await Promise.allSettled([loadRegions(), loadDestinations(), loadOffers(), loadReviews(), loadVillas()]);
});


async function loadRegions() {
    try {
        const data = await apiGet('region/all');
        if (!data.status) throw new Error(data.message);
        regionsCache = data.regions;
        renderRegionTiles(data.regions);
        renderRegionPills(data.regions);
    } catch (err) {
        console.error(err);
        $('trending-destinations-grid').innerHTML = errorBox('Could not load destinations.');
    }
}

function renderRegionTiles(regions) {
    $('trending-destinations-grid').innerHTML = regions.map((r) => `
        <button type="button" data-region="${esc(r.slug)}"
                class="group text-left bg-white border border-gray-200 rounded-lg overflow-hidden shadow-2xs hover:shadow-md transition">
            <div class="h-32 overflow-hidden">
                <img src="${esc(r.heroImage)}" alt="${esc(r.name)}" loading="lazy"
                     onerror="this.onerror=null;this.src=FALLBACK_IMG"
                     class="w-full h-full object-cover group-hover:scale-105 transition duration-500">
            </div>
            <div class="p-3">
                <h3 class="font-bold text-sm text-gray-900">${esc(r.name)}</h3>
                <p class="text-[11px] text-booking-muted mt-0.5 line-clamp-2">${esc(r.subtitle)}</p>
                <p class="text-[11px] text-booking-blue font-semibold mt-1.5">${esc(r.villaCountDesc)}</p>
            </div>
        </button>`).join('');
}

function renderRegionPills(regions) {
    const pill = (slug, label) => `
        <button type="button" data-region="${esc(slug)}"
                class="region-filter-pill px-3 py-1.5 rounded-full text-xs font-bold transition shrink-0">${esc(label)}</button>`;
    $('region-filter-pills').innerHTML = pill('', 'All Regions') + regions.map((r) => pill(r.slug, r.name)).join('');
    syncRegionPills();
}

function syncRegionPills() {
    document.querySelectorAll('.region-filter-pill').forEach((p) => {
        const active = p.dataset.region === filters.region;
        p.classList.toggle('bg-booking-blue', active);
        p.classList.toggle('text-white', active);
        p.classList.toggle('bg-gray-100', !active);
        p.classList.toggle('text-gray-700', !active);
        p.classList.toggle('hover:bg-gray-200', !active);
    });
}

function applyRegion(slug) {
    filters.region = slug;
    filters.city = '';
    $('destination-select').value = '';
    syncRegionPills();
    loadVillas();
}


async function loadDestinations() {
    try {
        const data = await apiGet('villa/destinations');
        if (!data.status) throw new Error(data.message);
        const select = $('destination-select');
        select.innerHTML = '<option value="">All Sri Lanka Regions</option>' + data.destinations.map((d) =>
            `<option value="${esc(d.city)}">${esc(d.city)} (${esc(d.regionName)})</option>`).join('');
    } catch (err) {
        console.error(err);
    }
}

function filterVillasByDestination(city) {
    filters.city = city || '';
    filters.region = '';
    const select = $('destination-select');
    if (select) select.value = [...select.options].some((o) => o.value === filters.city) ? filters.city : '';
    syncRegionPills();
    loadVillas();
    $('featured-villas-section').scrollIntoView({ behavior: 'smooth' });
}


async function loadOffers() {
    const grid = $('offers-grid');
    try {
        const data = await apiGet('offer/active');
        if (!data.status) throw new Error(data.message);
        if (data.offers.length === 0) {
            grid.innerHTML = '<p class="text-sm text-booking-muted">No offers right now. Check back soon!</p>';
            return;
        }
        grid.innerHTML = data.offers.map((o) => {
            const isGenius = /genius/i.test(o.badge);
            const action = isGenius
                ? '<a href="login.html" class="inline-block bg-booking-blue hover:bg-booking-blue-hover text-white text-xs font-bold py-2 px-4 rounded transition">Sign in to save</a>'
                : `<button type="button" onclick="filterVillasByDestination('')" class="bg-booking-blue hover:bg-booking-blue-hover text-white text-xs font-bold py-2 px-4 rounded transition">Search deals</button>`;
            return `
            <div class="bg-white border border-gray-200 rounded-lg p-5 shadow-2xs flex flex-col justify-between hover:shadow-md transition group">
                <div class="flex items-start justify-between gap-4">
                    <div class="space-y-1.5 flex-1">
                        <span class="text-xs font-bold ${isGenius ? 'text-booking-navy' : 'text-gray-600'} block uppercase tracking-wider">${esc(o.badge)}</span>
                        <h3 class="text-lg font-bold text-gray-900 group-hover:text-booking-blue transition">${esc(o.title)}</h3>
                        <p class="text-xs text-gray-600 leading-relaxed">${esc(o.description)}</p>
                    </div>
                    <img src="${esc(o.imageUrl)}" alt="${esc(o.badge)}" loading="lazy" onerror="this.onerror=null;this.src=FALLBACK_IMG"
                         class="w-24 h-24 sm:w-28 sm:h-28 rounded-md object-cover shrink-0 shadow-2xs">
                </div>
                <div class="mt-4">${action}</div>
            </div>`;
        }).join('');
    } catch (err) {
        console.error(err);
        grid.innerHTML = errorBox('Could not load offers.');
    }
}


function showVillaSkeletons() {
    $('featured-villas-grid').innerHTML = [1, 2, 3].map(() => '<div class="skeleton h-52 w-full"></div>').join('');
}

async function loadVillas() {
    const grid = $('featured-villas-grid');
    showVillaSkeletons();
    try {
        const data = await apiGet('villa/all', { region: filters.region, city: filters.city });
        if (!data.status) throw new Error(data.message);

        if (data.villas.length === 0) {
            grid.innerHTML = `
                <div class="bg-white border border-gray-200 rounded-lg p-8 text-center">
                    <i class="fa-regular fa-face-frown text-3xl text-gray-400"></i>
                    <p class="mt-3 font-bold text-gray-800">No villas found for this selection</p>
                    <p class="text-xs text-booking-muted mt-1">Try another destination or clear the filters.</p>
                    <button type="button" onclick="filterVillasByDestination('')" class="mt-4 bg-booking-blue text-white text-xs font-bold py-2 px-4 rounded">Show all villas</button>
                </div>`;
            return;
        }
        villasCache = data.villas;
        drawVillas();
    } catch (err) {
        console.error(err);
        grid.innerHTML = errorBox('Could not load villas. Is the server running and the database connected?');
    }
}

function drawVillas() {
    $('featured-villas-grid').innerHTML = `<div class="text-sm font-bold text-gray-700">${plural(villasCache.length, 'property', 'properties')} found</div>`
        + villasCache.map(villaCard).join('');
}

function onCurrencyChange() {
    if (villasCache.length) drawVillas();
}

function villaCard(v) {
    const link = `villa-details.html?slug=${encodeURIComponent(v.slug)}&${searchQuery()}`;
    return `
    <article class="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-2xs hover:shadow-md transition flex flex-col md:flex-row">
        <a href="${link}" class="md:w-72 h-52 md:h-auto shrink-0 overflow-hidden block">
            <img src="${esc(v.heroImage)}" alt="${esc(v.name)}" loading="lazy" onerror="this.onerror=null;this.src=FALLBACK_IMG"
                 class="w-full h-full object-cover hover:scale-105 transition duration-500">
        </a>

        <div class="flex-1 p-4 flex flex-col gap-2 min-w-0">
            <div class="flex items-center gap-2 text-booking-yellow text-xs">
                ${starsHtml(v.stars)}
                ${v.hasThumbsUp ? '<span class="bg-booking-yellow text-booking-navy text-[10px] px-1.5 py-0.5 rounded ml-1"><i class="fa-solid fa-thumbs-up"></i></span>' : ''}
                <span class="text-[11px] text-booking-muted font-semibold ml-1">${esc(v.propertyType)}</span>
            </div>
            <a href="${link}" class="text-lg font-extrabold text-booking-blue hover:underline leading-snug">${esc(v.name)}</a>
            <p class="text-xs text-gray-600 flex items-center gap-1.5 flex-wrap">
                <i class="fa-solid fa-location-dot text-booking-blue"></i>
                <span class="font-semibold">${esc(v.city)}</span>
                <span class="text-gray-400">·</span>
                <span>${esc(v.regionName)}</span>
                <span class="text-gray-400">·</span>
                <span class="text-booking-blue font-semibold">${locationLabel(v.locationScore)} ${Number(v.locationScore).toFixed(1)}</span>
            </p>
            <p class="text-xs text-gray-700 leading-relaxed line-clamp-2">${esc(v.tagline)}</p>
            <div class="flex flex-wrap gap-1.5 mt-auto pt-1">
                ${v.dealType ? `<span class="bg-booking-green text-white text-[10px] font-bold px-2 py-0.5 rounded">${esc(v.dealType)}</span>` : ''}
                ${v.geniusEligible ? '<span class="bg-booking-navy text-white text-[10px] font-bold px-2 py-0.5 rounded">Genius</span>' : ''}
                <span class="text-[11px] text-booking-green font-semibold flex items-center gap-1"><i class="fa-solid fa-check"></i> No prepayment needed</span>
            </div>
        </div>

        <div class="md:w-56 shrink-0 p-4 border-t md:border-t-0 md:border-l border-gray-100 flex md:flex-col justify-between items-end md:items-stretch gap-3">
            <div class="flex items-center gap-2 md:justify-end">
                <div class="text-right">
                    <div class="text-xs font-bold text-gray-900">${esc(v.reviewStatus)}</div>
                    <div class="text-[11px] text-booking-muted">${v.reviewCount.toLocaleString('en-US')} reviews</div>
                </div>
                ${v.reviewCount > 0 ? scoreBadge(v.reviewScore, 'w-9 h-9 text-sm') : ''}
            </div>
            <div class="text-right">
                ${v.discountPercent > 0 ? `<span class="bg-booking-red text-white text-[10px] font-bold px-1.5 py-0.5 rounded">-${v.discountPercent}%</span>` : ''}
                <div class="text-xs text-booking-red line-through font-semibold">${money(v.basePriceLkr)}</div>
                <div class="text-xl font-extrabold text-gray-900">${money(v.discountPriceLkr)}</div>
                <div class="text-[11px] text-booking-muted">per night · +${money(v.taxesLkr)} taxes and charges</div>
                <a href="${link}" class="mt-2 inline-block w-full text-center bg-booking-blue hover:bg-booking-blue-hover text-white text-xs font-bold py-2 px-4 rounded transition">See availability</a>
            </div>
        </div>
    </article>`;
}



async function loadReviews() {
    const grid = $('home-reviews-grid');
    try {
        const data = await apiGet('review/latest', { limit: 3 });
        if (!data.status) throw new Error(data.message);
        if (data.reviews.length === 0) {
            grid.innerHTML = '<p class="text-sm text-booking-muted">No reviews yet.</p>';
            return;
        }
        grid.innerHTML = data.reviews.map((r) => `
        <div class="bg-white border border-gray-200 rounded-lg p-4 shadow-2xs flex flex-col justify-between">
            <div>
                <div class="flex items-center justify-between">
                    <div class="flex items-center gap-2">
                        <span class="text-lg">${flagFor(r.authorCountry)}</span>
                        <div>
                            <h4 class="font-bold text-gray-900 text-xs">${esc(r.authorName)} · ${esc(r.authorCountry)}</h4>
                            <a href="villa-details.html?slug=${encodeURIComponent(r.villaSlug)}&${searchQuery()}#reviews"
                               class="text-[11px] text-booking-blue font-semibold hover:underline">Stayed at ${esc(r.villaName)}</a>
                        </div>
                    </div>
                    ${scoreBadge(r.score, 'w-7 h-7 text-xs')}
                </div>
                <p class="text-xs text-gray-600 mt-3 italic leading-relaxed line-clamp-4">"${esc(r.text)}"</p>
            </div>
            <span class="text-[10px] text-gray-400 mt-3">${r.verified ? 'Verified stay' : 'Stay'} · ${esc(r.stayDate)}</span>
        </div>`).join('');
    } catch (err) {
        console.error(err);
        grid.innerHTML = errorBox('Could not load reviews.');
    }
}

function errorBox(message) {
    return `<div class="col-span-full bg-red-50 border border-red-200 text-booking-red text-xs font-semibold rounded-lg p-4">
        <i class="fa-solid fa-triangle-exclamation mr-1"></i>${esc(message)}</div>`;
}
