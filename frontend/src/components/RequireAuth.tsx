import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function RequireAuth({
  children,
  role,
}: {
  children: React.ReactNode;
  role?: 'ADMIN' | 'USER';
}) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-500 dark:text-gray-400 text-sm">
        불러오는 중...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (role === 'ADMIN' && user.role !== 'ADMIN') {
    return (
      <div className="p-8 text-center">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">접근 권한이 없습니다</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">관리자만 접근할 수 있는 페이지입니다.</p>
      </div>
    );
  }

  return <>{children}</>;
}
