package lk.karu.lodge.service.admin;

import lk.karu.lodge.dto.admin.AdminVillaDTO;
import lk.karu.lodge.dto.admin.AdminVillaRequest;
import lk.karu.lodge.dto.admin.AdminVillaRow;
import lk.karu.lodge.entity.Facility;
import lk.karu.lodge.entity.NearbyLocation;
import lk.karu.lodge.entity.PropertyHighlight;
import lk.karu.lodge.entity.Region;
import lk.karu.lodge.entity.Villa;
import lk.karu.lodge.entity.VillaImage;
import lk.karu.lodge.util.AppUtil;
import org.hibernate.Session;

import java.math.BigDecimal;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

import static lk.karu.lodge.service.admin.AdminSupport.*;

public class AdminVillaService {

    public static final Set<String> STATUSES = Set.of("Published", "Pending review", "Paused");
    private static final DateTimeFormatter DAY = DateTimeFormatter.ofPattern("yyyy-MM-dd");

    public String loadAll() {
        return read("Failed to load villas.", (session, out) -> {
            Map<Integer, Long> rooms = new HashMap<>();
            for (Object[] r : session.createQuery("SELECT rt.villa.id, COUNT(rt) FROM RoomType rt GROUP BY rt.villa.id", Object[].class).getResultList()) {
                rooms.put(((Number) r[0]).intValue(), ((Number) r[1]).longValue());
            }
            Map<Integer, Long> facilities = new HashMap<>();
            for (Object[] r : session.createQuery("SELECT v.id, COUNT(f) FROM Villa v JOIN v.facilities f GROUP BY v.id", Object[].class).getResultList()) {
                facilities.put(((Number) r[0]).intValue(), ((Number) r[1]).longValue());
            }

            List<AdminVillaRow> rows = session.createQuery("SELECT v FROM Villa v JOIN FETCH v.region ORDER BY v.id DESC", Villa.class)
                    .getResultList().stream()
                    .map(v -> new AdminVillaRow(v.getId(), v.getSlug(), v.getName(), v.getPropertyType(), AppUtil.nz(v.getStars()),
                            v.getCity(), v.getRegion().getId(), v.getRegion().getName(), v.getHeroImage(), v.getReviewScore(),
                            AppUtil.nz(v.getReviewCount()), status(v), v.getUpdatedAt() == null ? "" : v.getUpdatedAt().format(DAY),
                            rooms.getOrDefault(v.getId(), 0L).intValue(), facilities.getOrDefault(v.getId(), 0L).intValue(),
                            v.getDiscountPriceLkr()))
                    .toList();
            out.add("villas", AppUtil.GSON.toJsonTree(rows));
        });
    }

    public String loadOne(int id) {
        return read("Failed to load villa.", (session, out) -> {
            Villa v = session.find(Villa.class, id);
            require(v != null, "Villa not found.");
            out.add("villa", AppUtil.GSON.toJsonTree(toDTO(v)));
        });
    }

    public String create(AdminVillaRequest req) {
        return write("Failed to save the villa.", (session, out) -> {
            Villa v = new Villa();
            apply(session, v, req, true);
            session.persist(v);
            session.flush();
            out.add("villa", AppUtil.GSON.toJsonTree(toDTO(v)));
        });
    }

    public String update(int id, AdminVillaRequest req) {
        return write("Failed to save the villa.", (session, out) -> {
            Villa v = session.find(Villa.class, id);
            require(v != null, "Villa not found.");
            apply(session, v, req, false);
            session.flush();
            out.add("villa", AppUtil.GSON.toJsonTree(toDTO(v)));
        });
    }

    public String setStatus(int id, String status) {
        return write("Failed to change the villa status.", (session, out) -> {
            require(status != null && STATUSES.contains(status), "Invalid status.");
            Villa v = session.find(Villa.class, id);
            require(v != null, "Villa not found.");
            v.setStatus(status);
        });
    }

