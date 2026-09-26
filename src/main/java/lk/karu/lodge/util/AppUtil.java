package lk.karu.lodge.util;

import com.google.gson.Gson;
import com.google.gson.GsonBuilder;

import java.io.IOException;
import java.io.InputStream;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.util.Properties;
import java.util.concurrent.ThreadLocalRandom;

public class AppUtil {

    public static final Gson GSON = new GsonBuilder().disableHtmlEscaping().create();

    private static final Properties PROPERTIES = new Properties();

    static {
        try (InputStream in = AppUtil.class.getClassLoader().getResourceAsStream("application.properties")) {
            if (in != null) PROPERTIES.load(in);
        } catch (IOException e) {
            e.printStackTrace();
        }
    }

    public static int intProperty(String key, int defaultValue) {
        try {
            return Integer.parseInt(PROPERTIES.getProperty(key, String.valueOf(defaultValue)).trim());
        } catch (NumberFormatException e) {
            return defaultValue;
        }
    }

    public static String property(String key) {
        String env = System.getenv(key.toUpperCase(java.util.Locale.ROOT).replace('.', '_'));
        if (env != null && !env.isBlank()) return env;
        return PROPERTIES.getProperty(key);
    }

    public static LocalDate parseDate(String value) {
        if (value == null || value.isBlank()) return null;
        try {
            return LocalDate.parse(value.trim());
        } catch (DateTimeParseException e) {
            return null;
        }
    }

    public static String generateBookingReference() {
        return "SL-BK-" + ThreadLocalRandom.current().nextInt(100000, 1000000);
    }

    public static int nz(Integer v) {
        return v == null ? 0 : v;
    }

    public static BigDecimal nz(BigDecimal v) {
        return v == null ? BigDecimal.ZERO : v;
    }

    public static boolean isBlank(String s) {
        return s == null || s.isBlank();
    }
}
