import { Navigate, Route, Routes } from 'react-router-dom';
import { useApp } from './store.jsx';
import Login from './pages/Login.jsx';
import AppLayout from './components/AppLayout.jsx';
import ClientsList from './pages/ClientsList.jsx';
import ClientDetail from './pages/ClientDetail.jsx';
import Mensajeria from './pages/Mensajeria.jsx';
import SurveysList from './pages/SurveysList.jsx';
import SurveyDetail from './pages/SurveyDetail.jsx';
import SurveyResponses from './pages/SurveyResponses.jsx';
import SurveyBuilder from './pages/SurveyBuilder.jsx';
import PlansList from './pages/PlansList.jsx';
import PlanDetail from './pages/PlanDetail.jsx';
import PlanForm from './pages/PlanForm.jsx';

export default function App() {
  const { authChecked, user } = useApp();

  if (!authChecked) return null;
  if (!user) return <Login />;

  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/mensajeria" element={<Mensajeria />} />
        <Route path="/mensajeria/:id" element={<Mensajeria />} />
        <Route path="/clientes" element={<ClientsList />} />
        <Route path="/clientes/:id" element={<ClientDetail />} />
        <Route path="/encuestas" element={<SurveysList />} />
        <Route path="/encuestas/nueva" element={<SurveyBuilder mode="create" />} />
        <Route path="/encuestas/:id" element={<SurveyDetail />} />
        <Route path="/encuestas/:id/editar" element={<SurveyBuilder mode="edit" />} />
        <Route path="/encuestas/:id/respuestas" element={<SurveyResponses />} />
        <Route path="/planes" element={<PlansList />} />
        <Route path="/planes/nuevo" element={<PlanForm mode="create" />} />
        <Route path="/planes/:id" element={<PlanDetail />} />
        <Route path="/planes/:id/editar" element={<PlanForm mode="edit" />} />
        <Route path="*" element={<Navigate to="/clientes" replace />} />
      </Route>
    </Routes>
  );
}
