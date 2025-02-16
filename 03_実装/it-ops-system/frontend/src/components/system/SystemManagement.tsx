import React, { useState } from 'react';
import {
  Box,
  Paper,
  Tabs,
  Tab,
  Typography,
  Container,
  Card,
  CardContent,
  Grid,
  Button,
} from '@mui/material';
import {
  GroupWork as GroupWorkIcon,
  Business as BusinessIcon,
} from '@mui/icons-material';
import ADManagement from './ActiveDirectory/ADManagement';
import M365Management from './Microsoft365/M365Management';

interface SystemSection {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  component: React.ReactNode;
}

const SystemManagement: React.FC = () => {
  const [selectedSection, setSelectedSection] = useState<string | null>(null);

  const sections: SystemSection[] = [
    {
      id: 'ad',
      title: 'Active Directory 管理',
      description: 'ユーザー、グループ、およびポリシーの管理',
      icon: <GroupWorkIcon fontSize="large" />,
      component: <ADManagement />,
    },
    {
      id: 'm365',
      title: 'Microsoft 365 管理',
      description: 'ライセンス、サービス、およびユーザー設定の管理',
      icon: <BusinessIcon fontSize="large" />,
      component: <M365Management />,
    },
  ];

  const handleSectionSelect = (sectionId: string) => {
    setSelectedSection(sectionId);
  };

  const handleBack = () => {
    setSelectedSection(null);
  };

  if (selectedSection) {
    const section = sections.find((s) => s.id === selectedSection);
    if (!section) return null;

    return (
      <Container maxWidth="xl">
        <Box sx={{ mt: 4, mb: 4 }}>
          <Box display="flex" alignItems="center" mb={4}>
            <Button
              variant="outlined"
              onClick={handleBack}
              sx={{ mr: 2 }}
            >
              戻る
            </Button>
            <Typography variant="h4" component="h1">
              {section.title}
            </Typography>
          </Box>
          {section.component}
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl">
      <Box sx={{ mt: 4, mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          システム管理
        </Typography>
        <Grid container spacing={3} sx={{ mt: 2 }}>
          {sections.map((section) => (
            <Grid item xs={12} md={6} key={section.id}>
              <Card
                sx={{
                  cursor: 'pointer',
                  '&:hover': {
                    boxShadow: 6,
                  },
                }}
                onClick={() => handleSectionSelect(section.id)}
              >
                <CardContent>
                  <Box
                    display="flex"
                    flexDirection="column"
                    alignItems="center"
                    textAlign="center"
                    p={3}
                  >
                    {section.icon}
                    <Typography variant="h5" component="h2" sx={{ mt: 2 }}>
                      {section.title}
                    </Typography>
                    <Typography
                      variant="body1"
                      color="text.secondary"
                      sx={{ mt: 1 }}
                    >
                      {section.description}
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Box>
    </Container>
  );
};

export default SystemManagement;