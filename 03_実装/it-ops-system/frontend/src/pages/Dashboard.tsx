import React from 'react';
import { Box, Container, Paper, Grid } from '@mui/material';
import DashboardIcon from '@mui/icons-material/Dashboard';
import SystemDashboard from '../components/dashboard/Dashboard';

const Dashboard = () => {
  return (
    <Container maxWidth="xl">
      <Box sx={{ my: 4 }}>
        <Paper
          elevation={3}
          sx={{
            p: 3,
            background: 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)',
            color: 'white'
          }}
        >
          <Grid container alignItems="center" spacing={2}>
            <Grid item>
              <DashboardIcon sx={{ fontSize: 40 }} />
            </Grid>
            <Grid item>
              <Box>
                <h1 style={{ margin: 0, fontSize: '2rem' }}>IT運用システム ダッシュボード</h1>
                <p style={{ margin: '0.5rem 0 0 0', opacity: 0.9 }}>システムの状態をリアルタイムで監視</p>
              </Box>
            </Grid>
          </Grid>
        </Paper>
      </Box>
      <SystemDashboard />
    </Container>
  );
};

export default Dashboard;