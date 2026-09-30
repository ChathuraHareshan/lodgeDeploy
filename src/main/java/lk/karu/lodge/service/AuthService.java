package lk.karu.lodge.service;

import lk.karu.lodge.dto.AuthRequest;
import lk.karu.lodge.dto.MyBookingDTO;
import lk.karu.lodge.dto.UserDTO;
import lk.karu.lodge.entity.Booking;
import lk.karu.lodge.entity.BookingRoom;
import lk.karu.lodge.entity.Review;
import lk.karu.lodge.dto.ReviewRequest;
import lk.karu.lodge.entity.User;
import lk.karu.lodge.service.admin.AdminSupport;
import lk.karu.lodge.util.AppUtil;
import lk.karu.lodge.util.HibernateUtil;
import lk.karu.lodge.validation.Validator;
import org.hibernate.Session;
import org.mindrot.jbcrypt.BCrypt;

import java.time.LocalDate;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.Map;
import java.util.Arrays;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

import static lk.karu.lodge.service.admin.AdminSupport.require;
import static lk.karu.lodge.service.admin.AdminSupport.trim;


public class AuthService {

    public record Result(String json, Integer userId) {
    }

    public static final int MIN_PASSWORD = 8;
    public static final int MAX_PASSWORD = 72;

    private static final DateTimeFormatter DAY = DateTimeFormatter.ofPattern("yyyy-MM-dd");
    private static final DateTimeFormatter MONTH = DateTimeFormatter.ofPattern("MMMM yyyy", Locale.ENGLISH);
    private static final Set<String> COUNTRIES = new LinkedHashSet<>(Arrays.asList(Locale.getISOCountries()));

    private static final String DUMMY_HASH = BCrypt.hashpw("lodge-timing-dummy", BCrypt.gensalt(10));


    private static final int MAX_FAILS = 5;
    private static final long WINDOW_MS = 10 * 60 * 1000L;
    private static final ConcurrentHashMap<String, long[]> FAILS = new ConcurrentHashMap<>();

    private static void checkNotLocked(String email) {
        long[] f = FAILS.get(email);
        if (f != null && System.currentTimeMillis() - f[1] < WINDOW_MS && f[0] >= MAX_FAILS) {
            throw new AdminSupport.AdminException("Too many failed attempts. Please wait a few minutes and try again.");
        }
    }

    private static void recordFailure(String email) {
        long now = System.currentTimeMillis();
        FAILS.compute(email, (k, f) -> (f == null || now - f[1] >= WINDOW_MS) ? new long[]{1, now} : new long[]{f[0] + 1, f[1]});
    }


    private static final ZoneId LOCAL_ZONE = ZoneId.of("Asia/Colombo");

    public static LocalDate today() {
        return LocalDate.now(LOCAL_ZONE);
    }

    private static int cancelMinDays() {
        return Math.max(0, AppUtil.intProperty("booking.cancel.min.days", 3));
    }


    private static boolean stayEnded(Booking b, LocalDate today) {
        return "Completed".equals(b.getBookingStatus()) || !today.isBefore(b.getCheckOutDate());
    }

    private static boolean canCancel(Booking b, LocalDate today, int minDays) {
        boolean open = "Confirmed".equals(b.getBookingStatus()) || "Pending".equals(b.getBookingStatus());
        return open && ChronoUnit.DAYS.between(today, b.getCheckInDate()) > minDays;
    }

    public String cancelBooking(int userId, String reference) {
        return AdminSupport.write("Failed to cancel the reservation.", (session, out) -> {
            require(reference != null && !reference.isBlank(), "Reservation not found.");
            List<Booking> found = session.createQuery(
                            "FROM Booking b WHERE b.bookingReference = :r AND b.userId = :u", Booking.class)
                    .setParameter("r", reference.trim()).setParameter("u", userId).getResultList();
            require(!found.isEmpty(), "Reservation not found.");
            Booking b = found.get(0);

            require(!"Cancelled".equals(b.getBookingStatus()), "This reservation is already cancelled.");
            require("Confirmed".equals(b.getBookingStatus()) || "Pending".equals(b.getBookingStatus()), "This reservation can no longer be cancelled.");
            int minDays = cancelMinDays();
            require(canCancel(b, LocalDate.now(LOCAL_ZONE), minDays),
                    "Online cancellation closes " + minDays + " days before check-in. Please contact the villa to change or cancel this reservation.");

            b.setBookingStatus("Cancelled");
            b.setPaymentStatus("Cancelled");
            out.addProperty("message", "Reservation cancelled");
        });
    }


