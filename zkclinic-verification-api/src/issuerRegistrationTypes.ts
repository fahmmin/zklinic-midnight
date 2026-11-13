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
  /** Hash proving a Didit identity check passed for this doctor key (no personal data). */
  identityAttestationHash?: string;
  status: IssuerRegistrationStatus;
  verificationPayloadHash?: string;
  reviewId?: string;
  reasons?: string[];
  confidence?: number;
  createdAt: number;
  updatedAt: number;
};
