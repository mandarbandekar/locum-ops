import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { Facility, FacilityContact, TermsSnapshot, Shift, Invoice, InvoiceLineItem, InvoicePayment, InvoiceActivity, EmailLog } from '@/types';
import {
  seedFacilities, seedContacts, seedTerms, seedShifts, seedInvoices, seedLineItems, seedEmailLogs,
} from '@/data/seed';
import { computeInvoiceStatus, generateId, generateInvoiceNumber } from '@/lib/businessLogic';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

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
    }
  }

  async function fetchAll() {
    try {
      const [fRes, cRes, tRes, sRes, iRes, liRes, eRes, pRes, aRes] = await Promise.all([
        db('facilities').select('*').order('created_at'),
        db('facility_contacts').select('*').order('created_at'),
        db('terms_snapshots').select('*').order('created_at'),
        db('shifts').select('*').order('start_datetime'),
        db('invoices').select('*').order('created_at'),
        db('invoice_line_items').select('*').order('created_at'),
        db('email_logs').select('*').order('sent_at'),
        db('invoice_payments').select('*').order('created_at'),
        db('invoice_activity').select('*').order('created_at'),
      ]);
      setFacilities((fRes.data || []).map(stripDbFields));
      setContacts((cRes.data || []).map(stripDbFields));
      setTerms((tRes.data || []).map(stripDbFields));
      setShifts((sRes.data || []).map(stripDbFields));
      setInvoices((iRes.data || []).map(stripDbFields));
      setLineItems((liRes.data || []).map(stripDbFields));
      setEmailLogs((eRes.data || []).map(stripDbFields));
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
    if (error) { toast.error(error.message); throw error; }
    const facility = stripDbFields(data) as Facility;
    setFacilities(prev => [...prev, facility]);
    return facility;
  }, [isDemo, user]);

  const updateFacility = useCallback(async (c: Facility) => {
    if (isDemo) { setFacilities(prev => prev.map(x => x.id === c.id ? c : x)); return; }
    const { id, ...rest } = c;
    const { error } = await db('facilities').update(rest).eq('id', id);
    if (error) { toast.error(error.message); return; }
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
    if (error) { toast.error(error.message); return; }
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
    if (error) { toast.error(error.message); return; }
    setContacts(prev => [...prev, stripDbFields(data) as FacilityContact]);
  }, [isDemo, user]);

  const updateContact = useCallback(async (c: FacilityContact) => {
    if (isDemo) { setContacts(prev => prev.map(x => x.id === c.id ? c : x)); return; }
    const { id, ...rest } = c;
    const { error } = await db('facility_contacts').update(rest).eq('id', id);
    if (error) { toast.error(error.message); return; }
    setContacts(prev => prev.map(x => x.id === c.id ? c : x));
  }, [isDemo]);

  const deleteContact = useCallback(async (id: string) => {
    if (isDemo) { setContacts(prev => prev.filter(x => x.id !== id)); return; }
    const { error } = await db('facility_contacts').delete().eq('id', id);
    if (error) { toast.error(error.message); return; }
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
      if (error) { toast.error(error.message); return; }
      setTerms(prev => prev.map(x => x.id === c.id ? c : x));
    } else {
      const { id: _, ...rest } = c;
      const { data, error } = await db('terms_snapshots').insert({ user_id: user!.id, ...rest }).select().single();
      if (error) { toast.error(error.message); return; }
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
    if (error) { toast.error(error.message); throw error; }
    const shift = stripDbFields(data) as Shift;
    setShifts(prev => [...prev, shift]);
    return shift;
  }, [isDemo, user]);

  const updateShift = useCallback(async (s: Shift) => {
    if (isDemo) { setShifts(prev => prev.map(x => x.id === s.id ? s : x)); return; }
    const { id, ...rest } = s;
    const { error } = await db('shifts').update(rest).eq('id', id);
    if (error) { toast.error(error.message); return; }
    setShifts(prev => prev.map(x => x.id === s.id ? s : x));
  }, [isDemo]);

  const deleteShift = useCallback(async (id: string) => {
    if (isDemo) {
      setShifts(prev => prev.filter(x => x.id !== id));
      setLineItems(prev => prev.filter(x => x.shift_id !== id));
      return;
    }
    const { error } = await db('shifts').delete().eq('id', id);
    if (error) { toast.error(error.message); return; }
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
    if (invError) { toast.error(invError.message); throw invError; }
    const invoice = stripDbFields(invData) as Invoice;
    setInvoices(prev => [...prev, invoice]);

    if (items.length > 0) {
      const toInsert = items.map(item => ({ user_id: user!.id, invoice_id: invoice.id, ...item }));
      const { data: liData, error: liError } = await db('invoice_line_items').insert(toInsert).select();
      if (liError) { toast.error(liError.message); } else {
        setLineItems(prev => [...prev, ...(liData || []).map(stripDbFields) as InvoiceLineItem[]]);
      }
    }
    return invoice;
  }, [isDemo, user]);

  const updateInvoice = useCallback(async (inv: Invoice) => {
    if (isDemo) { setInvoices(prev => prev.map(x => x.id === inv.id ? inv : x)); return; }
    const { id, ...rest } = inv;
    const { error } = await db('invoices').update(rest).eq('id', id);
    if (error) { toast.error(error.message); return; }
    setInvoices(prev => prev.map(x => x.id === inv.id ? inv : x));
  }, [isDemo]);

  const deleteInvoice = useCallback(async (id: string) => {
    if (isDemo) {
      setInvoices(prev => prev.filter(x => x.id !== id));
      setLineItems(prev => prev.filter(x => x.invoice_id !== id));
      return;
    }
    const { error } = await db('invoices').delete().eq('id', id);
    if (error) { toast.error(error.message); return; }
    setInvoices(prev => prev.filter(x => x.id !== id));
    setLineItems(prev => prev.filter(x => x.invoice_id !== id));
  }, [isDemo]);

  // ─── Line Items ──────────────────────────────────────────

  const addLineItem = useCallback(async (item: Omit<InvoiceLineItem, 'id'>) => {
    if (isDemo) { setLineItems(prev => [...prev, { ...item, id: generateId() }]); return; }
    const { data, error } = await db('invoice_line_items').insert({ user_id: user!.id, ...item }).select().single();
    if (error) { toast.error(error.message); return; }
    setLineItems(prev => [...prev, stripDbFields(data) as InvoiceLineItem]);
  }, [isDemo, user]);

  const updateLineItem = useCallback(async (item: InvoiceLineItem) => {
    if (isDemo) { setLineItems(prev => prev.map(x => x.id === item.id ? item : x)); return; }
    const { id, ...rest } = item;
    const { error } = await db('invoice_line_items').update(rest).eq('id', id);
    if (error) { toast.error(error.message); return; }
    setLineItems(prev => prev.map(x => x.id === item.id ? item : x));
  }, [isDemo]);

  const deleteLineItem = useCallback(async (id: string) => {
    if (isDemo) { setLineItems(prev => prev.filter(x => x.id !== id)); return; }
    const { error } = await db('invoice_line_items').delete().eq('id', id);
    if (error) { toast.error(error.message); return; }
    setLineItems(prev => prev.filter(x => x.id !== id));
  }, [isDemo]);

  // ─── Email Logs ──────────────────────────────────────────

  const addEmailLog = useCallback(async (log: Omit<EmailLog, 'id'>) => {
    if (isDemo) { setEmailLogs(prev => [...prev, { ...log, id: generateId() }]); return; }
    const { data, error } = await db('email_logs').insert({ user_id: user!.id, ...log }).select().single();
    if (error) { toast.error(error.message); return; }
    setEmailLogs(prev => [...prev, stripDbFields(data) as EmailLog]);
  }, [isDemo, user]);

  // ─── Auto-invoice on shift completion ─────────────────────
  const updateShiftWithAutoInvoice = useCallback(async (s: Shift) => {
    const oldShift = shifts.find(x => x.id === s.id);
    await updateShift(s);
    const justCompleted = s.status === 'completed' && oldShift?.status !== 'completed';
    if (justCompleted) {
      const alreadyInvoiced = lineItems.find(li => li.shift_id === s.id);
      if (!alreadyInvoiced) {
        const facility = facilities.find(f => f.id === s.facility_id);
        const invoiceNumber = generateInvoiceNumber(invoices, facility?.invoice_prefix || 'INV');
        const dueDays = (facility as any)?.invoice_due_days || 15;
        const dueDate = new Date(s.end_datetime);
        dueDate.setDate(dueDate.getDate() + dueDays);
        try {
          await addInvoice(
            {
              facility_id: s.facility_id,
              invoice_number: invoiceNumber,
              invoice_date: new Date().toISOString(),
              period_start: s.start_datetime,
              period_end: s.end_datetime,
              total_amount: s.rate_applied,
              balance_due: s.rate_applied,
              status: 'draft' as Invoice['status'],
              sent_at: null,
              paid_at: null,
              due_date: dueDate.toISOString(),
              notes: '',
              share_token: null,
              share_token_created_at: null,
              share_token_revoked_at: null,
            },
            [{
              shift_id: s.id,
              description: `${facility?.name || 'Shift'} — ${new Date(s.start_datetime).toLocaleDateString()}`,
              service_date: new Date(s.start_datetime).toISOString().split('T')[0],
              qty: 1,
              unit_rate: s.rate_applied,
              line_total: s.rate_applied,
            }]
          );
          toast.success(`Draft invoice ${invoiceNumber} auto-created`);
        } catch {
          // addInvoice already toasts errors
        }
      }
    }
  }, [shifts, lineItems, facilities, invoices, updateShift, addInvoice]);

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
      facilities, contacts, terms, shifts, invoices, lineItems, emailLogs, dataLoading,
      addFacility, updateFacility, deleteFacility,
      addContact, updateContact, deleteContact,
      updateTerms,
      addShift, updateShift: updateShiftWithAutoInvoice, deleteShift,
      addInvoice, updateInvoice, deleteInvoice,
      addLineItem, updateLineItem, deleteLineItem,
      addEmailLog,
      getComputedInvoiceStatus,
    }}>
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used within DataProvider');
  return ctx;
}
