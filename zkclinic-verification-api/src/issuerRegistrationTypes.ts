export type IssuerRegistrationStatus =
  | "pending_verification"
  | "api_verified"
  | "pending_admin"
  | "admin_approved"
  | "rejected";

export type IssuerRegistration = {
  registrationId: string;
  doctorPubKeyHex: string;
  licenseHash: string;
  doctorId: string;
  regdNoValue: string;
  imrRecordText?: string;
  certificateOcrText?: string;
  ocrNameHint?: string;
  ocrSmcHint?: string;
  status: IssuerRegistrationStatus;
  verificationPayloadHash?: string;
  reviewId?: string;
  reasons?: string[];
  confidence?: number;
  createdAt: number;
  updatedAt: number;
};
