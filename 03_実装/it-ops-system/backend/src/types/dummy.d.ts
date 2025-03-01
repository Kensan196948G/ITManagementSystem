declare module '../types/config' {
  export interface IAppConfig {
    api: {
      // Define necessary configuration properties
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
  }
}

declare module '../types/auth' {
  export interface AuthenticatedRequest {
    user?: any;
  }
}

declare module '../utils/tokenUtils' {
  export function validateToken(token: string): boolean;
}

declare module '../types/system' {
  export interface AuthUser {
    id: string;
    username: string;
    roles: string[];
  }
  export interface TokenBlacklist {
    token: string;
    expiresAt: Date;
    userId: string;
    reason: string;
  }
  export interface Alert {
    id: string;
    type: string;
    source: string;
    message: string;
    timestamp: Date;
    acknowledged: boolean;
    metadata?: Record<string, any>;
  }
}

declare module '../metrics/prometheus' {
  export const Prometheus: any;
}
