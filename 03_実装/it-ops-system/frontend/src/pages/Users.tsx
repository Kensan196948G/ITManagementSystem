import React, { FC } from 'react';
import { Container, Typography } from '@mui/material';

interface UsersProps {
  editMode?: boolean;
}

const Users: FC<UsersProps> = ({ editMode = false }) => {
  return (
    <Container>
      <Typography variant="h4" component="h1" gutterBottom>
        {editMode ? 'ユーザー管理の編集' : 'ユーザー管理'}
      </Typography>
      <Typography variant="body1">
        ユーザー管理ページです。ここではユーザー情報を管理できます。
      </Typography>
    </Container>
  );
};

export default Users;