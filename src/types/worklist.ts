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
  createdOn?: string;
  referredBy?: string;
  assignedToMobileNo?: string;
  assignedToEmailId?: string;
  patientMRN?: string;
  patientPhoto?: string;
  prescriptions?: TaskDetailRecord[];
  clinicalNotes?: TaskDetailRecord[];
  medicalRecords?: TaskDetailRecord[];
  drawings?: TaskDetailRecord[];
  records?: TaskDetailRecord[];
}

export type TaskDetailRecordType = 'prescription' | 'clinicalnote' | 'medicalRecord' | 'drawing' | 'Drawing';

export interface TaskDetailRecord {
  id: string;
  displayId?: string;
  name?: string;
  status?: string;
  recordType?: string;
  noteType?: string;
  prescriptionType?: string;
  sourceType?: TaskDetailRecordType | string;
  createdByUserName?: string;
  lastModifiedByUserName?: string;
  createdOn?: string;
  lastModifiedOn?: string;
  dateOfUpload?: string;
  recordDateTime?: string;
  diagramId?: string;
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
  /** Real file handle, populated on web only. Native uploads stream from fileUri. */
  file?: Blob;
}
