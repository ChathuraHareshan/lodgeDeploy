package lk.karu.lodge.service.admin;

import lk.karu.lodge.dto.admin.AdminCatalogRequest;
import lk.karu.lodge.dto.admin.AdminRoomFeatureDTO;
import lk.karu.lodge.entity.RoomFeatureOption;
import lk.karu.lodge.util.AppUtil;
import org.hibernate.Session;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static lk.karu.lodge.service.admin.AdminSupport.*;


public class AdminRoomFeatureService {

    public String loadAll() {
        return read("Failed to load room features.", (session, out) -> out.add("roomFeatures", AppUtil.GSON.toJsonTree(list(session))));
    }

    static List<AdminRoomFeatureDTO> list(Session session) {
        Map<String, Long> usage = new HashMap<>();
        for (Object[] row : session.createQuery(
                "SELECT lower(rf.featureName), COUNT(rf) FROM RoomFeature rf GROUP BY lower(rf.featureName)", Object[].class).getResultList()) {
            usage.put((String) row[0], ((Number) row[1]).longValue());
        }
        return session.createQuery("FROM RoomFeatureOption o ORDER BY o.name", RoomFeatureOption.class).getResultList().stream()
                .map(o -> new AdminRoomFeatureDTO(o.getId(), o.getName(), usage.getOrDefault(o.getName().toLowerCase(), 0L)))
                .toList();
    }

    static RoomFeatureOption findOrCreate(Session session, String rawName) {
        String name = trim(rawName);
        require(!name.isEmpty(), "Feature name can't be empty.");
        maxLen(name, 100, "Feature name");
        List<RoomFeatureOption> found = session.createQuery(
                "FROM RoomFeatureOption o WHERE lower(o.name) = :n", RoomFeatureOption.class)
                .setParameter("n", name.toLowerCase()).getResultList();
        if (!found.isEmpty()) return found.get(0);
        RoomFeatureOption o = new RoomFeatureOption(name);
        session.persist(o);
        return o;
    }

    public String create(AdminCatalogRequest req) {
        return write("Failed to add room feature.", (session, out) -> {
            require(req != null, "Invalid request.");
            String name = trim(req.name);
            require(!name.isEmpty(), "Enter the feature name.");
            maxLen(name, 100, "Feature name");
            Long same = session.createQuery("SELECT COUNT(o) FROM RoomFeatureOption o WHERE lower(o.name) = :n", Long.class)
                    .setParameter("n", name.toLowerCase()).getSingleResult();
            require(same == 0, "\"" + name + "\" is already in the library.");
            RoomFeatureOption o = new RoomFeatureOption(name);
            session.persist(o);
            session.flush();
            out.add("roomFeature", AppUtil.GSON.toJsonTree(new AdminRoomFeatureDTO(o.getId(), o.getName(), 0)));
        });
    }

    public String rename(int id, AdminCatalogRequest req) {
        return write("Failed to rename room feature.", (session, out) -> {
            RoomFeatureOption o = session.find(RoomFeatureOption.class, id);
            require(o != null, "Room feature not found.");
            require(req != null, "Invalid request.");
            String name = trim(req.name);
            require(!name.isEmpty(), "Enter the feature name.");
            maxLen(name, 100, "Feature name");
            Long same = session.createQuery("SELECT COUNT(x) FROM RoomFeatureOption x WHERE lower(x.name) = :n AND x.id <> :id", Long.class)
                    .setParameter("n", name.toLowerCase()).setParameter("id", id).getSingleResult();
            require(same == 0, "\"" + name + "\" is already in the library.");

            String old = o.getName();
            o.setName(name);
            session.createMutationQuery("UPDATE RoomFeature rf SET rf.featureName = :newName WHERE lower(rf.featureName) = :oldName")
                    .setParameter("newName", name).setParameter("oldName", old.toLowerCase()).executeUpdate();
        });
    }

    public String delete(int id) {
        return write("Failed to delete room feature.", (session, out) -> {
            RoomFeatureOption o = session.find(RoomFeatureOption.class, id);
            require(o != null, "Room feature not found.");
            session.createMutationQuery("DELETE FROM RoomFeature rf WHERE lower(rf.featureName) = :n")
                    .setParameter("n", o.getName().toLowerCase()).executeUpdate();
            session.remove(o);
        });
    }
}
