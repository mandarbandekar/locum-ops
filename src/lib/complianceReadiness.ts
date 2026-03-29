/**
 * Compliance Readiness Engine
 * Computes readiness scores, missing items, and recommended actions for credentials.
 */

import { getDaysUntilExpiration } from '@/lib/credentialTypes';

export interface ReadinessFactor {
  key: string;
  label: string;
  met: boolean;
  weight: number;
  severity: 'high' | 'needs_review' | 'info';
}

export interface MissingItem {
  id: string;
  title: string;
  severity: 'high' | 'needs_review' | 'info';
  actionType: string;
  actionLabel: string;
  credentialId?: string;
}

export interface ReadinessResult {
  score: number;
  label: 'not_ready' | 'in_progress' | 'nearly_ready' | 'ready';
  factors: ReadinessFactor[];
  missingItems: MissingItem[];
  recommendedAction: string | null;
  blockingCount: number;
}

export interface CredentialReadinessInput {
  id: string;
  custom_title: string;
  credential_type: string;
  expiration_date: string | null;
  renewal_open_date?: string | null;
  renewal_url?: string | null;
  ce_required_hours: number | null;
  ce_logged_hours: number;
  ce_missing_certs: number;
  linked_documents_count: number;
  has_credential_number: boolean;
  has_issuing_authority: boolean;
  has_issue_date: boolean;
  status: string;
}

function scoreToLabel(score: number): ReadinessResult['label'] {
  if (score >= 90) return 'ready';
  if (score >= 70) return 'nearly_ready';
  if (score >= 40) return 'in_progress';
  return 'not_ready';
}

export function computeReadiness(input: CredentialReadinessInput): ReadinessResult {
  const factors: ReadinessFactor[] = [];
  const missingItems: MissingItem[] = [];

  // Factor 1: Expiration date present
  const hasExpDate = !!input.expiration_date;
  factors.push({
    key: 'expiration_date',
    label: 'Expiration date on file',
    met: hasExpDate,
    weight: 10,
    severity: 'needs_review',
  });
  if (!hasExpDate) {
    missingItems.push({
      id: `${input.id}-exp-date`,
      title: 'Missing expiration date',
      severity: 'needs_review',
      actionType: 'edit_credential',
      actionLabel: 'Edit Credential',
      credentialId: input.id,
    });
  }

  // Factor 2: Not expired
  const daysLeft = getDaysUntilExpiration(input.expiration_date);
  const notExpired = daysLeft === null || daysLeft >= 0;
  factors.push({
    key: 'not_expired',
    label: 'Credential is current',
    met: notExpired,
    weight: 20,
    severity: 'high',
  });

  // Factor 3: Renewal window known
  const hasRenewalWindow = !!input.renewal_open_date;
  factors.push({
    key: 'renewal_window',
    label: 'Renewal window known',
    met: hasRenewalWindow,
    weight: 5,
    severity: 'info',
  });

  // Factor 4: CE requirement met
  let ceMet = true;
  if (input.ce_required_hours && input.ce_required_hours > 0) {
    ceMet = input.ce_logged_hours >= input.ce_required_hours;
    factors.push({
      key: 'ce_complete',
      label: `CE hours complete (${input.ce_logged_hours}/${input.ce_required_hours})`,
      met: ceMet,
      weight: 20,
      severity: 'high',
    });
    if (!ceMet) {
      const needed = input.ce_required_hours - input.ce_logged_hours;
      missingItems.push({
        id: `${input.id}-ce-hours`,
        title: `${needed} CE hours still needed`,
        severity: 'high',
        actionType: 'add_ce',
        actionLabel: 'Add CE',
        credentialId: input.id,
      });
    }
  }

  // Factor 5: CE certificates complete
  if (input.ce_missing_certs > 0) {
    factors.push({
      key: 'ce_certs',
      label: 'All CE certificates uploaded',
      met: false,
      weight: 10,
      severity: 'needs_review',
    });
    missingItems.push({
      id: `${input.id}-ce-certs`,
      title: `${input.ce_missing_certs} CE certificate${input.ce_missing_certs > 1 ? 's' : ''} missing`,
      severity: 'needs_review',
      actionType: 'upload_cert',
      actionLabel: 'Upload Certificate',
      credentialId: input.id,
    });
  } else {
    factors.push({
      key: 'ce_certs',
      label: 'All CE certificates uploaded',
      met: true,
      weight: 10,
      severity: 'info',
    });
  }

  // Factor 6: Required documents on file
  const hasDocuments = input.linked_documents_count > 0;
  factors.push({
    key: 'documents',
    label: 'Supporting documents on file',
    met: hasDocuments,
    weight: 10,
    severity: 'needs_review',
  });
  if (!hasDocuments) {
    missingItems.push({
      id: `${input.id}-docs`,
      title: 'No supporting documents linked',
      severity: 'needs_review',
      actionType: 'upload_document',
      actionLabel: 'Upload Document',
      credentialId: input.id,
    });
  }

  // Factor 7: Renewal URL present
  const hasRenewalUrl = !!input.renewal_url;
  factors.push({
    key: 'renewal_url',
    label: 'Renewal URL available',
    met: hasRenewalUrl,
    weight: 5,
    severity: 'info',
  });
  if (!hasRenewalUrl && daysLeft !== null && daysLeft <= 90) {
    missingItems.push({
      id: `${input.id}-renewal-url`,
      title: 'No renewal URL on file',
      severity: 'info',
      actionType: 'edit_credential',
      actionLabel: 'Add Renewal URL',
      credentialId: input.id,
    });
  }

  // Factor 8: Credential info confirmed
  const infoComplete = input.has_credential_number && input.has_issuing_authority && input.has_issue_date;
  factors.push({
    key: 'info_complete',
    label: 'Credential info confirmed',
    met: infoComplete,
    weight: 10,
    severity: 'info',
  });

  // Factor 9: Status is not archived/expired
  const healthyStatus = input.status !== 'archived' && input.status !== 'expired';
  factors.push({
    key: 'status_healthy',
    label: 'Active status',
    met: healthyStatus,
    weight: 10,
    severity: 'high',
  });

  // Compute score
  const totalWeight = factors.reduce((sum, f) => sum + f.weight, 0);
  const earnedWeight = factors.filter(f => f.met).reduce((sum, f) => sum + f.weight, 0);
  const score = totalWeight > 0 ? Math.round((earnedWeight / totalWeight) * 100) : 0;
  const blockingCount = missingItems.filter(m => m.severity === 'high').length;

  // Recommended action
  let recommendedAction: string | null = null;
  if (missingItems.length > 0) {
    // Prioritize high severity first
    const highPriority = missingItems.find(m => m.severity === 'high');
    const reviewPriority = missingItems.find(m => m.severity === 'needs_review');
    recommendedAction = (highPriority || reviewPriority || missingItems[0]).actionLabel;
  } else if (daysLeft !== null && daysLeft <= 30 && daysLeft >= 0) {
    recommendedAction = 'Review Renewal';
  }

  return {
    score,
    label: scoreToLabel(score),
    factors,
    missingItems,
    recommendedAction,
    blockingCount,
  };
}

