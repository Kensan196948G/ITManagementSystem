import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Dashboard from '../pages/Dashboard';
import Settings from '../pages/Settings';
import Security from '../pages/Security';
import Metrics from '../pages/Metrics';
import Users from '../pages/Users';
import Login from '../pages/Login';
import GraphPermissionDashboard from '../pages/GraphPermissionDashboard';
import UserPermissionView from '../pages/UserPermissionView';
import UserPermissionManagement from '../pages/UserPermissionManagement';
import { GraphAPIPermissionCheck } from '../components/admin/GraphAPIPermissionCheck';
import { AppLayout } from '../components/AppLayout';
import { AuthorizedContent } from '../components/AuthorizedContent';
import { AuthorizationLevel, ResourcePermissions } from '../constants/permissions';

export const AppRouter = () => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh' 
      }}>
        Loading...
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        {/* 認証前のルート */}
        <Route 
          path="/login" 
          element={
            isAuthenticated ? (
              <Navigate to="/" replace />
            ) : (
              <Login />
            )
          } 
        />

        {/* 認証後のルート */}
        <Route
          path="/"
          element={
            !isAuthenticated ? (
              <Navigate to="/login" replace />
            ) : (
              <AppLayout>
                <Dashboard />
              </AppLayout>
            )
          }
        />

        {/* メトリクス */}
        <Route
          path="/metrics"
          element={
            !isAuthenticated ? (
              <Navigate to="/login" replace />
            ) : (
              <AppLayout>
                <AuthorizedContent
                  requiredAuthLevel={AuthorizationLevel.USER_ROLE}
                  requiredPermission={ResourcePermissions.METRICS.VIEW}
                >
                  <Metrics />
                </AuthorizedContent>
              </AppLayout>
            )
          }
        />
        <Route 
          path="/metrics/edit" 
          element={
            isAuthenticated ? (
              <AppLayout>
                <AuthorizedContent
                  requiredAuthLevel={AuthorizationLevel.ADMIN_ROLE}
                  requiredPermission={ResourcePermissions.METRICS.EDIT}
                >
                  <Metrics editMode={true} />
                </AuthorizedContent>
              </AppLayout>
            ) : (
              <Navigate to="/login" />
            )
          } 
        />

        {/* セキュリティ設定 */}
        <Route 
          path="/security" 
          element={
            !isAuthenticated ? (
              <Navigate to="/login" replace />
            ) : (
              <AppLayout>
                <AuthorizedContent
                  requiredAuthLevel={AuthorizationLevel.USER_ROLE}
                  requiredPermission={ResourcePermissions.SECURITY.VIEW}
                >
                  <Security />
                </AuthorizedContent>
              </AppLayout>
            )
          } 
        />
        <Route 
          path="/security/configure" 
          element={
            isAuthenticated ? (
              <AppLayout>
                <AuthorizedContent
                  requiredAuthLevel={AuthorizationLevel.ADMIN_ROLE}
                  requiredPermission={ResourcePermissions.SECURITY.EDIT}
                >
                  <Security editMode={true} />
                </AuthorizedContent>
              </AppLayout>
            ) : (
              <Navigate to="/login" />
            )
          } 
        />

        {/* ユーザー管理 */}
        <Route 
          path="/users" 
          element={
            !isAuthenticated ? (
              <Navigate to="/login" replace />
            ) : (
              <AppLayout>
                <AuthorizedContent
                  requiredAuthLevel={AuthorizationLevel.USER_ROLE}
                  requiredPermission={ResourcePermissions.USERS.VIEW}
                >
                  <Users />
                </AuthorizedContent>
              </AppLayout>
            )
          } 
        />
        <Route 
          path="/users/manage" 
          element={
            isAuthenticated ? (
              <AppLayout>
                <AuthorizedContent
                  requiredAuthLevel={AuthorizationLevel.ADMIN_ROLE}
                  requiredPermission={ResourcePermissions.USERS.EDIT}
                >
                  <Users editMode={true} />
                </AuthorizedContent>
              </AppLayout>
            ) : (
              <Navigate to="/login" />
            )
          } 
        />

        {/* システム設定 */}
        <Route 
          path="/settings" 
          element={
            !isAuthenticated ? (
              <Navigate to="/login" replace />
            ) : (
              <AppLayout>
                <AuthorizedContent
                  requiredAuthLevel={AuthorizationLevel.ADMIN_ROLE}
                  requiredPermission={ResourcePermissions.SYSTEM.EDIT}
                >
                  <Settings />
                </AuthorizedContent>
              </AppLayout>
            )
          } 
        />

        {/* Graph API パーミッション管理 (グローバル管理者専用) */}
        <Route 
          path="/admin/graph-permissions" 
          element={
            !isAuthenticated ? (
              <Navigate to="/login" replace />
            ) : (
              <AppLayout>
                <AuthorizedContent
                  requiredAuthLevel={AuthorizationLevel.GLOBAL_ADMIN_ONLY}
                  featureId="graph-api-permissions"
                >
                  <GraphAPIPermissionCheck>
                    {null}
                  </GraphAPIPermissionCheck>
                </AuthorizedContent>
              </AppLayout>
            )
          } 
        />

        {/* 新規追加: IT運用情報ダッシュボード (一般ユーザー向け) */}
        <Route 
          path="/graph-permissions/dashboard" 
          element={
            !isAuthenticated ? (
              <Navigate to="/login" replace />
            ) : (
              <AppLayout>
                <AuthorizedContent
                  requiredAuthLevel={AuthorizationLevel.AUTHENTICATED}
                >
                  <GraphPermissionDashboard />
                </AuthorizedContent>
              </AppLayout>
            )
          } 
        />

        {/* 新規追加: 自分のパーミッション一覧表示 (一般ユーザー向け) */}
        <Route 
          path="/graph-permissions/my-permissions" 
          element={
            !isAuthenticated ? (
              <Navigate to="/login" replace />
            ) : (
              <AppLayout>
                <AuthorizedContent
                  requiredAuthLevel={AuthorizationLevel.AUTHENTICATED}
                >
                  <UserPermissionView />
                </AuthorizedContent>
              </AppLayout>
            )
          } 
        />

        {/* 新規追加: パーミッション管理画面 (グローバル管理者向け) */}
        <Route 
          path="/graph-permissions/manage" 
          element={
            !isAuthenticated ? (
              <Navigate to="/login" replace />
            ) : (
              <AppLayout>
                <AuthorizedContent
                  requiredAuthLevel={AuthorizationLevel.GLOBAL_ADMIN_ONLY}
                >
                  <UserPermissionManagement />
                </AuthorizedContent>
              </AppLayout>
            )
          } 
        />

        {/* 404ページ */}
        <Route 
          path="*" 
          element={
            !isAuthenticated ? (
              <Navigate to="/login" replace />
            ) : (
              <Navigate to="/" replace />
            )
          } 
        />
      </Routes>
    </Router>
  );
};