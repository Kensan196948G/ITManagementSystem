import React, { useState, useEffect } from 'react';
import { 
  Alert, 
  CircularProgress, 
  Container, 
  Typography, 
  Box, 
  Button,
  Tooltip 
} from '@mui/material';
import LockIcon from '@mui/icons-material/Lock';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import { useAuth } from '../contexts/AuthContext';
import { authApi } from '../services/api';
import { AuthorizationLevel, PermissionErrorMessages, GlobalAdminFeatures } from '../constants/permissions';

interface AuthorizedContentProps {
  // 表示に必要な権限レベル
  requiredAuthLevel?: AuthorizationLevel;
  // 必要なリソース権限
  requiredPermission?: string;
  // 表示する機能ID（GlobalAdminFeaturesでチェック）
  featureId?: string;
  // 子要素
  children: React.ReactNode;
  // 権限がない場合の代替コンテンツ（オプション）
  fallback?: React.ReactNode;
  // 権限エラー時にメッセージを表示するか
  showErrorMessage?: boolean;
}

/**
 * 権限に基づいてコンテンツの表示を制御するコンポーネント
 * ユーザーの権限レベルとリソースへのアクセス権を確認し、適切なコンテンツまたはエラーを表示
 */
export const AuthorizedContent: React.FC<AuthorizedContentProps> = ({ 
  requiredAuthLevel = AuthorizationLevel.AUTHENTICATED,
  requiredPermission,
  featureId,
  children,
  fallback,
  showErrorMessage = true
}) => {
  const { user, isLoading } = useAuth();
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [isGlobalAdmin, setIsGlobalAdmin] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState<boolean>(true);

  useEffect(() => {
    const checkAuthorization = async () => {
      if (!user?.email) {
        setHasPermission(false);
        setChecking(false);
        return;
      }

      try {
        // グローバル管理者かどうかを確認
        const rolesData = await authApi.getUserRoles(user.email);
        setIsGlobalAdmin(rolesData.isGlobalAdmin);
        
        // 権限レベルに基づくチェック
        let authorized = false;
        
        switch (requiredAuthLevel) {
          case AuthorizationLevel.GLOBAL_ADMIN_ONLY:
            authorized = rolesData.isGlobalAdmin;
            if (!authorized) {
              setError(PermissionErrorMessages.GLOBAL_ADMIN_REQUIRED);
            }
            break;
          
          case AuthorizationLevel.ADMIN_ROLE:
            // 管理者系のロールがあるかチェック（例: *:admin を含む）
            authorized = rolesData.isGlobalAdmin || 
              rolesData.roles.some(role => role.includes(':admin'));
            if (!authorized) {
              setError(PermissionErrorMessages.ROLE_REQUIRED('管理者'));
            }
            break;
          
          case AuthorizationLevel.USER_ROLE:
            // 特定の権限が必要な場合はチェック
            if (requiredPermission) {
              const permissionCheck = await authApi.checkPermission({
                userEmail: user.email,
                check: { resource: requiredPermission.split(':')[0], action: requiredPermission.split(':')[1] || 'read' }
              });
              authorized = permissionCheck;
              if (!authorized) {
                setError(PermissionErrorMessages.INSUFFICIENT_PERMISSION);
              }
            } else {
              authorized = true; // 特定の権限が指定されていない場合は許可
            }
            break;
          
          case AuthorizationLevel.AUTHENTICATED:
            authorized = true; // ログインしていれば表示可能
            break;
          
          default:
            authorized = false;
        }
        
        // 特定機能IDの場合、グローバル管理者のみアクセス可能
        if (featureId && GlobalAdminFeatures.includes(featureId)) {
          if (!rolesData.isGlobalAdmin) {
            authorized = false;
            setError(PermissionErrorMessages.GLOBAL_ADMIN_REQUIRED);
          }
        }
        
        setHasPermission(authorized);
      } catch (err) {
        console.error('権限チェックエラー:', err);
        setHasPermission(false);
        setError(PermissionErrorMessages.ACCESS_DENIED);
      } finally {
        setChecking(false);
      }
    };

    checkAuthorization();
  }, [user, requiredAuthLevel, requiredPermission, featureId]);

  // ローディング中
  if (isLoading || checking) {
    return (
      <Container sx={{ display: 'flex', justifyContent: 'center', mt: 2, mb: 2 }}>
        <CircularProgress size={24} />
      </Container>
    );
  }

  // 権限がない場合
  if (!hasPermission) {
    if (fallback) {
      return <>{fallback}</>;
    }

    if (showErrorMessage) {
      return (
        <Box sx={{ mt: 2, mb: 2 }}>
          <Alert 
            severity="warning" 
            icon={<LockIcon />}
            action={
              <Tooltip title="権限について問い合わせる場合は、IT管理者にお問い合わせください">
                <Button size="small" color="inherit">
                  <HelpOutlineIcon fontSize="small" />
                </Button>
              </Tooltip>
            }
          >
            <Typography variant="body1" fontWeight="medium">
              {error || PermissionErrorMessages.INSUFFICIENT_PERMISSION}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {isGlobalAdmin === false && featureId && GlobalAdminFeatures.includes(featureId) 
                ? 'この機能はMicrosoftアカウントのグローバル管理者のみがアクセスできます。' 
                : '必要な権限がない場合は、システム管理者にお問い合わせください。'}
            </Typography>
          </Alert>
        </Box>
      );
    }

    // メッセージを表示しない場合は何も表示しない
    return null;
  }

  // 権限があればコンテンツを表示
  return <>{children}</>;
};