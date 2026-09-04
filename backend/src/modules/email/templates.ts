/**
 * §12 — minimal HTML + text templates per event.
 *
 * All templates share the same brand wrapper. We intentionally
 * avoid a templating engine for the small surface count — adding one
 * (Handlebars, MJML, …) is a separate decision.
 *
 * The `bodyHtml` returned here goes verbatim into the email; no
 * PII or secrets are interpolated beyond the payload.
 */

const BRAND = {
  name: 'D-Trips',
  tagline: 'Directed trips, unforgettable premieres.',
  fromEmail: 'bookings@d-trips.com',
  brandColor: '#FFA61C',
};

function wrap(subject: string, preheader: string, innerHtml: string, recipientName?: string): {
  subject: string;
  html: string;
  text: string;
} {
  const greeting = recipientName ? `Hi ${recipientName},` : 'Hi,';
  const text = `${greeting}\n\n${preheader}\n\n— ${BRAND.name}`;
  const html = `<!doctype html><html><body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #FFF8EE; padding: 24px; color: #232323;">
  <div style="max-width: 560px; margin: 0 auto; background: #FFFFFF; border-radius: 12px; overflow: hidden;">
    <div style="background: ${BRAND.brandColor}; padding: 16px 24px; color: #000; font-weight: 600;">${BRAND.name}</div>
    <div style="padding: 24px;">
      <h1 style="font-family: 'LemonadoScript', 'Yellowtail', cursive; font-size: 28px; margin: 0 0 16px;">${subject}</h1>
      <p style="margin: 0 0 12px;">${greeting}</p>
      <div style="font-size: 15px; line-height: 1.6;">${innerHtml}</div>
      <hr style="border: none; border-top: 1px solid rgba(0,0,0,.12); margin: 24px 0;">
      <p style="font-size: 12px; color: #888; margin: 0;">${BRAND.name} — ${BRAND.tagline}</p>
    </div>
  </div>
</body></html>`;
  return { subject, html, text };
}

export function renderWelcome(p: { name: string }): { subject: string; html: string; text: string } {
  return wrap(
    'Welcome to D-Trips',
    'Your account is ready — start browsing trips or build your own.',
    `<p>Welcome to D-Trips, ${p.name}. Your account is ready — start browsing tours or build your own.</p>`,
    p.name,
  );
}

export function renderBookingCreated(p: {
  ref: string;
  totalEgp: number;
  guestName: string;
}): { subject: string; html: string; text: string } {
  return wrap(
    `Booking ${p.ref} received`,
    `We've received your booking for ${p.ref}. Total ${(p.totalEgp / 100).toFixed(2)} EGP. We'll be in touch within 24 hours to confirm payment and send documents.`,
    `<p>We've received your booking <strong>strong>${p.ref}</strong>.</p>
     <p>Total: <strong>strong>${(p.totalEgp / 100).toFixed(2)} EGP</strong></p>
     <p>Our trip director will reach out on WhatsApp or email within 24 hours to confirm payment and send your documents.</p>`,
    p.guestName,
  );
}

export function renderBookingConfirmation(p: {
  ref: string;
  tourName?: string;
  startDate?: Date;
  guestName: string;
}): { subject: string; html: string; text: string } {
  const inner = `
    <p>Your booking <strong>strong>${p.ref}</strong> is now confirmed.</p>
    ${p.tourName ? `<p><strong>Tour:</strong> ${p.tourName}</p>` : ''}
    ${p.startDate ? `<p><strong>Start:</strong> ${p.startDate.toDateString()}</p>` : ''}
    <p>See you soon —.</p>`;
  return wrap(
    `Booking ${p.ref} confirmed`,
    `Your booking ${p.ref} is confirmed. We'll see you on departure day.`,
    inner,
    p.guestName,
  );
}

export function renderBookingUpdate(p: {
  ref: string;
  fromStatus: string;
  toStatus: string;
  reason?: string;
  guestName: string;
}): { subject: string; html: string; text: string } {
  return wrap(
    `Update on ${p.ref}`,
    `Your booking ${p.ref} moved from ${p.fromStatus} to ${p.toStatus}.${p.reason ? ` Reason: ${p.reason}.` : ''}`,
    `<p>Your booking <strong>strong>${p.ref}</strong> status changed from <strong>strong>${p.fromStatus}</strong> to <strong>strong>${p.toStatus}</strong>.</p>
     ${p.reason ? `<p>Reason: ${p.reason}</p>` : ''}`,
    p.guestName,
  );
}

export function renderBookingCancellation(p: {
  ref: string;
  cancelledBy: 'CUSTOMER' | 'ADMIN';
  refundStatus: 'PENDING' | 'NOT_APPLICABLE';
  guestName: string;
}): { subject: string; html: string; text: string } {
  return wrap(
    `Booking ${p.ref} cancelled`,
    `Your booking ${p.ref} has been cancelled${p.cancelledBy === 'ADMIN' ? ' by our team' : ''}. Refund: ${p.refundStatus === 'PENDING' ? 'pending — we will follow up' : 'not applicable per cancellation policy'}.`,
    `<p>Your booking <strong>strong>${p.ref}</strong> has been cancelled${p.cancelledBy === 'ADMIN' ? ' by our team' : ' at your request'}.</p>
     <p><strong>Refund:</strong> ${p.refundStatus === 'PENDING' ? 'pending — we will follow up within 24 hours.' : 'not applicable per the cancellation policy you agreed to at checkout.'}</p>`,
    p.guestName,
  );
}

