package lk.karu.lodge.dto.admin;

import java.math.BigDecimal;
import java.util.List;

public class AdminVillaRequest {
    public String name;
    public String slug;
    public String propertyType;
    public Integer stars;
    public Boolean hasThumbsUp;
    public String tagline;
    public String overview;
    public String address;
    public String city;
    public Integer regionId;
    public Double latitude;
    public Double longitude;
    public BigDecimal locationScore;
    public BigDecimal basePrice;
    public BigDecimal discountPrice;
    public BigDecimal taxes;
    public String dealType;
    public Boolean geniusEligible;
    public Boolean featured;
    public String status;
    public List<Integer> facilityIds;
    public List<Highlight> highlights;
    public List<Nearby> nearby;
    public List<Image> images;

    public static class Highlight {
        public String icon;
        public String title;
        public String description;
        public String score;
    }

    public static class Nearby {
        public String name;
        public String distanceText;
        public BigDecimal distanceKm;
        public String locationType;
        public String imageUrl;
    }

    public static class Image {
        public String url;
        public String caption;
        public Boolean hero;
    }
}
