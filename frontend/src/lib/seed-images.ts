/**
 * TEMPORARY SEED CONTENT — see §2.4 of the original spec.
 *
 * All 17 images are hotlinked from Unsplash. They will be replaced with
 * real photography via Bunny Storage before public launch. Every consumer
 * MUST import from this file (never hard-code a URL) so the §2.4 swap is
 * a one-file change.
 *
 * CI guard: `pnpm seed:check --prod` fails the build if any file outside
 * `src/lib/` references images.unsplash.com.
 */
export const SEED_IMAGES = {
  // Heroes (1800w)
  heroAerial: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1800&q=80',
  heroContact:
    'https://images.unsplash.com/photo-1519046904884-53103b34b206?auto=format&fit=crop&w=1800&q=80',
  // Trip cards (700w)
  rasMohammed:
    'https://images.unsplash.com/photo-1502602898536-47ad22581b52?auto=format&fit=crop&w=700&q=80',
  elGouna: 'https://images.unsplash.com/photo-1518684079-3c830dcef090?auto=format&fit=crop&w=700&q=80',
  turkiye: 'https://images.unsplash.com/photo-1533105079780-92b9be482077?auto=format&fit=crop&w=700&q=80',
  greece: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=700&q=80',
  marsaAlam:
    'https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=700&q=80',
  rasSedr: 'https://images.unsplash.com/photo-1500375592092-40eb2168fd21?auto=format&fit=crop&w=700&q=80',
  zanzibar:
    'https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?auto=format&fit=crop&w=700&q=80',
  albania: 'https://images.unsplash.com/photo-1495954380655-01ffdb4ea616?auto=format&fit=crop&w=700&q=80',
  vietnam: 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=700&q=80',
  // Auth visuals (1200w)
  authLogin:
    'https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?auto=format&fit=crop&w=1200&q=80',
  authSignup:
    'https://images.unsplash.com/photo-1519046904884-53103b34b206?auto=format&fit=crop&w=1200&q=80',
  // Trip-detail gallery (500w)
  tdRasReef:
    'https://images.unsplash.com/photo-1502602898536-47ad22581b52?auto=format&fit=crop&w=500&q=80',
  tdDahabLagoon:
    'https://images.unsplash.com/photo-1518684079-3c830dcef090?auto=format&fit=crop&w=500&q=80',
  tdDesertCamp:
    'https://images.unsplash.com/photo-1500375592092-40eb2168fd21?auto=format&fit=crop&w=500&q=80',
  tdSinai: 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=500&q=80',
  // Destination cards (500w)
  destDahab:
    'https://images.unsplash.com/photo-1502602898536-47ad22581b52?auto=format&fit=crop&w=500&q=80',
  destElGouna:
    'https://images.unsplash.com/photo-1518684079-3c830dcef090?auto=format&fit=crop&w=500&q=80',
  destMarsaAlam:
    'https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=500&q=80',
  destRas: 'https://images.unsplash.com/photo-1500375592092-40eb2168fd21?auto=format&fit=crop&w=500&q=80',
  destTurkiye:
    'https://images.unsplash.com/photo-1533105079780-92b9be482077?auto=format&fit=crop&w=500&q=80',
  destGreece:
    'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=500&q=80',
  destZanzibar:
    'https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?auto=format&fit=crop&w=500&q=80',
  destVietnam:
    'https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=500&q=80',
  // Vibe cards (700w)
  vibeFriends:
    'https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?auto=format&fit=crop&w=700&q=80',
  vibeFamily:
    'https://images.unsplash.com/photo-1500534623283-312aade485b7?auto=format&fit=crop&w=700&q=80',
  vibeHoneymoon:
    'https://images.unsplash.com/photo-1518684079-3c830dcef090?auto=format&fit=crop&w=700&q=80',
  vibeSolo: 'https://images.unsplash.com/photo-1494783367193-149034c05e8f?auto=format&fit=crop&w=700&q=80',
  vibeAdventure:
    'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?auto=format&fit=crop&w=700&q=80',
  vibeUniversity:
    'https://images.unsplash.com/photo-1533130061792-64b345e4a833?auto=format&fit=crop&w=700&q=80',
  // About gallery (900w)
  aboutWadi:
    'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?auto=format&fit=crop&w=900&q=80',
  aboutCappadocia:
    'https://images.unsplash.com/photo-1533105079780-92b9be482077?auto=format&fit=crop&w=900&q=80',
  aboutReef:
    'https://images.unsplash.com/photo-1502602898536-47ad22581b52?auto=format&fit=crop&w=900&q=80',
  aboutDolomites:
    'https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=900&q=80',
  aboutPacific:
    'https://images.unsplash.com/photo-1519046904884-53103b34b206?auto=format&fit=crop&w=900&q=80',
  aboutSantorini:
    'https://images.unsplash.com/photo-1518684079-3c830dcef090?auto=format&fit=crop&w=900&q=80',
  aboutAnnapurna:
    'https://images.unsplash.com/photo-1494783367193-149034c05e8f?auto=format&fit=crop&w=900&q=80',
  aboutBlueHole:
    'https://images.unsplash.com/photo-1493246507139-91e8fad9978e?auto=format&fit=crop&w=900&q=80',
  aboutRidge:
    'https://images.unsplash.com/photo-1533130061792-64b345e4a833?auto=format&fit=crop&w=900&q=80',
  aboutNile: 'https://images.unsplash.com/photo-1500534623283-312aade485b7?auto=format&fit=crop&w=900&q=80',
  aboutPatagonia:
    'https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=900&q=80',
  aboutRomania:
    'https://images.unsplash.com/photo-1495954380655-01ffdb4ea616?auto=format&fit=crop&w=900&q=80',
  // Order summary thumb (200w)
  orderRas: 'https://images.unsplash.com/photo-1502602898536-47ad22581b52?auto=format&fit=crop&w=200&q=80',
  // Admin thumbs (200w)
  adminGeorgia:
    'https://images.unsplash.com/photo-1541544741938-0af808871cc0?auto=format&fit=crop&w=200&q=80',
  adminSiwa:
    'https://images.unsplash.com/photo-1509805142282-2ec5eb0f60ac?auto=format&fit=crop&w=200&q=80',
  // Teaser / split
  teaserVan:
    'https://images.unsplash.com/photo-1519046904884-53103b34b206?auto=format&fit=crop&w=900&q=80',
  teaserFounder: '/brand/home-teaser.jpg',
  // Contact support photo
  contactSunset:
    'https://images.unsplash.com/photo-1500375592092-40eb2168fd21?auto=format&fit=crop&w=800&q=80',
} as const;

export type SeedImageKey = keyof typeof SEED_IMAGES;