export function renderTourCancelledBulk(p: {
  ref: string;
  tourName: string;
  startDate: Date;
  guestName: string;
}): { subject: string; html: string; text: string } {
  return wrap(
    `Important: ${p.tourName} date cancelled`,
    `Your booked departure for ${p.tourName} on ${p.startDate.toDateString()} has been cancelled by D-Trips. We'll be in touch within 24 hours to refund or rebook.`,
    `<p>We're sorry — the <strong>strong>${p.tourName}</strong> departure on <strong>strong>${p.startDate.toDateString()}</strong> has been cancelled.</p>
     <p>Our team will reach out on WhatsApp or email within 24 hours to arrange a full refund or help you pick another date.</p>
     <p>Booking reference: <strong>strong>${p.ref}</strong></p>`,
    p.guestName,
  );
}

export function renderPaymentConfirmation(p: {
  ref: string;
  amountEgp: number;
  guestName: string;
}): { subject: string; html: string; text: string } {
  return wrap(
    `Payment received for ${p.ref}`,
    `We received ${(p.amountEgp / 100).toFixed(2)} EGP for booking ${p.ref}. Your card statement will show "EASYCASH* D-TRIPS".`,
    `<p>We received <strong>strong>${(p.amountEgp / 100).toFixed(2)} EGP</strong> for booking <strong>strong>${p.ref}</strong>.</p>
     <p>You'll see "EASYCASH* D-TRIPS" on your card statement.</p>`,
    p.guestName,
  );
}

export function renderPaymentFailed(p: {
  ref: string;
  failureCode?: string;
  failureMessage?: string;
  guestName: string;
}): { subject: string; html: string; text: string } {
  return wrap(
    `Payment failed for ${p.ref}`,
    `We couldn't complete the payment for booking ${p.ref}.${p.failureCode ? ` Code: ${p.failureCode}.` : ''} Reply to this email to retry.`,
    `<p>We couldn't complete the payment for booking <strong>strong>${p.ref}</strong>.</p>
     ${p.failureCode ? `<p>Code: <code>strong>${p.failureCode}</code></p>` : ''}
     ${p.failureMessage ? `<p>${p.failureMessage}</p>` : ''}
     <p>Reply to this email or visit your <a href="${process.env.APP_URL ?? ''}/account">account</a> to retry the payment.</p>`,
    p.guestName,
  );
}

export function renderPasswordReset(p: {
  name: string;
  resetUrl: string;
}): { subject: string; html: string; text: string } {
  return wrap(
    'Reset your D-Trips password',
    `Click the link below to set a new password. The link expires in 30 minutes.`,
    `<p>Click the link below to set a new password. The link expires in <strong>strong>30 minutes</strong>.</p>
     <p><a href="${p.resetUrl}" style="display:inline-block;background:#000;color:#fff;padding:12px 20px;border-radius:999px;text-decoration:none;">Reset password</a></p>
     <p style="font-size:12px;color:#888;">If you didn't request this, you can safely ignore this email.</p>`,
    p.name,
  );
}

export function renderTourReminder(p: {
  ref: string;
  tourName: string;
  startDate: Date;
  pickupLocation?: string;
  guestName: string;
}): { subject: string; html: string; text: string } {
  return wrap(
    `${p.tourName} starts ${p.startDate.toDateString()}`,
    `Your ${p.tourName} trip starts on ${p.startDate.toDateString()}.${p.pickupLocation ? ` Pickup: ${p.pickupLocation}.` : ''}`,
    `<p>Your <strong>strong>${p.tourName}</strong> trip starts on <strong>strong>${p.startDate.toDateString()}</strong>.</p>
     ${p.pickupLocation ? `<p><strong>Pickup:</strong> ${p.pickupLocation}</p>` : ''}
     <p>Reference: ${p.ref}</p>`,
    p.guestName,
  );
}

export function renderContactMessageReceived(p: {
  subject: string;
  name: string;
  email: string;
  phone?: string;
  body: string;
}): { subject: string; html: string; text: string } {
  return wrap(
    `New contact form: ${p.subject}`,
    `From ${p.name} <${p.email}>${p.phone ? ` (${p.phone})` : ''}: ${p.body}`,
    `<p><strong>strong>From:</strong> ${p.name} &lt;${p.email}&gt;${p.phone ? ` (${p.phone})` : ''}</p>
     <p><strong>strong>Subject:</strong> ${p.subject}</p>
     <p>${p.body.replace(/\n/g, '<br>')}</p>`,
  );
}

export function renderTripRequestReceived(p: {
  ref: string;
  contactName: string;
}): { subject: string; html: string; text: string } {
  return wrap(
    `Trip request ${p.ref} received`,
    `We've received your custom trip request ${p.ref}. Our director will reach out within 24 hours.`,
    `<p>We've received your custom trip request <strong>strong>${p.ref}</strong>.</p>
     <p>Our trip director will reach out on WhatsApp or email within 24 hours to start shaping your itinerary.</p>`,
    p.contactName,
  );
}