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

export interface User {
  username: string;
  displayName: string;
  loggedInAt: string;
}
