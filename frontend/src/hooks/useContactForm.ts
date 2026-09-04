import { useCallback, useMemo, useState, type FormEvent } from 'react';
import { minPhone, validEmail } from '@/lib/validation';
import { submitContactMessage } from '@/lib/api/contact-messages';
import { ApiError } from '@/lib/api/client';

export interface ContactFormValues {
  first: string;
  last: string;
  email: string;
  phone: string;
  countryCode: string;
  subject: string;
  message: string;
}

export interface ContactFormErrors {
  first?: string;
  last?: string;
  email?: string;
  phone?: string;
  subject?: string;
  message?: string;
}

export interface UseContactFormResult {
  values: ContactFormValues;
  errors: ContactFormErrors;
  isSubmitting: boolean;
  submitted: boolean;
  submitError: string | null;
  canSubmit: boolean;
  setField: <K extends keyof ContactFormValues>(key: K, value: ContactFormValues[K]) => void;
  reset: () => void;
  submit: (e?: FormEvent) => Promise<void>;
}

const COUNTRY_CODES = ['EG (+20)', 'US (+1)', 'UK (+44)', 'AE (+971)', 'SA (+966)'] as const;

const INITIAL_VALUES: ContactFormValues = {
  first: '',
  last: '',
  email: '',
  phone: '',
  countryCode: COUNTRY_CODES[0],
  subject: '',
  message: '',
};

/** Extract the "+NN" dial code prefix from the dropdown label. */
function dialCode(label: string): string {
  const m = /\(\+(\d+)\)/.exec(label);
  return m ? `+${m[1]}` : '';
}

/**
 * Stage 5 → Phase 15C — common `{ values, errors, isSubmitting, submit }`
 * shape for the Contact page. Validation is pure + synchronous; the
 * submit hook hits the real `POST /api/contact-messages` endpoint.
 *
 * The backend persists the row first (§24 — the DB row is the
 * durable record), then fires sendContactMessageReceived to the
 * team inbox. We only need to surface a generic success/error
 * banner to the user; no ref to display.
 */
export function useContactForm(): UseContactFormResult {
  const [values, setValues] = useState<ContactFormValues>(INITIAL_VALUES);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const errors = useMemo<ContactFormErrors>(() => {
    const e: ContactFormErrors = {};
    if (!values.first.trim()) e.first = 'Please tell us your first name.';
    if (!values.last.trim()) e.last = 'Please tell us your last name.';
    if (!validEmail(values.email)) e.email = 'Please enter a valid email.';
    if (!minPhone(values.phone)) e.phone = 'Please enter a phone number.';
    if (!values.subject.trim()) e.subject = 'Add a short subject.';
    if (!values.message.trim()) e.message = 'Tell us a bit about your trip.';
    return e;
  }, [values]);

  const canSubmit = Object.keys(errors).length === 0;

  const setField = useCallback(
    <K extends keyof ContactFormValues>(key: K, value: ContactFormValues[K]) => {
      setValues((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  const reset = useCallback(() => {
    setValues(INITIAL_VALUES);
    setSubmitted(false);
    setSubmitError(null);
  }, []);

  const submit = useCallback(
    async (e?: FormEvent) => {
      e?.preventDefault();
      if (!canSubmit || isSubmitting) return;
      setIsSubmitting(true);
      setSubmitError(null);
      try {
        const code = dialCode(values.countryCode);
        const phone = `${code} ${values.phone.trim()}`.trim();
        await submitContactMessage({
          name: `${values.first.trim()} ${values.last.trim()}`.trim(),
          email: values.email.trim(),
          phone,
          subject: values.subject.trim(),
          body: values.message.trim(),
        });
        setSubmitted(true);
        setValues(INITIAL_VALUES);
      } catch (err) {
        const msg =
          err instanceof ApiError && err.status >= 500
            ? 'Server error — please try again.'
            : err instanceof Error
              ? err.message
              : 'Could not send your message.';
        setSubmitError(msg);
      } finally {
        setIsSubmitting(false);
      }
    },
    [canSubmit, isSubmitting, values],
  );

  return { values, errors, isSubmitting, submitted, submitError, canSubmit, setField, reset, submit };
}

export const CONTACT_COUNTRY_CODES = COUNTRY_CODES;
