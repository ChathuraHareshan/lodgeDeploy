package lk.karu.lodge.controller.api.admin;

import lk.karu.lodge.dto.admin.AdminStatusRequest;
import lk.karu.lodge.dto.admin.AdminUserRoleRequest;
import lk.karu.lodge.service.admin.AdminSupport;
import lk.karu.lodge.service.admin.AdminUserService;
import lk.karu.lodge.util.AppUtil;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/admin/user")
public class AdminUserController {

    @GetMapping(path = "/all", produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<String> loadAll() {
        return ResponseEntity.ok(new AdminUserService().loadAll());
    }

    @PutMapping(path = "/{id}/role", consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<String> setRole(@PathVariable int id, @RequestBody String json) {
        AdminUserRoleRequest req;
        try {
            req = AppUtil.GSON.fromJson(json, AdminUserRoleRequest.class);
        } catch (Exception e) {
            req = null;
        }
        return ResponseEntity.ok(req == null ? AdminSupport.fail("Invalid request.") : new AdminUserService().updateRole(id, req.role));
    }

    @PutMapping(path = "/{id}/status", consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<String> setStatus(@PathVariable int id, @RequestBody String json) {
        AdminStatusRequest req;
        try {
            req = AppUtil.GSON.fromJson(json, AdminStatusRequest.class);
        } catch (Exception e) {
            req = null;
        }
        return ResponseEntity.ok(req == null ? AdminSupport.fail("Invalid request.") : new AdminUserService().updateStatus(id, req.status));
    }

    @DeleteMapping(path = "/{id}", produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<String> delete(@PathVariable int id) {
        return ResponseEntity.ok(new AdminUserService().delete(id));
    }
}
