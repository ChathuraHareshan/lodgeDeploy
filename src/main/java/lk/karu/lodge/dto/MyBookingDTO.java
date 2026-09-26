package lk.karu.lodge.dto;

import java.math.BigDecimal;
import java.util.List;

public record MyBookingDTO(String reference, String villaName, String villaSlug, String heroImage, String city,
                           String checkIn, String checkOut, int nights, int adults, int children,
                           BigDecimal totalAmountLkr, BigDecimal totalTaxesLkr, String paymentMethod,
                           String paymentStatus, String bookingStatus, String specialRequests, String bookedOn,
                           String guestName, List<Room> rooms, String cancellation,
                           boolean canCancel, String cancelUntil, int cancelMinDays,
                           boolean canReview, String reviewStatus, String guestEmail, String guestPhone) {

    public record Room(String name, int quantity) {
    }
}
