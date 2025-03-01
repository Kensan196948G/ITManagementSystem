import React, { FC } from 'react';
import { Container, Typography } from '@mui/material';

interface SecurityProps {
  editMode?: boolean;
}

const Security: FC<SecurityProps> = ({ editMode = false }) => {
  return (
    <Container>
      <Typography variant="h4" component="h1" gutterBottom>
        {editMode ? 'セキュリティ設定の編集' : 'セキュリティ設定'}
      </Typography>
      <Typography variant="body1">
        セキュリティ設定ページです。ここではセキュリティ関連の設定を管理できます。
      </Typography>
    </Container>
  );
};

export default Security;