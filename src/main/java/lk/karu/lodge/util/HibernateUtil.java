package lk.karu.lodge.util;

import org.hibernate.SessionFactory;
import org.hibernate.cfg.Configuration;

public class HibernateUtil {

    private static final SessionFactory SESSION_FACTORY = build();

    private static SessionFactory build() {
        try {
            Configuration cfg = new Configuration().configure();

            String url = System.getenv("LODGE_DB_URL");
            String user = System.getenv("LODGE_DB_USER");
            String pass = System.getenv("LODGE_DB_PASSWORD");
            if (url != null && !url.isBlank()) cfg.setProperty("hibernate.connection.url", url);
            if (user != null && !user.isBlank()) cfg.setProperty("hibernate.connection.username", user);
            if (pass != null) cfg.setProperty("hibernate.connection.password", pass);

            return cfg.buildSessionFactory();
        } catch (Throwable t) {
            t.printStackTrace();
            throw new ExceptionInInitializerError(t);
        }
    }

    public static SessionFactory getSessionFactory() {
        return SESSION_FACTORY;
    }
}
