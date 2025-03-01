export interface IAppConfig {
  api: {
    port: number;
    corsOrigin: string;
  };
  auth: {
    requiredPermissions: {
      dashboard: string[];
      metrics: {
        read: string[];
        write: string[];
      };
      alerts: {
        read: string[];
        write: string[];
      };
      security: {
        read: string[];
        write: string[];
      };
      users: {
        read: string[];
        write: string[];
      };
    };
    securityGroupsPrefix: string;
    defaultGroups: string[];
  };
  monitoring: {
    checkInterval: number;
    alertThresholds: {
      cpu: number;
      memory: number;
      disk: number;
    };
  };
  security: {
    session: {
      expiresIn: string;
      maxConcurrentSessions: number;
    };
    rateLimit: {
      windowMs: number;
      max: number;
      message: string;
    };
  };
}