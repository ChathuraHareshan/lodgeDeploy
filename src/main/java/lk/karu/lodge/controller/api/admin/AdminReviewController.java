package lk.karu.lodge.controller.api.admin;

import lk.karu.lodge.dto.admin.AdminStatusRequest;
import lk.karu.lodge.service.admin.AdminReviewService;
import lk.karu.lodge.service.admin.AdminSupport;
import lk.karu.lodge.util.AppUtil;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/admin/review")
public class AdminReviewController {

    @GetMapping(path = "/all", produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<String> loadAll() {
        return ResponseEntity.ok(new AdminReviewService().loadAll());
    }

    @PutMapping(path = "/{id}/status", consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<String> setStatus(@PathVariable int id, @RequestBody String json) {
        AdminStatusRequest req;
        try {
            req = AppUtil.GSON.fromJson(json, AdminStatusRequest.class);
        } catch (Exception e) {
            req = null;
        }
        return ResponseEntity.ok(req == null ? AdminSupport.fail("Invalid request.") : new AdminReviewService().setStatus(id, req.status));
    }

    @DeleteMapping(path = "/{id}", produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<String> delete(@PathVariable int id) {
        return ResponseEntity.ok(new AdminReviewService().delete(id));
    }
}
