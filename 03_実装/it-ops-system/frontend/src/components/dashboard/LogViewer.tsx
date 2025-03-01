import React, { useState, useMemo } from 'react';
import {
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  TextField,
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  SelectChangeEvent,
  Typography,
  InputAdornment,
} from '@mui/material';
import {
  Error as ErrorIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  BugReport as DebugIcon,
  Search as SearchIcon,
  FilterList as FilterIcon,
} from '@mui/icons-material';
import { LogEntry } from '../../types/api';
import { formatDistance } from 'date-fns';
import { ja } from 'date-fns/locale';

interface LogViewerProps {
  logs: LogEntry[];
}

const LogViewer: React.FC<LogViewerProps> = ({ logs }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [levelFilter, setLevelFilter] = useState<string>('all');
  const [sourceFilter, setSourceFilter] = useState<string>('all');

  const getLogLevelIcon = (level: LogEntry['level']) => {
    switch (level) {
      case 'error':
        return <ErrorIcon sx={{ color: '#f44336' }} fontSize="small" />;
      case 'warning':
        return <WarningIcon sx={{ color: '#ff9800' }} fontSize="small" />;
      case 'info':
        return <InfoIcon sx={{ color: '#2196f3' }} fontSize="small" />;
      case 'debug':
        return <DebugIcon sx={{ color: '#757575' }} fontSize="small" />;
      default:
        return <InfoIcon sx={{ color: '#757575' }} fontSize="small" />;
    }
  };

  const getLogLevelColor = (level: LogEntry['level']) => {
    switch (level) {
      case 'error':
        return 'error';
      case 'warning':
        return 'warning';
      case 'info':
        return 'info';
      case 'debug':
        return 'default';
      default:
        return 'default';
    }
  };

  const formatTimestamp = (date: Date) => {
    return formatDistance(new Date(date), new Date(), {
      addSuffix: true,
      locale: ja,
    });
  };

  const availableSources = useMemo(() => {
    const sources = new Set(logs.map(log => log.source));
    return Array.from(sources);
  }, [logs]);

  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      const matchesSearch = 
        log.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.source.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesLevel = levelFilter === 'all' || log.level === levelFilter;
      const matchesSource = sourceFilter === 'all' || log.source === sourceFilter;
      return matchesSearch && matchesLevel && matchesSource;
    });
  }, [logs, searchTerm, levelFilter, sourceFilter]);

  return (
    <Box>
      <Box sx={{ mb: 2, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        <TextField
          size="small"
          placeholder="ログを検索..."
          variant="outlined"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          sx={{ flexGrow: 1, minWidth: '200px' }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ color: 'action.active' }} />
              </InputAdornment>
            ),
          }}
        />
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel>ログレベル</InputLabel>
          <Select
            value={levelFilter}
            label="ログレベル"
            onChange={(e: SelectChangeEvent) => setLevelFilter(e.target.value)}
            startAdornment={
              <FilterIcon sx={{ color: 'action.active', mr: 1 }} />
            }
          >
            <MenuItem value="all">全て</MenuItem>
            <MenuItem value="error">エラー</MenuItem>
            <MenuItem value="warning">警告</MenuItem>
            <MenuItem value="info">情報</MenuItem>
            <MenuItem value="debug">デバッグ</MenuItem>
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel>ソース</InputLabel>
          <Select
            value={sourceFilter}
            label="ソース"
            onChange={(e: SelectChangeEvent) => setSourceFilter(e.target.value)}
            startAdornment={
              <FilterIcon sx={{ color: 'action.active', mr: 1 }} />
            }
          >
            <MenuItem value="all">全て</MenuItem>
            {availableSources.map(source => (
              <MenuItem key={source} value={source}>{source}</MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      <TableContainer
        component={Paper}
        sx={{
          maxHeight: 400,
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          '& .MuiTableCell-root': {
            borderColor: 'rgba(224, 224, 224, 0.5)',
          },
        }}
      >
        <Table stickyHeader size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 'bold', backgroundColor: '#f5f5f5' }}>レベル</TableCell>
              <TableCell sx={{ fontWeight: 'bold', backgroundColor: '#f5f5f5' }}>タイムスタンプ</TableCell>
              <TableCell sx={{ fontWeight: 'bold', backgroundColor: '#f5f5f5' }}>ソース</TableCell>
              <TableCell sx={{ fontWeight: 'bold', backgroundColor: '#f5f5f5' }}>メッセージ</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredLogs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4}>
                  <Box textAlign="center" py={2}>
                    <Typography color="textSecondary">
                      ログが見つかりません
                    </Typography>
                  </Box>
                </TableCell>
              </TableRow>
            ) : (
              filteredLogs.map((log) => (
                <TableRow
                  key={log.id}
                  hover
                  sx={{
                    '&:hover': {
                      backgroundColor: 'rgba(0, 0, 0, 0.04)',
                    },
                  }}
                >
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {getLogLevelIcon(log.level)}
                      <Chip
                        label={log.level.toUpperCase()}
                        size="small"
                        color={getLogLevelColor(log.level)}
                        sx={{ minWidth: 70 }}
                      />
                    </Box>
                  </TableCell>
                  <TableCell sx={{ whiteSpace: 'nowrap' }}>{formatTimestamp(log.timestamp)}</TableCell>
                  <TableCell>{log.source}</TableCell>
                  <TableCell sx={{ maxWidth: '400px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {log.message}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default LogViewer;