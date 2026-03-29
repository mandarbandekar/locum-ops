/**
 * Compliance Data Hook
 * Aggregates credential, CE, document data and computes readiness for the Compliance Center.
 */

import { useMemo } from 'react';
import { useCredentials } from '@/hooks/useCredentials';
import { useCEEntries } from '@/hooks/useCEEntries';
import { computeReadiness, type CredentialReadinessInput, type ReadinessResult, type MissingItem } from '@/lib/complianceReadiness';
import { computeCredentialStatus, getDaysUntilExpiration } from '@/lib/credentialTypes';

export interface EnrichedCredential {
  id: string;
  custom_title: string;
  credential_type: string;
  jurisdiction: string | null;
  jurisdiction_type: string | null;
  issuing_authority: string | null;
  credential_number: string | null;
  issue_date: string | null;
  expiration_date: string | null;
  renewal_frequency: string | null;
  renewal_open_date: string | null;
  renewal_url: string | null;
  status: string;
  notes: string | null;
  tags: string[] | null;
  ce_required_hours: number | null;
  computedStatus: string;
  daysLeft: number | null;
  ceStats: { completedHours: number; linkedCount: number; missingCerts: number };
  linkedDocumentsCount: number;
  readiness: ReadinessResult;
}

export interface ComplianceAlert {
  id: string;
  severity: 'high' | 'needs_review' | 'info';
  title: string;
  message: string;
  actionType: string;
  actionLabel: string;
  credentialId?: string;
  credentialName?: string;
}

export interface ComplianceSummary {
  activeCredentials: number;
  renewalsDueSoon: number;
  missingDocuments: number;
  ceIncomplete: number;
  readyToRenew: number;
  expiredCount: number;
}

