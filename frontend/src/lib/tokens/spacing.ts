/**
 * Spacing + z-index tokens — lifted from the original HTML sections.
 */
export const spacing = {
  section: '120px',
  wrapMaxWidth: '1240px',
  wrapPaddingX: '40px',
  headerHeight: '66px',
  footerShellMargin: '22px',
  footerShellMarginMobile: '12px',
} as const;

export const zIndex = {
  header: 100,
  waFloat: 400,
  mobileNav: 999,
  navToggle: 1001,
  dashOverlay: 190,
  dashTopbar: 200,
  dashSidebar: 210,
} as const;