    private static BigDecimal stars(Integer v, String label) {
        require(v != null && v >= 1 && v <= 10, "Please rate " + label + " from 1 to 10.");
        return BigDecimal.valueOf(v).setScale(1);
    }

    public String submitReview(int userId, String reference, ReviewRequest r) {
        return AdminSupport.write("Failed to save your review.", (session, out) -> {
            require(r != null, "Invalid request.");
            User u = session.find(User.class, userId);
            require(u != null, "Account not found.");
            List<Booking> found = session.createQuery(
                            "FROM Booking b JOIN FETCH b.villa WHERE b.bookingReference = :r AND b.userId = :u", Booking.class)
                    .setParameter("r", trim(reference)).setParameter("u", userId).getResultList();
            require(!found.isEmpty(), "Reservation not found.");
            Booking b = found.get(0);

            require("Confirmed".equals(b.getBookingStatus()) || "Completed".equals(b.getBookingStatus()), "Only completed stays can be reviewed.");
            require(stayEnded(b, today()), "You can review this stay after you check out.");
            Long already = session.createQuery("SELECT COUNT(x) FROM Review x WHERE x.bookingId = :b", Long.class)
                    .setParameter("b", b.getId()).getSingleResult();
            require(already == 0, "You have already reviewed this stay.");

            BigDecimal cleanliness = stars(r.cleanliness, "cleanliness"), comfort = stars(r.comfort, "comfort"),
                    location = stars(r.location, "location"), facilities = stars(r.facilities, "facilities"),
                    staff = stars(r.staff, "staff"), value = stars(r.value, "value for money");
            String title = trim(r.title), text = trim(r.text);
            require(title.length() >= 3, "Give your review a short title.");
            require(title.length() <= 200, "The title is too long (max 200 characters).");
            require(text.length() >= 10, "Please write a few words about your stay (at least 10 characters).");
            require(text.length() <= 2000, "Your review is too long (max 2000 characters).");

            BigDecimal overall = cleanliness.add(comfort).add(location).add(facilities).add(staff).add(value)
                    .divide(BigDecimal.valueOf(6), 1, RoundingMode.HALF_UP);

            Review review = new Review();
            review.setVilla(b.getVilla());
            review.setUserId(userId);
            review.setBookingId(b.getId());
            review.setAuthorName(u.getFullName());
            review.setAuthorCountry(u.getCountryName() == null ? "Sri Lanka" : u.getCountryName());
            review.setAuthorFlag(u.getCountryFlag());
            review.setScore(overall);
            review.setCleanlinessScore(cleanliness);
            review.setComfortScore(comfort);
            review.setLocationScore(location);
            review.setFacilitiesScore(facilities);
            review.setStaffScore(staff);
            review.setValueScore(value);
            review.setReviewTitle(title);
            review.setReviewText(text);
            review.setStayDate(b.getCheckOutDate().format(MONTH));
            review.setVerified(true);
            review.setStatus("Pending");
            session.persist(review);
            out.addProperty("message", "Thank you! Your review will appear on the villa page once it has been approved.");
        });
    }


    public User findUser(int id) {
        try (Session session = HibernateUtil.getSessionFactory().openSession()) {
            return session.find(User.class, id);
        } catch (Exception e) {
            e.printStackTrace();
            return null;
        }
    }

    static User findByEmail(Session session, String email) {
        List<User> found = session.createQuery("FROM User u WHERE lower(u.email) = :e", User.class)
                .setParameter("e", email.toLowerCase()).setMaxResults(1).getResultList();
        return found.isEmpty() ? null : found.get(0);
    }

    static void validatePassword(String password) {
        require(password != null && password.length() >= MIN_PASSWORD, "Password must be at least " + MIN_PASSWORD + " characters.");
        require(password.length() <= MAX_PASSWORD, "Password can be at most " + MAX_PASSWORD + " characters.");
    }

    static String validatePhone(String phone) {
        String p = trim(phone);
        require(p.length() <= 30, "Phone number is too long.");
        require(p.isEmpty() || p.matches("^[0-9+()\\-. ]+$"), "Phone number may only contain digits, spaces and + ( ) - .");
        return p.isEmpty() ? null : p;
    }


