package lk.karu.lodge.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;

@Entity
@Table(name = "reviews")
public class Review {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    private int id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "villa_id")
    private Villa villa;

    @Column(name = "author_name")
    private String authorName;

    @Column(name = "author_country")
    private String authorCountry;

    @Column(name = "score")
    private BigDecimal score;

    @Column(name = "cleanliness_score")
    private BigDecimal cleanlinessScore;

    @Column(name = "comfort_score")
    private BigDecimal comfortScore;

    @Column(name = "location_score")
    private BigDecimal locationScore;

    @Column(name = "facilities_score")
    private BigDecimal facilitiesScore;

    @Column(name = "staff_score")
    private BigDecimal staffScore;

    @Column(name = "value_score")
    private BigDecimal valueScore;

    @Column(name = "review_title")
    private String reviewTitle;

    @Column(name = "review_text")
    private String reviewText;

    @Column(name = "stay_date")
    private String stayDate;

    @Column(name = "is_verified")
    private Boolean verified;

    @Column(name = "user_id")
    private Integer userId;

    @Column(name = "booking_id")
    private Integer bookingId;

    @Column(name = "author_flag")
    private String authorFlag;

    @Column(name = "status")
    private String status;

    @Column(name = "created_at", insertable = false, updatable = false)
    private java.time.LocalDateTime createdAt;

    public Review() {
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

    public String getAuthorName() {
        return authorName;
    }

    public void setAuthorName(String authorName) {
        this.authorName = authorName;
    }

    public String getAuthorCountry() {
        return authorCountry;
    }

    public void setAuthorCountry(String authorCountry) {
        this.authorCountry = authorCountry;
    }

    public BigDecimal getScore() {
        return score;
    }

    public void setScore(BigDecimal score) {
        this.score = score;
    }

    public BigDecimal getCleanlinessScore() {
        return cleanlinessScore;
    }

    public void setCleanlinessScore(BigDecimal cleanlinessScore) {
        this.cleanlinessScore = cleanlinessScore;
    }

    public BigDecimal getComfortScore() {
        return comfortScore;
    }

    public void setComfortScore(BigDecimal comfortScore) {
        this.comfortScore = comfortScore;
    }

    public BigDecimal getLocationScore() {
        return locationScore;
    }

    public void setLocationScore(BigDecimal locationScore) {
        this.locationScore = locationScore;
    }

    public BigDecimal getFacilitiesScore() {
        return facilitiesScore;
    }

    public void setFacilitiesScore(BigDecimal facilitiesScore) {
        this.facilitiesScore = facilitiesScore;
    }

    public BigDecimal getStaffScore() {
        return staffScore;
    }

    public void setStaffScore(BigDecimal staffScore) {
        this.staffScore = staffScore;
    }

    public BigDecimal getValueScore() {
        return valueScore;
    }

    public void setValueScore(BigDecimal valueScore) {
        this.valueScore = valueScore;
    }

    public String getReviewTitle() {
        return reviewTitle;
    }

    public void setReviewTitle(String reviewTitle) {
        this.reviewTitle = reviewTitle;
    }

    public String getReviewText() {
        return reviewText;
    }

    public void setReviewText(String reviewText) {
        this.reviewText = reviewText;
    }

    public String getStayDate() {
        return stayDate;
    }

    public void setStayDate(String stayDate) {
        this.stayDate = stayDate;
    }

    public Boolean getVerified() {
        return verified;
    }

    public void setVerified(Boolean verified) {
        this.verified = verified;
    }

    public Integer getUserId() { return userId; }
    public void setUserId(Integer userId) { this.userId = userId; }
    public Integer getBookingId() { return bookingId; }
    public void setBookingId(Integer bookingId) { this.bookingId = bookingId; }
    public String getAuthorFlag() { return authorFlag; }
    public void setAuthorFlag(String authorFlag) { this.authorFlag = authorFlag; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public java.time.LocalDateTime getCreatedAt() { return createdAt; }
}
