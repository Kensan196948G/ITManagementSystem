import { useState, useEffect } from 'react';
import { Drawer, List, ListItem, ListItemIcon, ListItemText } from '@mui/material';
import DashboardIcon from '@mui/icons-material/Dashboard';
import SecurityIcon from '@mui/icons-material/Security';
import PeopleIcon from '@mui/icons-material/People';
import SettingsIcon from '@mui/icons-material/Settings';
import TimelineIcon from '@mui/icons-material/Timeline';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';

interface MenuItem {
  label: string;
  icon: React.ReactNode;
  path: string;
  permission: string;
}

const menuItems: MenuItem[] = [
  { label: 'ダッシュボード', icon: <DashboardIcon />, path: '/', permission: 'read:dashboard' },
  { label: 'メトリクス', icon: <TimelineIcon />, path: '/metrics', permission: 'read:metrics' },
  { label: 'セキュリティ', icon: <SecurityIcon />, path: '/security', permission: 'read:security' },
  { label: 'ユーザー管理', icon: <PeopleIcon />, path: '/users', permission: 'read:users' },
  { label: 'システム設定', icon: <SettingsIcon />, path: '/settings', permission: 'admin:system' }
];

export const SideNav = () => {
  const { user } = useAuth();
  const [userPermissions, setUserPermissions] = useState<string[]>([]);
  const [isGlobalAdmin, setIsGlobalAdmin] = useState(false);

  useEffect(() => {
    const fetchUserPermissions = async () => {
      try {
        if (!user?.email) return;

        const response = await api.get(`/auth/user-roles/${user.email}`);
        setUserPermissions(response.data.roles);
        setIsGlobalAdmin(response.data.isGlobalAdmin);
      } catch (error) {
        console.error('権限情報の取得に失敗しました:', error);
      }
    };

    fetchUserPermissions();
  }, [user]);

  const hasPermission = (permission: string): boolean => {
    return isGlobalAdmin || userPermissions.includes(permission);
  };

  return (
    <Drawer variant="permanent">
      <List>
        {menuItems.map((item) => (
          hasPermission(item.permission) && (
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
      </List>
    </Drawer>
  );
};