package lk.karu.lodge.service.admin;

import lk.karu.lodge.dto.admin.AdminReviewDTO;
import lk.karu.lodge.entity.Review;
import lk.karu.lodge.service.ReviewModeration;
import lk.karu.lodge.util.AppUtil;

import java.time.format.DateTimeFormatter;
import java.util.Set;

import static lk.karu.lodge.service.admin.AdminSupport.require;

public class AdminReviewService {

    public static final Set<String> STATUSES = Set.of("Pending", "Approved", "Rejected");
    private static final DateTimeFormatter DAY = DateTimeFormatter.ofPattern("yyyy-MM-dd");

    public String loadAll() {
        return AdminSupport.read("Failed to load reviews.", (session, out) -> {
            var reviews = session.createQuery("SELECT r FROM Review r JOIN FETCH r.villa ORDER BY r.id DESC", Review.class).getResultList();
            out.add("reviews", AppUtil.GSON.toJsonTree(reviews.stream().map(AdminReviewService::toDTO).toList()));
        });
    }

    public String setStatus(int id, String status) {
        return AdminSupport.write("Failed to update the review.", (session, out) -> {
            require(status != null && STATUSES.contains(status), "Invalid review status.");
            Review r = session.find(Review.class, id);
            require(r != null, "Review not found.");
            ReviewModeration.changeStatus(r, status);
        });
    }

    public String delete(int id) {
        return AdminSupport.write("Failed to delete the review.", (session, out) -> {
            Review r = session.find(Review.class, id);
            require(r != null, "Review not found.");
            ReviewModeration.changeStatus(r, "Rejected");
            session.remove(r);
        });
    }

    static AdminReviewDTO toDTO(Review r) {
        return new AdminReviewDTO(r.getId(), r.getVilla().getId(), r.getVilla().getName(), r.getAuthorName(), r.getAuthorCountry(),
                r.getScore(), r.getCleanlinessScore(), r.getComfortScore(), r.getLocationScore(), r.getFacilitiesScore(),
                r.getStaffScore(), r.getValueScore(), r.getReviewTitle(), r.getReviewText(), r.getStayDate(),
                ReviewModeration.statusOf(r), Boolean.TRUE.equals(r.getVerified()),
                r.getCreatedAt() == null ? "" : r.getCreatedAt().format(DAY));
    }
}
