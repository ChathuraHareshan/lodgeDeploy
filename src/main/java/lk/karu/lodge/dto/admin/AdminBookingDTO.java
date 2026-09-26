package lk.karu.lodge.dto.admin;

import java.math.BigDecimal;
import java.util.List;

public record AdminBookingDTO(int id, String reference, int villaId, String villaName, String guestName, String guestEmail,
                              String guestPhone, boolean hasAccount, String checkIn, String checkOut, int nights,
                              int adults, int children, List<Room> rooms, BigDecimal total, BigDecimal taxes,
                              String paymentMethod, String paymentStatus, String bookingStatus, String specialRequests,
                              String createdAt, boolean reviewed) {

    public record Room(String name, int quantity) {
    }
}
