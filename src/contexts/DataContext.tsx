import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { Clinic, ClinicContact, ContractSnapshot, Shift, Invoice, InvoiceLineItem, EmailLog } from '@/types';
import {
  seedClinics, seedContacts, seedContracts, seedShifts, seedInvoices, seedLineItems, seedEmailLogs,
  starterClinics, starterContacts, starterContracts, starterShifts, starterInvoices, starterLineItems, starterEmailLogs,
} from '@/data/seed';
import { computeInvoiceStatus, generateId } from '@/lib/businessLogic';

interface DataContextType {
  clinics: Clinic[];
  contacts: ClinicContact[];
  contracts: ContractSnapshot[];
  shifts: Shift[];
  invoices: Invoice[];
  lineItems: InvoiceLineItem[];
  emailLogs: EmailLog[];
  addClinic: (clinic: Omit<Clinic, 'id'>) => Clinic;
  updateClinic: (clinic: Clinic) => void;
  deleteClinic: (id: string) => void;
  addContact: (contact: Omit<ClinicContact, 'id'>) => void;
  updateContact: (contact: ClinicContact) => void;
  deleteContact: (id: string) => void;
  updateContract: (contract: ContractSnapshot) => void;
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
  const [clinics, setClinics] = useState<Clinic[]>(isDemo ? seedClinics : starterClinics);
  const [contacts, setContacts] = useState<ClinicContact[]>(isDemo ? seedContacts : starterContacts);
  const [contracts, setContracts] = useState<ContractSnapshot[]>(isDemo ? seedContracts : starterContracts);
  const [shifts, setShifts] = useState<Shift[]>(isDemo ? seedShifts : starterShifts);
  const [invoices, setInvoices] = useState<Invoice[]>(isDemo ? seedInvoices : starterInvoices);
  const [lineItems, setLineItems] = useState<InvoiceLineItem[]>(isDemo ? seedLineItems : starterLineItems);
  const [emailLogs, setEmailLogs] = useState<EmailLog[]>(isDemo ? seedEmailLogs : starterEmailLogs);

  const addClinic = useCallback((c: Omit<Clinic, 'id'>) => {
    const clinic = { ...c, id: generateId() };
    setClinics(prev => [...prev, clinic]);
    return clinic;
  }, []);

  const updateClinic = useCallback((c: Clinic) => {
    setClinics(prev => prev.map(x => x.id === c.id ? c : x));
  }, []);

  const deleteClinic = useCallback((id: string) => {
    setClinics(prev => prev.filter(x => x.id !== id));
    setContacts(prev => prev.filter(x => x.clinic_id !== id));
    setContracts(prev => prev.filter(x => x.clinic_id !== id));
    setShifts(prev => prev.filter(x => x.clinic_id !== id));
    setInvoices(prev => {
      const invoiceIds = prev.filter(x => x.clinic_id === id).map(x => x.id);
      setLineItems(li => li.filter(x => !invoiceIds.includes(x.invoice_id)));
      return prev.filter(x => x.clinic_id !== id);
    });
    setEmailLogs(prev => prev.filter(x => x.clinic_id !== id));
  }, []);

  const addContact = useCallback((c: Omit<ClinicContact, 'id'>) => {
    setContacts(prev => [...prev, { ...c, id: generateId() }]);
  }, []);

  const updateContact = useCallback((c: ClinicContact) => {
    setContacts(prev => prev.map(x => x.id === c.id ? c : x));
  }, []);

  const deleteContact = useCallback((id: string) => {
    setContacts(prev => prev.filter(x => x.id !== id));
  }, []);

  const updateContract = useCallback((c: ContractSnapshot) => {
    setContracts(prev => {
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
      clinics, contacts, contracts, shifts, invoices, lineItems, emailLogs,
      addClinic, updateClinic, deleteClinic,
      addContact, updateContact, deleteContact,
      updateContract,
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
