package lk.karu.lodge.dto;

import java.util.List;


public record BookingRequestDTO(String villaSlug, String checkIn, String checkOut, Integer adults, Integer children,
                                String leadGuestName, String guestEmail, String guestPhone,
                                String specialRequests, List<RoomSelection> rooms,
                                String password, String paymentMethod) {

    public record RoomSelection(Integer roomTypeId, Integer quantity) {
    }
}
