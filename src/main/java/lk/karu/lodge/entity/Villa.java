package lk.karu.lodge.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@NamedQuery(name = "Villa.getBySlug",
        query = "FROM Villa v JOIN FETCH v.region WHERE v.slug = :slug")
@Entity
@Table(name = "villas")
public class Villa {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    private int id;

    @Column(name = "slug")
    private String slug;

    @Column(name = "name")
    private String name;

    @Column(name = "property_type")
    private String propertyType;

    @Column(name = "stars")
    private Integer stars;

    @Column(name = "has_thumbs_up")
    private Boolean hasThumbsUp;

    @Column(name = "tagline")
    private String tagline;

    @Column(name = "overview")
    private String overview;

    @Column(name = "address")
    private String address;

    @Column(name = "city")
    private String city;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "region_id")
    private Region region;

    @Column(name = "latitude")
    private Double latitude;

    @Column(name = "longitude")
    private Double longitude;

    @Column(name = "hero_image")
    private String heroImage;

    @Column(name = "total_photos")
    private Integer totalPhotos;

    @Column(name = "review_score")
    private BigDecimal reviewScore;

    @Column(name = "review_status")
    private String reviewStatus;

    @Column(name = "review_count")
    private Integer reviewCount;

    @Column(name = "location_score")
    private BigDecimal locationScore;

    @Column(name = "base_price_lkr")
    private BigDecimal basePriceLkr;

    @Column(name = "discount_price_lkr")
    private BigDecimal discountPriceLkr;

    @Column(name = "taxes_lkr")
    private BigDecimal taxesLkr;

    @Column(name = "discount_percent")
    private Integer discountPercent;

    @Column(name = "deal_type")
    private String dealType;

    @Column(name = "is_genius_eligible")
    private Boolean geniusEligible;

    @Column(name = "is_featured")
    private Boolean featured;

    @Column(name = "status")
    private String status;

    @Column(name = "updated_at", insertable = false, updatable = false)
    private LocalDateTime updatedAt;

    @OneToMany(mappedBy = "villa", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("displayOrder ASC")
    private List<VillaImage> images = new ArrayList<>();

    @OneToMany(mappedBy = "villa")
    @OrderBy("discountPriceLkr ASC")
    private List<RoomType> roomTypes = new ArrayList<>();

    @OneToMany(mappedBy = "villa", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("id ASC")
    private List<PropertyHighlight> highlights = new ArrayList<>();

    @OneToMany(mappedBy = "villa", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("distanceKm ASC")
    private List<NearbyLocation> nearbyLocations = new ArrayList<>();

    @ManyToMany
    @JoinTable(name = "villa_facilities",
            joinColumns = @JoinColumn(name = "villa_id"),
            inverseJoinColumns = @JoinColumn(name = "facility_id"))
    @OrderBy("id ASC")
    private List<Facility> facilities = new ArrayList<>();

    public Villa() {
    }

    public int getId() {
        return id;
    }

    public void setId(int id) {
        this.id = id;
    }

    public String getSlug() {
        return slug;
    }

    public void setSlug(String slug) {
        this.slug = slug;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getPropertyType() {
        return propertyType;
    }

    public void setPropertyType(String propertyType) {
        this.propertyType = propertyType;
    }

    public Integer getStars() {
        return stars;
    }

    public void setStars(Integer stars) {
        this.stars = stars;
    }

    public Boolean getHasThumbsUp() {
        return hasThumbsUp;
    }

    public void setHasThumbsUp(Boolean hasThumbsUp) {
        this.hasThumbsUp = hasThumbsUp;
    }

    public String getTagline() {
        return tagline;
    }

    public void setTagline(String tagline) {
        this.tagline = tagline;
    }

    public String getOverview() {
        return overview;
    }

    public void setOverview(String overview) {
        this.overview = overview;
    }

    public String getAddress() {
        return address;
    }

    public void setAddress(String address) {
        this.address = address;
    }

    public String getCity() {
        return city;
    }

    public void setCity(String city) {
        this.city = city;
    }

    public Region getRegion() {
        return region;
    }

    public void setRegion(Region region) {
        this.region = region;
    }

    public Double getLatitude() {
        return latitude;
    }

    public void setLatitude(Double latitude) {
        this.latitude = latitude;
    }

    public Double getLongitude() {
        return longitude;
    }

    public void setLongitude(Double longitude) {
        this.longitude = longitude;
    }

    public String getHeroImage() {
        return heroImage;
    }

    public void setHeroImage(String heroImage) {
        this.heroImage = heroImage;
    }

    public Integer getTotalPhotos() {
        return totalPhotos;
    }

    public void setTotalPhotos(Integer totalPhotos) {
        this.totalPhotos = totalPhotos;
    }

    public BigDecimal getReviewScore() {
        return reviewScore;
    }

    public void setReviewScore(BigDecimal reviewScore) {
        this.reviewScore = reviewScore;
    }

    public String getReviewStatus() {
        return reviewStatus;
    }

    public void setReviewStatus(String reviewStatus) {
        this.reviewStatus = reviewStatus;
    }

    public Integer getReviewCount() {
        return reviewCount;
    }

    public void setReviewCount(Integer reviewCount) {
        this.reviewCount = reviewCount;
    }

    public BigDecimal getLocationScore() {
        return locationScore;
    }

    public void setLocationScore(BigDecimal locationScore) {
        this.locationScore = locationScore;
    }

    public BigDecimal getBasePriceLkr() {
        return basePriceLkr;
    }

    public void setBasePriceLkr(BigDecimal basePriceLkr) {
        this.basePriceLkr = basePriceLkr;
    }

    public BigDecimal getDiscountPriceLkr() {
        return discountPriceLkr;
    }

    public void setDiscountPriceLkr(BigDecimal discountPriceLkr) {
        this.discountPriceLkr = discountPriceLkr;
    }

    public BigDecimal getTaxesLkr() {
        return taxesLkr;
    }

    public void setTaxesLkr(BigDecimal taxesLkr) {
        this.taxesLkr = taxesLkr;
    }

    public Integer getDiscountPercent() {
        return discountPercent;
    }

    public void setDiscountPercent(Integer discountPercent) {
        this.discountPercent = discountPercent;
    }

    public String getDealType() {
        return dealType;
    }

    public void setDealType(String dealType) {
        this.dealType = dealType;
    }

    public Boolean getGeniusEligible() {
        return geniusEligible;
    }

    public void setGeniusEligible(Boolean geniusEligible) {
        this.geniusEligible = geniusEligible;
    }

    public Boolean getFeatured() {
        return featured;
    }

    public void setFeatured(Boolean featured) {
        this.featured = featured;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }

    public List<VillaImage> getImages() {
        return images;
    }

    public void setImages(List<VillaImage> images) {
        this.images = images;
    }

    public List<RoomType> getRoomTypes() {
        return roomTypes;
    }

    public void setRoomTypes(List<RoomType> roomTypes) {
        this.roomTypes = roomTypes;
    }

    public List<PropertyHighlight> getHighlights() {
        return highlights;
    }

    public void setHighlights(List<PropertyHighlight> highlights) {
        this.highlights = highlights;
    }

    public List<NearbyLocation> getNearbyLocations() {
        return nearbyLocations;
    }

    public void setNearbyLocations(List<NearbyLocation> nearbyLocations) {
        this.nearbyLocations = nearbyLocations;
    }

    public List<Facility> getFacilities() {
        return facilities;
    }

    public void setFacilities(List<Facility> facilities) {
        this.facilities = facilities;
    }

}
