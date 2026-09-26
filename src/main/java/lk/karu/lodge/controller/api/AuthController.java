package lk.karu.lodge.controller.api;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import lk.karu.lodge.dto.AuthRequest;
import lk.karu.lodge.dto.ReviewRequest;
import lk.karu.lodge.service.AuthService;
import lk.karu.lodge.service.admin.AdminSupport;
import lk.karu.lodge.util.AppUtil;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;


@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private static final String USER_KEY = "lodge.userId";


    public static Integer sessionUserId(HttpServletRequest request) {
        HttpSession session = request.getSession(false);
        Object id = session == null ? null : session.getAttribute(USER_KEY);
        return id instanceof Integer i ? i : null;
    }

    public static void signIn(HttpServletRequest request, int userId) {
        if (request.getSession(false) != null) request.changeSessionId();
        request.getSession(true).setAttribute(USER_KEY, userId);
    }

    private static ResponseEntity<String> ok(String json) {
        return ResponseEntity.ok(json);
    }

    private static ResponseEntity<String> signInRequired() {
        String json = AdminSupport.fail("Please sign in to continue.");
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).contentType(MediaType.APPLICATION_JSON)
                .body(json.replaceFirst("\\}$", ",\"authRequired\":true}"));
    }

    private static AuthRequest parse(String json) {
        try {
            return AppUtil.GSON.fromJson(json, AuthRequest.class);
        } catch (Exception e) {
            return null;
        }
    }


    @PostMapping(path = "/register", consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<String> register(@RequestBody String json, HttpServletRequest request) {
        AuthService.Result result = new AuthService().register(parse(json));
        if (result.userId() != null) signIn(request, result.userId());
        return ok(result.json());
    }

    @PostMapping(path = "/login", consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<String> login(@RequestBody String json, HttpServletRequest request) {
        AuthService.Result result = new AuthService().login(parse(json));
        if (result.userId() != null) signIn(request, result.userId());
        return ok(result.json());
    }

    @PostMapping(path = "/logout", produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<String> logout(HttpServletRequest request) {
        HttpSession session = request.getSession(false);
        if (session != null) session.invalidate();
        return ok("{\"status\":true}");
    }

    @GetMapping(path = "/me", produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<String> me(HttpServletRequest request) {
        return ok(new AuthService().me(sessionUserId(request)));
    }

    @PutMapping(path = "/profile", consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<String> updateProfile(@RequestBody String json, HttpServletRequest request) {
        Integer userId = sessionUserId(request);
        if (userId == null) return signInRequired();
        return ok(new AuthService().updateProfile(userId, parse(json)));
    }

    @PutMapping(path = "/password", consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<String> changePassword(@RequestBody String json, HttpServletRequest request) {
        Integer userId = sessionUserId(request);
        if (userId == null) return signInRequired();
        return ok(new AuthService().changePassword(userId, parse(json)));
    }

    @PostMapping(path = "/bookings/{reference}/cancel", produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<String> cancelBooking(@PathVariable String reference, HttpServletRequest request) {
        Integer userId = sessionUserId(request);
        if (userId == null) return signInRequired();
        return ok(new AuthService().cancelBooking(userId, reference));
    }

    @PostMapping(path = "/bookings/{reference}/review", consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<String> reviewBooking(@PathVariable String reference, @RequestBody String json, HttpServletRequest request) {
        Integer userId = sessionUserId(request);
        if (userId == null) return signInRequired();
        ReviewRequest req;
        try {
            req = AppUtil.GSON.fromJson(json, ReviewRequest.class);
        } catch (Exception e) {
            req = null;
        }
        return ok(new AuthService().submitReview(userId, reference, req));
    }

    @GetMapping(path = "/bookings", produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<String> myBookings(HttpServletRequest request) {
        Integer userId = sessionUserId(request);
        if (userId == null) return signInRequired();
        return ok(new AuthService().myBookings(userId));
    }
}
