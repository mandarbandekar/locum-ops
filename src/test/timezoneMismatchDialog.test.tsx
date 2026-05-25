import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';

const updateProfileMock = vi.fn().mockResolvedValue(undefined);

let mockProfile: any = null;
let mockIsDemo = false;

vi.mock('@/contexts/UserProfileContext', () => ({
  useUserProfile: () => ({
    profile: mockProfile,
    updateProfile: updateProfileMock,
  }),
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ isDemo: mockIsDemo }),
}));

import { TimezoneMismatchDialog } from '@/components/TimezoneMismatchDialog';

function setDeviceTz(tz: string) {
  vi.spyOn(Intl, 'DateTimeFormat').mockImplementation(
    () => ({ resolvedOptions: () => ({ timeZone: tz }) }) as any,
  );
}

function baseProfile(overrides: Partial<any> = {}) {
  return {
    id: 'p1',
    user_id: 'u1',
    timezone: 'America/Los_Angeles',
    timezone_pinned: false,
    ...overrides,
  };
}

beforeEach(() => {
  updateProfileMock.mockClear();
  sessionStorage.clear();
  mockIsDemo = false;
  mockProfile = null;
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('TimezoneMismatchDialog', () => {
  it('appears when saved tz differs from supported device tz and not pinned', () => {
    setDeviceTz('America/New_York');
    mockProfile = baseProfile({ timezone: 'America/Los_Angeles', timezone_pinned: false });
    render(<TimezoneMismatchDialog />);
    expect(
      screen.getByText(/Your device timezone is different/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/Pacific \(Los Angeles\)/)).toBeInTheDocument();
    expect(screen.getByText(/Eastern \(New York\)/)).toBeInTheDocument();
  });

  it('does NOT appear when timezone_pinned is true', () => {
    setDeviceTz('America/New_York');
    mockProfile = baseProfile({ timezone_pinned: true });
    render(<TimezoneMismatchDialog />);
    expect(screen.queryByText(/Your device timezone is different/i)).toBeNull();
  });

  it('does NOT appear when device tz is unsupported / non-US', () => {
    setDeviceTz('Europe/Rome');
    mockProfile = baseProfile();
    render(<TimezoneMismatchDialog />);
    expect(screen.queryByText(/Your device timezone is different/i)).toBeNull();
  });

  it('does NOT appear when device tz matches saved tz', () => {
    setDeviceTz('America/Los_Angeles');
    mockProfile = baseProfile({ timezone: 'America/Los_Angeles' });
    render(<TimezoneMismatchDialog />);
    expect(screen.queryByText(/Your device timezone is different/i)).toBeNull();
  });

  it('does NOT appear in demo mode', () => {
    setDeviceTz('America/New_York');
    mockIsDemo = true;
    mockProfile = baseProfile();
    render(<TimezoneMismatchDialog />);
    expect(screen.queryByText(/Your device timezone is different/i)).toBeNull();
  });

  it('"Use device timezone" calls updateProfile with timezone only', async () => {
    setDeviceTz('America/New_York');
    mockProfile = baseProfile();
    render(<TimezoneMismatchDialog />);
    fireEvent.click(screen.getByRole('button', { name: /Use device timezone/i }));
    expect(updateProfileMock).toHaveBeenCalledTimes(1);
    expect(updateProfileMock).toHaveBeenCalledWith({ timezone: 'America/New_York' });
  });

  it('"Keep saved timezone" does not call updateProfile and dismisses for the session', () => {
    setDeviceTz('America/New_York');
    mockProfile = baseProfile();
    const { unmount } = render(<TimezoneMismatchDialog />);
    fireEvent.click(screen.getByRole('button', { name: /Keep saved timezone/i }));
    expect(updateProfileMock).not.toHaveBeenCalled();
    expect(sessionStorage.getItem('locumops_tz_prompt_dismissed')).toBe('1');

    // Re-mount in the same session: should stay closed.
    unmount();
    render(<TimezoneMismatchDialog />);
    expect(screen.queryByText(/Your device timezone is different/i)).toBeNull();
  });

  it('"Don\'t ask again" calls updateProfile with timezone_pinned = true', () => {
    setDeviceTz('America/New_York');
    mockProfile = baseProfile();
    render(<TimezoneMismatchDialog />);
    fireEvent.click(screen.getByRole('button', { name: /Don't ask again/i }));
    expect(updateProfileMock).toHaveBeenCalledTimes(1);
    expect(updateProfileMock).toHaveBeenCalledWith({ timezone_pinned: true });
  });
});
