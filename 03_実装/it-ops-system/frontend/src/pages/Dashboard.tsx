import React from 'react';
import { Box, Typography, Container } from '@mui/material';

const Dashboard = () => {
  return (
    <Container maxWidth="lg">
      <Box sx={{ my: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          IT運用システム ダッシュボード
        </Typography>
        <Typography variant="body1">
          ようこそ、IT運用システムへ
        </Typography>
      </Box>
    </Container>
  );
};

export default Dashboard;