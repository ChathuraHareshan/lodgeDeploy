package lk.karu.lodge.controller.api.admin;

import lk.karu.lodge.dto.admin.AdminBookingRequest;
import lk.karu.lodge.service.admin.AdminBookingService;
import lk.karu.lodge.service.admin.AdminSupport;
import lk.karu.lodge.util.AppUtil;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/admin/booking")
public class AdminBookingController {

    @GetMapping(path = "/all", produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<String> loadAll() {
        return ResponseEntity.ok(new AdminBookingService().loadAll());
    }

    @PutMapping(path = "/{id}/status", consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<String> updateStatus(@PathVariable int id, @RequestBody String json) {
        AdminBookingRequest req;
        try {
            req = AppUtil.GSON.fromJson(json, AdminBookingRequest.class);
        } catch (Exception e) {
            req = null;
        }
        return ResponseEntity.ok(req == null ? AdminSupport.fail("Invalid request.") : new AdminBookingService().updateStatus(id, req));
    }
}