    public String delete(int id) {
        return write("Failed to delete the villa.", (session, out) -> {
            Villa v = session.find(Villa.class, id);
            require(v != null, "Villa not found.");
            Long bookings = session.createQuery("SELECT COUNT(b) FROM Booking b WHERE b.villa.id = :id", Long.class)
                    .setParameter("id", id).getSingleResult();
            require(bookings == 0, "This villa has " + bookings + " booking(s) on record, so it can't be deleted. Set it to Paused instead.");
            session.remove(v);
        });
    }

    private static void apply(Session session, Villa v, AdminVillaRequest r, boolean isNew) {
        require(r != null, "Invalid request.");

        String name = trim(r.name);
        require(!name.isEmpty(), "Enter the villa name.");
        maxLen(name, 200, "Villa name");
        String slug = trim(r.slug).isEmpty() ? slugify(name) : trim(r.slug);
        require(validSlug(slug), "URL slug may only contain lowercase letters, numbers and hyphens.");
        maxLen(slug, 100, "URL slug");
        Long slugUsed = session.createQuery("SELECT COUNT(x) FROM Villa x WHERE x.slug = :s AND x.id <> :id", Long.class)
                .setParameter("s", slug).setParameter("id", v.getId()).getSingleResult();
        require(slugUsed == 0, "Another villa already uses the URL slug \"" + slug + "\".");

        String city = trim(r.city);
        String address = trim(r.address);
        String tagline = trim(r.tagline);
        String overview = trim(r.overview);
        require(!city.isEmpty(), "Enter the city.");
        require(!address.isEmpty(), "Enter the address.");
        require(!tagline.isEmpty(), "Enter a tagline.");
        require(!overview.isEmpty(), "Write a short overview.");
        maxLen(city, 100, "City");
        maxLen(address, 255, "Address");
        maxLen(tagline, 255, "Tagline");

        String propertyType = trim(r.propertyType).isEmpty() ? "Resort Villa" : trim(r.propertyType);
        maxLen(propertyType, 80, "Property type");
        int stars = r.stars == null ? 5 : r.stars;
        require(stars >= 1 && stars <= 5, "Star rating must be between 1 and 5.");

        require(r.regionId != null, "Choose a region.");
        Region region = session.find(Region.class, r.regionId);
        require(region != null, "The selected region doesn't exist.");

        require(r.latitude != null && r.latitude >= -90 && r.latitude <= 90, "Enter a valid latitude (-90 to 90).");
        require(r.longitude != null && r.longitude >= -180 && r.longitude <= 180, "Enter a valid longitude (-180 to 180).");

        BigDecimal locationScore = r.locationScore == null ? new BigDecimal("8.0") : r.locationScore;
        require(locationScore.signum() >= 0 && locationScore.compareTo(BigDecimal.TEN) <= 0, "Location score must be between 0 and 10.");

        require(r.basePrice != null && r.basePrice.signum() > 0, "Enter the original price.");
        require(r.discountPrice != null && r.discountPrice.signum() > 0, "Enter the sale price.");
        require(r.discountPrice.compareTo(r.basePrice) <= 0, "Sale price can't be higher than the original price.");
        require(r.taxes != null && r.taxes.signum() >= 0, "Enter the taxes (0 if none).");
        String dealType = trim(r.dealType);
        maxLen(dealType, 80, "Deal badge");
        String status = trim(r.status).isEmpty() ? "Published" : trim(r.status);
        require(STATUSES.contains(status), "Invalid listing status.");

        Set<Integer> facilityIds = new LinkedHashSet<>();
        if (r.facilityIds != null) for (Integer fid : r.facilityIds) if (fid != null) facilityIds.add(fid);
        List<Facility> facilities = new ArrayList<>();
        if (!facilityIds.isEmpty()) {
            facilities = session.createQuery("FROM Facility f WHERE f.id IN (:ids) ORDER BY f.id", Facility.class)
                    .setParameterList("ids", facilityIds).getResultList();
            require(facilities.size() == facilityIds.size(), "One of the selected facilities no longer exists. Reload and try again.");
        }

        List<AdminVillaRequest.Image> images = r.images == null ? List.of() : r.images;
        require(!images.isEmpty(), "Add at least one photo.");
        int heroIndex = -1;
        for (int i = 0; i < images.size(); i++) {
            AdminVillaRequest.Image im = images.get(i);
            require(im != null && validUrl(im.url), "Photo links must start with http:// or https://");
            require(im.url.trim().length() <= 255, "A photo link is too long (max 255 characters).");
            maxLen(im.caption, 150, "Photo caption");
            if (Boolean.TRUE.equals(im.hero) && heroIndex < 0) heroIndex = i;
        }
        if (heroIndex < 0) heroIndex = 0;

        List<AdminVillaRequest.Highlight> highlights = r.highlights == null ? List.of() : r.highlights;
        require(highlights.size() <= 10, "You can add up to 10 highlights.");
        for (AdminVillaRequest.Highlight h : highlights) {
            require(h != null && !trim(h.title).isEmpty(), "Every highlight needs a title.");
            maxLen(h.title, 150, "Highlight title");
            maxLen(h.description, 255, "Highlight description");
            String sc = trim(h.score);
            if (!sc.isEmpty()) {
                try {
                    double d = Double.parseDouble(sc);
                    require(d >= 0 && d <= 10, "Highlight score must be a number from 0 to 10.");
                } catch (NumberFormatException e) {
                    throw new AdminException("Highlight score must be a number from 0 to 10.");
                }
                require(sc.length() <= 10, "Highlight score is too long.");
            }
        }

        List<AdminVillaRequest.Nearby> nearby = r.nearby == null ? List.of() : r.nearby;
        for (AdminVillaRequest.Nearby n : nearby) {
            require(n != null && !trim(n.name).isEmpty(), "Every nearby place needs a name.");
            if (n.distanceKm == null) n.distanceKm = parseKm(n.distanceText);
            require(!trim(n.distanceText).isEmpty() && n.distanceKm != null && n.distanceKm.signum() > 0,
                    "Every nearby place needs a distance like \"2.1 km\".");
            require(n.distanceKm.compareTo(new BigDecimal("999.99")) <= 0, "A nearby distance is too large.");
            maxLen(n.name, 150, "Nearby place name");
            maxLen(n.distanceText, 50, "Nearby distance");
            maxLen(n.locationType, 100, "Nearby place type");
            maxLen(n.imageUrl, 255, "Nearby image link");
            require(trim(n.imageUrl).isEmpty() || validUrl(n.imageUrl), "Nearby image links must start with http:// or https://");
        }

        v.setName(name);
        v.setSlug(slug);
        v.setPropertyType(propertyType);
        v.setStars(stars);
        v.setHasThumbsUp(r.hasThumbsUp == null || r.hasThumbsUp);
        v.setTagline(tagline);
        v.setOverview(overview);
        v.setAddress(address);
        v.setCity(city);
        v.setRegion(region);
        v.setLatitude(r.latitude);
        v.setLongitude(r.longitude);
        v.setLocationScore(locationScore);
        v.setBasePriceLkr(r.basePrice);
        v.setDiscountPriceLkr(r.discountPrice);
        v.setTaxesLkr(r.taxes);
        v.setDiscountPercent(discountPercent(r.basePrice, r.discountPrice));
        v.setDealType(dealType.isEmpty() ? null : dealType);
        v.setGeniusEligible(r.geniusEligible == null || r.geniusEligible);
        v.setFeatured(r.featured != null && r.featured);
        v.setStatus(status);
        v.setHeroImage(images.get(heroIndex).url.trim());

        if (isNew) {

            v.setReviewScore(BigDecimal.ZERO);
            v.setReviewStatus("New");
            v.setReviewCount(0);
            v.setTotalPhotos(images.size());
        }

        v.setFacilities(new ArrayList<>(facilities));

        v.getImages().clear();
        for (int i = 0; i < images.size(); i++) {
            AdminVillaRequest.Image im = images.get(i);
            VillaImage vi = new VillaImage();
            vi.setVilla(v);
            vi.setImageUrl(im.url.trim());
            vi.setCaption(trim(im.caption).isEmpty() ? null : trim(im.caption));
            vi.setDisplayOrder(i + 1);
            vi.setHero(i == heroIndex);
            v.getImages().add(vi);
        }

        v.getHighlights().clear();
        for (AdminVillaRequest.Highlight h : highlights) {
            PropertyHighlight ph = new PropertyHighlight();
            ph.setVilla(v);
            ph.setIcon(icon(h.icon));
            ph.setTitle(trim(h.title));
            ph.setDescription(trim(h.description).isEmpty() ? null : trim(h.description));
            ph.setScore(trim(h.score).isEmpty() ? null : trim(h.score));
            v.getHighlights().add(ph);
        }

        v.getNearbyLocations().clear();
        for (AdminVillaRequest.Nearby n : nearby) {
            NearbyLocation nl = new NearbyLocation();
            nl.setVilla(v);
            nl.setName(trim(n.name));
            nl.setDistanceText(trim(n.distanceText));
            nl.setDistanceKm(n.distanceKm);
            nl.setLocationType(trim(n.locationType));
            nl.setImageUrl(trim(n.imageUrl));
            v.getNearbyLocations().add(nl);
        }
    }

