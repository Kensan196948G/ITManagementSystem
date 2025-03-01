import React, { FC } from 'react';
import { Container, Typography } from '@mui/material';

interface MetricsProps {
  editMode?: boolean;
}

const Metrics: FC<MetricsProps> = ({ editMode = false }) => {
  return (
    <Container>
      <Typography variant="h4" component="h1" gutterBottom>
        {editMode ? 'メトリクスの編集' : 'メトリクス'}
      </Typography>
      <Typography variant="body1">
        メトリクスページです。ここではシステムのメトリクスを確認できます。
      </Typography>
    </Container>
  );
};

export default Metrics;