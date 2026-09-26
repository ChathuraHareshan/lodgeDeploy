package lk.karu.lodge.mail;

import jakarta.mail.Message;
import jakarta.mail.MessagingException;
import jakarta.mail.internet.InternetAddress;
import lk.karu.lodge.entity.Booking;
import lk.karu.lodge.util.AppUtil;

import java.math.BigDecimal;
import java.time.format.DateTimeFormatter;

public class BookingConfirmationMail extends Mailable {

    private static final DateTimeFormatter DATE_FORMAT = DateTimeFormatter.ofPattern("dd MMM yyyy");

    private final Booking booking;

    public BookingConfirmationMail(Booking booking) {
        this.booking = booking;
    }

    @Override
    public void build(Message message) throws MessagingException {
        message.setRecipient(Message.RecipientType.TO, new InternetAddress(booking.getGuestEmail()));

        String appName = AppUtil.property("app.name");
        message.setSubject("Booking Confirmed - " + booking.getBookingReference() + " - " + appName);
        message.setContent(buildEmailTemplate(appName), "text/html; charset=utf-8");
    }

    private String buildEmailTemplate(String appName) {
        BigDecimal total = AppUtil.nz(booking.getTotalAmountLkr()).add(AppUtil.nz(booking.getTotalTaxesLkr()));
        String villaName = booking.getVilla() != null ? booking.getVilla().getName() : "";

        return "<!DOCTYPE html>" +
                "<html lang=\"en\">" +
                "<head>" +
                "    <meta charset=\"UTF-8\">" +
                "    <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">" +
                "    <title>Booking Confirmation</title>" +
                "    <style>" +
                "        * { margin: 0; padding: 0; box-sizing: border-box; }" +
                "        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f7fa; }" +
                "        .email-wrapper { width: 100%; background-color: #f4f7fa; padding: 40px 20px; }" +
                "        .email-container { max-width: 600px; width: 100%; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08); }" +
                "        .header { background: linear-gradient(135deg, #b8892f 0%, #8f6a22 100%); padding: 40px 30px; text-align: center; }" +
                "        .header h1 { color: #ffffff; font-size: 26px; font-weight: 700; }" +
                "        .content { padding: 40px; }" +
                "        .greeting { font-size: 20px; font-weight: 600; color: #1a1a1a; margin-bottom: 16px; }" +
                "        .message { font-size: 15px; color: #4a5568; line-height: 1.7; margin-bottom: 24px; }" +
                "        .ref-box { background: linear-gradient(135deg, #fbf3e3 0%, #f5e6c8 100%); border: 2px dashed #b8892f; border-radius: 12px; padding: 20px; text-align: center; margin-bottom: 24px; }" +
                "        .ref-label { font-size: 13px; color: #8f6a22; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; }" +
                "        .ref-code { font-size: 26px; font-weight: 700; color: #8f6a22; letter-spacing: 2px; font-family: 'Courier New', monospace; }" +
                "        table.details { width: 100%; border-collapse: collapse; margin-bottom: 24px; }" +
                "        table.details td { padding: 10px 0; font-size: 14px; color: #4a5568; border-bottom: 1px solid #edf2f7; }" +
                "        table.details td.label { color: #94a3b8; width: 45%; }" +
                "        table.details td.value { font-weight: 600; color: #1a1a1a; text-align: right; }" +
                "        .total-row td { font-size: 16px !important; color: #8f6a22 !important; }" +
                "        .footer { background-color: #1a1a1a; padding: 30px; text-align: center; }" +
                "        .footer p { font-size: 13px; color: #a0aec0; line-height: 1.7; }" +
                "    </style>" +
                "</head>" +
                "<body>" +
                "    <table role=\"presentation\" class=\"email-wrapper\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\">" +
                "        <tr><td align=\"center\">" +
                "            <table role=\"presentation\" class=\"email-container\" cellpadding=\"0\" cellspacing=\"0\" style=\"width:100%;max-width:600px;\">" +
                "                <tr><td class=\"header\"><h1>Booking Confirmed</h1></td></tr>" +
                "                <tr><td class=\"content\">" +
                "                    <div class=\"greeting\">Hi " + safe(booking.getLeadGuestName()) + ",</div>" +
                "                    <p class=\"message\">Thank you for choosing " + safe(appName) + ". Your reservation at "
                + safe(villaName) + " is confirmed. Here are your booking details:</p>" +
                "                    <div class=\"ref-box\">" +
                "                        <div class=\"ref-label\">Booking Reference</div>" +
                "                        <div class=\"ref-code\">" + safe(booking.getBookingReference()) + "</div>" +
                "                    </div>" +
                "                    <table class=\"details\">" +
                "                        <tr><td class=\"label\">Villa</td><td class=\"value\">" + safe(villaName) + "</td></tr>" +
                "                        <tr><td class=\"label\">Check-in</td><td class=\"value\">" + formatDate(booking.getCheckInDate()) + "</td></tr>" +
                "                        <tr><td class=\"label\">Check-out</td><td class=\"value\">" + formatDate(booking.getCheckOutDate()) + "</td></tr>" +
                "                        <tr><td class=\"label\">Nights</td><td class=\"value\">" + AppUtil.nz(booking.getNightsCount()) + "</td></tr>" +
                "                        <tr><td class=\"label\">Guests</td><td class=\"value\">" + AppUtil.nz(booking.getAdultsCount()) + " adults, "
                + AppUtil.nz(booking.getChildrenCount()) + " children</td></tr>" +
                "                        <tr><td class=\"label\">Payment</td><td class=\"value\">" + safe(booking.getPaymentMethod()) + "</td></tr>" +
                "                        <tr class=\"total-row\"><td class=\"label\">Total amount</td><td class=\"value\">LKR " + total.toPlainString() + "</td></tr>" +
                "                    </table>" +
                "                    <p class=\"message\">If anything on this reservation looks incorrect, just reply to this email and we'll sort it out.</p>" +
                "                </td></tr>" +
                "                <tr><td class=\"footer\"><p><strong>" + safe(appName) + "</strong><br>This is an automated email. Please do not reply directly.</p></td></tr>" +
                "            </table>" +
                "        </td></tr>" +
                "    </table>" +
                "</body>" +
                "</html>";
    }

    private static String formatDate(java.time.LocalDate date) {
        return date == null ? "" : date.format(DATE_FORMAT);
    }

    private static String safe(String value) {
        return value == null ? "" : value;
    }
}
