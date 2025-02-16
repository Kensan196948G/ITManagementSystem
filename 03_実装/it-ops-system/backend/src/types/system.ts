import { ADUser, ADGroup, M365License, M365User, M365Service, SystemError } from './custom';

// AD関連のDTO型定義
export interface ADUserCreateDto {
  samAccountName: string;
  displayName: string;
  email: string;
  department?: string;
  title?: string;
  password: string;
  enabled: boolean;
  groups: string[];
}

export interface ADUserUpdateDto {
  displayName?: string;
  email?: string;
  department?: string;
  title?: string;
  enabled?: boolean;
  groups?: string[];
}

export interface ADGroupCreateDto {
  name: string;
  description?: string;
  type: 'security' | 'distribution';
  scope: 'domainLocal' | 'global' | 'universal';
  members: string[];
}

export interface ADGroupUpdateDto {
  description?: string;
  type?: 'security' | 'distribution';
  scope?: 'domainLocal' | 'global' | 'universal';
  members?: string[];
}

// M365関連のDTO型定義
export interface M365UserCreateDto {
  displayName: string;
  email: string;
  password: string;
  licenses: string[];
  accountEnabled: boolean;
}

export interface M365UserUpdateDto {
  displayName?: string;
  licenses?: string[];
  accountEnabled?: boolean;
}

export interface M365LicenseCreateDto {
  name: string;
  skuId: string;
  totalQuantity: number;
  services: {
    id: string;
    name: string;
    status: 'enabled' | 'disabled';
  }[];
}

export interface M365LicenseUpdateDto {
  name?: string;
  totalQuantity?: number;
  services?: {
    id: string;
    status: 'enabled' | 'disabled';
  }[];
}

// 操作結果型定義
export interface ADOperationResult {
  success: boolean;
  message: string;
  data?: any;
}

export interface M365OperationResult {
  success: boolean;
  message: string;
  data?: any;
}

// サービス設定型定義
export interface ServiceToggleDto {
  enabled: boolean;
}

// 再エクスポート
export {
  ADUser,
  ADGroup,
  M365License,
  M365User,
  M365Service,
  SystemError
};