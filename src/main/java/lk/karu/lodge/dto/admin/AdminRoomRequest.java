package lk.karu.lodge.dto.admin;

import java.math.BigDecimal;
import java.util.List;

public class AdminRoomRequest {
    public Integer villaId;
    public String name;
    public String slug;
    public String badge;
    public String bedInfo;
    public String sizeSqm;
    public Integer maxGuests;
    public BigDecimal originalPrice;
    public BigDecimal discountPrice;
    public BigDecimal taxes;
    public Boolean breakfastIncluded;
    public String breakfastDesc;
    public String perks;
    public String cancellationPolicy;
    public String prepaymentPolicy;
    public Integer stock;
    public String status;
    public List<String> features;
}
