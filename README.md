# Lodge – villa booking system (client side)

Spring Boot 3 (Spring MVC) · Hibernate 6 (plain `SessionFactory`, unmanaged by Spring) · MySQL 8 · Tailwind + vanilla JS (fetch / Ajax)



> ## Run it
> 1. **Import DB**
>2. Open `pom.xml` as a project, JDK 17+, let Maven download dependencies.
>3. Check the DB user/password in `src/main/resources/hibernate.cfg.xml`.
>4. Check and change application.properties has configurations.
>5. Run `lk.karu.lodge.LodgeApplication`.
>6. Open http://localhost:8080/lodge/.

## PayHere checkout
The reservation dialog offers **Pay at Villa** and **Pay Now with PayHere**. Pay at Villa is confirmed with `PayAtProperty` payment status. Pay Now reserves the selected inventory as `Pending`, sends the guest to PayHere, and becomes `Paid` / `Confirmed` when `/api/payments/notify` receives a valid signed PayHere notification for the configured merchant, LKR amount, and reservation reference. An admin can also accept a PayHere payment from the booking panel and mark it paid; doing so confirms a pending booking. The invoice page enables printing once the booking is paid. Failed PayHere notifications become `Failed`; pending reservations continue holding their selected inventory.

Set these environment variables in the application host (do not commit merchant secrets):

* `PAYHERE_MERCHANT_ID`
* `PAYHERE_MERCHANT_SECRET`
* `PAYHERE_SANDBOX=true` for testing, or `false` for live checkout
* `APP_PUBLIC_URL` to the externally reachable base URL, including `/lodge` (for example `https://example.com/lodge`). PayHere must be able to POST to `{APP_PUBLIC_URL}/api/payments/notify`; production should use HTTPS.

All front-end URLs are relative (`api/villa/all`), so any context path works.

## Booking confirmation email
`MailServiceProvider` sends a reservation-received email after booking, a booking-confirmed email when an administrator accepts a pending reservation, and a payment-accepted email when an administrator or verified PayHere notification marks it paid. Duplicate status updates do not resend the same acceptance email. A Spring `@Component` (`config/MailLifecycleConfig`) starts/stops the mail provider with the app context. Set SMTP credentials in `src/main/resources/application.properties` (`mail.host`, `mail.port`, `mail.username`, `mail.password`, `app.mail`); placeholder credentials will cause delivery failures to be logged. Email delivery does not roll back reservations or status changes.

## API
| Method | URL | Purpose |
|---|---|---|
| GET | `/api/region/all` | regions (destination tiles + filter pills) |
| GET | `/api/offer/active` | current offers |
| GET | `/api/villa/all?region=&city=&q=` | villa list (all params optional) |
| GET | `/api/villa/destinations` | cities for the destination drop-down |
| GET | `/api/villa/{slug}?checkIn=&checkOut=` | full villa details + room availability |
| GET | `/api/review/latest?limit=3` | latest reviews for the home page |
| GET | `/api/currency` | LKR per 1 USD for the header currency switcher (`currency.usd.rate` in application.properties) |
| POST | `/api/booking` | create a reservation. Signed-in guests book with their profile; a visitor sends name/email/phone + `password` and an account is created and signed in |
| POST | `/api/auth/register`, `/api/auth/login`, `/api/auth/logout` | account sign-up / sign-in (server session cookie) / sign-out |
| GET | `/api/auth/me` | who is signed in (`loggedIn`, `user`) |
| PUT | `/api/auth/profile`, `/api/auth/password` | update name, phone, country / change password |
| GET | `/api/auth/bookings` | the signed-in guest's reservations |
| POST | `/api/auth/bookings/{reference}/cancel` | cancel one of the guest's own bookings (only if check-in is more than `booking.cancel.min.days` away) |
| POST | `/api/auth/bookings/{reference}/review` | submit a review for a finished, unreviewed stay (waits for admin approval) |
| GET | `/api/admin/booking/all` | admin: every booking |
| PUT | `/api/admin/booking/{id}/status` | admin: change booking status (Pending/Confirmed/Completed/Cancelled) and/or payment status |
| GET | `/api/admin/review/all` | admin: every review, any status |
| PUT | `/api/admin/review/{id}/status` | admin: approve (Approved) / hide (Rejected) a review - updates the villa's stored score |
| DELETE | `/api/admin/review/{id}` | admin: delete a review |
| GET/POST | `/api/admin/offer/all`, `/api/admin/offer` | admin: offers table / create an offer |
| PUT/DELETE | `/api/admin/offer/{id}`, `/api/admin/offer/{id}/active` | admin: edit an offer / delete / switch on-off |

Static pages: `about.html` and `contact.html` (linked from the header nav pills and the footer). The contact form has no backend endpoint yet - on submit it shows a confirmation and opens the visitor's email client (`mailto:`) with the message pre-filled.
| GET | `/api/admin/meta` | admin: regions, facilities, room features + values already used (types, deals, policies, highlight suggestions) |
| GET/POST | `/api/admin/villa/all`, `/api/admin/villa` | admin: villa table rows / create villa |
| GET/PUT/DELETE | `/api/admin/villa/{id}` | admin: load full villa for editing / update / delete |
| PUT | `/api/admin/villa/{id}/status` | admin: Published / Pending review / Paused |
| GET/POST | `/api/admin/room/all`, `/api/admin/room` | admin: room table rows / create room type |
| PUT/DELETE | `/api/admin/room/{id}` | admin: update / delete room type |
| GET/POST/PUT/DELETE | `/api/admin/facility[/all\|/{id}]` | admin: facilities catalog |
| GET/POST/PUT/DELETE | `/api/admin/room-feature[/all\|/{id}]` | admin: room-feature library |

Quick check without the UI: http://localhost:8080/lodge/api/villa/all



## Notes
* Availability = `room_types.stock_quantity` − rooms booked on overlapping dates (cancelled ignored).
  Booking locks the room rows (`PESSIMISTIC_WRITE`) so the last room can't be double-booked.
* Price rules follow your sample booking: total = Σ qty × discount price × nights, taxes = Σ qty × taxes × nights.
* The house-rules block on the details page is still static HTML (no table for it in the schema).
* Bookings are saved as guest bookings (`user_id` = NULL); a confirmation email now goes out on success (see above).
