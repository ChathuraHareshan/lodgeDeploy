package lk.karu.lodge.service.admin;

import lk.karu.lodge.entity.Region;
import lk.karu.lodge.util.AppUtil;
import org.hibernate.Session;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

public class AdminMetaService {

    public static final List<String> FACILITY_CATEGORIES = List.of("General", "Wellness", "Dining", "Services", "Activities");

    public String loadMeta() {
        return AdminSupport.read("Failed to load form data.", (session, out) -> {

            List<Map<String, Object>> regions = new ArrayList<>();
            for (Region r : session.createQuery("FROM Region r ORDER BY r.name", Region.class).getResultList()) {
                Map<String, Object> m = new LinkedHashMap<>();
                m.put("id", r.getId());
                m.put("name", r.getName());
                regions.add(m);
            }

            out.add("regions", AppUtil.GSON.toJsonTree(regions));
            out.add("facilityCategories", AppUtil.GSON.toJsonTree(FACILITY_CATEGORIES));
            out.add("facilities", AppUtil.GSON.toJsonTree(AdminFacilityService.list(session)));
            out.add("roomFeatures", AppUtil.GSON.toJsonTree(AdminRoomFeatureService.list(session)));

            out.add("propertyTypes", AppUtil.GSON.toJsonTree(distinct(session, "SELECT DISTINCT v.propertyType FROM Villa v ORDER BY v.propertyType")));
            out.add("dealTypes", AppUtil.GSON.toJsonTree(distinct(session, "SELECT DISTINCT v.dealType FROM Villa v ORDER BY v.dealType")));
            out.add("nearbyTypes", AppUtil.GSON.toJsonTree(distinct(session, "SELECT DISTINCT n.locationType FROM NearbyLocation n ORDER BY n.locationType")));
            out.add("cancellationPolicies", AppUtil.GSON.toJsonTree(distinct(session, "SELECT DISTINCT r.cancellationPolicy FROM RoomType r ORDER BY r.cancellationPolicy")));
            out.add("prepaymentPolicies", AppUtil.GSON.toJsonTree(distinct(session, "SELECT DISTINCT r.prepaymentPolicy FROM RoomType r ORDER BY r.prepaymentPolicy")));

            List<Object[]> rows = session.createQuery(
                    "SELECT h.icon, h.title, h.description, h.score FROM PropertyHighlight h ORDER BY h.id", Object[].class).getResultList();
            Set<String> seen = new LinkedHashSet<>();
            List<Map<String, Object>> presets = new ArrayList<>();
            for (Object[] row : rows) {
                String title = (String) row[1];
                if (title == null || !seen.add(title.trim().toLowerCase())) continue;
                Map<String, Object> m = new LinkedHashMap<>();
                m.put("icon", row[0]);
                m.put("title", title);
                m.put("description", row[2] == null ? "" : row[2]);
                m.put("score", row[3] == null ? "" : row[3]);
                presets.add(m);
            }
            out.add("highlightPresets", AppUtil.GSON.toJsonTree(presets));
        });
    }

    private static List<String> distinct(Session session, String hql) {
        List<String> values = new ArrayList<>();
        for (String v : session.createQuery(hql, String.class).getResultList()) {
            if (v != null && !v.isBlank()) values.add(v);
        }
        return values;
    }
}