export function useComplianceData() {
  const { credentials, documents, isLoading: credLoading } = useCredentials();
  const { entries, links, isLoading: ceLoading, getCredentialCEStats } = useCEEntries();

  const enrichedCredentials: EnrichedCredential[] = useMemo(() => {
    return credentials.map(c => {
      const computedStatus = computeCredentialStatus(c.expiration_date, c.status);
      const daysLeft = getDaysUntilExpiration(c.expiration_date);
      const ceStats = getCredentialCEStats(c.id);
      const linkedDocs = documents.filter(d => d.credential_id === c.id);

      const readinessInput: CredentialReadinessInput = {
        id: c.id,
        custom_title: c.custom_title,
        credential_type: c.credential_type,
        expiration_date: c.expiration_date,
        renewal_open_date: (c as any).renewal_open_date ?? null,
        renewal_url: (c as any).renewal_url ?? null,
        ce_required_hours: c.ce_required_hours,
        ce_logged_hours: ceStats.completedHours,
        ce_missing_certs: ceStats.missingCerts,
        linked_documents_count: linkedDocs.length,
        has_credential_number: !!c.credential_number,
        has_issuing_authority: !!c.issuing_authority,
        has_issue_date: !!c.issue_date,
        status: computedStatus,
      };

      const readiness = computeReadiness(readinessInput);

      return {
        id: c.id,
        custom_title: c.custom_title,
        credential_type: c.credential_type,
        jurisdiction: c.jurisdiction,
        jurisdiction_type: (c as any).jurisdiction_type ?? 'state',
        issuing_authority: c.issuing_authority,
        credential_number: c.credential_number,
        issue_date: c.issue_date,
        expiration_date: c.expiration_date,
        renewal_frequency: c.renewal_frequency,
        renewal_open_date: (c as any).renewal_open_date ?? null,
        renewal_url: (c as any).renewal_url ?? null,
        status: c.status,
        notes: c.notes,
        tags: c.tags,
        ce_required_hours: c.ce_required_hours,
        computedStatus,
        daysLeft,
        ceStats,
        linkedDocumentsCount: linkedDocs.length,
        readiness,
      };
    });
  }, [credentials, documents, getCredentialCEStats]);

  const summary: ComplianceSummary = useMemo(() => {
    const active = enrichedCredentials.filter(c => c.computedStatus === 'active').length;
    const dueSoon = enrichedCredentials.filter(c => c.daysLeft !== null && c.daysLeft > 0 && c.daysLeft <= 60).length;
    const expired = enrichedCredentials.filter(c => c.computedStatus === 'expired').length;
    const missingDocs = enrichedCredentials.filter(c => c.linkedDocumentsCount === 0 && c.computedStatus !== 'archived').length;
    const ceIncomplete = enrichedCredentials.filter(c => {
      if (!c.ce_required_hours || c.ce_required_hours <= 0) return false;
      return c.ceStats.completedHours < c.ce_required_hours;
    }).length;
    const readyToRenew = enrichedCredentials.filter(c => c.readiness.label === 'ready' && c.daysLeft !== null && c.daysLeft <= 120).length;

    return {
      activeCredentials: active,
      renewalsDueSoon: dueSoon,
      missingDocuments: missingDocs,
      ceIncomplete,
      readyToRenew,
      expiredCount: expired,
    };
  }, [enrichedCredentials]);

  const alerts: ComplianceAlert[] = useMemo(() => {
    const result: ComplianceAlert[] = [];

    enrichedCredentials.forEach(c => {
      // Expired credentials
      if (c.computedStatus === 'expired') {
        result.push({
          id: `expired-${c.id}`,
          severity: 'high',
          title: `${c.custom_title} has expired`,
          message: c.daysLeft !== null ? `Expired ${Math.abs(c.daysLeft)} days ago` : 'Credential has expired',
          actionType: 'review_renewal',
          actionLabel: 'Review Renewal',
          credentialId: c.id,
          credentialName: c.custom_title,
        });
      }

      // Expiring soon
      if (c.daysLeft !== null && c.daysLeft > 0 && c.daysLeft <= 60) {
        result.push({
          id: `expiring-${c.id}`,
          severity: c.daysLeft <= 30 ? 'high' : 'needs_review',
          title: `${c.custom_title} expires in ${c.daysLeft} days`,
          message: `Renewal readiness: ${c.readiness.score}%`,
          actionType: 'review_renewal',
          actionLabel: 'Review Renewal',
          credentialId: c.id,
          credentialName: c.custom_title,
        });
      }

      // Missing CE for credentials approaching renewal
      if (c.ce_required_hours && c.ce_required_hours > 0 && c.ceStats.completedHours < c.ce_required_hours && c.daysLeft !== null && c.daysLeft <= 120 && c.daysLeft > 0) {
        const needed = c.ce_required_hours - c.ceStats.completedHours;
        result.push({
          id: `ce-incomplete-${c.id}`,
          severity: 'needs_review',
          title: `${c.custom_title} needs ${needed} more CE hours`,
          message: `${c.ceStats.completedHours} of ${c.ce_required_hours} hours logged`,
          actionType: 'add_ce',
          actionLabel: 'Add CE Entry',
          credentialId: c.id,
          credentialName: c.custom_title,
        });
      }

      // Missing CE certificates
      if (c.ceStats.missingCerts > 0) {
        result.push({
          id: `missing-cert-${c.id}`,
          severity: 'needs_review',
          title: `${c.custom_title} is missing ${c.ceStats.missingCerts} CE certificate${c.ceStats.missingCerts > 1 ? 's' : ''}`,
          message: 'Upload certificates to complete your compliance records',
          actionType: 'upload_cert',
          actionLabel: 'Upload Certificate',
          credentialId: c.id,
          credentialName: c.custom_title,
        });
      }

      // No linked documents
      if (c.linkedDocumentsCount === 0 && c.computedStatus !== 'archived') {
        result.push({
          id: `no-docs-${c.id}`,
          severity: 'info',
          title: `${c.custom_title} has no supporting documents`,
          message: 'Upload a copy of your credential for your records',
          actionType: 'upload_document',
          actionLabel: 'Upload Document',
          credentialId: c.id,
          credentialName: c.custom_title,
        });
      }
    });

    // Unlinked CE entries
    const unlinkedCE = entries.filter(e => {
      const entryLinks = links.filter(l => l.ce_entry_id === e.id);
      return entryLinks.length === 0;
    });
    if (unlinkedCE.length > 0) {
      result.push({
        id: 'unlinked-ce',
        severity: 'info',
        title: `${unlinkedCE.length} CE ${unlinkedCE.length === 1 ? 'entry is' : 'entries are'} not linked to any credential`,
        message: 'Link CE entries to credentials to track progress accurately',
        actionType: 'link_ce',
        actionLabel: 'Link CE Entry',
      });
    }

    // Sort by severity
    const severityOrder = { high: 0, needs_review: 1, info: 2 };
    return result.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);
  }, [enrichedCredentials, entries, links]);

  const upcomingRenewals = useMemo(() => {
    return enrichedCredentials
      .filter(c => c.daysLeft !== null && c.daysLeft > 0 && c.daysLeft <= 120 && c.computedStatus !== 'archived')
      .sort((a, b) => (a.daysLeft ?? 999) - (b.daysLeft ?? 999));
  }, [enrichedCredentials]);

  const allMissingItems: MissingItem[] = useMemo(() => {
    return enrichedCredentials.flatMap(c => c.readiness.missingItems);
  }, [enrichedCredentials]);

  return {
    enrichedCredentials,
    summary,
    alerts,
    upcomingRenewals,
    allMissingItems,
    isLoading: credLoading || ceLoading,
    credentials,
    documents,
    entries,
    links,
  };
}
