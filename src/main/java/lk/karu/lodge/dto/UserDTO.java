package lk.karu.lodge.dto;

public record UserDTO(int id, String fullName, String email, String phone, String countryCode, String countryName,
                      String countryFlag, String role, int geniusLevel, String memberSince) {
}
