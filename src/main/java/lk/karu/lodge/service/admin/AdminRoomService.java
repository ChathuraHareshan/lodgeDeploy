package lk.karu.lodge.service.admin;

import lk.karu.lodge.dto.admin.AdminRoomDTO;
import lk.karu.lodge.dto.admin.AdminRoomRequest;
import lk.karu.lodge.entity.RoomFeature;
import lk.karu.lodge.entity.RoomFeatureOption;
import lk.karu.lodge.entity.RoomType;
import lk.karu.lodge.entity.Villa;
import lk.karu.lodge.util.AppUtil;
import org.hibernate.Session;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

import static lk.karu.lodge.service.admin.AdminSupport.*;

public class AdminRoomService {

    public static final Set<String> STATUSES = Set.of("Active", "Inactive");


    public String loadAll() {
        return read("Failed to load rooms.", (session, out) -> {
            List<RoomType> rooms = session.createQuery(
                    "SELECT DISTINCT rt FROM RoomType rt JOIN FETCH rt.villa LEFT JOIN FETCH rt.features ORDER BY rt.id DESC", RoomType.class)
                    .getResultList();
            out.add("rooms", AppUtil.GSON.toJsonTree(rooms.stream().map(AdminRoomService::toDTO).toList()));
        });
    }


    public String create(AdminRoomRequest req) {
        return write("Failed to save the room.", (session, out) -> {
            RoomType rt = new RoomType();
            apply(session, rt, req);
            session.persist(rt);
            session.flush();
            syncVillaFromPrice(session, rt.getVilla());
            out.add("room", AppUtil.GSON.toJsonTree(toDTO(rt)));
        });
    }

    public String update(int id, AdminRoomRequest req) {
        return write("Failed to save the room.", (session, out) -> {
            RoomType rt = session.find(RoomType.class, id);
            require(rt != null, "Room type not found.");
            Villa before = rt.getVilla();
            apply(session, rt, req);
            session.flush();
            syncVillaFromPrice(session, rt.getVilla());
            if (before.getId() != rt.getVilla().getId()) syncVillaFromPrice(session, before);
            out.add("room", AppUtil.GSON.toJsonTree(toDTO(rt)));
        });
    }

    public String delete(int id) {
        return write("Failed to delete the room.", (session, out) -> {
            RoomType rt = session.find(RoomType.class, id);
            require(rt != null, "Room type not found.");
            Long booked = session.createQuery("SELECT COUNT(br) FROM BookingRoom br WHERE br.roomType.id = :id", Long.class)
                    .setParameter("id", id).getSingleResult();
            require(booked == 0, "This room type is part of " + booked + " booking(s), so it can't be deleted. Turn off \"Available for booking\" instead.");
            Villa villa = rt.getVilla();
            session.remove(rt);
            session.flush();
            syncVillaFromPrice(session, villa);
        });
    }


