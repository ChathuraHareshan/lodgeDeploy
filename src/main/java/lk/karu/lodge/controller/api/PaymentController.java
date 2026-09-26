package lk.karu.lodge.controller.api;

import lk.karu.lodge.entity.Booking;
import lk.karu.lodge.entity.BookingRoom;
import lk.karu.lodge.mail.BookingEventMail;
import lk.karu.lodge.provider.MailServiceProvider;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.persistence.LockModeType;
import lk.karu.lodge.util.AppUtil;
import lk.karu.lodge.util.HibernateUtil;
import org.hibernate.Session;
import org.hibernate.Transaction;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Locale;
import java.util.Map;

@RestController
@RequestMapping("/api/payments")
public class PaymentController {
    @PostMapping(path = "/notify", consumes = MediaType.APPLICATION_FORM_URLENCODED_VALUE)
    public ResponseEntity<String> notify(@RequestParam Map<String, String> form) {
        try (Session session = HibernateUtil.getSessionFactory().openSession()) {
            Transaction tx = session.beginTransaction();
            try {
                String merchant = form.get("merchant_id"), orderId = form.get("order_id");
                String amountRaw = form.get("payhere_amount"), currency = form.get("payhere_currency");
                String statusRaw = form.get("status_code"), signature = form.get("md5sig");
                if (!validSignature(form) || !property("payhere.merchant.id", "").equals(merchant)
                        || orderId == null || amountRaw == null || statusRaw == null || signature == null
                        || !"LKR".equals(currency)) {
                    tx.rollback();
                    return ResponseEntity.badRequest().body("INVALID SIGNATURE OR PAYMENT DETAILS");
                }
                Booking booking = session.createQuery("FROM Booking b WHERE b.bookingReference=:ref", Booking.class)
                        .setParameter("ref", orderId).setLockMode(LockModeType.PESSIMISTIC_WRITE).uniqueResult();
                if (booking == null || !"PayHere".equals(booking.getPaymentMethod())) {
                    tx.rollback();
                    return ResponseEntity.badRequest().body("UNKNOWN BOOKING");
                }
                BigDecimal expected = AppUtil.nz(booking.getTotalAmountLkr()).add(AppUtil.nz(booking.getTotalTaxesLkr())).setScale(2, RoundingMode.HALF_UP);
                BigDecimal received = new BigDecimal(amountRaw).setScale(2, RoundingMode.HALF_UP);
                if (expected.compareTo(received) != 0) {
                    tx.rollback();
                    return ResponseEntity.badRequest().body("AMOUNT MISMATCH");
                }
                int status = Integer.parseInt(statusRaw);
                boolean sendBookingAccepted = false;
                boolean sendPaymentAccepted = false;
                if (status == 2 && !"Cancelled".equals(booking.getBookingStatus())) {
                    sendBookingAccepted = !"Confirmed".equals(booking.getBookingStatus());
                    sendPaymentAccepted = !"Paid".equals(booking.getPaymentStatus());
                    booking.setPaymentStatus("Paid");
                    booking.setBookingStatus("Confirmed");
                } else if (status != 2 && "Pending".equals(booking.getPaymentStatus())) {
                    booking.setPaymentStatus("Failed");
                }
                tx.commit();
                if (sendBookingAccepted || sendPaymentAccepted) {
                    Booking mailBooking = session.createQuery("SELECT b FROM Booking b JOIN FETCH b.villa WHERE b.id=:id", Booking.class)
                            .setParameter("id", booking.getId()).uniqueResult();
                    if (mailBooking != null) {
                        if (sendBookingAccepted) MailServiceProvider.getInstance().sendMail(new BookingEventMail(
                                mailBooking, "Booking confirmed", "Booking confirmed", "The property has accepted your reservation."));
                        if (sendPaymentAccepted) MailServiceProvider.getInstance().sendMail(new BookingEventMail(
                                mailBooking, "Payment accepted", "Payment accepted", "PayHere verified your payment and your reservation is confirmed."));
                    }
                }
                return ResponseEntity.ok("OK");
            } catch (Exception e) {
                if (tx.isActive()) tx.rollback();
                return ResponseEntity.badRequest().body("INVALID NOTIFICATION");
            }
        }
    }

