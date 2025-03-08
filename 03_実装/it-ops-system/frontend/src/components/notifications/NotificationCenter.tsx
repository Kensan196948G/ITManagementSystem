import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, IconButton, Badge, Popover, List, ListItem, ListItemText,
  Typography, Divider, Chip, Paper, Snackbar, Alert, CircularProgress
} from '@mui/material';
import {
  Notifications as NotificationsIcon,
  Close as CloseIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  CheckCircle as CheckCircleIcon
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';

// 通知メッセージの型定義
interface NotificationMessage {
  id: string;
  type: 'permission_change' | 'system_status' | 'security_alert' | 'resource_warning';
  severity: 'info' | 'warning' | 'error' | 'critical';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  data?: any;
}

/**
 * リアルタイム通知センターコンポーネント
 * WebSocketからの通知を受信・表示する
 */
const NotificationCenter: React.FC = () => {
  // 状態管理
  const [notifications, setNotifications] = useState<NotificationMessage[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [connected, setConnected] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'info' | 'warning' | 'error';
  }>({
    open: false,
    message: '',
    severity: 'info'
  });

  // 認証情報の取得
  const { token } = useAuth();

  // WebSocket接続の確立
  useEffect(() => {
    if (!token) return;

    // WebSocketの接続先URL
    const wsUrl = `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws?token=${token}`;
    const newSocket = new WebSocket(wsUrl);

    // 接続イベント
    newSocket.onopen = () => {
      setConnected(true);
      setError(null);
      console.log('WebSocket接続が確立されました');
    };

    // メッセージ受信イベント
    newSocket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        // 接続確立メッセージの場合は無視
        if (data.type === 'connection_established') {
          return;
        }
        
        // 通知IDの生成
        const notification: NotificationMessage = {
          id: `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          type: data.type,
          severity: data.severity,
          title: data.title,
          message: data.message,
          timestamp: data.timestamp,
          read: false,
          data: data.data
        };
        
        // 通知の追加
        setNotifications(prev => [notification, ...prev].slice(0, 50)); // 最大50件まで保持
        
        // スナックバーで通知
        setSnackbar({
          open: true,
          message: `${notification.title}: ${notification.message}`,
          severity: notification.severity === 'critical' ? 'error' : notification.severity
        });
      } catch (err) {
        console.error('通知メッセージの解析に失敗しました:', err);
      }
    };

    // エラーイベント
    newSocket.onerror = (event) => {
      console.error('WebSocketエラー:', event);
      setError('通知サービスへの接続中にエラーが発生しました');
      setConnected(false);
    };

    // 切断イベント
    newSocket.onclose = (event) => {
      console.log('WebSocket接続が切断されました:', event.code, event.reason);
      setConnected(false);
      
      // 認証エラーの場合
      if (event.code === 4001 || event.code === 4002) {
        setError('認証エラー: 通知サービスに接続できません');
      } else if (event.code !== 1000) {
        // 正常終了以外の場合は再接続を試みる
        setTimeout(() => {
          if (token) {
            console.log('WebSocket再接続を試みます...');
            // 再接続処理（実際にはここで再接続ロジックを実装）
          }
        }, 5000);
      }
    };

    // ソケットの保存
    setSocket(newSocket);

    // クリーンアップ関数
    return () => {
      if (newSocket.readyState === WebSocket.OPEN) {
        newSocket.close();
      }
    };
  }, [token]);

  // 未読通知数の更新
  useEffect(() => {
    const count = notifications.filter(notification => !notification.read).length;
    setUnreadCount(count);
    
    // タイトルに未読数を表示
    if (count > 0) {
      document.title = `(${count}) IT管理システム`;
    } else {
      document.title = 'IT管理システム';
    }
  }, [notifications]);

  // 通知ポップオーバーを開く
  const handleOpenNotifications = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  // 通知ポップオーバーを閉じる
  const handleCloseNotifications = () => {
    setAnchorEl(null);
  };

  // 通知を既読にする
  const markAsRead = useCallback((id: string) => {
    setNotifications(prev => 
      prev.map(notification => 
        notification.id === id 
          ? { ...notification, read: true } 
          : notification
      )
    );
  }, []);

  // すべての通知を既読にする
  const markAllAsRead = useCallback(() => {
    setNotifications(prev => 
      prev.map(notification => ({ ...notification, read: true }))
    );
  }, []);

  // 通知を削除する
  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id));
  }, []);

  // スナックバーを閉じる
  const handleCloseSnackbar = () => {
    setSnackbar(prev => ({ ...prev, open: false }));
  };

  // 通知の重要度に応じたアイコンを取得
  const getSeverityIcon = (severity: 'info' | 'warning' | 'error' | 'critical') => {
    switch (severity) {
      case 'critical':
        return <ErrorIcon color="error" />;
      case 'error':
        return <ErrorIcon color="error" />;
      case 'warning':
        return <WarningIcon color="warning" />;
      case 'info':
        return <InfoIcon color="info" />;
      default:
        return <InfoIcon color="info" />;
    }
  };

  // 通知の種類に応じたチップの色を取得
  const getTypeColor = (type: string) => {
    switch (type) {
      case 'permission_change':
        return 'primary';
      case 'system_status':
        return 'secondary';
      case 'security_alert':
        return 'error';
      case 'resource_warning':
        return 'warning';
      default:
        return 'default';
    }
  };

  // 通知の種類に応じた表示名を取得
  const getTypeName = (type: string) => {
    switch (type) {
      case 'permission_change':
        return 'パーミッション';
      case 'system_status':
        return 'システム状態';
      case 'security_alert':
        return 'セキュリティ';
      case 'resource_warning':
        return 'リソース';
      default:
        return type;
    }
  };

  // ポップオーバーの開閉状態
  const open = Boolean(anchorEl);
  const id = open ? 'notifications-popover' : undefined;

  return (
    <>
      <IconButton
        color="inherit"
        aria-label="通知"
        onClick={handleOpenNotifications}
        aria-describedby={id}
      >
        <Badge badgeContent={unreadCount} color="error">
          <NotificationsIcon />
        </Badge>
      </IconButton>

      <Popover
        id={id}
        open={open}
        anchorEl={anchorEl}
        onClose={handleCloseNotifications}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        PaperProps={{
          style: {
            width: '400px',
            maxHeight: '500px',
          },
        }}
      >
        <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">通知</Typography>
          {unreadCount > 0 && (
            <Button
              size="small"
              onClick={markAllAsRead}
              startIcon={<CheckCircleIcon />}
            >
              すべて既読
            </Button>
          )}
        </Box>
        
        <Divider />
        
        {!connected && (
          <Box sx={{ p: 2, textAlign: 'center' }}>
            {error ? (
              <Typography color="error">{error}</Typography>
            ) : (
              <Box display="flex" alignItems="center" justifyContent="center">
                <CircularProgress size={20} sx={{ mr: 1 }} />
                <Typography>通知サービスに接続中...</Typography>
              </Box>
            )}
          </Box>
        )}
        
        {notifications.length === 0 ? (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <Typography color="textSecondary">通知はありません</Typography>
          </Box>
        ) : (
          <List sx={{ p: 0 }}>
            {notifications.map((notification) => (
              <React.Fragment key={notification.id}>
                <ListItem
                  alignItems="flex-start"
                  sx={{
                    bgcolor: notification.read ? 'inherit' : 'action.hover',
                    '&:hover': {
                      bgcolor: 'action.selected',
                    },
                  }}
                  secondaryAction={
                    <IconButton
                      edge="end"
                      aria-label="削除"
                      onClick={() => removeNotification(notification.id)}
                      size="small"
                    >
                      <CloseIcon fontSize="small" />
                    </IconButton>
                  }
                  onClick={() => markAsRead(notification.id)}
                >
                  <ListItemAvatar>
                    {getSeverityIcon(notification.severity)}
                  </ListItemAvatar>
                  <ListItemText
                    primary={
                      <Box display="flex" alignItems="center">
                        <Typography
                          variant="subtitle2"
                          component="span"
                          sx={{ fontWeight: notification.read ? 'normal' : 'bold' }}
                        >
                          {notification.title}
                        </Typography>
                        <Chip
                          label={getTypeName(notification.type)}
                          color={getTypeColor(notification.type) as any}
                          size="small"
                          sx={{ ml: 1, height: 20 }}
                        />
                      </Box>
                    }
                    secondary={
                      <>
                        <Typography
                          variant="body2"
                          color="textPrimary"
                          component="span"
                        >
                          {notification.message}
                        </Typography>
                        <Typography
                          variant="caption"
                          color="textSecondary"
                          component="div"
                          sx={{ mt: 0.5 }}
                        >
                          {new Date(notification.timestamp).toLocaleString()}
                        </Typography>
                      </>
                    }
                  />
                </ListItem>
                <Divider component="li" />
              </React.Fragment>
            ))}
          </List>
        )}
      </Popover>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  );
};

export default NotificationCenter;