package lk.karu.lodge.mail;

import jakarta.mail.Message;
import jakarta.mail.MessagingException;
import jakarta.mail.internet.InternetAddress;
import lk.karu.lodge.entity.Booking;
import lk.karu.lodge.util.AppUtil;

import java.math.BigDecimal;

public class BookingEventMail extends Mailable {
    private final Booking booking;
    private final String subject;
    private final String heading;
    private final String message;

    public BookingEventMail(Booking booking, String subject, String heading, String message) {
        this.booking = booking;
        this.subject = subject;
        this.heading = heading;
        this.message = message;
    }

    @Override
    public void build(Message mail) throws MessagingException {
        mail.setRecipient(Message.RecipientType.TO, new InternetAddress(booking.getGuestEmail()));
        String appName = AppUtil.property("app.name");
        mail.setSubject(subject + " - " + booking.getBookingReference() + " - " + appName);
        String villa = booking.getVilla() == null ? "" : booking.getVilla().getName();
        BigDecimal total = AppUtil.nz(booking.getTotalAmountLkr()).add(AppUtil.nz(booking.getTotalTaxesLkr()));
        String html = """
                <!doctype html><html><body style="margin:0;background:#f4f7fa;font-family:Arial,sans-serif;color:#263238">
                <main style="max-width:600px;margin:32px auto;background:white;border-radius:12px;overflow:hidden">
                <header style="background:#003580;color:white;padding:26px;text-align:center"><h1 style="margin:0">%s</h1></header>
                <section style="padding:28px">
                <p>Hi %s,</p><p>%s</p>
                <p><b>Booking reference:</b> %s</p><p><b>Villa:</b> %s</p>
                <p><b>Check-in:</b> %s &nbsp; <b>Check-out:</b> %s</p>
                <p><b>Payment method:</b> %s &nbsp; <b>Payment status:</b> %s</p>
                <p><b>Total:</b> LKR %s</p>
                <p>You can view your reservation and invoice from your Lodge account.</p>
                </section><footer style="padding:18px;text-align:center;background:#f8fafc;color:#667085">%s · Automated reservation email</footer>
                </main></body></html>
                """.formatted(escape(heading), escape(booking.getLeadGuestName()), escape(message),
                escape(booking.getBookingReference()), escape(villa), escape(String.valueOf(booking.getCheckInDate())),
                escape(String.valueOf(booking.getCheckOutDate())), escape(booking.getPaymentMethod()),
                escape(booking.getPaymentStatus()), escape(total.toPlainString()), escape(appName));
        mail.setContent(html, "text/html; charset=utf-8");
    }

    private static String escape(String value) {
        if (value == null) return "";
        return value.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
                .replace("\"", "&quot;").replace("'", "&#39;");
    }
}
