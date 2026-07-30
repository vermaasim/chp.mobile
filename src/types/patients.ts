import type { DateFilterOption } from '../utils/dateRangeFilter';

export interface PatientSummary {
  id: string;
  mrn?: string;
  prefix?: string;
  firstName?: string;
  lastName?: string;
  gender?: string;
  ageInYears?: number;
  mobileNo?: string;
  emailId?: string;
  isActive?: boolean;
}

export interface PatientVisitSummary {
  id: string;
  displayId?: string;
  visitDisplayId?: string;
  physicianId?: string;
  physicianPrefix?: string;
  physicianFirstName?: string;
  physicianLastName?: string;
  primaryClinicalServiceId?: string;
  primaryServiceName?: string;
  scheduledStartDateTime?: string;
  scheduledEndDateTime?: string;
  visitStatus?: string;
  status?: string;
  currentVisitType?: string;
  notes?: string;
  referredBy?: string;
}

export interface PatientDetail extends PatientSummary {
  suffix?: string;
  dateOfBirth?: string;
  bloodGroup?: string;
  maritalStatus?: string;
  nationalIdType?: string;
  nationalId?: string;
  emergencyContactPerson?: string;
  emergencyContactRelationship?: string;
  emergencyContactPhoneNumber?: string;
  addressHouseNo?: string;
  addressStreet?: string;
  addressCity?: string;
  addressState?: string;
  addressPIN?: string;
  addressCountry?: string;
  photo?: string;
  visits: PatientVisitSummary[];
}

export interface PatientCreatePayload {
  facilityId: string;
  prefix: string;
  firstName: string;
  lastName: string;
  gender: string;
  dateOfBirth: string;
  mobileNo: string;
  emailId?: string | null;
  emergencyContactPerson?: string;
  emergencyContactRelationship?: string;
  emergencyContactPhoneNumber?: string;
  addressHouseNo?: string;
  addressStreet?: string;
  addressCity?: string;
  addressState?: string;
  addressPIN?: string;
  addressCountry?: string;
  nationalIdType?: string;
  nationalId?: string;
  suffix?: string;
  bloodGroup?: string;
  maritalStatus?: string;
  photo?: string;
}

export interface PatientFilterPreference {
  option: DateFilterOption;
  fromDate: string;
  toDate: string;
}