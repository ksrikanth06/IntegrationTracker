export type ProjectOps = 'MOBILITY' | 'ERP' | 'FREIGHT';

export type Priority = 'P1' | 'P2' | 'P3' | 'P4';

export interface Interface {
  InterfaceID: string;
  InterfaceName: string;
  DataObject: string;
  Description: string;
  PackageName: string;
  InterfacePriority: Priority | string;
  InterfaceFrequency: string;
  SourceApplication: string;
  SourceProtocol: string;
  TargetApplication: string;
  TargetProtocol: string;
  CreatedDate: string | null;
  CreatedBy: string | null;
  ModifiedBy: string | null;
  ModifiedDate: string | null;
  IsActive: number;
  ProjectOps: ProjectOps | string;
}

export interface Log {
  ID: string;
  InterfaceID: string;
  TransactionID: string;
  EventType: string;
  ErrorType: string;
  ServiceName: string;
  LogMessage: string;
  ServerName: string;
  CreatedDate: string;
  DisplayOrder: string;
  IsAutoRetry: string;
  RequestPayload: string;
  ResponsePayload: string;
  ErrorPayload: string;
  CreatedBy: string;
  ModifiedBy: string;
  ModifiedDate: string;
  IsActive: string;
}

export interface User {
  username: string;
  displayName: string;
  loggedInAt: string;
}
