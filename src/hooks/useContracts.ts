import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Contract, ContractTerms, ContractChecklistItem, DEFAULT_CHECKLIST_ITEMS } from '@/types/contracts';
import { toast } from 'sonner';
import { friendlyDbError } from '@/lib/errorUtils';
import { generateId } from '@/lib/businessLogic';

const db = (table: string) => supabase.from(table as any);

function strip(row: any): any {
  if (!row) return row;
  const { user_id, created_at, updated_at, ...rest } = row;
  return rest;
}

export function useContracts(facilityId: string | undefined, isDemo = false) {
  const { user } = useAuth();
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [contractTerms, setContractTerms] = useState<ContractTerms[]>([]);
  const [checklistItems, setChecklistItems] = useState<ContractChecklistItem[]>([]);
  const [loading, setLoading] = useState(!isDemo);

  useEffect(() => {
    if (!facilityId || isDemo || !user) { setLoading(false); return; }
    fetchAll();
  }, [facilityId, isDemo, user?.id]);

  async function fetchAll() {
    try {
      const [cRes, tRes, clRes] = await Promise.all([
        db('contracts').select('*').eq('facility_id', facilityId).order('created_at'),
        db('contract_terms').select('*').order('updated_at'),
        db('contract_checklist_items').select('*').eq('facility_id', facilityId).order('created_at'),
      ]);
      const c = (cRes.data || []).map(strip) as Contract[];
      setContracts(c);
      // Filter terms to only those belonging to this facility's contracts
      const contractIds = c.map(x => x.id);
      setContractTerms(((tRes.data || []).map(strip) as ContractTerms[]).filter(t => contractIds.includes(t.contract_id)));
      setChecklistItems((clRes.data || []).map(strip) as ContractChecklistItem[]);
    } catch (err) {
      console.error('Failed to load contracts:', err);
    } finally {
      setLoading(false);
    }
  }

  const addContract = useCallback(async (c: Omit<Contract, 'id'>): Promise<Contract> => {
    if (isDemo) {
      const contract = { ...c, id: generateId() };
      setContracts(prev => [...prev, contract]);
      return contract;
    }
    const { data, error } = await db('contracts').insert({ user_id: user!.id, ...c }).select().single();
    if (error) { console.error(error); toast.error(friendlyDbError(error)); throw error; }
    const contract = strip(data) as Contract;
    setContracts(prev => [...prev, contract]);
    return contract;
  }, [isDemo, user]);

  const updateContract = useCallback(async (c: Contract) => {
    if (isDemo) { setContracts(prev => prev.map(x => x.id === c.id ? c : x)); return; }
    const { id, ...rest } = c;
    const { error } = await db('contracts').update(rest).eq('id', id);
    if (error) { console.error(error); toast.error(friendlyDbError(error)); return; }
    setContracts(prev => prev.map(x => x.id === c.id ? c : x));
  }, [isDemo]);

  const deleteContract = useCallback(async (id: string) => {
    if (isDemo) {
      setContracts(prev => prev.filter(x => x.id !== id));
      setContractTerms(prev => prev.filter(x => x.contract_id !== id));
      return;
    }
    const { error } = await db('contracts').delete().eq('id', id);
    if (error) { console.error(error); toast.error(friendlyDbError(error)); return; }
    setContracts(prev => prev.filter(x => x.id !== id));
    setContractTerms(prev => prev.filter(x => x.contract_id !== id));
  }, [isDemo]);

  const upsertTerms = useCallback(async (t: ContractTerms) => {
    const exists = contractTerms.find(x => x.id === t.id);
    if (isDemo) {
      if (exists) { setContractTerms(prev => prev.map(x => x.id === t.id ? t : x)); }
      else { setContractTerms(prev => [...prev, t]); }
      return;
    }
    if (exists) {
      const { id, ...rest } = t;
      const { error } = await db('contract_terms').update(rest).eq('id', id);
      if (error) { toast.error(error.message); return; }
      setContractTerms(prev => prev.map(x => x.id === t.id ? t : x));
    } else {
      const { id: _, ...rest } = t;
      const { data, error } = await db('contract_terms').insert({ user_id: user!.id, ...rest }).select().single();
      if (error) { toast.error(error.message); return; }
      setContractTerms(prev => [...prev, strip(data) as ContractTerms]);
    }
  }, [isDemo, user, contractTerms]);

  const addChecklistItem = useCallback(async (item: Omit<ContractChecklistItem, 'id'>) => {
    if (isDemo) {
      setChecklistItems(prev => [...prev, { ...item, id: generateId() }]);
      return;
    }
    const { data, error } = await db('contract_checklist_items').insert({ user_id: user!.id, ...item }).select().single();
    if (error) { toast.error(error.message); return; }
    setChecklistItems(prev => [...prev, strip(data) as ContractChecklistItem]);
  }, [isDemo, user]);

  const updateChecklistItem = useCallback(async (item: ContractChecklistItem) => {
    if (isDemo) { setChecklistItems(prev => prev.map(x => x.id === item.id ? item : x)); return; }
    const { id, ...rest } = item;
    const { error } = await db('contract_checklist_items').update(rest).eq('id', id);
    if (error) { toast.error(error.message); return; }
    setChecklistItems(prev => prev.map(x => x.id === item.id ? item : x));
  }, [isDemo]);

  const deleteChecklistItem = useCallback(async (id: string) => {
    if (isDemo) { setChecklistItems(prev => prev.filter(x => x.id !== id)); return; }
    const { error } = await db('contract_checklist_items').delete().eq('id', id);
    if (error) { toast.error(error.message); return; }
    setChecklistItems(prev => prev.filter(x => x.id !== id));
  }, [isDemo]);

  const createDefaultChecklist = useCallback(async (fId: string) => {
    for (const item of DEFAULT_CHECKLIST_ITEMS) {
      await addChecklistItem({ facility_id: fId, type: item.type, title: item.title, status: 'needed', due_date: null, notes: '' });
    }
  }, [addChecklistItem]);

  // Get active contract terms for a facility
  const getActiveTerms = useCallback((): ContractTerms | null => {
    const activeContract = contracts.find(c => c.status === 'active');
    if (!activeContract) return null;
    return contractTerms.find(t => t.contract_id === activeContract.id) || null;
  }, [contracts, contractTerms]);

  return {
    contracts, contractTerms, checklistItems, loading,
    addContract, updateContract, deleteContract,
    upsertTerms, addChecklistItem, updateChecklistItem, deleteChecklistItem,
    createDefaultChecklist, getActiveTerms,
  };
}
