package lk.karu.lodge.service;

import com.google.gson.JsonObject;
import lk.karu.lodge.util.AppUtil;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

public class CurrencyService {

    private static final String LIVE_URL = "https://open.er-api.com/v6/latest/USD";
    private static final Duration CACHE_TTL = Duration.ofHours(6);
    private static final DateTimeFormatter STAMP = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm");

    private static volatile double cachedRate = 0;
    private static volatile String cachedSource = "";
    private static volatile LocalDateTime cachedAt = null;

    public JsonObject rates() {
        double fallback = configuredRate();

        if (cachedRate <= 0 || cachedAt == null || Duration.between(cachedAt, LocalDateTime.now()).compareTo(CACHE_TTL) > 0) {
            refresh(fallback);
        }

        JsonObject out = new JsonObject();
        out.addProperty("status", true);
        out.addProperty("base", "LKR");
        out.addProperty("lkrPerUsd", cachedRate > 0 ? cachedRate : fallback);
        out.addProperty("source", cachedRate > 0 ? cachedSource : "configured");
        out.addProperty("date", LocalDate.now().toString());
        out.addProperty("updatedAt", cachedAt == null ? "" : cachedAt.format(STAMP));
        return out;
    }

    private synchronized void refresh(double fallback) {

        if (cachedAt != null && Duration.between(cachedAt, LocalDateTime.now()).compareTo(CACHE_TTL) <= 0) return;
        try {
            HttpClient client = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(4)).build();
            HttpRequest req = HttpRequest.newBuilder(URI.create(LIVE_URL)).timeout(Duration.ofSeconds(5)).GET().build();
            HttpResponse<String> res = client.send(req, HttpResponse.BodyHandlers.ofString());
            if (res.statusCode() == 200) {
                JsonObject body = AppUtil.GSON.fromJson(res.body(), JsonObject.class);
                JsonObject rates = body.has("rates") ? body.getAsJsonObject("rates") : null;
                if (rates != null && rates.has("LKR")) {
                    double live = rates.get("LKR").getAsDouble();
                    if (live > 0) {
                        cachedRate = live;
                        cachedSource = "live";
                        cachedAt = LocalDateTime.now();
                        return;
                    }
                }
            }
        } catch (Exception ignored) {

        }
        if (cachedRate <= 0) {
            cachedRate = fallback;
            cachedSource = "configured";
            cachedAt = LocalDateTime.now();
        }
    }

    private static double configuredRate() {
        double rate = 330;
        try {
            double parsed = Double.parseDouble(AppUtil.property("currency.usd.rate").trim());
            if (parsed > 0) rate = parsed;
        } catch (Exception ignored) {
        }
        return rate;
    }
}
