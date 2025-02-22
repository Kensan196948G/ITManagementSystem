import { IAppConfig } from '../types/config';

export const config: IAppConfig = {
  api: {
    // ...existing code...
  },
  auth: {
    requiredPermissions: {
      dashboard: ['IT-Ops-Dashboard-Users'],
      metrics: {
        read: ['IT-Ops-Metrics-Viewers'],
        write: ['IT-Ops-Metrics-Managers']
      },
      alerts: {
        read: ['IT-Ops-Alert-Readers'],
        write: ['IT-Ops-Alert-Managers']
      },
      security: {
        read: ['IT-Ops-Security-Viewers'],
        write: ['IT-Ops-Security-Managers']
      },
      users: {
        read: ['IT-Ops-User-Readers'],
        write: ['IT-Ops-User-Managers']
      }
    },
    securityGroupsPrefix: process.env.SECURITY_GROUPS_PREFIX || 'IT-Ops',
    defaultGroups: (process.env.REQUIRED_SECURITY_GROUPS || '').split(',')
  },
  // ...existing code...
};