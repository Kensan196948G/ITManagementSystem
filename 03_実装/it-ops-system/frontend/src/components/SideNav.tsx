import { useState, useEffect } from 'react';
import { 
  Drawer, 
  List, 
  ListItem, 
  ListItemIcon, 
  ListItemText, 
  Divider, 
  Typography,
  Box,
  Tooltip,
  Chip
} from '@mui/material';
import DashboardIcon from '@mui/icons-material/Dashboard';
import SecurityIcon from '@mui/icons-material/Security';
import PeopleIcon from '@mui/icons-material/People';
import SettingsIcon from '@mui/icons-material/Settings';
import TimelineIcon from '@mui/icons-material/Timeline';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import VpnKeyIcon from '@mui/icons-material/VpnKey';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import LockIcon from '@mui/icons-material/Lock';
import { useAuth } from '../contexts/AuthContext';
import { authApi } from '../services/api';
import { ResourcePermissions } from '../constants/permissions';

interface MenuItem {
  label: string;
  icon: React.ReactNode;
  path: string;
  permission: string;
  adminOnly?: boolean;
  globalAdminOnly?: boolean;
}

// 全てのユーザー向けメニュー項目
const commonMenuItems: MenuItem[] = [
  { label: 'ダッシュボード', icon: <DashboardIcon />, path: '/', permission: ResourcePermissions.DASHBOARD.VIEW },
  { label: 'メトリクス', icon: <TimelineIcon />, path: '/metrics', permission: ResourcePermissions.METRICS.VIEW },
  { label: 'セキュリティ', icon: <SecurityIcon />, path: '/security', permission: ResourcePermissions.SECURITY.VIEW },
  { label: 'ユーザー管理', icon: <PeopleIcon />, path: '/users', permission: ResourcePermissions.USERS.VIEW },
];

// 管理者向けメニュー項目
const adminMenuItems: MenuItem[] = [
  { label: 'システム設定', icon: <SettingsIcon />, path: '/settings', permission: ResourcePermissions.SYSTEM.EDIT, adminOnly: true },
  { label: 'セキュリティ設定', icon: <LockIcon />, path: '/security/configure', permission: ResourcePermissions.SECURITY.EDIT, adminOnly: true },
];

// グローバル管理者専用メニュー項目
const globalAdminMenuItems: MenuItem[] = [
  { label: 'Graph API権限', icon: <VpnKeyIcon />, path: '/admin/graph-permissions', permission: 'admin:graph', globalAdminOnly: true },
  { label: 'テナント管理', icon: <AdminPanelSettingsIcon />, path: '/admin/tenant', permission: 'admin:tenant', globalAdminOnly: true },
  { label: 'セキュリティポリシー', icon: <VerifiedUserIcon />, path: '/admin/security-policies', permission: 'admin:security', globalAdminOnly: true },
];

export const SideNav = () => {
  const { user } = useAuth();
  const [userPermissions, setUserPermissions] = useState<string[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isGlobalAdmin, setIsGlobalAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserPermissions = async () => {
      try {
        if (!user?.email) {
          setLoading(false);
          return;
        }

        const data = await authApi.getUserRoles(user.email);
        setUserPermissions(data.roles || []);
        // 管理者系の権限を持っているかチェック
        setIsAdmin(
          data.isGlobalAdmin || 
          data.roles.some(role => role.includes(':admin') || role.includes(':write'))
        );
        setIsGlobalAdmin(data.isGlobalAdmin);
      } catch (error) {
        console.error('権限情報の取得に失敗しました:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserPermissions();
  }, [user]);

  const hasPermission = (item: MenuItem): boolean => {
    // グローバル管理者専用の項目
    if (item.globalAdminOnly) {
      return isGlobalAdmin;
    }
    
    // 管理者向けの項目
    if (item.adminOnly) {
      return isAdmin || isGlobalAdmin;
    }
    
    // 通常の権限チェック
    return isGlobalAdmin || userPermissions.includes(item.permission);
  };

  if (loading) {
    return null; // ローディング中は何も表示しない
  }

  return (
    <Drawer variant="permanent" sx={{ width: 240, flexShrink: 0 }}>
      <Box sx={{ width: 240, overflow: 'auto' }}>
        <List>
          <ListItem sx={{ height: 64, display: 'flex', alignItems: 'center' }}>
            <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
              IT運用システム
            </Typography>
          </ListItem>
          
          <Divider />
          
          {/* 共通メニュー */}
          {commonMenuItems.map((item) => (
            hasPermission(item) && (
              <ListItem 
                button 
                key={item.path}
                component="a"
                href={item.path}
              >
                <ListItemIcon>{item.icon}</ListItemIcon>
                <ListItemText primary={item.label} />
              </ListItem>
            )
          ))}

          {/* 管理者メニュー */}
          {isAdmin && (
            <>
              <Divider />
              <ListItem>
                <Typography variant="caption" color="text.secondary">
                  管理者機能
                </Typography>
              </ListItem>
              
              {adminMenuItems.map((item) => (
                hasPermission(item) && (
                  <ListItem 
                    button 
                    key={item.path}
                    component="a"
                    href={item.path}
                  >
                    <ListItemIcon>{item.icon}</ListItemIcon>
                    <ListItemText primary={item.label} />
                  </ListItem>
                )
              ))}
            </>
          )}

          {/* グローバル管理者メニュー */}
          {isGlobalAdmin && (
            <>
              <Divider />
              <ListItem>
                <Box display="flex" alignItems="center">
                  <Typography variant="caption" color="text.secondary" sx={{ mr: 1 }}>
                    グローバル管理者専用
                  </Typography>
                  <Tooltip title="Microsoftアカウントのグローバル管理者権限を持つユーザーのみ利用できる機能です">
                    <Chip 
                      label="MS管理者" 
                      size="small" 
                      color="error" 
                      sx={{ height: 20, fontSize: '0.65rem' }}
                    />
                  </Tooltip>
                </Box>
              </ListItem>
              
              {globalAdminMenuItems.map((item) => (
                <ListItem 
                  button 
                  key={item.path}
                  component="a"
                  href={item.path}
                >
                  <ListItemIcon>{item.icon}</ListItemIcon>
                  <ListItemText primary={item.label} />
                </ListItem>
              ))}
            </>
          )}
        </List>
      </Box>
    </Drawer>
  );
};