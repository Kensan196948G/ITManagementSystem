import React, { useEffect, useState } from 'react';
import { 
  Container, Typography, Box, Paper, Grid, Card, CardContent, 
  CardHeader, Divider, Chip, List, ListItem, ListItemText,
  CircularProgress, Alert
} from '@mui/material';
import { graphPermissionApi } from '../services/graphPermissionApi';
import { authApi } from '../services/api';
import { GraphPermission, OperationsSummary } from '../types/graphPermission';

/**
 * IT運用情報ダッシュボード
 * 一般ユーザー向けのIT運用情報を表示するコンポーネント
 */
const GraphPermissionDashboard: React.FC = () => {
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<OperationsSummary | null>(null);
  const [userPermissions, setUserPermissions] = useState<GraphPermission[]>([]);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
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
          
          // グローバル管理者かどうかを確認
          const adminStatus = await authApi.isGlobalAdmin(currentUser.email);
          setIsAdmin(adminStatus);
          
          // ユーザーのパーミッション一覧を取得
          const permissions = await graphPermissionApi.getUserPermissions(currentUser.email);
          setUserPermissions(permissions);
        }
        
        // IT運用情報の概要を取得
        const operationsSummary = await graphPermissionApi.getOperationsSummary();
        if (operationsSummary) {
          setSummary(operationsSummary);
        }
        
        setLoading(false);
      } catch (err) {
        setError('データの読み込み中にエラーが発生しました');
        setLoading(false);
        console.error('Dashboard data loading error:', err);
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
        IT運用情報ダッシュボード
      </Typography>
      
      {/* 概要情報 */}
      <Paper elevation={3} sx={{ p: 3, mb: 4 }}>
        <Typography variant="h5" gutterBottom>
          Graph APIパーミッション概要
        </Typography>
        <Divider sx={{ mb: 2 }} />
        
        {summary ? (
          <Grid container spacing={3}>
            <Grid item xs={12} md={4}>
              <Card>
                <CardHeader title="パーミッション統計" />
                <CardContent>
                  <Typography variant="body1">
                    利用可能なパーミッション: {summary.totalAvailablePermissions}
                  </Typography>
                  <Typography variant="body1">
                    委任パーミッション: {summary.delegatedPermissions}
                  </Typography>
                  <Typography variant="body1">
                    アプリケーションパーミッション: {summary.applicationPermissions}
                  </Typography>
                  <Typography variant="caption" color="textSecondary">
                    最終更新: {new Date(summary.lastUpdated).toLocaleString()}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12} md={8}>
              <Card>
                <CardHeader title="一般的なパーミッション" />
                <CardContent>
                  <List>
                    {summary.commonPermissions.map((permission, index) => (
                      <ListItem key={index} divider={index < summary.commonPermissions.length - 1}>
                        <ListItemText
                          primary={
                            <Box display="flex" alignItems="center">
                              {permission.name}
                              <Chip 
                                label={permission.type} 
                                size="small" 
                                color={permission.type === 'Delegated' ? 'primary' : 'secondary'}
                                sx={{ ml: 1 }}
                              />
                            </Box>
                          }
                          secondary={permission.description}
                        />
                      </ListItem>
                    ))}
                  </List>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        ) : (
          <Typography>概要情報を取得できませんでした</Typography>
        )}
      </Paper>
      
      {/* ユーザーのパーミッション */}
      <Paper elevation={3} sx={{ p: 3, mb: 4 }}>
        <Typography variant="h5" gutterBottom>
          あなたのGraph APIパーミッション
        </Typography>
        <Divider sx={{ mb: 2 }} />
        
        {userPermissions.length > 0 ? (
          <List>
            {userPermissions.map((permission, index) => (
              <ListItem key={index} divider={index < userPermissions.length - 1}>
                <ListItemText
                  primary={
                    <Box display="flex" alignItems="center">
                      {permission.value}
                      <Chip 
                        label={permission.type} 
                        size="small" 
                        color={permission.type === 'Delegated' ? 'primary' : 'secondary'}
                        sx={{ ml: 1 }}
                      />
                    </Box>
                  }
                  secondary={permission.description || '説明なし'}
                />
              </ListItem>
            ))}
          </List>
        ) : (
          <Typography>
            現在、あなたには特別なGraph APIパーミッションが付与されていません。
          </Typography>
        )}
      </Paper>
      
      {/* 管理者向け情報 */}
      {isAdmin && (
        <Paper elevation={3} sx={{ p: 3, mb: 4 }}>
          <Typography variant="h5" gutterBottom>
            管理者向け情報
          </Typography>
          <Divider sx={{ mb: 2 }} />
          
          <Alert severity="info" sx={{ mb: 2 }}>
            グローバル管理者として、ユーザーのGraph APIパーミッションを管理できます。
            詳細な管理機能は「パーミッション管理」ページをご利用ください。
          </Alert>
          
          <Typography variant="body1">
            管理者としての追加機能:
          </Typography>
          <List>
            <ListItem>
              <ListItemText primary="ユーザーへのパーミッション付与" />
            </ListItem>
            <ListItem>
              <ListItemText primary="ユーザーからのパーミッション削除" />
            </ListItem>
            <ListItem>
              <ListItemText primary="パーミッション監査ログの閲覧" />
            </ListItem>
          </List>
        </Paper>
      )}
    </Container>
  );
};

export default GraphPermissionDashboard;