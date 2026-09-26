package lk.karu.lodge.dto;

public record OfferDTO(int id, String title, String badge, String description, int discountPercent,
                       String imageUrl, String validFrom, String validTo) {
}
