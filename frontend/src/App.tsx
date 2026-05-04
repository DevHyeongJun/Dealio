import { Navigate, Route, Routes } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import QuotationList from './pages/Quotations/List';
import QuotationDetail from './pages/Quotations/Detail';
import QuotationForm from './pages/Quotations/Form';

export default function App() {
  return (
    <Routes>
      <Route element={<MainLayout />}>
        <Route path="/" element={<Navigate to="/quotations" replace />} />
        <Route path="/quotations" element={<QuotationList />} />
        <Route path="/quotations/new" element={<QuotationForm mode="create" />} />
        <Route path="/quotations/:id" element={<QuotationDetail />} />
        <Route path="/quotations/:id/edit" element={<QuotationForm mode="edit" />} />
        <Route path="*" element={<div className="p-8">404 — 페이지를 찾을 수 없습니다.</div>} />
      </Route>
    </Routes>
  );
}
