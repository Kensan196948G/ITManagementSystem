import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { PermissionCheck } from '../components/PermissionCheck';
import Dashboard from '../pages/Dashboard';
import Settings from '../pages/Settings';
import Security from '../pages/Security';
import Metrics from '../pages/Metrics';
import Users from '../pages/Users';
import Login from '../pages/Login';
import { GraphAPIPermissionCheck } from '../components/admin/GraphAPIPermissionCheck';
import { AppLayout } from '../components/AppLayout';

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
                <PermissionCheck resource="metrics" action="read">
                  <Metrics />
                </PermissionCheck>
              </AppLayout>
            )
          }
        />
        <Route 
          path="/metrics/edit" 
          element={
            isAuthenticated ? (
              <AppLayout>
                <PermissionCheck resource="metrics" action="write">
                  <Metrics editMode={true} />
                </PermissionCheck>
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
                <PermissionCheck resource="security" action="read">
                  <Security />
                </PermissionCheck>
              </AppLayout>
            )
          } 
        />
        <Route 
          path="/security/configure" 
          element={
            isAuthenticated ? (
              <AppLayout>
                <PermissionCheck resource="security" action="write">
                  <Security editMode={true} />
                </PermissionCheck>
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
                <PermissionCheck resource="users" action="read">
                  <Users />
                </PermissionCheck>
              </AppLayout>
            )
          } 
        />
        <Route 
          path="/users/manage" 
          element={
            isAuthenticated ? (
              <AppLayout>
                <PermissionCheck resource="users" action="write">
                  <Users editMode={true} />
                </PermissionCheck>
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
                <PermissionCheck resource="system" action="write">
                  <Settings />
                </PermissionCheck>
              </AppLayout>
            )
          } 
        />

        {/* Graph API パーミッション管理 */}
        <Route 
          path="/admin/graph-permissions" 
          element={
            !isAuthenticated ? (
              <Navigate to="/login" replace />
            ) : (
              <AppLayout>
                <GraphAPIPermissionCheck>
                  {null}
                </GraphAPIPermissionCheck>
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