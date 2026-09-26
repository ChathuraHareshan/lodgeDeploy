package lk.karu.lodge.service.admin;

import lk.karu.lodge.dto.admin.AdminCatalogRequest;
import lk.karu.lodge.dto.admin.AdminFacilityDTO;
import lk.karu.lodge.entity.Facility;
import lk.karu.lodge.util.AppUtil;
import org.hibernate.Session;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static lk.karu.lodge.service.admin.AdminSupport.*;

public class AdminFacilityService {

    public String loadAll() {
        return read("Failed to load facilities.", (session, out) -> out.add("facilities", AppUtil.GSON.toJsonTree(list(session))));
    }

    static List<AdminFacilityDTO> list(Session session) {
        Map<Integer, Long> usage = new HashMap<>();
        for (Object[] row : session.createQuery(
                "SELECT f.id, COUNT(v) FROM Villa v JOIN v.facilities f GROUP BY f.id", Object[].class).getResultList()) {
            usage.put(((Number) row[0]).intValue(), ((Number) row[1]).longValue());
        }
        return session.createQuery("FROM Facility f ORDER BY f.category, f.name", Facility.class).getResultList().stream()
                .map(f -> new AdminFacilityDTO(f.getId(), f.getName(), f.getIcon(), f.getCategory(), usage.getOrDefault(f.getId(), 0L)))
                .toList();
    }

    public String create(AdminCatalogRequest req) {
        return write("Failed to add facility.", (session, out) -> {
            Facility f = new Facility();
            apply(session, f, req, 0);
            session.persist(f);
            session.flush();
            out.add("facility", AppUtil.GSON.toJsonTree(toDTO(session, f)));
        });
    }

    public String update(int id, AdminCatalogRequest req) {
        return write("Failed to update facility.", (session, out) -> {
            Facility f = session.find(Facility.class, id);
            require(f != null, "Facility not found.");
            apply(session, f, req, id);
            session.flush();
            out.add("facility", AppUtil.GSON.toJsonTree(toDTO(session, f)));
        });
    }

    public String delete(int id) {
        return write("Failed to delete facility.", (session, out) -> {
            Facility f = session.find(Facility.class, id);
            require(f != null, "Facility not found.");

            session.remove(f);
        });
    }

    private static void apply(Session session, Facility f, AdminCatalogRequest req, int selfId) {
        require(req != null, "Invalid request.");
        String name = trim(req.name);
        require(!name.isEmpty(), "Enter the facility name.");
        maxLen(name, 100, "Facility name");
        String category = trim(req.category);
        if (category.isEmpty()) category = "General";
        String cat = category;
        require(AdminMetaService.FACILITY_CATEGORIES.stream().anyMatch(c -> c.equals(cat)), "Unknown category.");

        Long same = session.createQuery("SELECT COUNT(x) FROM Facility x WHERE lower(x.name) = :n AND x.id <> :id", Long.class)
                .setParameter("n", name.toLowerCase()).setParameter("id", selfId).getSingleResult();
        require(same == 0, "A facility called \"" + name + "\" already exists.");

        f.setName(name);
        f.setIcon(icon(req.icon));
        f.setCategory(cat);
    }

    private static AdminFacilityDTO toDTO(Session session, Facility f) {
        Long used = session.createQuery("SELECT COUNT(v) FROM Villa v JOIN v.facilities x WHERE x.id = :id", Long.class)
                .setParameter("id", f.getId()).getSingleResult();
        return new AdminFacilityDTO(f.getId(), f.getName(), f.getIcon(), f.getCategory(), used);
    }
}
