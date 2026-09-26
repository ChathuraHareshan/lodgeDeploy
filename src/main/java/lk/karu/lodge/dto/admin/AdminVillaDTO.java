package lk.karu.lodge.dto.admin;

import java.math.BigDecimal;
import java.util.List;

public record AdminVillaDTO(int id, String slug, String name, String propertyType, int stars, boolean hasThumbsUp,
                            String tagline, String overview, String address, String city, int regionId,
                            Double latitude, Double longitude, String heroImage, BigDecimal locationScore,
                            BigDecimal basePrice, BigDecimal discountPrice, BigDecimal taxes, int discountPercent,
                            String dealType, boolean geniusEligible, boolean featured, String status,
                            int reviewCount, BigDecimal reviewScore, String updatedAt,
                            List<Integer> facilityIds, List<HighlightDTO> highlights, List<NearbyDTO> nearby,
                            List<ImageDTO> images) {

    public record HighlightDTO(String icon, String title, String description, String score) {
    }

    public record NearbyDTO(String name, String distanceText, String locationType, String imageUrl) {
    }

    public record ImageDTO(String url, String caption, boolean hero) {
    }
}
