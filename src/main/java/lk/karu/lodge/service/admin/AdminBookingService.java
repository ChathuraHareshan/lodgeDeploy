package lk.karu.lodge.service.admin;

import lk.karu.lodge.dto.admin.AdminBookingDTO;
import lk.karu.lodge.dto.admin.AdminBookingRequest;
import lk.karu.lodge.entity.Booking;
import lk.karu.lodge.entity.BookingRoom;
import lk.karu.lodge.mail.BookingEventMail;
import lk.karu.lodge.provider.MailServiceProvider;
import lk.karu.lodge.service.AuthService;
import lk.karu.lodge.util.AppUtil;
import lk.karu.lodge.util.HibernateUtil;
import jakarta.persistence.LockModeType;
import org.hibernate.Session;

import java.time.format.DateTimeFormatter;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

import static lk.karu.lodge.service.admin.AdminSupport.require;

public class AdminBookingService {

    public static final Set<String> BOOKING_STATUSES = Set.of("Confirmed", "Pending", "Cancelled", "Completed");
    public static final Set<String> PAYMENT_STATUSES = Set.of("Pending", "Paid", "PayAtProperty", "Failed");
    private static final DateTimeFormatter DAY = DateTimeFormatter.ofPattern("yyyy-MM-dd");

    public String loadAll() {
        return AdminSupport.read("Failed to load bookings.", (session, out) -> {
            Set<Integer> reviewed = new HashSet<>(session.createQuery(
                    "SELECT r.bookingId FROM Review r WHERE r.bookingId IS NOT NULL", Integer.class).getResultList());

            List<Booking> bookings = session.createQuery(
                    "SELECT DISTINCT b FROM Booking b JOIN FETCH b.villa LEFT JOIN FETCH b.rooms ORDER BY b.id DESC", Booking.class)
                    .getResultList();
            out.add("bookings", AppUtil.GSON.toJsonTree(bookings.stream().map(b -> toDTO(b, reviewed.contains(b.getId()))).toList()));
        });
    }


    public String updateStatus(int id, AdminBookingRequest req) {
        boolean[] events = new boolean[2];
        String result = AdminSupport.write("Failed to update the booking.", (session, out) -> {
            require(req != null && (req.bookingStatus != null || req.paymentStatus != null), "Nothing to change.");
            Booking b = session.find(Booking.class, id, LockModeType.PESSIMISTIC_WRITE);
            require(b != null, "Booking not found.");
            require(!"Cancelled".equals(b.getBookingStatus()), "A cancelled booking can't be changed. Create a new booking instead.");
            String previousBookingStatus = b.getBookingStatus();
            String previousPaymentStatus = b.getPaymentStatus();

            if (req.bookingStatus != null) {
                String status = req.bookingStatus.trim();
                require(BOOKING_STATUSES.contains(status), "Invalid booking status.");
                if ("Completed".equals(status)) {
                    require(!b.getCheckInDate().isAfter(AuthService.today()), "A booking can only be completed once the stay has started.");
                }
                b.setBookingStatus(status);
                if ("Cancelled".equals(status)) b.setPaymentStatus("Cancelled");
            }
            if (req.paymentStatus != null && !"Cancelled".equals(b.getBookingStatus())) {
                String pay = req.paymentStatus.trim();
                require(PAYMENT_STATUSES.contains(pay), "Invalid payment status.");
                b.setPaymentStatus(pay);
                if ("PayHere".equals(b.getPaymentMethod()) && "Paid".equals(pay) && "Pending".equals(b.getBookingStatus())) {
                    b.setBookingStatus("Confirmed");
                }
            }
            events[0] = !"Confirmed".equals(previousBookingStatus) && "Confirmed".equals(b.getBookingStatus());
            events[1] = !"Paid".equals(previousPaymentStatus) && "Paid".equals(b.getPaymentStatus());
            session.flush();
            out.add("booking", AppUtil.GSON.toJsonTree(toDTO(b, false)));
        });
        if (isSuccessful(result) && (events[0] || events[1])) sendGuestNotifications(id, events[0], events[1]);
        return result;
    }

    private static boolean isSuccessful(String json) {
        try { return com.google.gson.JsonParser.parseString(json).getAsJsonObject().get("status").getAsBoolean(); }
        catch (Exception ignored) { return false; }
    }

    private static void sendGuestNotifications(int bookingId, boolean bookingConfirmed, boolean paymentAccepted) {
        try (Session session = HibernateUtil.getSessionFactory().openSession()) {
            Booking booking = session.createQuery("SELECT b FROM Booking b JOIN FETCH b.villa WHERE b.id=:id", Booking.class)
                    .setParameter("id", bookingId).uniqueResult();
            if (booking == null) return;
            if (bookingConfirmed) {
                MailServiceProvider.getInstance().sendMail(new BookingEventMail(booking,
                        "Booking confirmed", "Booking confirmed", "The property has accepted your reservation."));
            }
            if (paymentAccepted) {
                MailServiceProvider.getInstance().sendMail(new BookingEventMail(booking,
                        "Payment accepted", "Payment accepted", "Your payment has been accepted and your reservation is confirmed."));
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    static AdminBookingDTO toDTO(Booking b, boolean reviewed) {
        return new AdminBookingDTO(b.getId(), b.getBookingReference(), b.getVilla().getId(), b.getVilla().getName(),
                b.getLeadGuestName(), b.getGuestEmail(), b.getGuestPhone() == null ? "" : b.getGuestPhone(), b.getUserId() != null,
                b.getCheckInDate().format(DAY), b.getCheckOutDate().format(DAY), AppUtil.nz(b.getNightsCount()),
                AppUtil.nz(b.getAdultsCount()), AppUtil.nz(b.getChildrenCount()),
                b.getRooms().stream().map((BookingRoom br) -> new AdminBookingDTO.Room(br.getRoomType().getName(), AppUtil.nz(br.getQuantity()))).toList(),
                AppUtil.nz(b.getTotalAmountLkr()), AppUtil.nz(b.getTotalTaxesLkr()), b.getPaymentMethod(), b.getPaymentStatus(),
                b.getBookingStatus(), b.getSpecialRequests() == null ? "" : b.getSpecialRequests(),
                b.getCreatedAt() == null ? "" : b.getCreatedAt().format(DAY), reviewed);
    }
}
