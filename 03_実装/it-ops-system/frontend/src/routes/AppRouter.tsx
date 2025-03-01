import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { PermissionCheck } from '../components/PermissionCheck';
import Dashboard from '../pages/Dashboard';
import Settings from '../pages/Settings';
import Security from '../pages/Security';
import Metrics from '../pages/Metrics';
import Users from '../pages/Users';
import { GraphAPIPermissionCheck } from '../components/admin/GraphAPIPermissionCheck';

export const AppRouter = () => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <Router>
      <Routes>
        {/* 基本ダッシュボード - 全ユーザーアクセス可能 */}
        <Route path="/" element={<Dashboard />} />
        
        {/* メトリクス - 閲覧/編集権限を分離 */}
        <Route 
          path="/metrics" 
          element={
            <PermissionCheck resource="metrics" action="read">
              <Metrics />
            </PermissionCheck>
          } 
        />
        <Route 
          path="/metrics/edit" 
          element={
            <PermissionCheck resource="metrics" action="write">
              <Metrics editMode={true} />
            </PermissionCheck>
          } 
        />

        {/* セキュリティ設定 - 閲覧/編集権限を分離 */}
        <Route 
          path="/security" 
          element={
            <PermissionCheck resource="security" action="read">
              <Security />
            </PermissionCheck>
          } 
        />
        <Route 
          path="/security/configure" 
          element={
            <PermissionCheck resource="security" action="write">
              <Security editMode={true} />
            </PermissionCheck>
          } 
        />

        {/* ユーザー管理 - 閲覧/編集権限を分離 */}
        <Route 
          path="/users" 
          element={
            <PermissionCheck resource="users" action="read">
              <Users />
            </PermissionCheck>
          } 
        />
        <Route 
          path="/users/manage" 
          element={
            <PermissionCheck resource="users" action="write">
              <Users editMode={true} />
            </PermissionCheck>
          } 
        />

        {/* システム設定 - 高度な権限が必要 */}
        <Route 
          path="/settings" 
          element={
            <PermissionCheck resource="system" action="write">
              <Settings />
            </PermissionCheck>
          } 
        />

        {/* Graph API パーミッション管理 - グローバル管理者のみ */}
        <Route 
          path="/admin/graph-permissions" 
          element={
            <GraphAPIPermissionCheck>
              {/* 空のチャイルドレンとしてnullを渡す */}
              {null}
            </GraphAPIPermissionCheck>
          } 
        />
      </Routes>
    </Router>
  );
};