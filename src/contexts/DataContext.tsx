import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { Facility, FacilityContact, TermsSnapshot, Shift, Invoice, InvoiceLineItem, EmailLog } from '@/types';
import {
  seedFacilities, seedContacts, seedTerms, seedShifts, seedInvoices, seedLineItems, seedEmailLogs,
  starterFacilities, starterContacts, starterTerms, starterShifts, starterInvoices, starterLineItems, starterEmailLogs,
} from '@/data/seed';
import { computeInvoiceStatus, generateId } from '@/lib/businessLogic';

interface DataContextType {
  facilities: Facility[];
  contacts: FacilityContact[];
  terms: TermsSnapshot[];
  shifts: Shift[];
  invoices: Invoice[];
  lineItems: InvoiceLineItem[];
  emailLogs: EmailLog[];
  addFacility: (facility: Omit<Facility, 'id'>) => Facility;
  updateFacility: (facility: Facility) => void;
  deleteFacility: (id: string) => void;
  addContact: (contact: Omit<FacilityContact, 'id'>) => void;
  updateContact: (contact: FacilityContact) => void;
  deleteContact: (id: string) => void;
  updateTerms: (terms: TermsSnapshot) => void;
  addShift: (shift: Omit<Shift, 'id'>) => Shift;
  updateShift: (shift: Shift) => void;
  deleteShift: (id: string) => void;
  addInvoice: (invoice: Omit<Invoice, 'id'>, items: Omit<InvoiceLineItem, 'id' | 'invoice_id'>[]) => Invoice;
  updateInvoice: (invoice: Invoice) => void;
  deleteInvoice: (id: string) => void;
  addLineItem: (item: Omit<InvoiceLineItem, 'id'>) => void;
  updateLineItem: (item: InvoiceLineItem) => void;
  deleteLineItem: (id: string) => void;
  addEmailLog: (log: Omit<EmailLog, 'id'>) => void;
  getComputedInvoiceStatus: (invoice: Invoice) => Invoice['status'];
}

const DataContext = createContext<DataContextType | null>(null);

export function DataProvider({ children, isDemo = false }: { children: ReactNode; isDemo?: boolean }) {
  const [facilities, setFacilities] = useState<Facility[]>(isDemo ? seedFacilities : starterFacilities);
  const [contacts, setContacts] = useState<FacilityContact[]>(isDemo ? seedContacts : starterContacts);
  const [terms, setTerms] = useState<TermsSnapshot[]>(isDemo ? seedTerms : starterTerms);
  const [shifts, setShifts] = useState<Shift[]>(isDemo ? seedShifts : starterShifts);
  const [invoices, setInvoices] = useState<Invoice[]>(isDemo ? seedInvoices : starterInvoices);
  const [lineItems, setLineItems] = useState<InvoiceLineItem[]>(isDemo ? seedLineItems : starterLineItems);
  const [emailLogs, setEmailLogs] = useState<EmailLog[]>(isDemo ? seedEmailLogs : starterEmailLogs);

  const addFacility = useCallback((c: Omit<Facility, 'id'>) => {
    const facility = { ...c, id: generateId() };
    setFacilities(prev => [...prev, facility]);
    return facility;
  }, []);

  const updateFacility = useCallback((c: Facility) => {
    setFacilities(prev => prev.map(x => x.id === c.id ? c : x));
  }, []);

  const deleteFacility = useCallback((id: string) => {
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
  }, []);

  const addContact = useCallback((c: Omit<FacilityContact, 'id'>) => {
    setContacts(prev => [...prev, { ...c, id: generateId() }]);
  }, []);

  const updateContact = useCallback((c: FacilityContact) => {
    setContacts(prev => prev.map(x => x.id === c.id ? c : x));
  }, []);

  const deleteContact = useCallback((id: string) => {
    setContacts(prev => prev.filter(x => x.id !== id));
  }, []);

  const updateTerms = useCallback((c: TermsSnapshot) => {
    setTerms(prev => {
      const exists = prev.find(x => x.id === c.id);
      if (exists) return prev.map(x => x.id === c.id ? c : x);
      return [...prev, c];
    });
  }, []);

  const addShift = useCallback((s: Omit<Shift, 'id'>) => {
    const shift = { ...s, id: generateId() };
    setShifts(prev => [...prev, shift]);
    return shift;
  }, []);

  const updateShift = useCallback((s: Shift) => {
    setShifts(prev => prev.map(x => x.id === s.id ? s : x));
  }, []);

  const deleteShift = useCallback((id: string) => {
    setShifts(prev => prev.filter(x => x.id !== id));
    setLineItems(prev => prev.filter(x => x.shift_id !== id));
  }, []);

  const addInvoice = useCallback((inv: Omit<Invoice, 'id'>, items: Omit<InvoiceLineItem, 'id' | 'invoice_id'>[]) => {
    const invoice = { ...inv, id: generateId() };
    setInvoices(prev => [...prev, invoice]);
    const newItems = items.map(item => ({ ...item, id: generateId(), invoice_id: invoice.id }));
    setLineItems(prev => [...prev, ...newItems]);
    return invoice;
  }, []);

  const updateInvoice = useCallback((inv: Invoice) => {
    setInvoices(prev => prev.map(x => x.id === inv.id ? inv : x));
  }, []);

  const deleteInvoice = useCallback((id: string) => {
    setInvoices(prev => prev.filter(x => x.id !== id));
    setLineItems(prev => prev.filter(x => x.invoice_id !== id));
  }, []);

  const addLineItem = useCallback((item: Omit<InvoiceLineItem, 'id'>) => {
    setLineItems(prev => [...prev, { ...item, id: generateId() }]);
  }, []);

  const updateLineItem = useCallback((item: InvoiceLineItem) => {
    setLineItems(prev => prev.map(x => x.id === item.id ? item : x));
  }, []);

  const deleteLineItem = useCallback((id: string) => {
    setLineItems(prev => prev.filter(x => x.id !== id));
  }, []);

  const addEmailLog = useCallback((log: Omit<EmailLog, 'id'>) => {
    setEmailLogs(prev => [...prev, { ...log, id: generateId() }]);
  }, []);

  const getComputedInvoiceStatus = useCallback((invoice: Invoice) => {
    return computeInvoiceStatus(invoice);
  }, []);

  return (
    <DataContext.Provider value={{
      facilities, contacts, terms, shifts, invoices, lineItems, emailLogs,
      addFacility, updateFacility, deleteFacility,
      addContact, updateContact, deleteContact,
      updateTerms,
      addShift, updateShift, deleteShift,
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
