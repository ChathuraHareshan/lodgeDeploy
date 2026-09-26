package lk.karu.lodge.service.admin;

import com.google.gson.JsonObject;
import lk.karu.lodge.util.AppUtil;
import lk.karu.lodge.util.HibernateUtil;
import org.hibernate.Session;
import org.hibernate.Transaction;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.regex.Pattern;

public final class AdminSupport {

    private AdminSupport() {
    }

    public static class AdminException extends RuntimeException {
        public AdminException(String message) {
            super(message);
        }
    }

    @FunctionalInterface
    public interface Work {
        void run(Session session, JsonObject out) throws Exception;
    }

    public static String read(String failMessage, Work work) {
        JsonObject out = new JsonObject();
        try (Session session = HibernateUtil.getSessionFactory().openSession()) {
            out.addProperty("status", true);
            work.run(session, out);
            return AppUtil.GSON.toJson(out);
        } catch (AdminException e) {
            return fail(e.getMessage());
        } catch (Exception e) {
            e.printStackTrace();
            return fail(failMessage);
        }
    }

    public static String write(String failMessage, Work work) {
        JsonObject out = new JsonObject();
        try (Session session = HibernateUtil.getSessionFactory().openSession()) {
            Transaction tx = session.beginTransaction();
            try {
                out.addProperty("status", true);
                work.run(session, out);
                tx.commit();
                return AppUtil.GSON.toJson(out);
            } catch (AdminException e) {
                rollback(tx);
                return fail(e.getMessage());
            } catch (Exception e) {
                rollback(tx);
                e.printStackTrace();
                return fail(failMessage);
            }
        } catch (Exception e) {
            e.printStackTrace();
            return fail(failMessage);
        }
    }

    private static void rollback(Transaction tx) {
        try {
            if (tx != null && tx.isActive()) tx.rollback();
        } catch (Exception ignored) {
        }
    }

    public static String fail(String message) {
        JsonObject o = new JsonObject();
        o.addProperty("status", false);
        o.addProperty("message", message);
        return AppUtil.GSON.toJson(o);
    }

    private static final Pattern SLUG = Pattern.compile("^[a-z0-9]+(-[a-z0-9]+)*$");
    private static final Pattern URL = Pattern.compile("^https?://\\S+$", Pattern.CASE_INSENSITIVE);
    private static final Pattern ICON = Pattern.compile("^fa-[a-z0-9-]+$");

    public static String trim(String s) {
        return s == null ? "" : s.trim();
    }

    public static String slugify(String s) {
        String slug = trim(s).toLowerCase().replaceAll("[^a-z0-9]+", "-").replaceAll("^-+|-+$", "");
        return slug;
    }

    public static boolean validSlug(String s) {
        return s != null && SLUG.matcher(s).matches();
    }

    public static boolean validUrl(String s) {
        return s != null && URL.matcher(s.trim()).matches();
    }

    public static String icon(String s) {
        return s != null && ICON.matcher(s.trim()).matches() ? s.trim() : "fa-circle-check";
    }

    public static void require(boolean ok, String message) {
        if (!ok) throw new AdminException(message);
    }

    public static void maxLen(String value, int max, String label) {
        if (value != null && value.length() > max) throw new AdminException(label + " is too long (max " + max + " characters)");
    }

    public static int discountPercent(BigDecimal original, BigDecimal sale) {
        if (original == null || sale == null || original.signum() <= 0 || sale.signum() <= 0 || sale.compareTo(original) > 0) return 0;
        return BigDecimal.ONE.subtract(sale.divide(original, 4, RoundingMode.HALF_UP))
                .multiply(BigDecimal.valueOf(100)).setScale(0, RoundingMode.HALF_UP).intValue();
    }

    public static int nz(Number n) {
        return n == null ? 0 : n.intValue();
    }
}
