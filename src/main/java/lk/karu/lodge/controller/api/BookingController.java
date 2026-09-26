package lk.karu.lodge.controller.api;

import jakarta.servlet.http.HttpServletRequest;
import lk.karu.lodge.dto.BookingRequestDTO;
import lk.karu.lodge.service.BookingService;
import lk.karu.lodge.util.AppUtil;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/booking")
public class BookingController {


    @PostMapping(consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<String> createBooking(@RequestBody String jsonData, HttpServletRequest request) {
        BookingRequestDTO bookingRequestDTO = AppUtil.GSON.fromJson(jsonData, BookingRequestDTO.class);
        String responseJson = new BookingService().createBooking(bookingRequestDTO,
                AuthController.sessionUserId(request),
                newUserId -> AuthController.signIn(request, newUserId));
        return ResponseEntity.ok(responseJson);
    }
}
