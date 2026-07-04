import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { apiGet, apiPost, apiPatch, apiPut, apiDelete } from './api.js';

const AppContext = createContext(null);
export const useApp = () => useContext(AppContext);

export function AppProvider({ children }) {
  // ── Auth ──
  const [authChecked, setAuthChecked] = useState(false);
  const [user, setUser] = useState(null);

  // ── Datos ──
  const [clients, setClients] = useState([]);
  const [plans, setPlans] = useState([]);
  const [surveys, setSurveys] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [dataLoaded, setDataLoaded] = useState(false);

  // ── Layout ──
  const [viewportWidth, setViewportWidth] = useState(window.innerWidth);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const isDesktop = viewportWidth >= 1024;

  // ── Clientes: filtros ──
  const [clientSearch, setClientSearch] = useState('');
  const [vipFilterOn, setVipFilterOn] = useState(false);

  // ── Globales ──
  const [toast, setToastMsg] = useState(null);
  const [confirmModal, setConfirmModal] = useState(null); // {title, message, onConfirm}
  const [activeSubmission, setActiveSubmission] = useState(null); // {id, editing}
  const toastTimer = useRef(null);

  useEffect(() => {
    const onResize = () => setViewportWidth(window.innerWidth);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const showToast = useCallback((message) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToastMsg(message);
    toastTimer.current = setTimeout(() => setToastMsg(null), 2400);
  }, []);

  const loadData = useCallback(async () => {
    const data = await apiGet('/api/bootstrap');
    setClients(data.clients);
    setPlans(data.plans);
    setSurveys(data.surveys);
    setSubmissions(data.submissions);
    setDataLoaded(true);
  }, []);

  // Sesión existente al cargar la app
  useEffect(() => {
    (async () => {
      try {
        const me = await apiGet('/api/me');
        setUser(me);
        await loadData();
      } catch {
        /* no autenticado */
      } finally {
        setAuthChecked(true);
      }
    })();
  }, [loadData]);

  const login = useCallback(async (email, password) => {
    const res = await apiPost('/api/login', { email, password });
    setUser({ email: res.email });
    await loadData();
  }, [loadData]);

  const logout = useCallback(async () => {
    try { await apiPost('/api/logout'); } catch { /* ignorar */ }
    setUser(null);
    setDataLoaded(false);
    setClients([]); setPlans([]); setSurveys([]); setSubmissions([]);
    setMobileSidebarOpen(false);
  }, []);

  const handleError = useCallback((err) => {
    showToast(err?.message || 'Ocurrió un error');
  }, [showToast]);

  // ── Clientes ──
  const updateClient = useCallback(async (id, fields) => {
    const updated = await apiPatch(`/api/clients/${id}`, fields);
    setClients((cs) => cs.map((c) => (c.id === id ? updated : c)));
    return updated;
  }, []);

  const setClientVip = useCallback(async (id, isVip, reason) => {
    const updated = await apiPatch(`/api/clients/${id}/vip`, { is_vip: isVip, vip_reason: reason });
    setClients((cs) => cs.map((c) => (c.id === id ? updated : c)));
    return updated;
  }, []);

  const saveNutritionPlan = useCallback(async (id, text) => {
    const updated = await apiPatch(`/api/clients/${id}/nutrition-plan`, { nutrition_plan_text: text });
    setClients((cs) => cs.map((c) => (c.id === id ? updated : c)));
    return updated;
  }, []);

  // ── Planes ──
  const createPlan = useCallback(async (fields) => {
    const created = await apiPost('/api/plans', fields);
    setPlans((ps) => [...ps, created]);
    return created;
  }, []);

  const updatePlan = useCallback(async (id, fields) => {
    const updated = await apiPatch(`/api/plans/${id}`, fields);
    setPlans((ps) => ps.map((p) => (p.id === id ? updated : p)));
    return updated;
  }, []);

  const deletePlan = useCallback(async (id) => {
    await apiDelete(`/api/plans/${id}`);
    setPlans((ps) => ps.filter((p) => p.id !== id));
  }, []);

  // ── Encuestas ──
  const createSurvey = useCallback(async (payload) => {
    const res = await apiPost('/api/surveys', payload);
    await loadData();
    return res;
  }, [loadData]);

  const updateSurvey = useCallback(async (id, payload) => {
    const res = await apiPut(`/api/surveys/${id}`, payload);
    await loadData();
    return res;
  }, [loadData]);

  const toggleSurveyActive = useCallback(async (id) => {
    const updated = await apiPatch(`/api/surveys/${id}/active`);
    setSurveys((svs) => svs.map((sv) => (sv.id === id ? { ...sv, is_active: updated.is_active } : sv)));
  }, []);

  const deleteSurvey = useCallback(async (id) => {
    await apiDelete(`/api/surveys/${id}`);
    setSurveys((svs) => svs.filter((sv) => sv.id !== id));
  }, []);

  // ── Respuestas ──
  const saveSubmissionAnswers = useCallback(async (id, answers) => {
    const res = await apiPut(`/api/submissions/${id}/answers`, { answers });
    setSubmissions((subs) => subs.map((s) => (s.id === id ? { ...s, answers: res.answers } : s)));
    return res;
  }, []);

  const deleteSubmission = useCallback(async (id) => {
    await apiDelete(`/api/submissions/${id}`);
    setSubmissions((subs) => subs.filter((s) => s.id !== id));
  }, []);

  const value = {
    authChecked, user, login, logout,
    clients, plans, surveys, submissions, dataLoaded, loadData,
    isDesktop, sidebarCollapsed, setSidebarCollapsed, mobileSidebarOpen, setMobileSidebarOpen,
    clientSearch, setClientSearch, vipFilterOn, setVipFilterOn,
    toast, showToast, confirmModal, setConfirmModal,
    activeSubmission, setActiveSubmission,
    handleError,
    updateClient, setClientVip, saveNutritionPlan,
    createPlan, updatePlan, deletePlan,
    createSurvey, updateSurvey, toggleSurveyActive, deleteSurvey,
    saveSubmissionAnswers, deleteSubmission,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