    private static BigDecimal parseKm(String text) {
        java.util.regex.Matcher m = java.util.regex.Pattern.compile("([0-9]+(?:\\.[0-9]+)?)\\s*(km|m)?", java.util.regex.Pattern.CASE_INSENSITIVE)
                .matcher(trim(text));
        if (!m.find()) return null;
        BigDecimal n = new BigDecimal(m.group(1));
        if ("m".equalsIgnoreCase(m.group(2))) n = n.divide(BigDecimal.valueOf(1000), 2, java.math.RoundingMode.HALF_UP);
        return n;
    }

    static String status(Villa v) {
        return v.getStatus() == null || v.getStatus().isBlank() ? "Published" : v.getStatus();
    }

    static AdminVillaDTO toDTO(Villa v) {
        return new AdminVillaDTO(v.getId(), v.getSlug(), v.getName(), v.getPropertyType(), AppUtil.nz(v.getStars()),
                !Boolean.FALSE.equals(v.getHasThumbsUp()), v.getTagline(), v.getOverview(), v.getAddress(), v.getCity(),
                v.getRegion().getId(), v.getLatitude(), v.getLongitude(), v.getHeroImage(), v.getLocationScore(),
                v.getBasePriceLkr(), v.getDiscountPriceLkr(), v.getTaxesLkr(), AppUtil.nz(v.getDiscountPercent()),
                v.getDealType() == null ? "" : v.getDealType(), Boolean.TRUE.equals(v.getGeniusEligible()),
                Boolean.TRUE.equals(v.getFeatured()), status(v), AppUtil.nz(v.getReviewCount()), v.getReviewScore(),
                v.getUpdatedAt() == null ? "" : v.getUpdatedAt().format(DAY),
                v.getFacilities().stream().map(Facility::getId).toList(),
                v.getHighlights().stream().map(h -> new AdminVillaDTO.HighlightDTO(h.getIcon(), h.getTitle(),
                        h.getDescription() == null ? "" : h.getDescription(), h.getScore() == null ? "" : h.getScore())).toList(),
                v.getNearbyLocations().stream().map(n -> new AdminVillaDTO.NearbyDTO(n.getName(), n.getDistanceText(),
                        n.getLocationType(), n.getImageUrl())).toList(),
                v.getImages().stream().map(i -> new AdminVillaDTO.ImageDTO(i.getImageUrl(),
                        i.getCaption() == null ? "" : i.getCaption(), Boolean.TRUE.equals(i.getHero()))).toList());
    }
}
