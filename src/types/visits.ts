import type { DateFilterOption } from '../utils/dateRangeFilter';

export type VisitType = 'OPD' | 'Home';

export type VisitStatus = 'Scheduled' | 'CheckedIn' | 'InProgress' | 'Completed' | 'NoShow' | 'Cancelled' | string;

export interface VisitSummary {
  id: string;
  displayId?: string;
  visitDisplayId?: string;
  patientId?: string;
  patientPrefix?: string;
  patientFirstName?: string;
  patientLastName?: string;
  patientGender?: string;
  patientAgeInYears?: number;
  patientMobileNo?: string;
  physicianId?: string;
  physicianPrefix?: string;
  physicianFirstName?: string;
  physicianLastName?: string;
  primaryClinicalServiceId?: string;
  primaryServiceName?: string;
  scheduledStartDateTime?: string;
  scheduledEndDateTime?: string;
  visitStatus?: VisitStatus;
  status?: VisitStatus;
  currentVisitType?: string;
  notes?: string;
  referredBy?: string;
}

export interface VisitDetail extends VisitSummary {
  onwardTravelTimeInMins?: number;
  returnTravelTimeInMins?: number;
  advanceAmount?: number;
  paymentMode?: string;
  discountInPercentage?: number;
  shouldGenerateBill?: boolean;
}

export interface VisitLinkedService {
  id: string;
  displayId?: string;
  serviceCode?: string;
  serviceName?: string;
  assignedToUserName?: string;
  scheduledStartDateTime?: string;
  scheduledEndDateTime?: string;
  status?: string;
  billingStatus?: string;
  isPrimary?: boolean;
}

export interface VisitBillingSummary {
  billId?: string;
  billDisplayId?: string;
  createdByUserName?: string;
  createdOn?: string;
  totalAmount?: number;
  paidAmount?: number;
  refundedAmount?: number;
  balanceAmount?: number;
}

export interface VisitFilterPayload {
  from: string;
  to: string;
  statusList: string[];
  physicianId?: string;
}

export interface VisitFilterPreference {
  option: DateFilterOption;
  fromDate: string;
  toDate: string;
}

export interface VisitCreatePayload {
  patientId: string;
  physicianId: string;
  scheduledStartDateTime: string;
  scheduledEndDateTime: string;
  notes: string;
  clinicalServiceId: string;
  facilityId: string;
  visitType: VisitType;
  onwardTravelTimeInMins: number;
  returnTravelTimeInMins: number;
  referredBy: string;
  advanceAmount: number;
  paymentMode: string | null;
  shouldGenerateBill: boolean;
  discountInPercentage: number;
}

export interface PhysicianOption {
  id: string;
  salutation?: string;
  firstName?: string;
  lastName?: string;
  suffix?: string;
}

export interface ClinicalServiceOption {
  id: string;
  name?: string;
  fees?: number;
  durationInMins?: number;
}

export interface PatientOption {
  id: string;
  prefix?: string;
  firstName?: string;
  lastName?: string;
  gender?: string;
  ageInYears?: number;
  mobileNo?: string;
  mrn?: string;
}

export interface AvailableSlot {
  startsAtIsoUtc: string;
  endsAtIsoUtc: string;
}

export interface PhysicianScheduleItem {
  id: string;
  title: string;
  startsAtIsoUtc: string;
  endsAtIsoUtc: string;
  onwardTravelTimeInMins?: number;
  returnTravelTimeInMins?: number;
}
