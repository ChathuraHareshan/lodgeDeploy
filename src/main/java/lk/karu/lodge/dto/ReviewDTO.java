package lk.karu.lodge.dto;

import java.math.BigDecimal;

public record ReviewDTO(int id, String authorName, String authorCountry, BigDecimal score,
                        String title, String text, String stayDate, boolean verified,
                        String villaName, String villaSlug) {
}
