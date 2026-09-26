package lk.karu.lodge.service.admin;

import lk.karu.lodge.dto.admin.AdminOfferDTO;
import lk.karu.lodge.dto.admin.AdminOfferRequest;
import lk.karu.lodge.entity.Offer;
import lk.karu.lodge.service.AuthService;
import lk.karu.lodge.util.AppUtil;

import java.time.LocalDate;
import java.time.format.DateTimeParseException;

import static lk.karu.lodge.service.admin.AdminSupport.*;

public class AdminOfferService {

    public String loadAll() {
        return read("Failed to load offers.", (session, out) -> {
            var offers = session.createQuery("FROM Offer o ORDER BY o.validTo DESC, o.id DESC", Offer.class).getResultList();
            out.add("offers", AppUtil.GSON.toJsonTree(offers.stream().map(AdminOfferService::toDTO).toList()));
        });
    }

    public String create(AdminOfferRequest req) {
        return write("Failed to save the offer.", (session, out) -> {
            Offer o = new Offer();
            apply(o, req);
            session.persist(o);
            session.flush();
            out.add("offer", AppUtil.GSON.toJsonTree(toDTO(o)));
        });
    }

    public String update(int id, AdminOfferRequest req) {
        return write("Failed to save the offer.", (session, out) -> {
            Offer o = session.find(Offer.class, id);
            require(o != null, "Offer not found.");
            apply(o, req);
            session.flush();
            out.add("offer", AppUtil.GSON.toJsonTree(toDTO(o)));
        });
    }

    public String setActive(int id, boolean active) {
        return write("Failed to update the offer.", (session, out) -> {
            Offer o = session.find(Offer.class, id);
            require(o != null, "Offer not found.");
            o.setActive(active);
            out.add("offer", AppUtil.GSON.toJsonTree(toDTO(o)));
        });
    }

    public String delete(int id) {
        return write("Failed to delete the offer.", (session, out) -> {
            Offer o = session.find(Offer.class, id);
            require(o != null, "Offer not found.");
            session.remove(o);
        });
    }

    private static LocalDate date(String value, String label) {
        try {
            return LocalDate.parse(trim(value));
        } catch (DateTimeParseException e) {
            throw new AdminException("Choose the " + label + " date.");
        }
    }

    private static void apply(Offer o, AdminOfferRequest r) {
        require(r != null, "Invalid request.");
        String title = trim(r.title), badge = trim(r.badge), desc = trim(r.description), image = trim(r.imageUrl);
        require(!title.isEmpty(), "Enter the offer title.");
        require(!badge.isEmpty(), "Enter a badge.");
        require(!desc.isEmpty(), "Enter a description.");
        maxLen(title, 150, "Title");
        maxLen(badge, 50, "Badge");
        maxLen(desc, 2000, "Description");
        require(validUrl(image) && image.length() <= 255, "Image link must start with http:// or https:// (max 255 characters).");
        require(r.discountPercent != null && r.discountPercent >= 1 && r.discountPercent <= 90, "Discount must be between 1% and 90%.");
        LocalDate from = date(r.validFrom, "start");
        LocalDate to = date(r.validTo, "end");
        require(!to.isBefore(from), "The end date can't be before the start date.");

        o.setTitle(title);
        o.setBadge(badge);
        o.setDescription(desc);
        o.setDiscountPercent(r.discountPercent);
        o.setImageUrl(image);
        o.setValidFrom(from);
        o.setValidTo(to);
        o.setActive(r.active == null || r.active);
    }

    static AdminOfferDTO toDTO(Offer o) {
        LocalDate today = AuthService.today();
        boolean active = !Boolean.FALSE.equals(o.getActive());
        String state = !active ? "Inactive" : o.getValidTo().isBefore(today) ? "Expired" : o.getValidFrom().isAfter(today) ? "Scheduled" : "Active";
        return new AdminOfferDTO(o.getId(), o.getTitle(), o.getBadge(), o.getDescription(), AppUtil.nz(o.getDiscountPercent()),
                o.getImageUrl(), String.valueOf(o.getValidFrom()), String.valueOf(o.getValidTo()), active, state);
    }
}
