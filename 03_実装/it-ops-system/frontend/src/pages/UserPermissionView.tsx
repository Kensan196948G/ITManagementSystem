import React, { useState, useEffect } from 'react';
import {
  Container, Typography, Box, Paper, Grid, Card, CardContent,
  Divider, Chip, List, ListItem, ListItemText, CircularProgress,
  Alert, Table, TableBody, TableCell, TableContainer, TableHead, TableRow
} from '@mui/material';
import { graphPermissionApi } from '../services/graphPermissionApi';
import { authApi } from '../services/api';
import { GraphPermission, PermissionAuditLog } from '../types/graphPermission';

/**
 * 自分のパーミッション一覧表示画面
 * 一般ユーザーが自分自身のGraph APIパーミッションを確認するコンポーネント
 */
const UserPermissionView: React.FC = () => {
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [userPermissions, setUserPermissions] = useState<GraphPermission[]>([]);
  const [auditLogs, setAuditLogs] = useState<PermissionAuditLog[]>([]);
  const [currentUserEmail, setCurrentUserEmail] = useState<string>('');

  // データの読み込み
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // 現在のユーザー情報を取得
        const currentUser = await authApi.getCurrentUser();
        if (currentUser && currentUser.email) {
          setCurrentUserEmail(currentUser.email);
          
          // ユーザーのパーミッション一覧を取得
          const permissions = await graphPermissionApi.getUserPermissions(currentUser.email);
          setUserPermissions(permissions);
          
          // 自分に関連する監査ログを取得
          const logs = await graphPermissionApi.getAuditLogs(currentUser.email);
          setAuditLogs(logs);
        } else {
          setError('ユーザー情報を取得できませんでした');
        }
        
        setLoading(false);
      } catch (err) {
        setError('データの読み込み中にエラーが発生しました');
        setLoading(false);
        console.error('Permission view data loading error:', err);
      }
    };
    
    fetchData();
  }, []);

  // ローディング中の表示
  if (loading) {
    return (
      <Container>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  // エラー表示
  if (error) {
    return (
      <Container>
        <Alert severity="error" sx={{ mt: 3 }}>
          {error}
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg">
      <Typography variant="h4" component="h1" gutterBottom sx={{ mt: 3, mb: 4 }}>
        あなたのパーミッション情報
      </Typography>
      
      {/* ユーザー情報 */}
      <Paper elevation={3} sx={{ p: 3, mb: 4 }}>
        <Typography variant="h5" gutterBottom>
          ユーザー情報
        </Typography>
        <Divider sx={{ mb: 2 }} />
        
        <Typography variant="body1">
          メールアドレス: {currentUserEmail}
        </Typography>
      </Paper>
      
      {/* パーミッション一覧 */}
      <Paper elevation={3} sx={{ p: 3, mb: 4 }}>
        <Typography variant="h5" gutterBottom>
          Graph APIパーミッション
        </Typography>
        <Divider sx={{ mb: 2 }} />
        
        {userPermissions.length > 0 ? (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>パーミッション</TableCell>
                  <TableCell>タイプ</TableCell>
                  <TableCell>説明</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {userPermissions.map((permission, index) => (
                  <TableRow key={index}>
                    <TableCell>{permission.value}</TableCell>
                    <TableCell>
                      <Chip
                        label={permission.type}
                        color={permission.type === 'Delegated' ? 'primary' : 'secondary'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>{permission.description || '説明なし'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        ) : (
          <Alert severity="info">
            現在、あなたには特別なGraph APIパーミッションが付与されていません。
          </Alert>
        )}
      </Paper>
      
      {/* パーミッション変更履歴 */}
      <Paper elevation={3} sx={{ p: 3, mb: 4 }}>
        <Typography variant="h5" gutterBottom>
          パーミッション変更履歴
        </Typography>
        <Divider sx={{ mb: 2 }} />
        
        {auditLogs.length > 0 ? (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>日時</TableCell>
                  <TableCell>操作</TableCell>
                  <TableCell>パーミッション</TableCell>
                  <TableCell>操作者</TableCell>
                  <TableCell>結果</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {auditLogs.map((log, index) => (
                  <TableRow key={index}>
                    <TableCell>{new Date(log.timestamp).toLocaleString()}</TableCell>
                    <TableCell>
                      <Chip
                        label={
                          log.action === 'grant' ? '付与' :
                          log.action === 'revoke' ? '削除' : '確認'
                        }
                        color={
                          log.action === 'grant' ? 'success' :
                          log.action === 'revoke' ? 'error' : 'info'
                        }
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      {log.permission ? (
                        <>
                          {log.permission}
                          {log.permissionType && (
                            <Chip
                              label={log.permissionType}
                              size="small"
                              sx={{ ml: 1 }}
                            />
                          )}
                        </>
                      ) : (
                        '全パーミッション'
                      )}
                    </TableCell>
                    <TableCell>{log.operatorEmail}</TableCell>
                    <TableCell>
                      <Chip
                        label={log.success ? '成功' : '失敗'}
                        color={log.success ? 'success' : 'error'}
                        size="small"
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        ) : (
          <Alert severity="info">
            パーミッション変更履歴はありません。
          </Alert>
        )}
      </Paper>
      
      {/* パーミッションの説明 */}
      <Paper elevation={3} sx={{ p: 3, mb: 4 }}>
        <Typography variant="h5" gutterBottom>
          パーミッションについて
        </Typography>
        <Divider sx={{ mb: 2 }} />
        
        <Typography variant="body1" paragraph>
          Graph APIパーミッションは、Microsoft 365サービスへのアクセス権を制御します。
          パーミッションには以下の2種類があります：
        </Typography>
        
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="h6" color="primary" gutterBottom>
                  委任パーミッション (Delegated)
                </Typography>
                <Typography variant="body2">
                  アプリケーションがサインインしているユーザーの代わりにAPIにアクセスする場合に使用されます。
                  ユーザーの権限の範囲内でのみ操作が許可されます。
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="h6" color="secondary" gutterBottom>
                  アプリケーションパーミッション (Application)
                </Typography>
                <Typography variant="body2">
                  アプリケーションがユーザーなしでバックグラウンドで動作する場合に使用されます。
                  通常、管理者の同意が必要で、より強力な権限を持ちます。
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
        
        <Box mt={3}>
          <Typography variant="body2" color="textSecondary">
            パーミッションの変更が必要な場合は、システム管理者にお問い合わせください。
          </Typography>
        </Box>
      </Paper>
    </Container>
  );
};

export default UserPermissionView;