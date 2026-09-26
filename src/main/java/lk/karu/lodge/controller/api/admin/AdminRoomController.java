package lk.karu.lodge.controller.api.admin;

import lk.karu.lodge.dto.admin.AdminRoomRequest;
import lk.karu.lodge.service.admin.AdminRoomService;
import lk.karu.lodge.service.admin.AdminSupport;
import lk.karu.lodge.util.AppUtil;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/admin/room")
public class AdminRoomController {

    @GetMapping(path = "/all", produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<String> loadAll() {
        return ResponseEntity.ok(new AdminRoomService().loadAll());
    }

    @PostMapping(consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<String> create(@RequestBody String json) {
        AdminRoomRequest req = parse(json);
        return ResponseEntity.ok(req == null ? AdminSupport.fail("Invalid request.") : new AdminRoomService().create(req));
    }

    @PutMapping(path = "/{id}", consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<String> update(@PathVariable int id, @RequestBody String json) {
        AdminRoomRequest req = parse(json);
        return ResponseEntity.ok(req == null ? AdminSupport.fail("Invalid request.") : new AdminRoomService().update(id, req));
    }

    @DeleteMapping(path = "/{id}", produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<String> delete(@PathVariable int id) {
        return ResponseEntity.ok(new AdminRoomService().delete(id));
    }

    private static AdminRoomRequest parse(String json) {
        try {
            return AppUtil.GSON.fromJson(json, AdminRoomRequest.class);
        } catch (Exception e) {
            return null;
        }
    }
}
