let villaMapInstance = null;

function initVillaMap(lat, lng, name, address, elementId = 'villa-detail-map') {
    const el = document.getElementById(elementId);
    if (!el || typeof L === 'undefined' || !lat || !lng) return;

    if (villaMapInstance) villaMapInstance.remove();

    villaMapInstance = L.map(el).setView([lat, lng], 14);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap contributors'
    }).addTo(villaMapInstance);

    L.marker([lat, lng]).addTo(villaMapInstance)
        .bindPopup(`<b>${esc(name)}</b><br>${esc(address)}`)
        .openPopup();
}
