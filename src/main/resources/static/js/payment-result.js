(() => {
  const params = new URLSearchParams(location.search);
  const reference = params.get('ref') || '';
  const refNode = document.getElementById('booking-reference');
  const message = document.getElementById('payment-message');
  const state = document.getElementById('payment-state');
  const actions = document.getElementById('payment-actions');
  refNode.textContent = reference || 'Not provided';
  let booking;
  const show = (text, color) => { state.textContent = text; state.style.color = color; };
  async function check() {
    if (!reference) { message.textContent = 'We could not find a reservation reference.'; return; }
    try {
      const response = await fetch(`api/payments/status?ref=${encodeURIComponent(reference)}`, { headers: { Accept: 'application/json' } });
      if (!response.ok) throw new Error('Reservation not found');
      booking = await response.json();
      if (booking.paymentStatus === 'Paid') {
        message.textContent = 'PayHere confirmed your payment. Your reservation is confirmed and your invoice is ready.';
        show('Paid · PayHere', '#008234'); actions.classList.remove('hidden');
        document.getElementById('invoice-button').classList.remove('hidden');
        document.getElementById('invoice-button').onclick = () => openInvoice(booking);
      } else if (booking.paymentStatus === 'Failed') {
        message.textContent = 'PayHere did not complete this payment. The reservation has not been marked paid.';
        show('Payment failed', '#d4111e'); actions.classList.remove('hidden');
      } else {
        message.textContent = 'The reservation is held while PayHere sends its verified result. This page will check again shortly.';
        show('Payment pending verification', '#8a5a00');
        setTimeout(check, 2500);
      }
    } catch (e) {
      message.textContent = 'We could not retrieve this reservation. Please check My reservations or contact the property.';
      show('Status unavailable', '#595959');
    }
  }
  check();
})();
