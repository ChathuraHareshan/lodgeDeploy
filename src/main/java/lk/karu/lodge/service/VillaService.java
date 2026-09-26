package lk.karu.lodge.service;

import com.google.gson.JsonObject;
import lk.karu.lodge.dto.DestinationDTO;
import lk.karu.lodge.dto.RoomTypeDTO;
import lk.karu.lodge.dto.VillaDTO;
import lk.karu.lodge.dto.VillaDetailDTO;
import lk.karu.lodge.entity.Region;
import lk.karu.lodge.entity.Review;
import lk.karu.lodge.entity.RoomType;
import lk.karu.lodge.entity.Villa;
import lk.karu.lodge.util.AppUtil;
import lk.karu.lodge.util.HibernateUtil;
import org.hibernate.Session;
import org.hibernate.query.Query;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Map;

public class VillaService {


    public String loadVillas(String regionSlug, String city, String search) {
        JsonObject responseObject = new JsonObject();

        try (Session hibernateSession = HibernateUtil.getSessionFactory().openSession()) {

            StringBuilder hql = new StringBuilder("SELECT v FROM Villa v JOIN FETCH v.region r " +
                    "WHERE (v.status IS NULL OR v.status = 'Published')");
            if (!AppUtil.isBlank(regionSlug)) hql.append(" AND r.slug = :region");
            if (!AppUtil.isBlank(city)) hql.append(" AND lower(v.city) = :city");
            if (!AppUtil.isBlank(search)) hql.append(" AND (lower(v.name) LIKE :q OR lower(v.city) LIKE :q)");
            hql.append(" ORDER BY v.featured DESC, v.reviewScore DESC, v.id ASC");

            Query<Villa> query = hibernateSession.createQuery(hql.toString(), Villa.class);
            if (!AppUtil.isBlank(regionSlug)) query.setParameter("region", regionSlug.trim().toLowerCase());
            if (!AppUtil.isBlank(city)) query.setParameter("city", city.trim().toLowerCase());
            if (!AppUtil.isBlank(search)) query.setParameter("q", "%" + search.trim().toLowerCase() + "%");

            List<VillaDTO> villas = query.getResultList().stream().map(VillaService::toDTO).toList();

            responseObject.addProperty("status", true);
            responseObject.add("villas", AppUtil.GSON.toJsonTree(villas));
        } catch (Exception e) {
            e.printStackTrace();
            responseObject.addProperty("status", false);
            responseObject.addProperty("message", "Failed to load villas.");
        }
        return AppUtil.GSON.toJson(responseObject);
    }


    public String loadDestinations() {
        JsonObject responseObject = new JsonObject();

        try (Session hibernateSession = HibernateUtil.getSessionFactory().openSession()) {
            List<Object[]> rows = hibernateSession.createQuery(
                    "SELECT v.city, r.name, r.slug FROM Villa v JOIN v.region r " +
                            "WHERE (v.status IS NULL OR v.status = 'Published') " +
                            "GROUP BY v.city, r.name, r.slug ORDER BY v.city", Object[].class).getResultList();

            List<DestinationDTO> destinations = rows.stream()
                    .map(row -> new DestinationDTO((String) row[0], (String) row[1], (String) row[2]))
                    .toList();

            responseObject.addProperty("status", true);
            responseObject.add("destinations", AppUtil.GSON.toJsonTree(destinations));
        } catch (Exception e) {
            e.printStackTrace();
            responseObject.addProperty("status", false);
            responseObject.addProperty("message", "Failed to load destinations.");
        }
        return AppUtil.GSON.toJson(responseObject);
    }


