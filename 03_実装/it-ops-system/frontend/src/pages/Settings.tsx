import React, { FC } from 'react';
import { Container, Typography } from '@mui/material';

interface SettingsProps {
  editMode?: boolean;
}

const Settings: FC<SettingsProps> = ({ editMode = false }) => {
  return (
    <Container>
      <Typography variant="h4" component="h1" gutterBottom>
        {editMode ? 'システム設定の編集' : 'システム設定'}
      </Typography>
      <Typography variant="body1">
        システム設定ページです。ここではシステム全体の設定を管理できます。
      </Typography>
    </Container>
  );
};

export default Settings;