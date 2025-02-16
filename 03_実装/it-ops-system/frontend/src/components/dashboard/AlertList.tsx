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
        return <ErrorIcon color="error" />;
      case 'error':
        return <ErrorIcon color="error" />;
      case 'warning':
        return <WarningIcon color="warning" />;
      case 'info':
        return <InfoIcon color="info" />;
      default:
        return <InfoIcon />;
    }
  };

  const getAlertColor = (type: Alert['type']) => {
    switch (type) {
      case 'critical':
        return 'error';
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

  return (
    <List>
      {alerts.length === 0 ? (
        <Box textAlign="center" py={2}>
          <Typography color="textSecondary">
            アクティブなアラートはありません
          </Typography>
        </Box>
      ) : (
        alerts.map((alert) => (
          <ListItem
            key={alert.id}
            divider
            sx={{
              bgcolor: alert.acknowledged ? 'action.hover' : 'inherit',
              opacity: alert.acknowledged ? 0.7 : 1,
            }}
          >
            <ListItemIcon>{getAlertIcon(alert.type)}</ListItemIcon>
            <ListItemText
              primary={
                <Typography variant="body1" component="div">
                  {alert.message}
                  <Chip
                    size="small"
                    label={alert.type.toUpperCase()}
                    color={getAlertColor(alert.type)}
                    sx={{ ml: 1 }}
                  />
                </Typography>
              }
              secondary={
                <React.Fragment>
                  <Typography variant="caption" component="div">
                    ソース: {alert.source}
                  </Typography>
                  <Typography variant="caption" component="div">
                    {formatTimestamp(alert.timestamp)}
                  </Typography>
                  {alert.acknowledged && (
                    <Typography variant="caption" component="div" color="textSecondary">
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
                  >
                    <DoneIcon />
                  </IconButton>
                </Tooltip>
              )}
            </ListItemSecondaryAction>
          </ListItem>
        ))
      )}
    </List>
  );
};

export default AlertList;