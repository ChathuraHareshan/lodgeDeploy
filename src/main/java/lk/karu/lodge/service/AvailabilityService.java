package lk.karu.lodge.service;

import org.hibernate.Session;

import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;


public class AvailabilityService {

    public Map<Integer, Long> bookedByRoomType(Session session, int villaId, LocalDate checkIn, LocalDate checkOut) {
        List<Object[]> rows = session.createQuery(
                        "SELECT br.roomType.id, SUM(br.quantity) FROM BookingRoom br " +
                                "WHERE br.roomType.villa.id = :villaId " +
                                "AND br.booking.bookingStatus <> 'Cancelled' " +
                                "AND br.booking.checkInDate < :checkOut " +
                                "AND br.booking.checkOutDate > :checkIn " +
                                "GROUP BY br.roomType.id", Object[].class)
                .setParameter("villaId", villaId)
                .setParameter("checkIn", checkIn)
                .setParameter("checkOut", checkOut)
                .getResultList();

        Map<Integer, Long> booked = new HashMap<>();
        for (Object[] row : rows) {
            booked.put(((Number) row[0]).intValue(), ((Number) row[1]).longValue());
        }
        return booked;
    }


    public long bookedForRoom(Session session, int roomTypeId, LocalDate checkIn, LocalDate checkOut) {
        Long booked = session.createQuery(
                        "SELECT SUM(br.quantity) FROM BookingRoom br " +
                                "WHERE br.roomType.id = :roomTypeId " +
                                "AND br.booking.bookingStatus <> 'Cancelled' " +
                                "AND br.booking.checkInDate < :checkOut " +
                                "AND br.booking.checkOutDate > :checkIn", Long.class)
                .setParameter("roomTypeId", roomTypeId)
                .setParameter("checkIn", checkIn)
                .setParameter("checkOut", checkOut)
                .uniqueResult();
        return booked == null ? 0 : booked;
    }
}
