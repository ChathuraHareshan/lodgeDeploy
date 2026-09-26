package lk.karu.lodge.dto;

import java.math.BigDecimal;
import java.util.List;

public record RoomTypeDTO(int id, String slug, String name, String badge, String bedInfo, String sizeSqm,
                          int maxGuests, BigDecimal originalPriceLkr, BigDecimal discountPriceLkr,
                          BigDecimal taxesLkr, int discountPercent, String breakfastDesc,
                          boolean breakfastIncluded, String perks, String cancellationPolicy,
                          String prepaymentPolicy, int stockQuantity, int availableQuantity,
                          List<String> features) {
}
