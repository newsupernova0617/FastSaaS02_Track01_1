import { useState, type FormEvent } from 'react';
import { waitlistCopy } from '../content';

type Status = 'idle' | 'loading' | 'success' | 'already' | 'invalid' | 'error';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const API_BASE = (import.meta.env.PUBLIC_API_BASE_URL ?? 'http://localhost:8787').replace(/\/$/, '');

export default function WaitlistForm() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const trackEvent = (name: string, properties: Record<string, string>) => {
    if (typeof window === 'undefined') return;
    (window as Window & {
      fastsaasTrackEvent?: (eventName: string, eventProperties?: Record<string, string>) => void;
    }).fastsaasTrackEvent?.(name, properties);
  };

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = email.trim();
    if (!EMAIL_RE.test(trimmed)) {
      setStatus('invalid');
      return;
    }
    setStatus('loading');
    try {
      const res = await fetch(`${API_BASE}/waitlist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmed }),
      });
      if (!res.ok) {
        setStatus('error');
        return;
      }
      const data = (await res.json()) as { success?: boolean; alreadyRegistered?: boolean };
      if (data.alreadyRegistered) {
        setStatus('already');
        trackEvent('waitlist_submit', {
          status: 'already',
          source: 'waitlist_form',
        });
      } else if (data.success) {
        setStatus('success');
        setEmail('');
        trackEvent('waitlist_submit', {
          status: 'success',
          source: 'waitlist_form',
        });
      } else {
        setStatus('error');
        trackEvent('waitlist_submit', {
          status: 'error',
          source: 'waitlist_form',
        });
      }
    } catch {
      setStatus('error');
      trackEvent('waitlist_submit', {
        status: 'error',
        source: 'waitlist_form',
      });
    }
  }

  const isDone = status === 'success' || status === 'already';

  return (
    <form
      onSubmit={handleSubmit}
      className="mx-auto mt-8 flex w-full max-w-md flex-col gap-3 sm:flex-row"
      noValidate
    >
      <input
        type="email"
        required
        value={email}
        onChange={(e) => {
          setEmail(e.target.value);
          if (status !== 'idle' && status !== 'loading') setStatus('idle');
        }}
        placeholder={waitlistCopy.placeholder}
        disabled={status === 'loading' || isDone}
        className="app-input flex-1 bg-white/95 text-base-content"
        aria-label="이메일 주소"
      />
      <button
        type="submit"
        disabled={status === 'loading' || isDone}
        className="app-btn app-btn-secondary px-5 py-3"
      >
        {status === 'loading' ? '전송 중...' : waitlistCopy.cta}
      </button>

      <p
        className="sm:col-span-2 text-sm mt-1 min-h-[1.25rem]"
        role="status"
        aria-live="polite"
      >
        {status === 'success' && <span className="text-success">{waitlistCopy.success}</span>}
        {status === 'already' && <span className="opacity-90">{waitlistCopy.already}</span>}
        {status === 'invalid' && <span className="text-warning">{waitlistCopy.invalid}</span>}
        {status === 'error' && <span className="text-error">{waitlistCopy.error}</span>}
      </p>
    </form>
  );
}
