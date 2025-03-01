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
import { M365LicenseManagement } from './M365LicenseManagement';
import { M365UserManagement } from './M365UserManagement';

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
      id={`m365-tabpanel-${index}`}
      aria-labelledby={`m365-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
};

const M365Management: React.FC = () => {
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
          Microsoft 365 管理
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
              aria-label="M365 management tabs"
            >
              <Tab label="ライセンス管理" id="m365-tab-0" />
              <Tab label="ユーザー管理" id="m365-tab-1" />
            </Tabs>
          </Box>
          <TabPanel value={currentTab} index={0}>
            <M365LicenseManagement onError={handleError} />
          </TabPanel>
          <TabPanel value={currentTab} index={1}>
            <M365UserManagement onError={handleError} />
          </TabPanel>
        </Paper>
      </Box>
    </Container>
  );
};

export default M365Management;