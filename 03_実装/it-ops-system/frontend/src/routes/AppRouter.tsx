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
    return <div>Loading...</div>;
  }

  return (
    <Router>
      <Routes>
        {/* 認証不要のルート */}
        <Route path="/login" element={!isAuthenticated ? <Login /> : <Navigate to="/" />} />

        {/* 認証が必要なルート */}
        <Route path="/" element={isAuthenticated ? <AppLayout><Dashboard /></AppLayout> : <Navigate to="/login" />} />

        {/* メトリクス - 閲覧/編集権限を分離 */}
        <Route 
          path="/metrics" 
          element={
            isAuthenticated ? (
              <AppLayout>
                <PermissionCheck resource="metrics" action="read">
                  <Metrics />
                </PermissionCheck>
              </AppLayout>
            ) : (
              <Navigate to="/login" />
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

        {/* セキュリティ設定 - 閲覧/編集権限を分離 */}
        <Route 
          path="/security" 
          element={
            isAuthenticated ? (
              <AppLayout>
                <PermissionCheck resource="security" action="read">
                  <Security />
                </PermissionCheck>
              </AppLayout>
            ) : (
              <Navigate to="/login" />
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

        {/* ユーザー管理 - 閲覧/編集権限を分離 */}
        <Route 
          path="/users" 
          element={
            isAuthenticated ? (
              <AppLayout>
                <PermissionCheck resource="users" action="read">
                  <Users />
                </PermissionCheck>
              </AppLayout>
            ) : (
              <Navigate to="/login" />
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

        {/* システム設定 - 高度な権限が必要 */}
        <Route 
          path="/settings" 
          element={
            isAuthenticated ? (
              <AppLayout>
                <PermissionCheck resource="system" action="write">
                  <Settings />
                </PermissionCheck>
              </AppLayout>
            ) : (
              <Navigate to="/login" />
            )
          } 
        />

        {/* Graph API パーミッション管理 - グローバル管理者のみ */}
        <Route 
          path="/admin/graph-permissions" 
          element={
            isAuthenticated ? (
              <AppLayout>
                <GraphAPIPermissionCheck>
                  {null}
                </GraphAPIPermissionCheck>
              </AppLayout>
            ) : (
              <Navigate to="/login" />
            )
          } 
        />

        {/* 404ページ */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
};