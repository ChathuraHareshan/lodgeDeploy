package lk.karu.lodge.dto.admin;

public record AdminOfferDTO(int id, String title, String badge, String description, int discountPercent, String imageUrl,
                            String validFrom, String validTo, boolean active, String state) {
}
