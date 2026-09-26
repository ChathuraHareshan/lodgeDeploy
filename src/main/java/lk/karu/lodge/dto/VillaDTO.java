package lk.karu.lodge.dto;

import java.math.BigDecimal;

public record VillaDTO(int id, String slug, String name, String propertyType, int stars, boolean hasThumbsUp,
                       String tagline, String city, String regionName, String regionSlug, String heroImage,
                       BigDecimal reviewScore, String reviewStatus, int reviewCount, BigDecimal locationScore,
                       BigDecimal basePriceLkr, BigDecimal discountPriceLkr, BigDecimal taxesLkr,
                       int discountPercent, String dealType, boolean geniusEligible) {
}