export function getReadinessColor(label: string): string {
  switch (label) {
    case 'ready': return 'text-emerald-600 dark:text-emerald-400';
    case 'nearly_ready': return 'text-blue-600 dark:text-blue-400';
    case 'in_progress': return 'text-amber-600 dark:text-amber-400';
    case 'not_ready': return 'text-red-600 dark:text-red-400';
    default: return 'text-muted-foreground';
  }
}

export function getReadinessBgColor(label: string): string {
  switch (label) {
    case 'ready': return 'bg-emerald-500/15';
    case 'nearly_ready': return 'bg-blue-500/15';
    case 'in_progress': return 'bg-amber-500/15';
    case 'not_ready': return 'bg-red-500/15';
    default: return 'bg-muted';
  }
}

export function getReadinessDisplayLabel(label: string): string {
  switch (label) {
    case 'ready': return 'Ready to Renew';
    case 'nearly_ready': return 'Nearly Ready';
    case 'in_progress': return 'In Progress';
    case 'not_ready': return 'Not Ready';
    default: return label;
  }
}

export function getSeverityColor(severity: string): string {
  switch (severity) {
    case 'high': return 'text-red-600 dark:text-red-400';
    case 'needs_review': return 'text-amber-600 dark:text-amber-400';
    case 'info': return 'text-blue-600 dark:text-blue-400';
    default: return 'text-muted-foreground';
  }
}

export function getSeverityBg(severity: string): string {
  switch (severity) {
    case 'high': return 'bg-red-500/10 border-red-500/20';
    case 'needs_review': return 'bg-amber-500/10 border-amber-500/20';
    case 'info': return 'bg-blue-500/10 border-blue-500/20';
    default: return 'bg-muted';
  }
}
