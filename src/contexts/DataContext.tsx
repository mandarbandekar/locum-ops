import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { Facility, FacilityContact, TermsSnapshot, Shift, Invoice, InvoiceLineItem, InvoicePayment, InvoiceActivity, EmailLog } from '@/types';
import { ContractChecklistItem } from '@/types/contracts';
import {
  seedFacilities, seedContacts, seedTerms, seedShifts, seedInvoices, seedLineItems, seedEmailLogs, seedChecklistItems,
} from '@/data/seed';
import { computeInvoiceStatus, generateId, generateInvoiceNumber } from '@/lib/businessLogic';
import {
  getBillingPeriod,
  getEligibleShiftsForPeriod,
  getSentInvoiceShiftIds,
  buildAutoInvoiceDraft,
} from '@/lib/invoiceAutoGeneration';
import type { BillingCadence } from '@/types';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { friendlyDbError } from '@/lib/errorUtils';

// Helper for tables not yet in auto-generated types
const db = (table: string) => supabase.from(table as any);

function stripDbFields(row: any): any {
  if (!row) return row;
  const { user_id, created_at, updated_at, ...rest } = row;
  return rest;
}

interface DataContextType {
  facilities: Facility[];
  contacts: FacilityContact[];
  terms: TermsSnapshot[];
  shifts: Shift[];
  invoices: Invoice[];
  lineItems: InvoiceLineItem[];
  payments: InvoicePayment[];
  activities: InvoiceActivity[];
  emailLogs: EmailLog[];
  checklistItems: ContractChecklistItem[];
  dataLoading: boolean;
  addFacility: (facility: Omit<Facility, 'id'>) => Promise<Facility>;
  updateFacility: (facility: Facility) => Promise<void>;
  deleteFacility: (id: string) => Promise<void>;
  addContact: (contact: Omit<FacilityContact, 'id'>) => Promise<void>;
  updateContact: (contact: FacilityContact) => Promise<void>;
  deleteContact: (id: string) => Promise<void>;
  updateTerms: (terms: TermsSnapshot) => Promise<void>;
  addShift: (shift: Omit<Shift, 'id'>) => Promise<Shift>;
  updateShift: (shift: Shift) => Promise<void>;
  deleteShift: (id: string) => Promise<void>;
  addInvoice: (invoice: Omit<Invoice, 'id'>, items: Omit<InvoiceLineItem, 'id' | 'invoice_id'>[]) => Promise<Invoice>;
  updateInvoice: (invoice: Invoice) => Promise<void>;
  deleteInvoice: (id: string) => Promise<void>;
  addLineItem: (item: Omit<InvoiceLineItem, 'id'>) => Promise<void>;
  updateLineItem: (item: InvoiceLineItem) => Promise<void>;
  deleteLineItem: (id: string) => Promise<void>;
  addPayment: (payment: Omit<InvoicePayment, 'id'>) => Promise<void>;
  addActivity: (activity: Omit<InvoiceActivity, 'id' | 'created_at'>) => Promise<void>;
  addEmailLog: (log: Omit<EmailLog, 'id'>) => Promise<void>;
  getComputedInvoiceStatus: (invoice: Invoice) => Invoice['status'];
}

const DataContext = createContext<DataContextType | null>(null);

