export type ServiceStatus = 'NotStarted' | 'InProgress' | 'Completed' | string;

export interface AssignedService {
  id: string;
  displayId: string;
  serviceName: string;
  status: ServiceStatus;
  patientId?: string;
  patientPrefix?: string;
  patientFirstName?: string;
  patientLastName?: string;
  patientGender?: string;
  patientAgeInYears?: number;
  patientMobileNo?: string;
  patientEmailId?: string;
  assignedToUserName?: string;
  visitId?: string;
  visitDisplayId?: string;
  scheduledStartDateTime?: string;
}

export interface AssignedServiceFilter {
  from: string;
  to: string;
  facilityId: string;
}

export interface UpdateServiceStatusRequest {
  serviceId: string;
  status: ServiceStatus;
}

export interface MedicalRecordUploadRequest {
  availedServiceId: string;
  name: string;
  recordDate: string;
  recordType: string;
  description?: string;
  fileUri: string;
  fileName: string;
  mimeType: string;
}
