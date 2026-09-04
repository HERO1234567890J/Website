/**
 * Fixed WhatsApp floating button — bottom-right on every public page.
 *
 * Stage 1: static visual parity with /Website/index.html:947-987.
 * Stage 2 will add: tooltip-show-on-hover behaviour (already in CSS).
 *
 * Phone number is hardcoded for v1 — Stage 5 will move it to site config.
 */
export function WhatsAppFloat() {
  return (
    <a
      href="https://wa.me/201092878580?text=Hi%20D-Trips%2C%20I%27d%20like%20to%20ask%20about%20a%20trip"
      target="_blank"
      rel="noopener noreferrer"
      className="wa-float"
      aria-label="Chat with us on WhatsApp"
    >
      <span className="wa-float-ping" aria-hidden />
      <svg viewBox="0 0 32 32" fill="currentColor" aria-hidden>
        <path d="M16.001 3C9.373 3 4 8.373 4 15c0 2.386.7 4.605 1.905 6.472L4 29l7.727-1.868A11.94 11.94 0 0016.001 27C22.628 27 28 21.627 28 15S22.628 3 16.001 3zm0 21.818c-1.964 0-3.79-.57-5.33-1.553l-.383-.24-4.583 1.108 1.127-4.463-.25-.397A9.77 9.77 0 016.18 15c0-5.415 4.406-9.818 9.821-9.818 5.415 0 9.818 4.403 9.818 9.818 0 5.415-4.403 9.818-9.818 9.818zm5.385-7.36c-.294-.147-1.74-.858-2.01-.956-.27-.098-.467-.147-.664.147-.196.294-.762.956-.934 1.152-.172.196-.343.221-.637.074-.294-.147-1.242-.458-2.366-1.462-.874-.78-1.464-1.744-1.636-2.038-.172-.294-.018-.453.129-.6.133-.132.294-.343.44-.514.147-.172.196-.294.294-.49.098-.196.049-.368-.025-.514-.074-.147-.664-1.6-.911-2.191-.24-.577-.484-.5-.664-.51l-.566-.01c-.196 0-.514.074-.783.368-.27.294-1.03 1.006-1.03 2.454 0 1.448 1.054 2.847 1.2 3.043.147.196 2.075 3.167 5.028 4.441.703.303 1.252.484 1.68.62.706.225 1.35.193 1.858.117.567-.085 1.74-.712 1.985-1.4.245-.688.245-1.278.172-1.4-.074-.123-.27-.196-.564-.343z" />
      </svg>
      <span className="wa-tip">Chat with us</span>
    </a>
  );
}