    public String loadVillaDetail(String slug, String checkInText, String checkOutText) {
        JsonObject responseObject = new JsonObject();

        LocalDate today = LocalDate.now();
        LocalDate checkIn = AppUtil.parseDate(checkInText);
        LocalDate checkOut = AppUtil.parseDate(checkOutText);
        if (checkIn == null || checkIn.isBefore(today)) checkIn = today;
        if (checkOut == null || !checkOut.isAfter(checkIn)) checkOut = checkIn.plusDays(1);
        long nights = ChronoUnit.DAYS.between(checkIn, checkOut);

        try (Session hibernateSession = HibernateUtil.getSessionFactory().openSession()) {

            Villa v = hibernateSession.createNamedQuery("Villa.getBySlug", Villa.class)
                    .setParameter("slug", slug == null ? "" : slug.trim())
                    .uniqueResult();

            if (v == null || (v.getStatus() != null && !"Published".equals(v.getStatus()))) {
                responseObject.addProperty("status", false);
                responseObject.addProperty("message", "Villa not found.");
                return AppUtil.GSON.toJson(responseObject);
            }


            Map<Integer, Long> booked = new AvailabilityService()
                    .bookedByRoomType(hibernateSession, v.getId(), checkIn, checkOut);

            List<RoomTypeDTO> rooms = v.getRoomTypes().stream()
                    .filter(rt -> rt.getStatus() == null || "Active".equals(rt.getStatus()))
                    .map(rt -> {
                int stock = AppUtil.nz(rt.getStockQuantity());
                int available = (int) Math.max(0, stock - booked.getOrDefault(rt.getId(), 0L));
                return toRoomDTO(rt, available);
            }).toList();


            List<Review> allReviews = hibernateSession
                    .createQuery("FROM Review r WHERE r.villa.id = :villaId AND (r.status IS NULL OR r.status = 'Approved') ORDER BY r.id DESC", Review.class)
                    .setParameter("villaId", v.getId())
                    .getResultList();

            VillaDetailDTO detail = new VillaDetailDTO(
                    toDTO(v),
                    v.getOverview(),
                    v.getAddress(),
                    v.getLatitude() == null ? 0 : v.getLatitude(),
                    v.getLongitude() == null ? 0 : v.getLongitude(),
                    AppUtil.nz(v.getTotalPhotos()),
                    v.getImages().stream()
                            .map(i -> new VillaDetailDTO.ImageDTO(i.getImageUrl(), i.getCaption(), Boolean.TRUE.equals(i.getHero())))
                            .toList(),
                    v.getFacilities().stream()
                            .map(f -> new VillaDetailDTO.FacilityDTO(f.getId(), f.getName(), f.getIcon(), f.getCategory()))
                            .toList(),
                    v.getHighlights().stream()
                            .map(h -> new VillaDetailDTO.HighlightDTO(h.getIcon(), h.getTitle(), h.getDescription(), h.getScore()))
                            .toList(),
                    v.getNearbyLocations().stream()
                            .map(n -> new VillaDetailDTO.NearbyDTO(n.getName(), n.getDistanceText(), n.getLocationType(), n.getImageUrl()))
                            .toList(),
                    rooms,
                    allReviews.stream().limit(12).map(ReviewService::toDTO).toList(),
                    ReviewService.summarise(allReviews));

            responseObject.addProperty("status", true);
            responseObject.addProperty("checkIn", checkIn.toString());
            responseObject.addProperty("checkOut", checkOut.toString());
            responseObject.addProperty("nights", nights);
            responseObject.add("detail", AppUtil.GSON.toJsonTree(detail));

        } catch (Exception e) {
            e.printStackTrace();
            responseObject.addProperty("status", false);
            responseObject.addProperty("message", "Failed to load villa details.");
        }
        return AppUtil.GSON.toJson(responseObject);
    }


    static VillaDTO toDTO(Villa v) {
        Region r = v.getRegion();
        return new VillaDTO(v.getId(), v.getSlug(), v.getName(), v.getPropertyType(),
                AppUtil.nz(v.getStars()), Boolean.TRUE.equals(v.getHasThumbsUp()),
                v.getTagline(), v.getCity(), r.getName(), r.getSlug(), v.getHeroImage(),
                v.getReviewScore(), v.getReviewStatus(), AppUtil.nz(v.getReviewCount()), v.getLocationScore(),
                v.getBasePriceLkr(), v.getDiscountPriceLkr(), v.getTaxesLkr(),
                AppUtil.nz(v.getDiscountPercent()), v.getDealType(), Boolean.TRUE.equals(v.getGeniusEligible()));
    }

    static RoomTypeDTO toRoomDTO(RoomType rt, int available) {
        return new RoomTypeDTO(rt.getId(), rt.getSlug(), rt.getName(), rt.getBadge(), rt.getBedInfo(),
                rt.getSizeSqm(), AppUtil.nz(rt.getMaxGuests()), rt.getOriginalPriceLkr(), rt.getDiscountPriceLkr(),
                rt.getTaxesLkr(), AppUtil.nz(rt.getDiscountPercent()), rt.getBreakfastDesc(),
                Boolean.TRUE.equals(rt.getBreakfastIncluded()), rt.getPerks(), rt.getCancellationPolicy(),
                rt.getPrepaymentPolicy(), AppUtil.nz(rt.getStockQuantity()), available,
                rt.getFeatures().stream().map(f -> f.getFeatureName()).toList());
    }
}
