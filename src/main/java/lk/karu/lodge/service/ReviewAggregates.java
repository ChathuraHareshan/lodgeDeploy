package lk.karu.lodge.service;

import lk.karu.lodge.entity.Villa;
import lk.karu.lodge.util.AppUtil;

import java.math.BigDecimal;
import java.math.RoundingMode;


final class ReviewAggregates {

    private ReviewAggregates() {
    }

    static String label(BigDecimal score) {
        double s = score == null ? 0 : score.doubleValue();
        if (s >= 9.5) return "Exceptional";
        if (s >= 9.0) return "Superb";
        if (s >= 8.5) return "Fabulous";
        if (s >= 8.0) return "Very good";
        if (s >= 7.0) return "Good";
        return "Pleasant";
    }

    static void add(Villa v, BigDecimal reviewScore) {
        int count = AppUtil.nz(v.getReviewCount());
        BigDecimal total = AppUtil.nz(v.getReviewScore()).multiply(BigDecimal.valueOf(count)).add(reviewScore);
        int next = count + 1;
        BigDecimal avg = total.divide(BigDecimal.valueOf(next), 1, RoundingMode.HALF_UP);
        v.setReviewCount(next);
        v.setReviewScore(avg);
        v.setReviewStatus(label(avg));
    }


    static void remove(Villa v, BigDecimal reviewScore) {
        int count = AppUtil.nz(v.getReviewCount());
        if (count <= 1) {
            v.setReviewCount(0);
            v.setReviewScore(BigDecimal.ZERO);
            v.setReviewStatus("New");
            return;
        }
        BigDecimal total = AppUtil.nz(v.getReviewScore()).multiply(BigDecimal.valueOf(count)).subtract(reviewScore);
        BigDecimal avg = total.divide(BigDecimal.valueOf(count - 1L), 1, RoundingMode.HALF_UP);
        if (avg.signum() < 0) avg = BigDecimal.ZERO;
        if (avg.compareTo(BigDecimal.TEN) > 0) avg = BigDecimal.TEN;
        v.setReviewCount(count - 1);
        v.setReviewScore(avg);
        v.setReviewStatus(label(avg));
    }
}