    private static void apply(Session session, RoomType rt, AdminRoomRequest r) {
        require(r != null, "Invalid request.");

        require(r.villaId != null, "Choose the villa this room belongs to.");
        Villa villa = session.find(Villa.class, r.villaId);
        require(villa != null, "The selected villa doesn't exist.");

        String name = trim(r.name);
        require(!name.isEmpty(), "Enter the room type name.");
        maxLen(name, 150, "Room name");
        String bed = trim(r.bedInfo);
        String size = trim(r.sizeSqm);
        require(!bed.isEmpty(), "Enter the bed information.");
        require(!size.isEmpty(), "Enter the room size.");
        maxLen(bed, 150, "Bed information");
        maxLen(size, 20, "Room size");
        maxLen(r.badge, 100, "Badge");
        maxLen(r.breakfastDesc, 150, "Breakfast text");
        maxLen(r.perks, 255, "Perks");

        int guests = r.maxGuests == null ? 2 : r.maxGuests;
        int stock = r.stock == null ? 0 : r.stock;
        require(guests >= 1 && guests <= 20, "Max guests must be between 1 and 20.");
        require(stock >= 0 && stock <= 9999, "Stock must be between 0 and 9999.");

        require(r.originalPrice != null && r.originalPrice.signum() > 0, "Enter the original price.");
        require(r.discountPrice != null && r.discountPrice.signum() > 0, "Enter the sale price.");
        require(r.discountPrice.compareTo(r.originalPrice) <= 0, "Sale price can't be higher than the original price.");
        require(r.taxes != null && r.taxes.signum() >= 0, "Enter the taxes (0 if none).");

        String cancel = trim(r.cancellationPolicy);
        String prepay = trim(r.prepaymentPolicy);
        require(!cancel.isEmpty(), "Enter the cancellation policy.");
        require(!prepay.isEmpty(), "Enter the prepayment policy.");
        maxLen(cancel, 150, "Cancellation policy");
        maxLen(prepay, 150, "Prepayment policy");

        String status = trim(r.status).isEmpty() ? "Active" : trim(r.status);
        require(STATUSES.contains(status), "Invalid room status.");


        String base = trim(r.slug).isEmpty() ? slugify(name) : trim(r.slug);
        require(validSlug(base), "URL slug may only contain lowercase letters, numbers and hyphens.");
        maxLen(base, 90, "URL slug");
        String slug = base;
        for (int n = 2; ; n++) {
            Long used = session.createQuery("SELECT COUNT(x) FROM RoomType x WHERE x.villa.id = :v AND x.slug = :s AND x.id <> :id", Long.class)
                    .setParameter("v", villa.getId()).setParameter("s", slug).setParameter("id", rt.getId()).getSingleResult();
            if (used == 0) break;
            slug = base + "-" + n;
        }

        Map<String, String> wanted = new LinkedHashMap<>();
        if (r.features != null) {
            for (String f : r.features) {
                if (trim(f).isEmpty()) continue;
                RoomFeatureOption opt = AdminRoomFeatureService.findOrCreate(session, f);
                wanted.putIfAbsent(opt.getName().toLowerCase(), opt.getName());
            }
        }

        rt.setVilla(villa);
        rt.setName(name);
        rt.setSlug(slug);
        rt.setBadge(trim(r.badge).isEmpty() ? null : trim(r.badge));
        rt.setBedInfo(bed);
        rt.setSizeSqm(size);
        rt.setMaxGuests(guests);
        rt.setOriginalPriceLkr(r.originalPrice);
        rt.setDiscountPriceLkr(r.discountPrice);
        rt.setTaxesLkr(r.taxes);
        rt.setDiscountPercent(discountPercent(r.originalPrice, r.discountPrice));
        rt.setBreakfastIncluded(r.breakfastIncluded == null || r.breakfastIncluded);
        rt.setBreakfastDesc(trim(r.breakfastDesc).isEmpty() ? (Boolean.FALSE.equals(r.breakfastIncluded) ? "Breakfast not included" : "Breakfast included") : trim(r.breakfastDesc));
        rt.setPerks(trim(r.perks));
        rt.setCancellationPolicy(cancel);
        rt.setPrepaymentPolicy(prepay);
        rt.setStockQuantity(stock);
        rt.setStatus(status);

        rt.getFeatures().removeIf(f -> !wanted.containsKey(trim(f.getFeatureName()).toLowerCase()));
        for (RoomFeature f : rt.getFeatures()) wanted.remove(trim(f.getFeatureName()).toLowerCase());
        for (String name2 : wanted.values()) {
            RoomFeature rf = new RoomFeature();
            rf.setRoomType(rt);
            rf.setFeatureName(name2);
            rt.getFeatures().add(rf);
        }
    }


    static void syncVillaFromPrice(Session session, Villa villa) {
        List<RoomType> cheapest = session.createQuery(
                "FROM RoomType r WHERE r.villa.id = :v AND (r.status IS NULL OR r.status = 'Active') ORDER BY r.discountPriceLkr ASC, r.id ASC", RoomType.class)
                .setParameter("v", villa.getId()).setMaxResults(1).getResultList();
        if (cheapest.isEmpty()) return;
        RoomType rt = cheapest.get(0);
        villa.setBasePriceLkr(rt.getOriginalPriceLkr());
        villa.setDiscountPriceLkr(rt.getDiscountPriceLkr());
        villa.setTaxesLkr(rt.getTaxesLkr());
        villa.setDiscountPercent(rt.getDiscountPercent());
    }

    static AdminRoomDTO toDTO(RoomType rt) {
        return new AdminRoomDTO(rt.getId(), rt.getVilla().getId(), rt.getVilla().getName(), rt.getSlug(), rt.getName(),
                rt.getBadge() == null ? "" : rt.getBadge(), rt.getBedInfo(), rt.getSizeSqm(), AppUtil.nz(rt.getMaxGuests()),
                rt.getOriginalPriceLkr(), rt.getDiscountPriceLkr(), rt.getTaxesLkr(), AppUtil.nz(rt.getDiscountPercent()),
                Boolean.TRUE.equals(rt.getBreakfastIncluded()), rt.getBreakfastDesc() == null ? "" : rt.getBreakfastDesc(),
                rt.getPerks() == null ? "" : rt.getPerks(), rt.getCancellationPolicy(), rt.getPrepaymentPolicy(),
                AppUtil.nz(rt.getStockQuantity()),
                rt.getStatus() == null || rt.getStatus().isBlank() ? "Active" : rt.getStatus(),
                rt.getFeatures().stream().map(RoomFeature::getFeatureName).toList());
    }
}
