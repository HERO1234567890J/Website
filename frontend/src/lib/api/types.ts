/**
 * Shared API response types — mirror the Prisma models on the backend
 * (`backend/prisma/schema.prisma`). Hand-written here instead of
 * generated so the frontend stays decoupled from Prisma's generated
 * client and from `@nestjs/swagger`. If the schema drifts, TS errors
 * at the API call site are the early-warning system.
 *
 * Money: `startingPrice` on Tour is integer EGP piasters per §8/§11.
 * Format to major units at the render boundary (`/ 100`), not here.
 */

export interface Category {
  id: string;
  slug: string;
  name: string;
  isActive: boolean;
  displayOrder: number;
}

export interface Destination {
  id: string;
  slug: string;
  name: string;
  isActive: boolean;
}

export interface TripTypePreset {
  id: string;
  slug: string;
  name: string;
  /** Bunny Storage ID or external URL — null until media pipeline lands. */
  imageId: string | null;
  displayOrder: number;
  isActive: boolean;
}

export interface TourImage {
  id: string;
  tourId: string;
  src: string;
  alt: string | null;
  displayOrder: number;
}

export interface TourDate {
  id: string;
  tourId: string;
  /** ISO-8601 date string from JSON serialization. */
  startDate: string;
  /** ISO-8601 date string. */
  endDate: string;
  capacity: number;
  remainingCapacity: number;
}

/**
 * Tour list-view (from `GET /api/tours`). Includes the lightweight
 * `category` + `destination` joins; `images` and `dates` come only
 * from the detail endpoint.
 */
export interface TourSummary {
  id: string;
  slug: string;
  title: string;
  shortDescription: string;
  description: string;
  categoryId: string;
  destinationId: string | null;
  /** Integer EGP piasters (per §8). */
  startingPrice: number;
  currency: string;
  durationDays: number;
  isPublished: boolean;
  /** Bunny Storage ID or external URL. */
  coverImageId: string | null;
  itinerary: unknown | null;
  included: string[];
  excluded: string[];
  meetingInfo: string | null;
  cancellationPolicy: string | null;
  createdAt: string;
  updatedAt: string;
  category: Category;
  destination: Destination | null;
}

/** Tour detail-view (from `GET /api/tours/:slug`) — adds images + dates. */
export interface TourDetail extends TourSummary {
  images: TourImage[];
  dates: TourDate[];
}

export interface ListToursQuery {
  search?: string;
  /** Category slug (e.g. "local"). */
  category?: string;
  /** Destination slug (e.g. "ras-mohammed"). */
  destination?: string;
  /** Integer EGP piasters (per §8). */
  minPrice?: number;
  maxPrice?: number;
  minDays?: number;
  maxDays?: number;
  sort?: 'price-asc' | 'price-desc' | 'duration-asc' | 'duration-desc' | 'newest';
  page?: number;
  pageSize?: number;
}

export interface PagedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}
