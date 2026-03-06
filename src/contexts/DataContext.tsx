import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { Clinic, ClinicContact, ContractSnapshot, Shift, Invoice, InvoiceLineItem, EmailLog } from '@/types';
import { seedClinics, seedContacts, seedContracts, seedShifts, seedInvoices, seedLineItems, seedEmailLogs } from '@/data/seed';
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
  addContact: (contact: Omit<ClinicContact, 'id'>) => void;
  updateContact: (contact: ClinicContact) => void;
  deleteContact: (id: string) => void;
  updateContract: (contract: ContractSnapshot) => void;
  addShift: (shift: Omit<Shift, 'id'>) => Shift;
  updateShift: (shift: Shift) => void;
  addInvoice: (invoice: Omit<Invoice, 'id'>, items: Omit<InvoiceLineItem, 'id' | 'invoice_id'>[]) => Invoice;
  updateInvoice: (invoice: Invoice) => void;
  addLineItem: (item: Omit<InvoiceLineItem, 'id'>) => void;
  updateLineItem: (item: InvoiceLineItem) => void;
  deleteLineItem: (id: string) => void;
  addEmailLog: (log: Omit<EmailLog, 'id'>) => void;
  getComputedInvoiceStatus: (invoice: Invoice) => Invoice['status'];
}

const DataContext = createContext<DataContextType | null>(null);

export function DataProvider({ children }: { children: ReactNode }) {
  const [clinics, setClinics] = useState<Clinic[]>(seedClinics);
  const [contacts, setContacts] = useState<ClinicContact[]>(seedContacts);
  const [contracts, setContracts] = useState<ContractSnapshot[]>(seedContracts);
  const [shifts, setShifts] = useState<Shift[]>(seedShifts);
  const [invoices, setInvoices] = useState<Invoice[]>(seedInvoices);
  const [lineItems, setLineItems] = useState<InvoiceLineItem[]>(seedLineItems);
  const [emailLogs, setEmailLogs] = useState<EmailLog[]>(seedEmailLogs);

  const addClinic = useCallback((c: Omit<Clinic, 'id'>) => {
    const clinic = { ...c, id: generateId() };
    setClinics(prev => [...prev, clinic]);
    return clinic;
  }, []);

  const updateClinic = useCallback((c: Clinic) => {
    setClinics(prev => prev.map(x => x.id === c.id ? c : x));
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
      addClinic, updateClinic,
      addContact, updateContact, deleteContact,
      updateContract,
      addShift, updateShift,
      addInvoice, updateInvoice,
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
