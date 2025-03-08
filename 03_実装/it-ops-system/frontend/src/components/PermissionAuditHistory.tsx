import React, { useEffect, useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Paper,
  Typography,
  Box,
  TextField,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers';
import { PermissionAuditRecord } from '../../../backend/src/services/permissionAuditService';

interface PermissionAuditHistoryProps {
  onReview?: (recordId: number, approved: boolean, comments: string) => Promise<void>;
}

export const PermissionAuditHistory: React.FC<PermissionAuditHistoryProps> = ({ onReview }) => {
  const [records, setRecords] = useState<PermissionAuditRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [selectedRecord, setSelectedRecord] = useState<PermissionAuditRecord | null>(null);
  const [reviewComment, setReviewComment] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateDates = () => {
    const newErrors: Record<string, string> = {};
    
    if (startDate && endDate && startDate > endDate) {
      newErrors.dateRange = '開始日は終了日より前の日付を指定してください';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const fetchRecords = async () => {
    if (!validateDates()) {
      return;
    }

    try {
      setLoading(true);
      const response = await fetch('/api/permission-audit/records', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          startDate: startDate?.toISOString(),
          endDate: endDate?.toISOString(),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        if (errorData.details) {
          // バリデーションエラーの詳細を表示
          const validationErrors: Record<string, string> = {};
          errorData.details.forEach((detail: { field: string; message: string }) => {
            validationErrors[detail.field] = detail.message;
          });
          setErrors(validationErrors);
        } else {
          throw new Error(errorData.error || '権限変更履歴の取得に失敗しました');
        }
        return;
      }

      const data = await response.json();
      setRecords(data);
      setErrors({});
    } catch (err) {
      setError(err instanceof Error ? err.message : '権限変更履歴の取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, [startDate, endDate]);

  const handleReview = async (approved: boolean) => {
    if (!selectedRecord?.id || !onReview) return;

    if (!reviewComment.trim()) {
      setErrors({ review: 'コメントを入力してください' });
      return;
    }

    try {
      await onReview(selectedRecord.id, approved, reviewComment.trim());
      setSelectedRecord(null);
      setReviewComment('');
      setErrors({});
      fetchRecords(); // 履歴を更新
    } catch (err) {
      const error = err as Error;
      if (error.message.includes('権限がありません')) {
        setError('レビューを行う権限がありません');
      } else {
        setError(error.message || 'レビューの保存に失敗しました');
      }
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        権限変更履歴
      </Typography>

      <Box sx={{ mb: 3, display: 'flex', gap: 2, flexDirection: 'column' }}>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <DatePicker
            label="開始日"
            value={startDate}
            onChange={(date) => {
              setStartDate(date);
              setErrors({});
            }}
            slotProps={{
              textField: {
                error: !!errors.dateRange,
                helperText: errors.dateRange
              }
            }}
          />
          <DatePicker
            label="終了日"
            value={endDate}
            onChange={(date) => {
              setEndDate(date);
              setErrors({});
            }}
            slotProps={{
              textField: {
                error: !!errors.dateRange
              }
            }}
          />
        </Box>
      </Box>

      <Paper sx={{ width: '100%', overflow: 'hidden' }}>
        <Table stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell>日時</TableCell>
              <TableCell>変更者</TableCell>
              <TableCell>対象者</TableCell>
              <TableCell>アクション</TableCell>
              <TableCell>リソース</TableCell>
              <TableCell>理由</TableCell>
              <TableCell>操作</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {records.map((record) => (
              <TableRow key={record.id}>
                <TableCell>{new Date(record.timestamp).toLocaleString()}</TableCell>
                <TableCell>{record.actorEmail}</TableCell>
                <TableCell>{record.targetEmail}</TableCell>
                <TableCell>{record.action}</TableCell>
                <TableCell>{`${record.resourceType}/${record.resourceName}`}</TableCell>
                <TableCell>{record.reason}</TableCell>
                <TableCell>
                  {onReview && (
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={() => setSelectedRecord(record)}
                    >
                      レビュー
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>

      <Dialog open={!!selectedRecord} onClose={() => {
        setSelectedRecord(null);
        setReviewComment('');
        setErrors({});
      }}>
        <DialogTitle>権限変更レビュー</DialogTitle>
        <DialogContent>
          <Typography variant="body1" gutterBottom>
            {selectedRecord?.targetEmail}への権限変更をレビューします。
          </Typography>
          <TextField
            fullWidth
            multiline
            rows={4}
            label="コメント"
            value={reviewComment}
            onChange={(e) => {
              setReviewComment(e.target.value);
              if (errors.review) {
                setErrors({});
              }
            }}
            error={!!errors.review}
            helperText={errors.review}
            margin="normal"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setSelectedRecord(null);
            setReviewComment('');
            setErrors({});
          }}>
            キャンセル
          </Button>
          <Button
            onClick={() => handleReview(false)}
            color="error"
            variant="contained"
            disabled={!!Object.keys(errors).length}
          >
            却下
          </Button>
          <Button
            onClick={() => handleReview(true)}
            color="primary"
            variant="contained"
            disabled={!!Object.keys(errors).length}
          >
            承認
          </Button>
        </DialogActions>
      </Dialog>

      {error && (
        <Box sx={{ mt: 2 }}>
          <Typography color="error">{error}</Typography>
        </Box>
      )}
    </Box>
  );
};