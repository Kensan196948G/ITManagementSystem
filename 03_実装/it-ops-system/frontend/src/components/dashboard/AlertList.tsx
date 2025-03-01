import React from 'react';
import {
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Chip,
  Typography,
  Tooltip,
  Box,
  Paper,
} from '@mui/material';
import {
  Error as ErrorIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  CheckCircle as SuccessIcon,
  Done as DoneIcon,
} from '@mui/icons-material';
import { Alert } from '../../types/api';
import { formatDistanceToNow } from 'date-fns';
import { ja } from 'date-fns/locale';

interface AlertListProps {
  alerts: Alert[];
  onAcknowledge?: (alertId: string) => void;
}

const AlertList: React.FC<AlertListProps> = ({ alerts, onAcknowledge }) => {
  const getAlertIcon = (type: Alert['type']) => {
    switch (type) {
      case 'critical':
        return <ErrorIcon sx={{ color: '#d32f2f' }} />;
      case 'error':
        return <ErrorIcon sx={{ color: '#f44336' }} />;
      case 'warning':
        return <WarningIcon sx={{ color: '#ff9800' }} />;
      case 'info':
        return <InfoIcon sx={{ color: '#2196f3' }} />;
      default:
        return <InfoIcon sx={{ color: '#757575' }} />;
    }
  };

  const getAlertColor = (type: Alert['type']): "error" | "warning" | "info" | "success" | "default" => {
    switch (type) {
      case 'critical':
      case 'error':
        return 'error';
      case 'warning':
        return 'warning';
      case 'info':
        return 'info';
      default:
        return 'default';
    }
  };

  const formatTimestamp = (date: Date) => {
    return formatDistanceToNow(new Date(date), {
      addSuffix: true,
      locale: ja,
    });
  };

  if (alerts.length === 0) {
    return (
      <Paper 
        elevation={0} 
        sx={{ 
          p: 2, 
          textAlign: 'center',
          backgroundColor: 'rgba(76, 175, 80, 0.1)',
          borderRadius: 1
        }}
      >
        <SuccessIcon sx={{ color: '#4caf50', fontSize: 40, mb: 1 }} />
        <Typography>アクティブなアラートはありません</Typography>
      </Paper>
    );
  }

  return (
    <List sx={{ width: '100%', bgcolor: 'background.paper', borderRadius: 1 }}>
      {alerts.map((alert) => (
        <ListItem
          key={alert.id}
          divider
          sx={{
            bgcolor: alert.acknowledged ? 'action.hover' : 'inherit',
            opacity: alert.acknowledged ? 0.7 : 1,
            transition: 'all 0.2s ease',
            '&:hover': {
              bgcolor: 'action.selected',
            },
          }}
        >
          <ListItemIcon>{getAlertIcon(alert.type)}</ListItemIcon>
          <ListItemText
            primary={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="body1" component="span" sx={{ flex: 1 }}>
                  {alert.message}
                </Typography>
                <Chip
                  size="small"
                  label={alert.type.toUpperCase()}
                  color={getAlertColor(alert.type)}
                  sx={{ 
                    minWidth: 70,
                    fontWeight: 'bold',
                  }}
                />
              </Box>
            }
            secondary={
              <React.Fragment>
                <Typography variant="caption" component="div" sx={{ color: 'text.secondary' }}>
                  ソース: {alert.source}
                </Typography>
                <Typography variant="caption" component="div" sx={{ color: 'text.secondary' }}>
                  {formatTimestamp(alert.timestamp)}
                </Typography>
                {alert.acknowledged && (
                  <Typography variant="caption" component="div" sx={{ color: 'success.main' }}>
                    確認者: {alert.acknowledgedBy} ({formatTimestamp(alert.acknowledgedAt!)})
                  </Typography>
                )}
              </React.Fragment>
            }
          />
          <ListItemSecondaryAction>
            {!alert.acknowledged && onAcknowledge && (
              <Tooltip title="アラートを確認済みにする">
                <IconButton
                  edge="end"
                  aria-label="acknowledge"
                  onClick={() => onAcknowledge(alert.id)}
                  sx={{
                    color: 'primary.main',
                    '&:hover': {
                      bgcolor: 'primary.light',
                      color: 'primary.dark',
                    },
                  }}
                >
                  <DoneIcon />
                </IconButton>
              </Tooltip>
            )}
          </ListItemSecondaryAction>
        </ListItem>
      ))}
    </List>
  );
};

export default AlertList;