    static User newUser(String fullName, String email, String phone, String password, String countryCode) {
        String code = countryCode == null || countryCode.isBlank() ? "LK" : countryCode.trim().toUpperCase();
        require(COUNTRIES.contains(code), "Please choose a valid country.");
        User u = new User();
        u.setFullName(fullName);
        u.setEmail(email.toLowerCase());
        u.setPasswordHash(BCrypt.hashpw(password, BCrypt.gensalt(10)));
        u.setPhoneNumber(phone);
        applyCountry(u, code);
        u.setRole("guest");
        u.setAccountStatus("Active");
        u.setGeniusLevel(1);
        return u;
    }

    private static void applyCountry(User u, String code) {
        u.setCountryCode(code);
        u.setCountryName(new Locale("", code).getDisplayCountry(Locale.ENGLISH));

        u.setCountryFlag(new String(Character.toChars(0x1F1E6 + code.charAt(0) - 'A'))
                + new String(Character.toChars(0x1F1E6 + code.charAt(1) - 'A')));
    }

    static UserDTO toDTO(User u) {
        return new UserDTO(u.getId(), u.getFullName(), u.getEmail(), u.getPhoneNumber() == null ? "" : u.getPhoneNumber(),
                u.getCountryCode(), u.getCountryName(), u.getCountryFlag(), u.getRole() == null ? "guest" : u.getRole(),
                AppUtil.nz(u.getGeniusLevel()), u.getCreatedAt() == null ? "" : u.getCreatedAt().format(MONTH));
    }



    public Result register(AuthRequest r) {
        Integer[] id = new Integer[1];
        String json = AdminSupport.write("Failed to create the account. Please try again.", (session, out) -> {
            require(r != null, "Invalid request.");
            String name = trim(r.fullName);
            String email = trim(r.email);
            require(!name.isEmpty(), "Please enter your full name.");
            require(name.length() <= 150, "Name is too long.");
            require(!email.isEmpty(), "Please enter your email address.");
            require(email.length() <= 150 && email.matches(Validator.EMAIL_VALIDATION), "Please enter a valid email address.");
            validatePassword(r.password);
            String phone = validatePhone(r.phone);
            require(findByEmail(session, email) == null, "An account with this email already exists. Please sign in instead.");

            User u = newUser(name, email, phone, r.password, r.countryCode);
            session.persist(u);
            session.flush();
            id[0] = u.getId();
            out.add("user", AppUtil.GSON.toJsonTree(toDTO(u)));
            out.addProperty("message", "Account created");
        });
        return new Result(json, id[0]);
    }

    public Result login(AuthRequest r) {
        Integer[] id = new Integer[1];
        String json = AdminSupport.write("Sign in failed. Please try again.", (session, out) -> {
            require(r != null && !trim(r.email).isEmpty() && r.password != null && !r.password.isEmpty(), "Enter your email and password.");
            String email = trim(r.email).toLowerCase();
            checkNotLocked(email);

            User u = findByEmail(session, email);
            boolean ok;
            try {
                ok = BCrypt.checkpw(r.password.length() > MAX_PASSWORD ? r.password.substring(0, MAX_PASSWORD) : r.password,
                        u == null ? DUMMY_HASH : u.getPasswordHash()) && u != null;
            } catch (IllegalArgumentException badHash) {
                ok = false;
            }
            if (!ok) {
                recordFailure(email);
                throw new AdminSupport.AdminException("Incorrect email or password.");
            }
            FAILS.remove(email);
            id[0] = u.getId();
            out.add("user", AppUtil.GSON.toJsonTree(toDTO(u)));
        });
        return new Result(json, id[0]);
    }


    public String me(Integer userId) {
        return AdminSupport.read("Failed to load your account.", (session, out) -> {
            User u = userId == null ? null : session.find(User.class, userId);
            out.addProperty("loggedIn", u != null);
            if (u != null) out.add("user", AppUtil.GSON.toJsonTree(toDTO(u)));
        });
    }

