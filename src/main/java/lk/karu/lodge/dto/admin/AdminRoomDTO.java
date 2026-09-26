package lk.karu.lodge.dto.admin;

import java.math.BigDecimal;
import java.util.List;

public record AdminRoomDTO(int id, int villaId, String villaName, String slug, String name, String badge,
                           String bedInfo, String sizeSqm, int maxGuests, BigDecimal originalPrice,
                           BigDecimal discountPrice, BigDecimal taxes, int discountPercent, boolean breakfastIncluded,
                           String breakfastDesc, String perks, String cancellationPolicy, String prepaymentPolicy,
                           int stock, String status, List<String> features) {
}
