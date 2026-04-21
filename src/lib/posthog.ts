import posthog from 'posthog-js';

const POSTHOG_KEY = 'phc_tJUghL2jaXZVj7qaxmBBWtXJpyHDswtox2ZDtj9uErRT';
const POSTHOG_HOST = 'https://us.i.posthog.com';

let initialized = false;

export function initPostHog() {
  if (initialized || typeof window === 'undefined') return;
  posthog.init(POSTHOG_KEY, {
    api_host: POSTHOG_HOST,
    person_profiles: 'identified_only',
    capture_pageview: false, // we capture manually on route changes
    capture_pageleave: true,
  });
  initialized = true;
}

export { posthog };
