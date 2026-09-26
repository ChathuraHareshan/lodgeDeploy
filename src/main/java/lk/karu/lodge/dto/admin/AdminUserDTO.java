package lk.karu.lodge.dto.admin;

import java.math.BigDecimal;

public record AdminUserDTO(int id, String fullName, String email, String phoneNumber, String countryName,
                           String countryFlag, String role, String accountStatus, int geniusLevel,
                           int bookingCount, BigDecimal totalSpend, int reviewCount, String createdAt) {
}
