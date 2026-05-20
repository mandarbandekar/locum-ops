export type DeviceType = 'mobile' | 'tablet' | 'desktop' | 'unknown';

export function detectDeviceType(ua?: string): DeviceType {
  const s = (ua ?? (typeof navigator !== 'undefined' ? navigator.userAgent : '') ?? '').toLowerCase();
  if (!s) return 'unknown';
  if (/ipad|tablet|playbook|silk|(android(?!.*mobile))/i.test(s)) return 'tablet';
  if (/mobi|iphone|ipod|android|blackberry|opera mini|iemobile|webos/i.test(s)) return 'mobile';
  return 'desktop';
}
