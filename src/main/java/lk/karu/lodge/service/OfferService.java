package lk.karu.lodge.service;

import com.google.gson.JsonObject;
import lk.karu.lodge.dto.OfferDTO;
import lk.karu.lodge.entity.Offer;
import lk.karu.lodge.util.AppUtil;
import lk.karu.lodge.util.HibernateUtil;
import org.hibernate.Session;

import java.util.List;

public class OfferService {


    public String loadActiveOffers() {
        JsonObject responseObject = new JsonObject();

        try (Session hibernateSession = HibernateUtil.getSessionFactory().openSession()) {
            List<Offer> offers = hibernateSession
                    .createQuery("FROM Offer o WHERE o.active = true AND o.validFrom <= :today AND o.validTo >= :today ORDER BY o.id", Offer.class)
                    .setParameter("today", AuthService.today())
                    .getResultList();

            List<OfferDTO> dtos = offers.stream()
                    .map(o -> new OfferDTO(o.getId(), o.getTitle(), o.getBadge(), o.getDescription(),
                            AppUtil.nz(o.getDiscountPercent()), o.getImageUrl(),
                            String.valueOf(o.getValidFrom()), String.valueOf(o.getValidTo())))
                    .toList();

            responseObject.addProperty("status", true);
            responseObject.add("offers", AppUtil.GSON.toJsonTree(dtos));
        } catch (Exception e) {
            e.printStackTrace();
            responseObject.addProperty("status", false);
            responseObject.addProperty("message", "Failed to load offers.");
        }
        return AppUtil.GSON.toJson(responseObject);
    }
}
