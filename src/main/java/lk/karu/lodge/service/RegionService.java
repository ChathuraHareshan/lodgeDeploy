package lk.karu.lodge.service;

import com.google.gson.JsonObject;
import lk.karu.lodge.dto.RegionDTO;
import lk.karu.lodge.entity.Region;
import lk.karu.lodge.util.AppUtil;
import lk.karu.lodge.util.HibernateUtil;
import org.hibernate.Session;

import java.util.List;

public class RegionService {

    public String loadAllRegions() {
        JsonObject responseObject = new JsonObject();

        try (Session hibernateSession = HibernateUtil.getSessionFactory().openSession()) {
            List<Region> regions = hibernateSession.createQuery("FROM Region r ORDER BY r.id", Region.class)
                    .getResultList();

            List<RegionDTO> dtos = regions.stream()
                    .map(r -> new RegionDTO(r.getId(), r.getName(), r.getSlug(), r.getSubtitle(),
                            r.getHeroImage(), r.getVillaCountDesc()))
                    .toList();

            responseObject.addProperty("status", true);
            responseObject.add("regions", AppUtil.GSON.toJsonTree(dtos));
        } catch (Exception e) {
            e.printStackTrace();
            responseObject.addProperty("status", false);
            responseObject.addProperty("message", "Failed to load regions.");
        }
        return AppUtil.GSON.toJson(responseObject);
    }
}
