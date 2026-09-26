package lk.karu.lodge.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "booking_rooms")
public class BookingRoom {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    private int id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "booking_id")
    private Booking booking;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "room_type_id")
    private RoomType roomType;

    @Column(name = "quantity")
    private Integer quantity;

    @Column(name = "price_per_night_lkr")
    private BigDecimal pricePerNightLkr;

    @Column(name = "total_price_lkr")
    private BigDecimal totalPriceLkr;

    public BookingRoom() {
    }

    public int getId() {
        return id;
    }

    public void setId(int id) {
        this.id = id;
    }

    public Booking getBooking() {
        return booking;
    }

    public void setBooking(Booking booking) {
        this.booking = booking;
    }

    public RoomType getRoomType() {
        return roomType;
    }

    public void setRoomType(RoomType roomType) {
        this.roomType = roomType;
    }

    public Integer getQuantity() {
        return quantity;
    }

    public void setQuantity(Integer quantity) {
        this.quantity = quantity;
    }

    public BigDecimal getPricePerNightLkr() {
        return pricePerNightLkr;
    }

    public void setPricePerNightLkr(BigDecimal pricePerNightLkr) {
        this.pricePerNightLkr = pricePerNightLkr;
    }

    public BigDecimal getTotalPriceLkr() {
        return totalPriceLkr;
    }

    public void setTotalPriceLkr(BigDecimal totalPriceLkr) {
        this.totalPriceLkr = totalPriceLkr;
    }

}
