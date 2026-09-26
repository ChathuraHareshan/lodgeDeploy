package lk.karu.lodge.dto;

import java.util.List;

public record VillaDetailDTO(VillaDTO villa, String overview, String address, double latitude, double longitude,
                             int totalPhotos, List<ImageDTO> images, List<FacilityDTO> facilities,
                             List<HighlightDTO> highlights, List<NearbyDTO> nearby, List<RoomTypeDTO> rooms,
                             List<ReviewDTO> reviews, ReviewSummaryDTO reviewSummary) {

    public record ImageDTO(String url, String caption, boolean hero) {
    }

    public record FacilityDTO(int id, String name, String icon, String category) {
    }

    public record HighlightDTO(String icon, String title, String description, String score) {
    }

    public record NearbyDTO(String name, String distanceText, String locationType, String imageUrl) {
    }
}
