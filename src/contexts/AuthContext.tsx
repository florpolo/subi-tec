import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { setCurrentCompanyId } from '../lib/dataLayer';

interface CompanyMember {
  id: string;
  company_id: string;
  role: 'office' | 'technician';
  company?: {
    id: string;
    name: string;
  };
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  activeCompanyId: string | null;
  activeCompanyRole: 'office' | 'technician' | 'engineer' | null;
  companyMemberships: CompanyMember[];
  engineerId: string | null;
  setActiveCompany: (companyId: string) => void;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeCompanyId, setActiveCompanyId] = useState<string | null>(null);
  const [activeCompanyRole, setActiveCompanyRole] = useState<'office' | 'technician' | 'engineer' | null>(null);
  const [companyMemberships, setCompanyMemberships] = useState<CompanyMember[]>([]);
  const [engineerId, setEngineerId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      (async () => {
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          await loadCompanyMemberships(session.user.id);
        }

        setLoading(false);
      })();
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      (async () => {
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          await loadCompanyMemberships(session.user.id);
        } else {
          setCompanyMemberships([]);
          setActiveCompanyId(null);
          setActiveCompanyRole(null);
        }
      })();
    });

    return () => subscription.unsubscribe();
  }, []);

  const loadCompanyMemberships = async (userId: string) => {
    const { data: engineerData } = await supabase
      .from('engineers')
      .select('id, company_id')
      .eq('user_id', userId)
      .maybeSingle();

    if (engineerData) {
      setEngineerId(engineerData.id);
      setActiveCompanyId(engineerData.company_id);
      setActiveCompanyRole('engineer');
      setCurrentCompanyId(engineerData.company_id);
      setCompanyMemberships([]);
      return;
    }

    const { data, error } = await supabase
      .from('company_members')
      .select(`
        id,
        company_id,
        role,
        company:companies(id, name)
      `)
      .eq('user_id', userId);

    if (error) {
      console.error('Error loading company memberships:', error);
      return;
    }

    if (data && data.length > 0) {
      setCompanyMemberships(data as CompanyMember[]);
      setEngineerId(null);

      const storedCompanyId = localStorage.getItem('activeCompanyId');
      const validStoredCompany = data.find(m => m.company_id === storedCompanyId);

      if (validStoredCompany) {
        setActiveCompanyId(validStoredCompany.company_id);
        setActiveCompanyRole(validStoredCompany.role);
        setCurrentCompanyId(validStoredCompany.company_id);
      } else {
        setActiveCompanyId(data[0].company_id);
        setActiveCompanyRole(data[0].role);
        localStorage.setItem('activeCompanyId', data[0].company_id);
        setCurrentCompanyId(data[0].company_id);
      }
    }
  };

  const setActiveCompany = (companyId: string) => {
    const membership = companyMemberships.find(m => m.company_id === companyId);
    if (membership) {
      setActiveCompanyId(companyId);
      setActiveCompanyRole(membership.role);
      localStorage.setItem('activeCompanyId', companyId);
      setCurrentCompanyId(companyId);
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setActiveCompanyId(null);
    setActiveCompanyRole(null);
    setCompanyMemberships([]);
    setEngineerId(null);
    localStorage.removeItem('activeCompanyId');
    setCurrentCompanyId(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        activeCompanyId,
        activeCompanyRole,
        companyMemberships,
        engineerId,
        setActiveCompany,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
