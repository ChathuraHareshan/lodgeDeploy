package lk.karu.lodge.dto.admin;

import java.math.BigDecimal;

public record AdminVillaRow(int id, String slug, String name, String propertyType, int stars, String city,
                            int regionId, String regionName, String heroImage, BigDecimal reviewScore,
                            int reviewCount, String status, String updatedAt, int roomCount, int facilityCount,
                            BigDecimal discountPrice) {
}