    public String updateProfile(int userId, AuthRequest r) {
        return AdminSupport.write("Failed to save your profile.", (session, out) -> {
            User u = session.find(User.class, userId);
            require(u != null, "Account not found.");
            require(r != null, "Invalid request.");
            String name = trim(r.fullName);
            require(!name.isEmpty(), "Please enter your full name.");
            require(name.length() <= 150, "Name is too long.");
            String phone = validatePhone(r.phone);
            String code = trim(r.countryCode).isEmpty() ? u.getCountryCode() : trim(r.countryCode).toUpperCase();
            require(code != null && COUNTRIES.contains(code), "Please choose a valid country.");
            u.setFullName(name);
            u.setPhoneNumber(phone);
            if (!code.equals(u.getCountryCode())) applyCountry(u, code);
            out.add("user", AppUtil.GSON.toJsonTree(toDTO(u)));
        });
    }

    public String changePassword(int userId, AuthRequest r) {
        return AdminSupport.write("Failed to change your password.", (session, out) -> {
            User u = session.find(User.class, userId);
            require(u != null, "Account not found.");
            require(r != null && r.currentPassword != null && !r.currentPassword.isEmpty(), "Enter your current password.");
            boolean ok;
            try {
                ok = BCrypt.checkpw(r.currentPassword.length() > MAX_PASSWORD ? r.currentPassword.substring(0, MAX_PASSWORD) : r.currentPassword, u.getPasswordHash());
            } catch (IllegalArgumentException e) {
                ok = false;
            }
            require(ok, "Your current password is incorrect.");
            validatePassword(r.newPassword);
            require(!r.newPassword.equals(r.currentPassword), "Choose a password different from your current one.");
            u.setPasswordHash(BCrypt.hashpw(r.newPassword, BCrypt.gensalt(10)));
        });
    }


    public String myBookings(int userId) {
        return AdminSupport.read("Failed to load your reservations.", (session, out) -> {
            List<Booking> bookings = session.createQuery(
                            "SELECT DISTINCT b FROM Booking b JOIN FETCH b.villa LEFT JOIN FETCH b.rooms " +
                                    "WHERE b.userId = :id ORDER BY b.checkInDate DESC, b.id DESC", Booking.class)
                    .setParameter("id", userId).getResultList();

            List<MyBookingDTO> rows = new ArrayList<>();
            LocalDate today = LocalDate.now(LOCAL_ZONE);
            int minDays = cancelMinDays();
            Map<Integer, String> reviews = new HashMap<>();
            for (Object[] row : session.createQuery("SELECT r.bookingId, r.status FROM Review r WHERE r.userId = :u AND r.bookingId IS NOT NULL", Object[].class)
                    .setParameter("u", userId).getResultList()) {
                reviews.put((Integer) row[0], row[1] == null ? "Approved" : (String) row[1]);
            }
            for (Booking b : bookings) {
                Set<String> policies = new LinkedHashSet<>();
                List<MyBookingDTO.Room> rooms = new ArrayList<>();
                for (BookingRoom br : b.getRooms()) {
                    rooms.add(new MyBookingDTO.Room(br.getRoomType().getName(), AppUtil.nz(br.getQuantity())));
                    if (br.getRoomType().getCancellationPolicy() != null) policies.add(br.getRoomType().getCancellationPolicy());
                }
                rows.add(new MyBookingDTO(b.getBookingReference(), b.getVilla().getName(), b.getVilla().getSlug(),
                        b.getVilla().getHeroImage(), b.getVilla().getCity(), b.getCheckInDate().format(DAY), b.getCheckOutDate().format(DAY),
                        AppUtil.nz(b.getNightsCount()), AppUtil.nz(b.getAdultsCount()), AppUtil.nz(b.getChildrenCount()),
                        AppUtil.nz(b.getTotalAmountLkr()), AppUtil.nz(b.getTotalTaxesLkr()), b.getPaymentMethod(), b.getPaymentStatus(),
                        b.getBookingStatus(), b.getSpecialRequests() == null ? "" : b.getSpecialRequests(),
                        b.getCreatedAt() == null ? "" : b.getCreatedAt().format(DAY), b.getLeadGuestName(), rooms, String.join(" / ", policies),
                        canCancel(b, today, minDays), b.getCheckInDate().minusDays(minDays + 1L).format(DAY), minDays,
                        ("Confirmed".equals(b.getBookingStatus()) || "Completed".equals(b.getBookingStatus()))
                                && stayEnded(b, today) && !reviews.containsKey(b.getId()),
                        reviews.get(b.getId()), b.getGuestEmail(), b.getGuestPhone()));
            }
            out.add("bookings", AppUtil.GSON.toJsonTree(rows));
        });
    }
}
