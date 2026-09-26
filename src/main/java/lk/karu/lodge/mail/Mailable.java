package lk.karu.lodge.mail;

import jakarta.mail.Message;
import jakarta.mail.MessagingException;
import jakarta.mail.Session;
import jakarta.mail.Transport;
import jakarta.mail.internet.InternetAddress;
import jakarta.mail.internet.MimeMessage;
import lk.karu.lodge.provider.MailServiceProvider;
import lk.karu.lodge.util.AppUtil;

public abstract class Mailable implements Runnable {
    private final MailServiceProvider mailServiceProvider;

    public Mailable() {
        this.mailServiceProvider = MailServiceProvider.getInstance();
    }

    @Override
    public void run() {
        try {
            Session mailSession = Session.getInstance(mailServiceProvider.getProperties(), mailServiceProvider.getAuthenticator());
            MimeMessage mimeMessage = new MimeMessage(mailSession);
            mimeMessage.setFrom(new InternetAddress(AppUtil.property("app.mail")));
            build(mimeMessage);
            if (mimeMessage.getRecipients(Message.RecipientType.TO).length > 0) {
                Transport.send(mimeMessage);
                System.out.println("\u001B[32mEmail sending successful...\u001B[32m");
            } else {
                throw new RuntimeException("Email recipients can not be empty...");
            }
        } catch (MessagingException e) {
            throw new RuntimeException(e);
        }
    }

    public abstract void build(Message message) throws MessagingException;
}
