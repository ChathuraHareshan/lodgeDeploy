package lk.karu.lodge.service;

import com.google.gson.JsonObject;
import lk.karu.lodge.dto.ReviewDTO;
import lk.karu.lodge.dto.ReviewSummaryDTO;
import lk.karu.lodge.entity.Review;
import lk.karu.lodge.util.AppUtil;
import lk.karu.lodge.util.HibernateUtil;
import org.hibernate.Session;

import java.math.BigDecimal;
import java.util.List;
import java.util.function.Function;

public class ReviewService {


    public String loadLatestReviews(int limit) {
        JsonObject responseObject = new JsonObject();
        int max = Math.max(1, Math.min(limit, 12));

        try (Session hibernateSession = HibernateUtil.getSessionFactory().openSession()) {
            List<Review> reviews = hibernateSession
                    .createQuery("SELECT r FROM Review r JOIN FETCH r.villa WHERE (r.status IS NULL OR r.status = 'Approved') ORDER BY r.id DESC", Review.class)
                    .setMaxResults(max)
                    .getResultList();

            responseObject.addProperty("status", true);
            responseObject.add("reviews", AppUtil.GSON.toJsonTree(reviews.stream().map(ReviewService::toDTO).toList()));
        } catch (Exception e) {
            e.printStackTrace();
            responseObject.addProperty("status", false);
            responseObject.addProperty("message", "Failed to load reviews.");
        }
        return AppUtil.GSON.toJson(responseObject);
    }

    static ReviewDTO toDTO(Review r) {
        return new ReviewDTO(r.getId(), r.getAuthorName(), r.getAuthorCountry(), r.getScore(),
                r.getReviewTitle(), r.getReviewText(), r.getStayDate(), Boolean.TRUE.equals(r.getVerified()),
                r.getVilla().getName(), r.getVilla().getSlug());
    }

    static ReviewSummaryDTO summarise(List<Review> reviews) {
        if (reviews.isEmpty()) return null;
        return new ReviewSummaryDTO(reviews.size(),
                average(reviews, Review::getCleanlinessScore),
                average(reviews, Review::getComfortScore),
                average(reviews, Review::getLocationScore),
                average(reviews, Review::getFacilitiesScore),
                average(reviews, Review::getStaffScore),
                average(reviews, Review::getValueScore));
    }

    private static double average(List<Review> reviews, Function<Review, BigDecimal> getter) {
        double avg = reviews.stream()
                .map(getter)
                .filter(v -> v != null)
                .mapToDouble(BigDecimal::doubleValue)
                .average()
                .orElse(0);
        return Math.round(avg * 10) / 10.0;
    }
}
