package lk.karu.lodge.service;

import com.google.gson.JsonObject;
import jakarta.persistence.LockModeType;
import lk.karu.lodge.dto.BookingRequestDTO;
import lk.karu.lodge.entity.Booking;
import lk.karu.lodge.entity.BookingRoom;
import lk.karu.lodge.entity.RoomType;
import lk.karu.lodge.entity.User;
import lk.karu.lodge.entity.Villa;
import lk.karu.lodge.mail.BookingEventMail;
import lk.karu.lodge.provider.MailServiceProvider;
import lk.karu.lodge.util.AppUtil;
import lk.karu.lodge.util.HibernateUtil;
import lk.karu.lodge.validation.Validator;
import org.hibernate.Session;
import org.hibernate.Transaction;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.LinkedHashSet;
import java.util.Map;
import java.util.Set;
import java.util.TreeMap;
import java.util.function.Consumer;

public class BookingService {


    private static class BookingException extends RuntimeException {
        BookingException(String message) {
            super(message);
        }
    }


    private static class AccountExistsException extends BookingException {
        AccountExistsException() {
            super("An account already exists for this email. Please sign in to complete your reservation.");
        }
    }


    public String createBooking(BookingRequestDTO dto, Integer loggedInUserId, Consumer<Integer> onAccountCreated) {

        JsonObject responseObject = new JsonObject();
        boolean status = false;
        String message = "";

        LocalDate today = LocalDate.now();
        int maxNights = AppUtil.intProperty("booking.max.nights", 30);
        LocalDate checkIn = dto == null ? null : AppUtil.parseDate(dto.checkIn());
        LocalDate checkOut = dto == null ? null : AppUtil.parseDate(dto.checkOut());

        User member = loggedInUserId == null ? null : new AuthService().findUser(loggedInUserId);
        String leadName = dto == null ? null : (!AppUtil.isBlank(dto.leadGuestName()) ? dto.leadGuestName().trim() : member != null ? member.getFullName() : null);
        String guestEmail = dto == null ? null : (!AppUtil.isBlank(dto.guestEmail()) ? dto.guestEmail().trim() : member != null ? member.getEmail() : null);
        String guestPhone = dto == null ? null : (!AppUtil.isBlank(dto.guestPhone()) ? dto.guestPhone().trim() : member != null ? member.getPhoneNumber() : null);


        if (dto == null) {
            message = "Invalid request";
        } else if (AppUtil.isBlank(dto.villaSlug())) {
            message = "Villa is required";
        } else if (checkIn == null) {
            message = "Please select a valid check-in date";
        } else if (checkOut == null) {
            message = "Please select a valid check-out date";
        } else if (checkIn.isBefore(today)) {
            message = "Check-in date can't be in the past";
        } else if (!checkOut.isAfter(checkIn)) {
            message = "Check-out must be after check-in";
        } else if (ChronoUnit.DAYS.between(checkIn, checkOut) > maxNights) {
            message = "You can book a maximum of " + maxNights + " nights";
        } else if (dto.adults() == null || dto.adults() < 1) {
            message = "At least one adult is required";
        } else if (dto.children() != null && dto.children() < 0) {
            message = "Invalid number of children";
        } else if (dto.paymentMethod() != null && !dto.paymentMethod().equalsIgnoreCase("PayNow") && !dto.paymentMethod().equalsIgnoreCase("PayAtVilla")) {
            message = "Please choose Pay at Villa or Pay Now";
        } else if ("PayNow".equalsIgnoreCase(dto.paymentMethod()) && (property("payhere.merchant.id", "").isBlank() || property("payhere.merchant.secret", "").isBlank())) {
            message = "Online payment is not configured yet. Please choose Pay at Villa or contact the property.";
        } else if (dto.rooms() == null || dto.rooms().isEmpty()) {
            message = "Please select at least one room";
        } else if (AppUtil.isBlank(leadName)) {
            message = "Lead guest name is required";
        } else if (leadName.length() > 150) {
            message = "Guest name is too long";
        } else if (AppUtil.isBlank(guestEmail)) {
            message = "Email is required";
        } else if (guestEmail.length() > 150 || !guestEmail.matches(Validator.EMAIL_VALIDATION)) {
            message = "Please enter a valid email address";
        } else if (guestPhone != null && guestPhone.length() > 30) {
            message = "Phone number is too long";
        } else if (member == null && (dto.password() == null || dto.password().length() < AuthService.MIN_PASSWORD)) {
            message = "Create a password of at least " + AuthService.MIN_PASSWORD + " characters to save your reservation";
        } else if (member == null && dto.password().length() > AuthService.MAX_PASSWORD) {
            message = "Password can be at most " + AuthService.MAX_PASSWORD + " characters";
        } else if (dto.specialRequests() != null && dto.specialRequests().length() > 2000) {
            message = "Special requests are too long";
        } else {

            int adults = dto.adults();
            int children = dto.children() == null ? 0 : dto.children();
            long nights = ChronoUnit.DAYS.between(checkIn, checkOut);


            Map<Integer, Integer> wanted = new TreeMap<>();
            boolean invalidRoom = false;
            for (BookingRequestDTO.RoomSelection sel : dto.rooms()) {
                if (sel == null || sel.roomTypeId() == null || sel.quantity() == null || sel.quantity() < 1) {
                    invalidRoom = true;
                    break;
                }
                wanted.merge(sel.roomTypeId(), sel.quantity(), Integer::sum);
            }

            if (invalidRoom) {
                message = "Invalid room selection";
            } else {
                try (Session hibernateSession = HibernateUtil.getSessionFactory().openSession()) {
                    Transaction transaction = hibernateSession.beginTransaction();

                    try {
                        Villa villa = hibernateSession.createNamedQuery("Villa.getBySlug", Villa.class)
                                .setParameter("slug", dto.villaSlug().trim())
                                .uniqueResult();
                        if (villa == null) throw new BookingException("Villa not found");


                        User owner = member;
                        boolean accountCreated = false;
                        if (owner == null) {
                            if (AuthService.findByEmail(hibernateSession, guestEmail) != null) throw new AccountExistsException();
                            owner = AuthService.newUser(leadName, guestEmail, guestPhone, dto.password(), null);
                            hibernateSession.persist(owner);
                            accountCreated = true;
                        } else if (AppUtil.isBlank(member.getPhoneNumber()) && guestPhone != null) {
                            User managed = hibernateSession.find(User.class, member.getId());
                            if (managed != null) managed.setPhoneNumber(guestPhone);
                        }

                        AvailabilityService availability = new AvailabilityService();

                        Booking booking = new Booking();
                        BigDecimal totalAmount = BigDecimal.ZERO;
                        BigDecimal totalTaxes = BigDecimal.ZERO;
                        int capacity = 0;
                        Set<String> policies = new LinkedHashSet<>();

                        for (Map.Entry<Integer, Integer> entry : wanted.entrySet()) {

                            RoomType roomType = hibernateSession.find(RoomType.class, entry.getKey(),
                                    LockModeType.PESSIMISTIC_WRITE);

                            if (roomType == null || roomType.getVilla().getId() != villa.getId()) {
                                throw new BookingException("Selected room is not available at this villa");
                            }

                            int qty = entry.getValue();
                            long booked = availability.bookedForRoom(hibernateSession, roomType.getId(), checkIn, checkOut);
                            long left = AppUtil.nz(roomType.getStockQuantity()) - booked;

                            if (qty > left) {
                                throw new BookingException(left <= 0
                                        ? roomType.getName() + " is sold out for the selected dates"
                                        : "Only " + left + " x " + roomType.getName() + " left for the selected dates");
                            }

                            BigDecimal nightsBd = BigDecimal.valueOf(nights);
                            BigDecimal qtyBd = BigDecimal.valueOf(qty);
                            BigDecimal price = AppUtil.nz(roomType.getDiscountPriceLkr());
                            BigDecimal lineTotal = price.multiply(qtyBd).multiply(nightsBd);

                            totalAmount = totalAmount.add(lineTotal);
                            totalTaxes = totalTaxes.add(AppUtil.nz(roomType.getTaxesLkr()).multiply(qtyBd).multiply(nightsBd));
                            capacity += qty * AppUtil.nz(roomType.getMaxGuests());
                            if (!AppUtil.isBlank(roomType.getCancellationPolicy())) {
                                policies.add(roomType.getCancellationPolicy());
                            }

                            BookingRoom line = new BookingRoom();
                            line.setBooking(booking);
                            line.setRoomType(roomType);
                            line.setQuantity(qty);
                            line.setPricePerNightLkr(price);
                            line.setTotalPriceLkr(lineTotal);
                            booking.getRooms().add(line);
                        }

                        if (adults + children > capacity) {
                            throw new BookingException("The selected rooms sleep " + capacity
                                    + " guests at most. Please add more rooms.");
                        }

                        booking.setBookingReference(uniqueReference(hibernateSession));
                        booking.setVilla(villa);
                        booking.setUserId(owner.getId());
                        booking.setLeadGuestName(leadName);
                        booking.setGuestEmail(guestEmail);
                        booking.setGuestPhone(AppUtil.isBlank(guestPhone) ? null : guestPhone);
                        booking.setSpecialRequests(AppUtil.isBlank(dto.specialRequests()) ? null : dto.specialRequests().trim());
                        booking.setCheckInDate(checkIn);
                        booking.setCheckOutDate(checkOut);
                        booking.setNightsCount((int) nights);
                        booking.setAdultsCount(adults);
                        booking.setChildrenCount(children);
                        booking.setTotalAmountLkr(totalAmount);
                        booking.setTotalTaxesLkr(totalTaxes);
                        boolean payNow = "PayNow".equalsIgnoreCase(dto.paymentMethod());
                        booking.setPaymentMethod(payNow ? "PayHere" : "Pay at Villa");
                        booking.setPaymentStatus(payNow ? "Pending" : "PayAtProperty");
                        booking.setBookingStatus(payNow ? "Pending" : "Confirmed");

                        hibernateSession.persist(booking);
                        transaction.commit();


                        try {
                            String notice = payNow
                                    ? "Your reservation is held while your PayHere payment is completed. We will email you again when it is accepted."
                                    : "Your reservation has been received and is confirmed for payment at the villa.";
                            MailServiceProvider.getInstance().sendMail(new BookingEventMail(
                                    booking, "Reservation received", "Reservation received", notice));
                        } catch (Exception mailException) {
                            mailException.printStackTrace();
                        }

                        if (accountCreated && onAccountCreated != null) {
                            try {
                                onAccountCreated.accept(owner.getId());
                            } catch (Exception signInException) {
                                signInException.printStackTrace();
                            }
                        }
                        responseObject.addProperty("accountCreated", accountCreated);

                        status = true;
                        message = payNow ? "Reservation held. Continue to PayHere to confirm your payment." : "Reservation confirmed";
                        responseObject.addProperty("reference", booking.getBookingReference());
                        responseObject.addProperty("guestName", booking.getLeadGuestName());
                        responseObject.addProperty("nights", nights);
                        responseObject.addProperty("totalAmountLkr", totalAmount);
                        responseObject.addProperty("totalTaxesLkr", totalTaxes);
                        responseObject.addProperty("cancellation", String.join(" / ", policies));
                        responseObject.addProperty("paymentMethod", booking.getPaymentMethod());
                        responseObject.addProperty("paymentStatus", booking.getPaymentStatus());
                        responseObject.addProperty("bookingStatus", booking.getBookingStatus());
                        if (payNow) {
                            BigDecimal charge = totalAmount.add(totalTaxes).setScale(2, RoundingMode.HALF_UP);
                            String baseUrl = property("app.public.url", "http://localhost:8080/lodge");
                            JsonObject payment = new JsonObject();
                            payment.addProperty("merchant_id", property("payhere.merchant.id", ""));
                            payment.addProperty("return_url", baseUrl + "/payment-result.html?ref=" + booking.getBookingReference());
                            payment.addProperty("cancel_url", baseUrl + "/payment-result.html?ref=" + booking.getBookingReference() + "&cancelled=1");
                            payment.addProperty("notify_url", baseUrl + "/api/payments/notify");
                            payment.addProperty("first_name", leadName);
                            payment.addProperty("last_name", "-");
                            payment.addProperty("email", guestEmail);
                            payment.addProperty("phone", guestPhone == null ? "" : guestPhone);
                            payment.addProperty("address", villa.getName());
                            payment.addProperty("city", "Sri Lanka");
                            payment.addProperty("country", "Sri Lanka");
                            payment.addProperty("order_id", booking.getBookingReference());
                            payment.addProperty("items", villa.getName() + " reservation");
                            payment.addProperty("currency", "LKR");
                            payment.addProperty("amount", charge.toPlainString());
                            payment.addProperty("hash", payHereHash(booking.getBookingReference(), charge));
                            payment.addProperty("sandbox", Boolean.parseBoolean(property("payhere.sandbox", "true")));
                            responseObject.add("paymentDetails", payment);
                        }

                    } catch (AccountExistsException e) {
                        rollback(transaction);
                        message = e.getMessage();
                        responseObject.addProperty("accountExists", true);
                    } catch (BookingException e) {
                        rollback(transaction);
                        message = e.getMessage();
                    } catch (Exception e) {
                        e.printStackTrace();
                        rollback(transaction);
                        message = "Reservation failed. Please try again";
                    }
                } catch (Exception e) {
                    e.printStackTrace();
                    message = "Reservation failed. Please try again";
                }
            }
        }

        responseObject.addProperty("status", status);
        responseObject.addProperty("message", message);
        return AppUtil.GSON.toJson(responseObject);
    }

