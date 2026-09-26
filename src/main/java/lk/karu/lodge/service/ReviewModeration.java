package lk.karu.lodge.service;

import lk.karu.lodge.entity.Review;

public final class ReviewModeration {

    private ReviewModeration() {
    }

    public static String statusOf(Review r) {
        return r.getStatus() == null || r.getStatus().isBlank() ? "Approved" : r.getStatus();
    }

    public static void changeStatus(Review r, String next) {
        boolean wasPublic = "Approved".equals(statusOf(r));
        boolean willBePublic = "Approved".equals(next);
        if (!wasPublic && willBePublic) ReviewAggregates.add(r.getVilla(), r.getScore());
        if (wasPublic && !willBePublic) ReviewAggregates.remove(r.getVilla(), r.getScore());
        r.setStatus(next);
    }
}
