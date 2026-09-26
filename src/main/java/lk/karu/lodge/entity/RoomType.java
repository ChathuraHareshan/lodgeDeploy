package lk.karu.lodge.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "room_types")
public class RoomType {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    private int id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "villa_id")
    private Villa villa;

    @Column(name = "slug")
    private String slug;

    @Column(name = "name")
    private String name;

    @Column(name = "badge")
    private String badge;

    @Column(name = "bed_info")
    private String bedInfo;

    @Column(name = "size_sqm")
    private String sizeSqm;

    @Column(name = "max_guests")
    private Integer maxGuests;

    @Column(name = "original_price_lkr")
    private BigDecimal originalPriceLkr;

    @Column(name = "discount_price_lkr")
    private BigDecimal discountPriceLkr;

    @Column(name = "taxes_lkr")
    private BigDecimal taxesLkr;

    @Column(name = "discount_percent")
    private Integer discountPercent;

    @Column(name = "breakfast_desc")
    private String breakfastDesc;

    @Column(name = "is_breakfast_included")
    private Boolean breakfastIncluded;

    @Column(name = "perks")
    private String perks;

    @Column(name = "cancellation_policy")
    private String cancellationPolicy;

    @Column(name = "prepayment_policy")
    private String prepaymentPolicy;

    @Column(name = "stock_quantity")
    private Integer stockQuantity;

    @Column(name = "status")
    private String status;

    @OneToMany(mappedBy = "roomType", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("id ASC")
    private List<RoomFeature> features = new ArrayList<>();

    public RoomType() {
    }

    public int getId() {
        return id;
    }

    public void setId(int id) {
        this.id = id;
    }

    public Villa getVilla() {
        return villa;
    }

    public void setVilla(Villa villa) {
        this.villa = villa;
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

    public String getBadge() {
        return badge;
    }

    public void setBadge(String badge) {
        this.badge = badge;
    }

    public String getBedInfo() {
        return bedInfo;
    }

    public void setBedInfo(String bedInfo) {
        this.bedInfo = bedInfo;
    }

    public String getSizeSqm() {
        return sizeSqm;
    }

    public void setSizeSqm(String sizeSqm) {
        this.sizeSqm = sizeSqm;
    }

    public Integer getMaxGuests() {
        return maxGuests;
    }

    public void setMaxGuests(Integer maxGuests) {
        this.maxGuests = maxGuests;
    }

    public BigDecimal getOriginalPriceLkr() {
        return originalPriceLkr;
    }

    public void setOriginalPriceLkr(BigDecimal originalPriceLkr) {
        this.originalPriceLkr = originalPriceLkr;
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

    public String getBreakfastDesc() {
        return breakfastDesc;
    }

    public void setBreakfastDesc(String breakfastDesc) {
        this.breakfastDesc = breakfastDesc;
    }

    public Boolean getBreakfastIncluded() {
        return breakfastIncluded;
    }

    public void setBreakfastIncluded(Boolean breakfastIncluded) {
        this.breakfastIncluded = breakfastIncluded;
    }

    public String getPerks() {
        return perks;
    }

    public void setPerks(String perks) {
        this.perks = perks;
    }

    public String getCancellationPolicy() {
        return cancellationPolicy;
    }

    public void setCancellationPolicy(String cancellationPolicy) {
        this.cancellationPolicy = cancellationPolicy;
    }

    public String getPrepaymentPolicy() {
        return prepaymentPolicy;
    }

    public void setPrepaymentPolicy(String prepaymentPolicy) {
        this.prepaymentPolicy = prepaymentPolicy;
    }

    public Integer getStockQuantity() {
        return stockQuantity;
    }

    public void setStockQuantity(Integer stockQuantity) {
        this.stockQuantity = stockQuantity;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public List<RoomFeature> getFeatures() {
        return features;
    }

    public void setFeatures(List<RoomFeature> features) {
        this.features = features;
    }

}