    private static void rollback(Transaction transaction) {
        try {
            if (transaction.isActive()) transaction.rollback();
        } catch (Exception ignored) {
        }
    }

    private static String uniqueReference(Session session) {
        for (int i = 0; i < 10; i++) {
            String ref = AppUtil.generateBookingReference();
            Long count = session.createQuery("SELECT COUNT(b) FROM Booking b WHERE b.bookingReference = :ref", Long.class)
                    .setParameter("ref", ref)
                    .getSingleResult();
            if (count == 0) return ref;
        }
        throw new BookingException("Could not generate a booking reference. Please try again");
    }

    private static String property(String key, String fallback) {
        String env = System.getenv(key.toUpperCase().replace('.', '_'));
        if (env != null && !env.isBlank()) return env;
        String configured = AppUtil.property(key);
        return configured == null || configured.isBlank() ? fallback : configured;
    }

    private static String payHereHash(String orderId, BigDecimal amount) {
        String merchantId = property("payhere.merchant.id", "");
        String secret = property("payhere.merchant.secret", "");
        String secretHash = md5(secret).toUpperCase();
        return md5(merchantId + orderId + amount.setScale(2, RoundingMode.HALF_UP).toPlainString() + "LKR" + secretHash).toUpperCase();
    }

    private static String md5(String value) {
        try {
            byte[] bytes = java.security.MessageDigest.getInstance("MD5").digest(value.getBytes(java.nio.charset.StandardCharsets.UTF_8));
            StringBuilder result = new StringBuilder();
            for (byte b : bytes) result.append(String.format("%02x", b));
            return result.toString();
        } catch (java.security.NoSuchAlgorithmException e) { throw new IllegalStateException(e); }
    }
}
