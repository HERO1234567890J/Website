import { Routes, Route } from 'react-router-dom';
import { AuthGuard } from './auth/AuthGuard';
import { About } from './pages/About';
import { Account } from './pages/Account';
import { Admin } from './pages/Admin';
import { BuildTrip } from './pages/BuildTrip';
import { BuildTripDestinations } from './pages/BuildTripDestinations';
import { BuildTripDetails } from './pages/BuildTripDetails';
import { BuildTripReview } from './pages/BuildTripReview';
import { Checkout } from './pages/Checkout';
import { Contact } from './pages/Contact';
import { Home } from './pages/Home';
import { Login } from './pages/Login';
import { PrivacyPolicy } from './pages/PrivacyPolicy';
import { PublicLayout } from './layouts/PublicLayout';
import { Signup } from './pages/Signup';
import { TermsConditions } from './pages/TermsConditions';
import { TourDetail } from './pages/TourDetail';
import { Tours } from './pages/Tours';

/**
 * Stage 4 — full router.
 *
 * All public routes nest inside <PublicLayout> (header + footer + WA float).
 * /admin has its own sidebar chrome and renders outside PublicLayout.
 */
export function App() {
  return (
    <Routes>
      {/* Public surface — header + footer + WA float */}
      <Route element={<PublicLayout variant="overlay" />}>
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<About />} />
        <Route path="/tours" element={<Tours />} />
        <Route path="/tours/:slug" element={<TourDetail />} />
        <Route path="/build-trip" element={<BuildTrip />} />
        <Route path="/build-trip/destinations" element={<BuildTripDestinations />} />
        <Route path="/build-trip/details" element={<BuildTripDetails />} />
        <Route path="/build-trip/review" element={<BuildTripReview />} />
        <Route path="/checkout" element={<Checkout />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/privacy-policy" element={<PrivacyPolicy />} />
        <Route path="/terms-conditions" element={<TermsConditions />} />
        <Route
          path="/account"
          element={
            <AuthGuard>
              <Account />
            </AuthGuard>
          }
        />
      </Route>

      {/* Admin — own chrome, no public layout, role-guarded */}
      <Route
        path="/admin"
        element={
          <AuthGuard role="ADMIN">
            <Admin />
          </AuthGuard>
        }
      />
    </Routes>
  );
}
