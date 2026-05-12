import { Navigate, Route, Routes } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import RequireAuth from './components/RequireAuth';
import Login from './pages/Login';
import QuotationList from './pages/Quotations/List';
import QuotationDetail from './pages/Quotations/Detail';
import QuotationForm from './pages/Quotations/Form';
import ProductList from './pages/Products/List';
import ProductForm from './pages/Products/Form';
import CustomerList from './pages/Customers/List';
import CustomerForm from './pages/Customers/Form';
import UserList from './pages/Users/List';
import Settings from './pages/Settings';
import ContractList from './pages/Contracts/List';
import ContractForm from './pages/Contracts/Form';
import ContractDetail from './pages/Contracts/Detail';
import ExpenseList from './pages/Expenses/List';
import ExpenseForm from './pages/Expenses/Form';
import AccessLogList from './pages/AccessLogs/List';
import AccessRulesPage from './pages/AccessRules/List';
import Dashboard from './pages/Dashboard';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        element={
          <RequireAuth>
            <MainLayout />
          </RequireAuth>
        }
      >
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/quotations" element={<QuotationList />} />
        <Route path="/quotations/new" element={<QuotationForm mode="create" />} />
        <Route path="/quotations/:id" element={<QuotationDetail />} />
        <Route path="/quotations/:id/edit" element={<QuotationForm mode="edit" />} />
        <Route path="/products" element={<ProductList />} />
        <Route path="/products/new" element={<ProductForm mode="create" />} />
        <Route path="/products/:id/edit" element={<ProductForm mode="edit" />} />
        <Route path="/customers" element={<CustomerList />} />
        <Route path="/customers/new" element={<CustomerForm mode="create" />} />
        <Route path="/customers/:id/edit" element={<CustomerForm mode="edit" />} />
        <Route
          path="/users"
          element={
            <RequireAuth role="ADMIN">
              <UserList />
            </RequireAuth>
          }
        />
        <Route path="/contracts" element={<ContractList />} />
        <Route path="/contracts/new" element={<ContractForm mode="create" />} />
        <Route path="/contracts/:id" element={<ContractDetail />} />
        <Route path="/contracts/:id/edit" element={<ContractForm mode="edit" />} />
        <Route path="/expenses" element={<ExpenseList />} />
        <Route path="/expenses/new" element={<ExpenseForm mode="create" />} />
        <Route path="/expenses/:id/edit" element={<ExpenseForm mode="edit" />} />
        <Route
          path="/access-logs"
          element={
            <RequireAuth role="ADMIN">
              <AccessLogList />
            </RequireAuth>
          }
        />
        <Route
          path="/access-rules"
          element={
            <RequireAuth role="ADMIN">
              <AccessRulesPage />
            </RequireAuth>
          }
        />
        <Route path="/settings" element={<Settings />} />
        <Route path="*" element={<div className="p-8">404 — 페이지를 찾을 수 없습니다.</div>} />
      </Route>
    </Routes>
  );
}
