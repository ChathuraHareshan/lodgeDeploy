package lk.karu.lodge.service.admin;

import lk.karu.lodge.dto.admin.AdminUserDTO;
import lk.karu.lodge.entity.Booking;
import lk.karu.lodge.entity.Review;
import lk.karu.lodge.entity.User;
import lk.karu.lodge.util.AppUtil;
import org.hibernate.Session;

import java.math.BigDecimal;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

import static lk.karu.lodge.service.admin.AdminSupport.require;

public class AdminUserService {

    public static final Set<String> ROLES = Set.of("guest", "host", "admin");
    public static final Set<String> STATUSES = Set.of("Active", "Suspended");
    private static final DateTimeFormatter DAY = DateTimeFormatter.ofPattern("yyyy-MM-dd");

    public String loadAll() {
        return AdminSupport.read("Failed to load users.", (session, out) -> {
            List<User> users = session.createQuery("FROM User u ORDER BY u.id DESC", User.class).getResultList();

            Map<Integer, int[]> bookingStats = new HashMap<>();
            Map<Integer, BigDecimal> spend = new HashMap<>();
            List<Booking> bookings = session.createQuery("FROM Booking b WHERE b.userId IS NOT NULL", Booking.class).getResultList();
            for (Booking b : bookings) {
                Integer uid = b.getUserId();
                bookingStats.computeIfAbsent(uid, k -> new int[1])[0]++;
                if (!"Cancelled".equals(b.getBookingStatus())) {
                    spend.merge(uid, AppUtil.nz(b.getTotalAmountLkr()), BigDecimal::add);
                }
            }

            Map<Integer, Integer> reviewCounts = new HashMap<>();
            List<Review> reviews = session.createQuery("FROM Review r WHERE r.userId IS NOT NULL", Review.class).getResultList();
            for (Review r : reviews) reviewCounts.merge(r.getUserId(), 1, Integer::sum);

            out.add("users", AppUtil.GSON.toJsonTree(users.stream()
                    .map(u -> toDTO(u, bookingStats, spend, reviewCounts)).toList()));
        });
    }

    public String updateRole(int id, String role) {
        return AdminSupport.write("Failed to update the user's role.", (session, out) -> {
            require(role != null && ROLES.contains(role.toLowerCase()), "Invalid role.");
            User u = session.find(User.class, id);
            require(u != null, "User not found.");
            u.setRole(role.toLowerCase());
        });
    }

    public String updateStatus(int id, String status) {
        return AdminSupport.write("Failed to update the user's status.", (session, out) -> {
            require(status != null && STATUSES.contains(status), "Invalid account status.");
            User u = session.find(User.class, id);
            require(u != null, "User not found.");
            require(!("admin".equalsIgnoreCase(u.getRole()) && "Suspended".equals(status)), "Admin accounts can't be suspended.");
            u.setAccountStatus(status);
        });
    }

    public String delete(int id) {
        return AdminSupport.write("Failed to delete the user.", (session, out) -> {
            User u = session.find(User.class, id);
            require(u != null, "User not found.");
            require(!"admin".equalsIgnoreCase(u.getRole()), "Admin accounts can't be deleted here.");
            session.remove(u);
        });
    }

    private static AdminUserDTO toDTO(User u, Map<Integer, int[]> bookingStats, Map<Integer, BigDecimal> spend, Map<Integer, Integer> reviewCounts) {
        int bookings = bookingStats.containsKey(u.getId()) ? bookingStats.get(u.getId())[0] : 0;
        BigDecimal total = spend.getOrDefault(u.getId(), BigDecimal.ZERO);
        int reviews = reviewCounts.getOrDefault(u.getId(), 0);
        return new AdminUserDTO(u.getId(), u.getFullName(), u.getEmail(), u.getPhoneNumber(), u.getCountryName(),
                u.getCountryFlag(), u.getRole() == null ? "guest" : u.getRole(),
                u.getAccountStatus() == null ? "Active" : u.getAccountStatus(), AppUtil.nz(u.getGeniusLevel()),
                bookings, total, reviews, u.getCreatedAt() == null ? "" : u.getCreatedAt().format(DAY));
    }
}
