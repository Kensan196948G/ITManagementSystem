import React, { useEffect, useState } from 'react';
import { Box, Container, Paper, Grid, Typography, Chip, Divider, Alert } from '@mui/material';
import DashboardIcon from '@mui/icons-material/Dashboard';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import SystemDashboard from '../components/dashboard/Dashboard';
import { useAuth } from '../contexts/AuthContext';
import { authApi } from '../services/api';
import { AuthorizedContent } from '../components/AuthorizedContent';
import { AuthorizationLevel, ResourcePermissions } from '../constants/permissions';

const Dashboard = () => {
  const { user } = useAuth();
  const [isGlobalAdmin, setIsGlobalAdmin] = useState<boolean>(false);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const checkUserRoles = async () => {
      if (!user?.email) {
        setLoading(false);
        return;
      }

      try {
        const roles = await authApi.getUserRoles(user.email);
        setIsGlobalAdmin(roles.isGlobalAdmin);
        setIsAdmin(
          roles.isGlobalAdmin || 
          roles.roles.some(role => role.includes(':admin') || role.includes(':write'))
        );
      } catch (error) {
        console.error('ユーザーロール取得エラー:', error);
      } finally {
        setLoading(false);
      }
    };

    checkUserRoles();
  }, [user]);

  return (
    <Container maxWidth="xl">
      <Box sx={{ my: 4 }}>
        <Paper
          elevation={3}
          sx={{
            p: 3,
            background: 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)',
            color: 'white'
          }}
        >
          <Grid container alignItems="center" spacing={2}>
            <Grid item>
              <DashboardIcon sx={{ fontSize: 40 }} />
            </Grid>
            <Grid item xs>
              <Box>
                <Typography variant="h4" component="h1" sx={{ m: 0, fontWeight: 'bold' }}>
                  IT運用システム ダッシュボード
                </Typography>
                <Typography variant="subtitle1" sx={{ mt: 0.5, opacity: 0.9 }}>
                  システムの状態をリアルタイムで監視
                </Typography>
              </Box>
            </Grid>
            {!loading && (isGlobalAdmin || isAdmin) && (
              <Grid item>
                <Chip 
                  icon={<AdminPanelSettingsIcon />} 
                  label={isGlobalAdmin ? "グローバル管理者" : "管理者"} 
                  color={isGlobalAdmin ? "error" : "primary"} 
                  variant="filled" 
                />
              </Grid>
            )}
          </Grid>
        </Paper>
      </Box>

      {/* グローバル管理者向け特別セクション */}
      <AuthorizedContent 
        requiredAuthLevel={AuthorizationLevel.GLOBAL_ADMIN_ONLY}
        showErrorMessage={false}
      >
        <Paper sx={{ p: 3, mb: 3, borderLeft: '4px solid #f44336' }}>
          <Typography variant="h6" gutterBottom>
            グローバル管理者ステータス
          </Typography>
          <Alert severity="info" sx={{ mb: 2 }}>
            Microsoft Entra ID グローバル管理者として、すべての機能とデータにアクセスできます。
          </Alert>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <Paper variant="outlined" sx={{ p: 2 }}>
                <Typography variant="subtitle2" color="text.secondary">
                  テナント管理
                </Typography>
                <Typography variant="body1">
                  テナント管理機能にアクセスして、Microsoft 365環境の詳細設定が可能です。
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} md={6}>
              <Paper variant="outlined" sx={{ p: 2 }}>
                <Typography variant="subtitle2" color="text.secondary">
                  グローバルポリシー
                </Typography>
                <Typography variant="body1">
                  セキュリティポリシーやコンプライアンス設定の変更ができます。
                </Typography>
              </Paper>
            </Grid>
          </Grid>
        </Paper>
      </AuthorizedContent>

      {/* 管理者向けセクション */}
      <AuthorizedContent 
        requiredAuthLevel={AuthorizationLevel.ADMIN_ROLE}
        showErrorMessage={false}
      >
        <Paper sx={{ p: 3, mb: 3, borderLeft: '4px solid #3f51b5' }}>
          <Typography variant="h6" gutterBottom>
            管理者ステータス
          </Typography>
          <Typography variant="body1">
            システム管理者として、ユーザー管理やセキュリティ設定などの管理機能にアクセスできます。
          </Typography>
        </Paper>
      </AuthorizedContent>

      {/* すべてのユーザーに表示するシステムダッシュボード */}
      <SystemDashboard />
    </Container>
  );
};

export default Dashboard;