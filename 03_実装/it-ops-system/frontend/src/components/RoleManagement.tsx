import React, { useState, useEffect } from 'react';
import {
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Typography,
  Chip,
  Alert
} from '@mui/material';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';

interface RoleMapping {
  roleName: string;
  permissions: string[];
  description: string;
}

export const RoleManagement: React.FC = () => {
  const { user } = useAuth();
  const [roleMappings, setRoleMappings] = useState<RoleMapping[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRoleMappings = async () => {
      try {
        if (!user?.email) return;
        const response = await api.get('/auth/role-mappings');
        setRoleMappings(response.data);
      } catch (err) {
        setError('ロール情報の取得に失敗しました');
      }
    };

    fetchRoleMappings();
  }, [user]);

  if (error) {
    return <Alert severity="error">{error}</Alert>;
  }

  return (
    <Box sx={{ width: '100%' }}>
      <Typography variant="h6" sx={{ mb: 2 }}>権限マッピング</Typography>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>ロール名</TableCell>
              <TableCell>権限</TableCell>
              <TableCell>説明</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {roleMappings.map((role) => (
              <TableRow key={role.roleName}>
                <TableCell>{role.roleName}</TableCell>
                <TableCell>
                  {role.permissions.map((permission) => (
                    <Chip
                      key={permission}
                      label={permission}
                      size="small"
                      sx={{ m: 0.5 }}
                    />
                  ))}
                </TableCell>
                <TableCell>{role.description}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};