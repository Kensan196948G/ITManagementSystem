import React, { useState } from 'react';
import {
  Box,
  Paper,
  Tabs,
  Tab,
  Typography,
  Alert,
  Container,
} from '@mui/material';
import ADUserManagement from './ADUserManagement';
import ADGroupManagement from './ADGroupManagement';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel: React.FC<TabPanelProps> = (props) => {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`ad-tabpanel-${index}`}
      aria-labelledby={`ad-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
};

const ADManagement: React.FC = () => {
  const [currentTab, setCurrentTab] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setCurrentTab(newValue);
    setError(null);
  };

  const handleError = (errorMessage: string) => {
    setError(errorMessage);
  };

  return (
    <Container maxWidth="xl">
      <Box sx={{ mt: 4, mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Active Directory 管理
        </Typography>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        <Paper sx={{ width: '100%', mt: 3 }}>
          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tabs
              value={currentTab}
              onChange={handleTabChange}
              aria-label="AD management tabs"
            >
              <Tab label="ユーザー管理" id="ad-tab-0" />
              <Tab label="グループ管理" id="ad-tab-1" />
            </Tabs>
          </Box>
          <TabPanel value={currentTab} index={0}>
            <ADUserManagement onError={handleError} />
          </TabPanel>
          <TabPanel value={currentTab} index={1}>
            <ADGroupManagement onError={handleError} />
          </TabPanel>
        </Paper>
      </Box>
    </Container>
  );
};

export default ADManagement;