export function DataProvider({ children, isDemo = false }: { children: ReactNode; isDemo?: boolean }) {
  const { user } = useAuth();
  const [dataLoading, setDataLoading] = useState(!isDemo);

  const [facilities, setFacilities] = useState<Facility[]>(isDemo ? seedFacilities : []);
  const [contacts, setContacts] = useState<FacilityContact[]>(isDemo ? seedContacts : []);
  const [terms, setTerms] = useState<TermsSnapshot[]>(isDemo ? seedTerms : []);
  const [shifts, setShifts] = useState<Shift[]>(isDemo ? seedShifts : []);
  const [invoices, setInvoices] = useState<Invoice[]>(isDemo ? seedInvoices : []);
  const [lineItems, setLineItems] = useState<InvoiceLineItem[]>(isDemo ? seedLineItems : []);
  const [emailLogs, setEmailLogs] = useState<EmailLog[]>(isDemo ? seedEmailLogs : []);
  const [payments, setPayments] = useState<InvoicePayment[]>([]);
  const [activities, setActivities] = useState<InvoiceActivity[]>([]);
  const [checklistItems, setChecklistItems] = useState<ContractChecklistItem[]>(isDemo ? seedChecklistItems : []);

  useEffect(() => {
    if (isDemo || !user) return;
    fetchAll();

    // Subscribe to realtime changes for cross-tab sync
    const channel = supabase
      .channel('data-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'facilities' }, () => refetchTable('facilities'))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'facility_contacts' }, () => refetchTable('facility_contacts'))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'terms_snapshots' }, () => refetchTable('terms_snapshots'))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'shifts' }, () => refetchTable('shifts'))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'invoices' }, () => refetchTable('invoices'))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'invoice_line_items' }, () => refetchTable('invoice_line_items'))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'email_logs' }, () => refetchTable('email_logs'))
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [isDemo, user?.id]);

  async function refetchTable(table: string) {
    const { data } = await db(table).select('*').order('created_at');
    const rows = (data || []).map(stripDbFields);
    switch (table) {
      case 'facilities': setFacilities(rows); break;
      case 'facility_contacts': setContacts(rows); break;
      case 'terms_snapshots': setTerms(rows); break;
      case 'shifts': setShifts(rows); break;
      case 'invoices': setInvoices(rows); break;
      case 'invoice_line_items': setLineItems(rows); break;
      case 'invoice_payments': setPayments(rows); break;
      case 'invoice_activity': setActivities(rows); break;
      case 'email_logs': setEmailLogs(rows); break;
      case 'contract_checklist_items': setChecklistItems(rows); break;
    }
  }

  async function fetchAll() {
    try {
      const [fRes, cRes, tRes, sRes, iRes, liRes, eRes, pRes, aRes, clRes] = await Promise.all([
        db('facilities').select('*').order('created_at'),
        db('facility_contacts').select('*').order('created_at'),
        db('terms_snapshots').select('*').order('created_at'),
        db('shifts').select('*').order('start_datetime'),
        db('invoices').select('*').order('created_at'),
        db('invoice_line_items').select('*').order('created_at'),
        db('email_logs').select('*').order('sent_at'),
        db('invoice_payments').select('*').order('created_at'),
        db('invoice_activity').select('*').order('created_at'),
        db('contract_checklist_items').select('*').order('created_at'),
      ]);
      setFacilities((fRes.data || []).map(stripDbFields));
      setContacts((cRes.data || []).map(stripDbFields));
      setTerms((tRes.data || []).map(stripDbFields));
      setShifts((sRes.data || []).map(stripDbFields));
      setInvoices((iRes.data || []).map(stripDbFields));
      setLineItems((liRes.data || []).map(stripDbFields));
      setEmailLogs((eRes.data || []).map(stripDbFields));
      setPayments((pRes.data || []).map(stripDbFields));
      setActivities((aRes.data || []).map(stripDbFields));
      setChecklistItems((clRes.data || []).map(stripDbFields));
    } catch (err: any) {
      console.error('Failed to load data:', err);
      toast.error('Failed to load data');
    } finally {
      setDataLoading(false);
    }
  }

  // ─── Facilities ──────────────────────────────────────────

  const addFacility = useCallback(async (c: Omit<Facility, 'id'>): Promise<Facility> => {
    if (isDemo) {
      const f = { ...c, id: generateId() };
      setFacilities(prev => [...prev, f]);
      return f;
    }
    const { data, error } = await db('facilities').insert({ user_id: user!.id, ...c }).select().single();
    if (error) { console.error(error); toast.error(friendlyDbError(error)); throw error; }
    const facility = stripDbFields(data) as Facility;
    setFacilities(prev => [...prev, facility]);
    return facility;
  }, [isDemo, user]);

  const updateFacility = useCallback(async (c: Facility) => {
    if (isDemo) { setFacilities(prev => prev.map(x => x.id === c.id ? c : x)); return; }
    const { id, ...rest } = c;
    const { error } = await db('facilities').update(rest).eq('id', id);
    if (error) { console.error(error); toast.error(friendlyDbError(error)); return; }
    setFacilities(prev => prev.map(x => x.id === c.id ? c : x));
  }, [isDemo]);

  const deleteFacility = useCallback(async (id: string) => {
    if (isDemo) {
      setFacilities(prev => prev.filter(x => x.id !== id));
      setContacts(prev => prev.filter(x => x.facility_id !== id));
      setTerms(prev => prev.filter(x => x.facility_id !== id));
      setShifts(prev => prev.filter(x => x.facility_id !== id));
      setInvoices(prev => {
        const invoiceIds = prev.filter(x => x.facility_id === id).map(x => x.id);
        setLineItems(li => li.filter(x => !invoiceIds.includes(x.invoice_id)));
        return prev.filter(x => x.facility_id !== id);
      });
      setEmailLogs(prev => prev.filter(x => x.facility_id !== id));
      return;
    }
    // DB cascades handle child tables
    const { error } = await db('facilities').delete().eq('id', id);
    if (error) { console.error(error); toast.error(friendlyDbError(error)); return; }
    const invoiceIds = invoices.filter(x => x.facility_id === id).map(x => x.id);
    setFacilities(prev => prev.filter(x => x.id !== id));
    setContacts(prev => prev.filter(x => x.facility_id !== id));
    setTerms(prev => prev.filter(x => x.facility_id !== id));
    setShifts(prev => prev.filter(x => x.facility_id !== id));
    setInvoices(prev => prev.filter(x => x.facility_id !== id));
    setLineItems(prev => prev.filter(x => !invoiceIds.includes(x.invoice_id)));
    setEmailLogs(prev => prev.filter(x => x.facility_id !== id));
  }, [isDemo, invoices]);

  // ─── Contacts ────────────────────────────────────────────

  const addContact = useCallback(async (c: Omit<FacilityContact, 'id'>) => {
    if (isDemo) { setContacts(prev => [...prev, { ...c, id: generateId() }]); return; }
    const { data, error } = await db('facility_contacts').insert({ user_id: user!.id, ...c }).select().single();
    if (error) { console.error(error); toast.error(friendlyDbError(error)); return; }
    setContacts(prev => [...prev, stripDbFields(data) as FacilityContact]);
  }, [isDemo, user]);

  const updateContact = useCallback(async (c: FacilityContact) => {
    if (isDemo) { setContacts(prev => prev.map(x => x.id === c.id ? c : x)); return; }
    const { id, ...rest } = c;
    const { error } = await db('facility_contacts').update(rest).eq('id', id);
    if (error) { console.error(error); toast.error(friendlyDbError(error)); return; }
    setContacts(prev => prev.map(x => x.id === c.id ? c : x));
  }, [isDemo]);

  const deleteContact = useCallback(async (id: string) => {
    if (isDemo) { setContacts(prev => prev.filter(x => x.id !== id)); return; }
    const { error } = await db('facility_contacts').delete().eq('id', id);
    if (error) { console.error(error); toast.error(friendlyDbError(error)); return; }
    setContacts(prev => prev.filter(x => x.id !== id));
  }, [isDemo]);

  // ─── Terms ───────────────────────────────────────────────

  const updateTerms = useCallback(async (c: TermsSnapshot) => {
    if (isDemo) {
      setTerms(prev => {
        const exists = prev.find(x => x.id === c.id);
        if (exists) return prev.map(x => x.id === c.id ? c : x);
        return [...prev, c];
      });
      return;
    }
    const exists = terms.find(x => x.id === c.id);
    if (exists) {
      const { id, ...rest } = c;
      const { error } = await db('terms_snapshots').update(rest).eq('id', id);
      if (error) { console.error(error); toast.error(friendlyDbError(error)); return; }
      setTerms(prev => prev.map(x => x.id === c.id ? c : x));
    } else {
      const { id: _, ...rest } = c;
      const { data, error } = await db('terms_snapshots').insert({ user_id: user!.id, ...rest }).select().single();
      if (error) { console.error(error); toast.error(friendlyDbError(error)); return; }
      setTerms(prev => [...prev, stripDbFields(data) as TermsSnapshot]);
    }
  }, [isDemo, user, terms]);

  // ─── Shifts ──────────────────────────────────────────────

  const addShift = useCallback(async (s: Omit<Shift, 'id'>): Promise<Shift> => {
    if (isDemo) {
      const shift = { ...s, id: generateId() };
      setShifts(prev => [...prev, shift]);
      return shift;
    }
    const { data, error } = await db('shifts').insert({ user_id: user!.id, ...s }).select().single();
    if (error) { console.error(error); toast.error(friendlyDbError(error)); throw error; }
    const shift = stripDbFields(data) as Shift;
    setShifts(prev => [...prev, shift]);

    // Auto-generate invoice draft if applicable
    try {
      const facility = facilities.find(f => f.id === shift.facility_id);
      if (facility && facility.auto_generate_invoices && shift.status !== 'canceled') {
        const cadence = facility.billing_cadence as BillingCadence;
        const shiftStart = new Date(shift.start_datetime);
        // Use the SHIFT date to determine billing period, not today's date
        // This ensures shifts added for any week/month get grouped correctly
        const period = getBillingPeriod(cadence, shiftStart);

          const sentIds = getSentInvoiceShiftIds(lineItems, invoices);
          const allShiftsWithNew = [...shifts, shift];
          const eligible = getEligibleShiftsForPeriod(allShiftsWithNew, facility.id, period.start, period.end, sentIds);

          if (eligible.length > 0) {
            // Check for existing auto-draft for this facility + period
            const existingDraft = invoices.find(inv =>
              inv.facility_id === facility.id &&
              inv.status === 'draft' &&
              inv.generation_type === 'automatic' &&
              new Date(inv.period_start).toISOString().slice(0, 10) === period.start.toISOString().slice(0, 10) &&
              new Date(inv.period_end).toISOString().slice(0, 10) === period.end.toISOString().slice(0, 10)
            );

            if (existingDraft) {
              // Update existing draft: rebuild line items
              const { lineItems: newItems } = buildAutoInvoiceDraft(
                facility, eligible, period.start, period.end, existingDraft.invoice_number
              );
              const total = newItems.reduce((sum, li) => sum + li.line_total, 0);

              // Delete old line items for this draft
              await db('invoice_line_items').delete().eq('invoice_id', existingDraft.id);
              setLineItems(prev => prev.filter(li => li.invoice_id !== existingDraft.id));

              // Insert new line items
              const toInsert = newItems.map(item => ({ user_id: user!.id, invoice_id: existingDraft.id, ...item }));
              const { data: liData } = await db('invoice_line_items').insert(toInsert).select();
              if (liData) {
                setLineItems(prev => [...prev, ...(liData).map(stripDbFields) as InvoiceLineItem[]]);
              }

              // Update invoice total
              const updatedInv = { ...existingDraft, total_amount: total, balance_due: total };
              await db('invoices').update({ total_amount: total, balance_due: total }).eq('id', existingDraft.id);
              setInvoices(prev => prev.map(i => i.id === existingDraft.id ? updatedInv : i));

              toast.info(`Draft invoice updated for ${facility.name}`);
            } else {
              // Create new draft
              const invoiceNumber = generateInvoiceNumber(invoices, facility.invoice_prefix);
              const { invoice: invData, lineItems: newItems } = buildAutoInvoiceDraft(
                facility, eligible, period.start, period.end, invoiceNumber
              );

              const { data: invRow, error: invErr } = await db('invoices')
                .insert({ user_id: user!.id, ...invData }).select().single();
              if (!invErr && invRow) {
                const invoice = stripDbFields(invRow) as Invoice;
                setInvoices(prev => [...prev, invoice]);

                if (newItems.length > 0) {
                  const toInsert = newItems.map(item => ({ user_id: user!.id, invoice_id: invoice.id, ...item }));
                  const { data: liData } = await db('invoice_line_items').insert(toInsert).select();
                  if (liData) {
                    setLineItems(prev => [...prev, ...(liData).map(stripDbFields) as InvoiceLineItem[]]);
                  }
                }
                toast.info(`Draft invoice auto-generated for ${facility.name}`);
              }
            }
          }
        }
      }
    } catch (autoErr) {
      console.error('Auto-invoice generation failed:', autoErr);
    }

    return shift;
  }, [isDemo, user, facilities, shifts, invoices, lineItems]);

  const updateShift = useCallback(async (s: Shift) => {
    if (isDemo) { setShifts(prev => prev.map(x => x.id === s.id ? s : x)); return; }
    const { id, ...rest } = s;
    const { error } = await db('shifts').update(rest).eq('id', id);
    if (error) { console.error(error); toast.error(friendlyDbError(error)); return; }
    setShifts(prev => prev.map(x => x.id === s.id ? s : x));
  }, [isDemo]);

  const deleteShift = useCallback(async (id: string) => {
    if (isDemo) {
      setShifts(prev => prev.filter(x => x.id !== id));
      setLineItems(prev => prev.filter(x => x.shift_id !== id));
      return;
    }
    const { error } = await db('shifts').delete().eq('id', id);
    if (error) { console.error(error); toast.error(friendlyDbError(error)); return; }
    setShifts(prev => prev.filter(x => x.id !== id));
    setLineItems(prev => prev.filter(x => x.shift_id !== id));
  }, [isDemo]);

  // ─── Invoices ────────────────────────────────────────────

  const addInvoice = useCallback(async (inv: Omit<Invoice, 'id'>, items: Omit<InvoiceLineItem, 'id' | 'invoice_id'>[]) => {
    if (isDemo) {
      const invoice = { ...inv, id: generateId() };
      setInvoices(prev => [...prev, invoice]);
      const newItems = items.map(item => ({ ...item, id: generateId(), invoice_id: invoice.id }));
      setLineItems(prev => [...prev, ...newItems]);
      return invoice;
    }
    const { data: invData, error: invError } = await db('invoices')
      .insert({ user_id: user!.id, ...inv }).select().single();
    if (invError) { console.error(invError); toast.error(friendlyDbError(invError)); throw invError; }
    const invoice = stripDbFields(invData) as Invoice;
    setInvoices(prev => [...prev, invoice]);

    if (items.length > 0) {
      const toInsert = items.map(item => ({ user_id: user!.id, invoice_id: invoice.id, ...item }));
      const { data: liData, error: liError } = await db('invoice_line_items').insert(toInsert).select();
      if (liError) { console.error(liError); toast.error(friendlyDbError(liError)); } else {
        setLineItems(prev => [...prev, ...(liData || []).map(stripDbFields) as InvoiceLineItem[]]);
      }
    }
    return invoice;
  }, [isDemo, user]);

  const updateInvoice = useCallback(async (inv: Invoice) => {
    if (isDemo) { setInvoices(prev => prev.map(x => x.id === inv.id ? inv : x)); return; }
    const { id, ...rest } = inv;
    const { error } = await db('invoices').update(rest).eq('id', id);
    if (error) { console.error(error); toast.error(friendlyDbError(error)); return; }
    setInvoices(prev => prev.map(x => x.id === inv.id ? inv : x));
  }, [isDemo]);

  const deleteInvoice = useCallback(async (id: string) => {
    if (isDemo) {
      setInvoices(prev => prev.filter(x => x.id !== id));
      setLineItems(prev => prev.filter(x => x.invoice_id !== id));
      return;
    }
    const { error } = await db('invoices').delete().eq('id', id);
    if (error) { console.error(error); toast.error(friendlyDbError(error)); return; }
    setInvoices(prev => prev.filter(x => x.id !== id));
    setLineItems(prev => prev.filter(x => x.invoice_id !== id));
  }, [isDemo]);

  // ─── Line Items ──────────────────────────────────────────

  const addLineItem = useCallback(async (item: Omit<InvoiceLineItem, 'id'>) => {
    if (isDemo) { setLineItems(prev => [...prev, { ...item, id: generateId() }]); return; }
    const { data, error } = await db('invoice_line_items').insert({ user_id: user!.id, ...item }).select().single();
    if (error) { console.error(error); toast.error(friendlyDbError(error)); return; }
    setLineItems(prev => [...prev, stripDbFields(data) as InvoiceLineItem]);
  }, [isDemo, user]);

  const updateLineItem = useCallback(async (item: InvoiceLineItem) => {
    if (isDemo) { setLineItems(prev => prev.map(x => x.id === item.id ? item : x)); return; }
    const { id, ...rest } = item;
    const { error } = await db('invoice_line_items').update(rest).eq('id', id);
    if (error) { console.error(error); toast.error(friendlyDbError(error)); return; }
    setLineItems(prev => prev.map(x => x.id === item.id ? item : x));
  }, [isDemo]);

  const deleteLineItem = useCallback(async (id: string) => {
    if (isDemo) { setLineItems(prev => prev.filter(x => x.id !== id)); return; }
    const { error } = await db('invoice_line_items').delete().eq('id', id);
    if (error) { console.error(error); toast.error(friendlyDbError(error)); return; }
    setLineItems(prev => prev.filter(x => x.id !== id));
  }, [isDemo]);

  // ─── Email Logs ──────────────────────────────────────────

  const addEmailLog = useCallback(async (log: Omit<EmailLog, 'id'>) => {
    if (isDemo) { setEmailLogs(prev => [...prev, { ...log, id: generateId() }]); return; }
    const { data, error } = await db('email_logs').insert({ user_id: user!.id, ...log }).select().single();
    if (error) { console.error(error); toast.error(friendlyDbError(error)); return; }
    setEmailLogs(prev => [...prev, stripDbFields(data) as EmailLog]);
  }, [isDemo, user]);

  // ─── Payments ────────────────────────────────────────────
  const addPayment = useCallback(async (p: Omit<InvoicePayment, 'id'>) => {
    if (isDemo) { setPayments(prev => [...prev, { ...p, id: generateId() }]); return; }
    const { data, error } = await db('invoice_payments').insert({ user_id: user!.id, ...p }).select().single();
    if (error) { console.error(error); toast.error(friendlyDbError(error)); return; }
    setPayments(prev => [...prev, stripDbFields(data) as InvoicePayment]);
  }, [isDemo, user]);

  // ─── Activity ────────────────────────────────────────────
  const addActivity = useCallback(async (a: Omit<InvoiceActivity, 'id' | 'created_at'>) => {
    if (isDemo) { setActivities(prev => [...prev, { ...a, id: generateId(), created_at: new Date().toISOString() }]); return; }
    const { data, error } = await db('invoice_activity').insert({ user_id: user!.id, ...a }).select().single();
    if (error) { console.error(error); return; }
    setActivities(prev => [...prev, stripDbFields(data) as InvoiceActivity]);
  }, [isDemo, user]);

  // ─── Computed ────────────────────────────────────────────

  const getComputedInvoiceStatus = useCallback((invoice: Invoice) => {
    return computeInvoiceStatus(invoice);
  }, []);

  if (dataLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted">
        <p className="text-muted-foreground">Loading your data…</p>
      </div>
    );
  }

  return (
    <DataContext.Provider value={{
      facilities, contacts, terms, shifts, invoices, lineItems, payments, activities, emailLogs, checklistItems, dataLoading,
      addFacility, updateFacility, deleteFacility,
      addContact, updateContact, deleteContact,
      updateTerms,
      addShift, updateShift, deleteShift,
      addInvoice, updateInvoice, deleteInvoice,
      addLineItem, updateLineItem, deleteLineItem,
      addPayment, addActivity,
      addEmailLog,
      getComputedInvoiceStatus,
    }}>
      {children}
    </DataContext.Provider>
  );
}

export function useData(): DataContextType {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used within DataProvider');
  return ctx;
}