    @GetMapping(path = "/status", produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<String> status(@RequestParam("ref") String reference, HttpServletRequest request) {
        Integer sessionUserId = AuthController.sessionUserId(request);
        if (sessionUserId == null) return ResponseEntity.status(401).body("{\"status\":false,\"message\":\"Please sign in to view this reservation.\"}");
        try (Session session = HibernateUtil.getSessionFactory().openSession()) {
            Booking booking = session.createQuery("SELECT DISTINCT b FROM Booking b JOIN FETCH b.villa LEFT JOIN FETCH b.rooms WHERE b.bookingReference=:ref", Booking.class)
                    .setParameter("ref", reference).uniqueResult();
            if (booking == null) return ResponseEntity.notFound().build();
            if (booking.getUserId() == null || !booking.getUserId().equals(sessionUserId)) return ResponseEntity.notFound().build();
            var out = new com.google.gson.JsonObject();
            out.addProperty("status", true); out.addProperty("reference", booking.getBookingReference());
            out.addProperty("paymentStatus", booking.getPaymentStatus()); out.addProperty("paymentMethod", booking.getPaymentMethod());
            out.addProperty("bookingStatus", booking.getBookingStatus()); out.addProperty("guestName", booking.getLeadGuestName());
            out.addProperty("guestEmail", booking.getGuestEmail()); out.addProperty("guestPhone", booking.getGuestPhone());
            out.addProperty("villaName", booking.getVilla().getName()); out.addProperty("city", booking.getVilla().getCity());
            out.addProperty("checkIn", booking.getCheckInDate().toString()); out.addProperty("checkOut", booking.getCheckOutDate().toString());
            out.addProperty("nights", booking.getNightsCount()); out.addProperty("adults", booking.getAdultsCount()); out.addProperty("children", booking.getChildrenCount());
            out.addProperty("total", AppUtil.nz(booking.getTotalAmountLkr())); out.addProperty("taxes", AppUtil.nz(booking.getTotalTaxesLkr()));
            var rooms = new com.google.gson.JsonArray();
            for (BookingRoom room : booking.getRooms()) {
                var row = new com.google.gson.JsonObject(); row.addProperty("name", room.getRoomType().getName()); row.addProperty("quantity", room.getQuantity());
                row.addProperty("price", room.getPricePerNightLkr()); rooms.add(row);
            }
            out.add("rooms", rooms);
            return ResponseEntity.ok(AppUtil.GSON.toJson(out));
        } catch (Exception e) { return ResponseEntity.internalServerError().build(); }
    }

    private static boolean validSignature(Map<String, String> form) {
        String merchant = form.get("merchant_id"), order = form.get("order_id"), amount = form.get("payhere_amount");
        String currency = form.get("payhere_currency"), status = form.get("status_code"), signature = form.get("md5sig");
        if (merchant == null || order == null || amount == null || currency == null || status == null || signature == null) return false;
        String raw = merchant + order + amount + currency + status + md5(property("payhere.merchant.secret", "")).toUpperCase(Locale.ROOT);
        return md5(raw).equalsIgnoreCase(signature);
    }
    private static String property(String key, String fallback) {
        String env = System.getenv(key.toUpperCase(Locale.ROOT).replace('.', '_'));
        if (env != null && !env.isBlank()) return env;
        String value = AppUtil.property(key); return value == null || value.isBlank() ? fallback : value;
    }
    private static String md5(String value) {
        try {
            byte[] bytes = MessageDigest.getInstance("MD5").digest(value.getBytes(StandardCharsets.UTF_8));
            StringBuilder out = new StringBuilder(); for (byte b : bytes) out.append(String.format("%02x", b)); return out.toString();
        } catch (Exception e) { throw new IllegalStateException(e); }
    }
}
