package lk.karu.lodge.dto.admin;

import java.math.BigDecimal;

public record AdminReviewDTO(int id, int villaId, String villaName, String authorName, String authorCountry,
                             BigDecimal score, BigDecimal cleanliness, BigDecimal comfort, BigDecimal location,
                             BigDecimal facilities, BigDecimal staff, BigDecimal value, String title, String text,
                             String stayDate, String status, boolean verified, String createdAt) {
}
