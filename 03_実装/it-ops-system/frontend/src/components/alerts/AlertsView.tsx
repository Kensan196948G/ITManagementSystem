import React, { useState, useCallback } from 'react';
import {
  Card,
  CardHeader,
  CardContent,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Chip,
  Box,
  TextField,
} from '@mui/material';
import {
  Error as ErrorIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  CheckCircle as CheckCircleIcon,
  Visibility as ViewIcon,
} from '@mui/icons-material';
import { Alert as AlertType } from 'types/api';
import { alertsApi } from 'services/api';

interface AlertsViewProps {
  alerts: AlertType[];
  onAcknowledge: (alertId: string) => void;
}

const getAlertIcon = (type: AlertType['type']) => {
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
      return <CheckCircleIcon color="success" />;
  }
};

const getAlertColor = (type: AlertType['type']) => {
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
      return 'success';
  }
};

export const AlertsView: React.FC<AlertsViewProps> = ({ alerts, onAcknowledge }) => {
  const [selectedAlert, setSelectedAlert] = useState<AlertType | null>(null);
  const [comment, setComment] = useState('');

  const handleOpenDialog = (alert: AlertType) => {
    setSelectedAlert(alert);
    setComment('');
  };

  const handleCloseDialog = () => {
    setSelectedAlert(null);
    setComment('');
  };

  const handleAcknowledge = useCallback(async () => {
    if (!selectedAlert) return;

    try {
      await alertsApi.acknowledgeAlert(selectedAlert.id);
      onAcknowledge(selectedAlert.id);
      handleCloseDialog();
    } catch (error) {
      console.error('Failed to acknowledge alert:', error);
    }
  }, [selectedAlert, onAcknowledge]);

  return (
    <>
      <Card>
        <CardHeader 
          title="システムアラート" 
          action={
            <Box display="flex" alignItems="center">
              <Chip 
                label={`未確認: ${alerts.filter(a => !a.acknowledged).length}`}
                color={alerts.some(a => a.type === 'critical' && !a.acknowledged) ? 'error' : 'default'}
                sx={{ mr: 1 }}
              />
              <Chip 
                label={`合計: ${alerts.length}`}
                color="default"
              />
            </Box>
          }
        />
        <CardContent>
          <List>
            {alerts.map((alert) => (
              <ListItem
                key={alert.id}
                sx={{
                  bgcolor: alert.acknowledged ? 'transparent' : 'action.hover',
                  borderRadius: 1,
                  mb: 1,
                }}
                secondaryAction={
                  <IconButton edge="end" onClick={() => handleOpenDialog(alert)}>
                    <ViewIcon />
                  </IconButton>
                }
              >
                <ListItemIcon>
                  {getAlertIcon(alert.type)}
                </ListItemIcon>
                <ListItemText
                  primary={
                    <Box display="flex" alignItems="center" gap={1}>
                      <Typography variant="body1">{alert.message}</Typography>
                      <Chip
                        label={alert.type}
                        size="small"
                        color={getAlertColor(alert.type) as any}
                      />
                    </Box>
                  }
                  secondary={
                    <Box display="flex" alignItems="center" gap={1}>
                      <Typography variant="body2" color="text.secondary">
                        {new Date(alert.timestamp).toLocaleString()}
                      </Typography>
                      {!alert.acknowledged && (
                        <Chip label="未確認" size="small" color="warning" />
                      )}
                    </Box>
                  }
                />
              </ListItem>
            ))}
          </List>
        </CardContent>
      </Card>

      <Dialog
        open={!!selectedAlert}
        onClose={handleCloseDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>アラート詳細</DialogTitle>
        <DialogContent>
          {selectedAlert && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle1" gutterBottom>
                種類: 
                <Chip
                  label={selectedAlert.type}
                  size="small"
                  color={getAlertColor(selectedAlert.type) as any}
                  sx={{ ml: 1 }}
                />
              </Typography>
              <Typography variant="body1" gutterBottom>
                {selectedAlert.message}
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                発生時刻: {new Date(selectedAlert.timestamp).toLocaleString()}
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                ソース: {selectedAlert.source}
              </Typography>
              {!selectedAlert.acknowledged && (
                <TextField
                  fullWidth
                  label="確認コメント"
                  multiline
                  rows={3}
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  sx={{ mt: 2 }}
                />
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>閉じる</Button>
          {selectedAlert && !selectedAlert.acknowledged && (
            <Button
              onClick={handleAcknowledge}
              variant="contained"
              color="primary"
              disabled={!comment.trim()}
            >
              確認
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </>
  );
};