import * as __compactRuntime from '@midnight-ntwrk/compact-runtime';
__compactRuntime.checkRuntimeVersion('0.21.0');

export var IssuerStatus;
(function (IssuerStatus) {
  IssuerStatus[IssuerStatus['None'] = 0] = 'None';
  IssuerStatus[IssuerStatus['Pending'] = 1] = 'Pending';
  IssuerStatus[IssuerStatus['Approved'] = 2] = 'Approved';
  IssuerStatus[IssuerStatus['Revoked'] = 3] = 'Revoked';
})(IssuerStatus || (IssuerStatus = {}));

export var TrialStatus;
(function (TrialStatus) {
  TrialStatus[TrialStatus['Open'] = 0] = 'Open';
  TrialStatus[TrialStatus['Closed'] = 1] = 'Closed';
  TrialStatus[TrialStatus['Full'] = 2] = 'Full';
})(TrialStatus || (TrialStatus = {}));

const _descriptor_0 = new __compactRuntime.CompactTypeBytes(32);

const _descriptor_1 = new __compactRuntime.CompactTypeUnsignedInteger(255n, 1);

const _descriptor_2 = new __compactRuntime.CompactTypeUnsignedInteger(4294967295n, 4);

class _EligibilityCriteria_0 {
  alignment() {
    return _descriptor_1.alignment().concat(_descriptor_1.alignment().concat(_descriptor_0.alignment().concat(_descriptor_0.alignment().concat(_descriptor_0.alignment().concat(_descriptor_2.alignment().concat(_descriptor_2.alignment()))))));
  }
  fromValue(value_0) {
    return {
      minAge: _descriptor_1.fromValue(value_0),
      maxAge: _descriptor_1.fromValue(value_0),
      requiredDiagnosis: _descriptor_0.fromValue(value_0),
      excludedDiagnosis: _descriptor_0.fromValue(value_0),
      labCode: _descriptor_0.fromValue(value_0),
      labMin: _descriptor_2.fromValue(value_0),
      labMax: _descriptor_2.fromValue(value_0)
    }
  }
  toValue(value_0) {
    return _descriptor_1.toValue(value_0.minAge).concat(_descriptor_1.toValue(value_0.maxAge).concat(_descriptor_0.toValue(value_0.requiredDiagnosis).concat(_descriptor_0.toValue(value_0.excludedDiagnosis).concat(_descriptor_0.toValue(value_0.labCode).concat(_descriptor_2.toValue(value_0.labMin).concat(_descriptor_2.toValue(value_0.labMax)))))));
  }
}

const _descriptor_3 = new _EligibilityCriteria_0();

const _descriptor_4 = __compactRuntime.CompactTypeBoolean;

class _ZswapCoinPublicKey_0 {
  alignment() {
    return _descriptor_0.alignment();
  }
  fromValue(value_0) {
    return {
      bytes: _descriptor_0.fromValue(value_0)
    }
  }
  toValue(value_0) {
    return _descriptor_0.toValue(value_0.bytes);
  }
}

const _descriptor_5 = new _ZswapCoinPublicKey_0();

const _descriptor_6 = new __compactRuntime.CompactTypeUnsignedInteger(18446744073709551615n, 8);

const _descriptor_7 = new __compactRuntime.CompactTypeEnum(2, 1);

class _TrialRecord_0 {
  alignment() {
    return _descriptor_5.alignment().concat(_descriptor_6.alignment().concat(_descriptor_6.alignment().concat(_descriptor_6.alignment().concat(_descriptor_7.alignment().concat(_descriptor_0.alignment().concat(_descriptor_6.alignment()))))));
  }
  fromValue(value_0) {
    return {
      manager: _descriptor_5.fromValue(value_0),
      slotsTotal: _descriptor_6.fromValue(value_0),
      slotsFilled: _descriptor_6.fromValue(value_0),
      deadline: _descriptor_6.fromValue(value_0),
      status: _descriptor_7.fromValue(value_0),
      criteriaHash: _descriptor_0.fromValue(value_0),
      eligibilityThresholdBps: _descriptor_6.fromValue(value_0)
    }
  }
  toValue(value_0) {
    return _descriptor_5.toValue(value_0.manager).concat(_descriptor_6.toValue(value_0.slotsTotal).concat(_descriptor_6.toValue(value_0.slotsFilled).concat(_descriptor_6.toValue(value_0.deadline).concat(_descriptor_7.toValue(value_0.status).concat(_descriptor_0.toValue(value_0.criteriaHash).concat(_descriptor_6.toValue(value_0.eligibilityThresholdBps)))))));
  }
}

const _descriptor_8 = new _TrialRecord_0();

const _descriptor_9 = __compactRuntime.CompactTypeField;

class _MerkleTreeDigest_0 {
  alignment() {
    return _descriptor_9.alignment();
  }
  fromValue(value_0) {
    return {
      field: _descriptor_9.fromValue(value_0)
    }
  }
  toValue(value_0) {
    return _descriptor_9.toValue(value_0.field);
  }
}

const _descriptor_10 = new _MerkleTreeDigest_0();

const _descriptor_11 = new __compactRuntime.CompactTypeUnsignedInteger(65535n, 2);

const _descriptor_12 = new __compactRuntime.CompactTypeEnum(3, 1);

class _IssuerRecord_0 {
  alignment() {
    return _descriptor_5.alignment().concat(_descriptor_0.alignment().concat(_descriptor_0.alignment().concat(_descriptor_0.alignment().concat(_descriptor_12.alignment().concat(_descriptor_6.alignment().concat(_descriptor_6.alignment().concat(_descriptor_6.alignment())))))));
  }
  fromValue(value_0) {
    return {
      doctorKey: _descriptor_5.fromValue(value_0),
      licenseHash: _descriptor_0.fromValue(value_0),
      attestationHash: _descriptor_0.fromValue(value_0),
      issuerVerificationHash: _descriptor_0.fromValue(value_0),
      status: _descriptor_12.fromValue(value_0),
      submittedAt: _descriptor_6.fromValue(value_0),
      approvedAt: _descriptor_6.fromValue(value_0),
      revokedAt: _descriptor_6.fromValue(value_0)
    }
  }
  toValue(value_0) {
    return _descriptor_5.toValue(value_0.doctorKey).concat(_descriptor_0.toValue(value_0.licenseHash).concat(_descriptor_0.toValue(value_0.attestationHash).concat(_descriptor_0.toValue(value_0.issuerVerificationHash).concat(_descriptor_12.toValue(value_0.status).concat(_descriptor_6.toValue(value_0.submittedAt).concat(_descriptor_6.toValue(value_0.approvedAt).concat(_descriptor_6.toValue(value_0.revokedAt))))))));
  }
}

const _descriptor_13 = new _IssuerRecord_0();

const _descriptor_14 = new __compactRuntime.CompactTypeVector(4, _descriptor_0);

class _LabResult_0 {
  alignment() {
    return _descriptor_0.alignment().concat(_descriptor_2.alignment());
  }
  fromValue(value_0) {
    return {
      code: _descriptor_0.fromValue(value_0),
      value: _descriptor_2.fromValue(value_0)
    }
  }
  toValue(value_0) {
    return _descriptor_0.toValue(value_0.code).concat(_descriptor_2.toValue(value_0.value));
  }
}

const _descriptor_15 = new _LabResult_0();

const _descriptor_16 = new __compactRuntime.CompactTypeVector(4, _descriptor_15);

class _HealthAttributes_0 {
  alignment() {
    return _descriptor_1.alignment().concat(_descriptor_14.alignment().concat(_descriptor_16.alignment().concat(_descriptor_6.alignment().concat(_descriptor_0.alignment()))));
  }
  fromValue(value_0) {
    return {
      ageYears: _descriptor_1.fromValue(value_0),
      diagnoses: _descriptor_14.fromValue(value_0),
      labs: _descriptor_16.fromValue(value_0),
      expiresAt: _descriptor_6.fromValue(value_0),
      salt: _descriptor_0.fromValue(value_0)
    }
  }
  toValue(value_0) {
    return _descriptor_1.toValue(value_0.ageYears).concat(_descriptor_14.toValue(value_0.diagnoses).concat(_descriptor_16.toValue(value_0.labs).concat(_descriptor_6.toValue(value_0.expiresAt).concat(_descriptor_0.toValue(value_0.salt)))));
  }
}

const _descriptor_17 = new _HealthAttributes_0();

class _MerkleTreePathEntry_0 {
  alignment() {
    return _descriptor_10.alignment().concat(_descriptor_4.alignment());
  }
  fromValue(value_0) {
    return {
      sibling: _descriptor_10.fromValue(value_0),
      goes_left: _descriptor_4.fromValue(value_0)
    }
  }
  toValue(value_0) {
    return _descriptor_10.toValue(value_0.sibling).concat(_descriptor_4.toValue(value_0.goes_left));
  }
}

const _descriptor_18 = new _MerkleTreePathEntry_0();

const _descriptor_19 = new __compactRuntime.CompactTypeVector(16, _descriptor_18);

class _MerkleTreePath_0 {
  alignment() {
    return _descriptor_0.alignment().concat(_descriptor_19.alignment());
  }
  fromValue(value_0) {
    return {
      leaf: _descriptor_0.fromValue(value_0),
      path: _descriptor_19.fromValue(value_0)
    }
  }
  toValue(value_0) {
    return _descriptor_0.toValue(value_0.leaf).concat(_descriptor_19.toValue(value_0.path));
  }
}

const _descriptor_20 = new _MerkleTreePath_0();

const _descriptor_21 = new __compactRuntime.CompactTypeBytes(6);

class _LeafPreimage_0 {
  alignment() {
    return _descriptor_21.alignment().concat(_descriptor_0.alignment());
  }
  fromValue(value_0) {
    return {
      domain_sep: _descriptor_21.fromValue(value_0),
      data: _descriptor_0.fromValue(value_0)
    }
  }
  toValue(value_0) {
    return _descriptor_21.toValue(value_0.domain_sep).concat(_descriptor_0.toValue(value_0.data));
  }
}

const _descriptor_22 = new _LeafPreimage_0();

const _descriptor_23 = new __compactRuntime.CompactTypeVector(3, _descriptor_0);

const _descriptor_24 = new __compactRuntime.CompactTypeVector(2, _descriptor_0);

const _descriptor_25 = new __compactRuntime.CompactTypeVector(2, _descriptor_9);

class _Either_0 {
  alignment() {
    return _descriptor_4.alignment().concat(_descriptor_0.alignment().concat(_descriptor_0.alignment()));
  }
  fromValue(value_0) {
    return {
      is_left: _descriptor_4.fromValue(value_0),
      left: _descriptor_0.fromValue(value_0),
      right: _descriptor_0.fromValue(value_0)
    }
  }
  toValue(value_0) {
    return _descriptor_4.toValue(value_0.is_left).concat(_descriptor_0.toValue(value_0.left).concat(_descriptor_0.toValue(value_0.right)));
  }
}

const _descriptor_26 = new _Either_0();

const _descriptor_27 = new __compactRuntime.CompactTypeUnsignedInteger(340282366920938463463374607431768211455n, 16);

class _ContractAddress_0 {
  alignment() {
    return _descriptor_0.alignment();
  }
  fromValue(value_0) {
    return {
      bytes: _descriptor_0.fromValue(value_0)
    }
  }
  toValue(value_0) {
    return _descriptor_0.toValue(value_0.bytes);
  }
}

const _descriptor_28 = new _ContractAddress_0();

class _UserAddress_0 {
  alignment() {
    return _descriptor_0.alignment();
  }
  fromValue(value_0) {
    return {
      bytes: _descriptor_0.fromValue(value_0)
    }
  }
  toValue(value_0) {
    return _descriptor_0.toValue(value_0.bytes);
  }
}

const _descriptor_29 = new _UserAddress_0();

class _Either_1 {
  alignment() {
    return _descriptor_4.alignment().concat(_descriptor_28.alignment().concat(_descriptor_29.alignment()));
  }
  fromValue(value_0) {
    return {
      is_left: _descriptor_4.fromValue(value_0),
      left: _descriptor_28.fromValue(value_0),
      right: _descriptor_29.fromValue(value_0)
    }
  }
  toValue(value_0) {
    return _descriptor_4.toValue(value_0.is_left).concat(_descriptor_28.toValue(value_0.left).concat(_descriptor_29.toValue(value_0.right)));
  }
}

const _descriptor_30 = new _Either_1();

class _Maybe_0 {
  alignment() {
    return _descriptor_4.alignment().concat(_descriptor_30.alignment());
  }
  fromValue(value_0) {
    return {
      is_some: _descriptor_4.fromValue(value_0),
      value: _descriptor_30.fromValue(value_0)
    }
  }
  toValue(value_0) {
    return _descriptor_4.toValue(value_0.is_some).concat(_descriptor_30.toValue(value_0.value));
  }
}

const _descriptor_31 = new _Maybe_0();

export class Contract {
  witnesses;
  constructor(...args_0) {
    if (args_0.length !== 1) {
      throw new __compactRuntime.CompactError(`Contract constructor: expected 1 argument, received ${args_0.length}`);
    }
    const witnesses_0 = args_0[0];
    if (typeof(witnesses_0) !== 'object') {
      throw new __compactRuntime.CompactError('first (witnesses) argument to Contract constructor is not an object');
    }
    if (typeof(witnesses_0.patientSecretKey) !== 'function') {
      throw new __compactRuntime.CompactError('first (witnesses) argument to Contract constructor does not contain a function-valued field named patientSecretKey');
    }
    if (typeof(witnesses_0.healthAttributes) !== 'function') {
      throw new __compactRuntime.CompactError('first (witnesses) argument to Contract constructor does not contain a function-valued field named healthAttributes');
    }
    if (typeof(witnesses_0.credentialPath) !== 'function') {
      throw new __compactRuntime.CompactError('first (witnesses) argument to Contract constructor does not contain a function-valued field named credentialPath');
    }
    if (typeof(witnesses_0.recordApplication) !== 'function') {
      throw new __compactRuntime.CompactError('first (witnesses) argument to Contract constructor does not contain a function-valued field named recordApplication');
    }
    this.witnesses = witnesses_0;
    this.circuits = {
      submitIssuerRequest: async (...args_1) => {
        if (args_1.length !== 2) {
          throw new __compactRuntime.CompactError(`submitIssuerRequest: expected 2 arguments (as invoked from Typescript), received ${args_1.length}`);
        }
        const contextOrig_0 = args_1[0];
        const licenseHash_0 = args_1[1];
        if (!(typeof(contextOrig_0) === 'object' && contextOrig_0.callContext.currentQueryContext != undefined)) {
          __compactRuntime.typeError('submitIssuerRequest',
                                     'argument 1 (as invoked from Typescript)',
                                     'zkclinic.compact line 56 char 1',
                                     'CircuitContext',
                                     contextOrig_0)
        }
        if (!(licenseHash_0.buffer instanceof ArrayBuffer && licenseHash_0.BYTES_PER_ELEMENT === 1 && licenseHash_0.length === 32)) {
          __compactRuntime.typeError('submitIssuerRequest',
                                     'argument 1 (argument 2 as invoked from Typescript)',
                                     'zkclinic.compact line 56 char 1',
                                     'Bytes<32>',
                                     licenseHash_0)
        }
        const context = __compactRuntime.copyCircuitContext(contextOrig_0);
        const partialProofData = {
          input: {
            value: _descriptor_0.toValue(licenseHash_0),
            alignment: _descriptor_0.alignment()
          },
          output: undefined,
          publicTranscript: [],
          privateTranscriptOutputs: []
        };
        const result_0 = await this._submitIssuerRequest_0(context,
                                                           partialProofData,
                                                           licenseHash_0);
        partialProofData.output = { value: [], alignment: [] };
        __compactRuntime.finalizeCallProofData(context, partialProofData);
        return { result: result_0, context: context, gasCost: context.callContext.currentGasCost };
      },
      approveIssuer: async (...args_1) => {
        if (args_1.length !== 4) {
          throw new __compactRuntime.CompactError(`approveIssuer: expected 4 arguments (as invoked from Typescript), received ${args_1.length}`);
        }
        const contextOrig_0 = args_1[0];
        const doctor_0 = args_1[1];
        const attestationHash_0 = args_1[2];
        const issuerVerificationHash_0 = args_1[3];
        if (!(typeof(contextOrig_0) === 'object' && contextOrig_0.callContext.currentQueryContext != undefined)) {
          __compactRuntime.typeError('approveIssuer',
                                     'argument 1 (as invoked from Typescript)',
                                     'zkclinic.compact line 69 char 1',
                                     'CircuitContext',
                                     contextOrig_0)
        }
        if (!(typeof(doctor_0) === 'object' && doctor_0.bytes.buffer instanceof ArrayBuffer && doctor_0.bytes.BYTES_PER_ELEMENT === 1 && doctor_0.bytes.length === 32)) {
          __compactRuntime.typeError('approveIssuer',
                                     'argument 1 (argument 2 as invoked from Typescript)',
                                     'zkclinic.compact line 69 char 1',
                                     'struct ZswapCoinPublicKey<bytes: Bytes<32>>',
                                     doctor_0)
        }
        if (!(attestationHash_0.buffer instanceof ArrayBuffer && attestationHash_0.BYTES_PER_ELEMENT === 1 && attestationHash_0.length === 32)) {
          __compactRuntime.typeError('approveIssuer',
                                     'argument 2 (argument 3 as invoked from Typescript)',
                                     'zkclinic.compact line 69 char 1',
                                     'Bytes<32>',
                                     attestationHash_0)
        }
        if (!(issuerVerificationHash_0.buffer instanceof ArrayBuffer && issuerVerificationHash_0.BYTES_PER_ELEMENT === 1 && issuerVerificationHash_0.length === 32)) {
          __compactRuntime.typeError('approveIssuer',
                                     'argument 3 (argument 4 as invoked from Typescript)',
                                     'zkclinic.compact line 69 char 1',
                                     'Bytes<32>',
                                     issuerVerificationHash_0)
        }
        const context = __compactRuntime.copyCircuitContext(contextOrig_0);
        const partialProofData = {
          input: {
            value: _descriptor_5.toValue(doctor_0).concat(_descriptor_0.toValue(attestationHash_0).concat(_descriptor_0.toValue(issuerVerificationHash_0))),
            alignment: _descriptor_5.alignment().concat(_descriptor_0.alignment().concat(_descriptor_0.alignment()))
          },
          output: undefined,
          publicTranscript: [],
          privateTranscriptOutputs: []
        };
        const result_0 = await this._approveIssuer_0(context,
                                                     partialProofData,
                                                     doctor_0,
                                                     attestationHash_0,
                                                     issuerVerificationHash_0);
        partialProofData.output = { value: [], alignment: [] };
        __compactRuntime.finalizeCallProofData(context, partialProofData);
        return { result: result_0, context: context, gasCost: context.callContext.currentGasCost };
      },
      revokeIssuer: async (...args_1) => {
        if (args_1.length !== 2) {
          throw new __compactRuntime.CompactError(`revokeIssuer: expected 2 arguments (as invoked from Typescript), received ${args_1.length}`);
        }
        const contextOrig_0 = args_1[0];
        const doctor_0 = args_1[1];
        if (!(typeof(contextOrig_0) === 'object' && contextOrig_0.callContext.currentQueryContext != undefined)) {
          __compactRuntime.typeError('revokeIssuer',
                                     'argument 1 (as invoked from Typescript)',
                                     'zkclinic.compact line 90 char 1',
                                     'CircuitContext',
                                     contextOrig_0)
        }
        if (!(typeof(doctor_0) === 'object' && doctor_0.bytes.buffer instanceof ArrayBuffer && doctor_0.bytes.BYTES_PER_ELEMENT === 1 && doctor_0.bytes.length === 32)) {
          __compactRuntime.typeError('revokeIssuer',
                                     'argument 1 (argument 2 as invoked from Typescript)',
                                     'zkclinic.compact line 90 char 1',
                                     'struct ZswapCoinPublicKey<bytes: Bytes<32>>',
                                     doctor_0)
        }
        const context = __compactRuntime.copyCircuitContext(contextOrig_0);
        const partialProofData = {
          input: {
            value: _descriptor_5.toValue(doctor_0),
            alignment: _descriptor_5.alignment()
          },
          output: undefined,
          publicTranscript: [],
          privateTranscriptOutputs: []
        };
        const result_0 = await this._revokeIssuer_0(context,
                                                    partialProofData,
                                                    doctor_0);
        partialProofData.output = { value: [], alignment: [] };
        __compactRuntime.finalizeCallProofData(context, partialProofData);
        return { result: result_0, context: context, gasCost: context.callContext.currentGasCost };
      },
      transferAdmin: async (...args_1) => {
        if (args_1.length !== 2) {
          throw new __compactRuntime.CompactError(`transferAdmin: expected 2 arguments (as invoked from Typescript), received ${args_1.length}`);
        }
        const contextOrig_0 = args_1[0];
        const newAdmin_0 = args_1[1];
        if (!(typeof(contextOrig_0) === 'object' && contextOrig_0.callContext.currentQueryContext != undefined)) {
          __compactRuntime.typeError('transferAdmin',
                                     'argument 1 (as invoked from Typescript)',
                                     'zkclinic.compact line 110 char 1',
                                     'CircuitContext',
                                     contextOrig_0)
        }
        if (!(typeof(newAdmin_0) === 'object' && newAdmin_0.bytes.buffer instanceof ArrayBuffer && newAdmin_0.bytes.BYTES_PER_ELEMENT === 1 && newAdmin_0.bytes.length === 32)) {
          __compactRuntime.typeError('transferAdmin',
                                     'argument 1 (argument 2 as invoked from Typescript)',
                                     'zkclinic.compact line 110 char 1',
                                     'struct ZswapCoinPublicKey<bytes: Bytes<32>>',
                                     newAdmin_0)
        }
        const context = __compactRuntime.copyCircuitContext(contextOrig_0);
        const partialProofData = {
          input: {
            value: _descriptor_5.toValue(newAdmin_0),
            alignment: _descriptor_5.alignment()
          },
          output: undefined,
          publicTranscript: [],
          privateTranscriptOutputs: []
        };
        const result_0 = await this._transferAdmin_0(context,
                                                     partialProofData,
                                                     newAdmin_0);
        partialProofData.output = { value: [], alignment: [] };
        __compactRuntime.finalizeCallProofData(context, partialProofData);
        return { result: result_0, context: context, gasCost: context.callContext.currentGasCost };
      },
      registerCredential: async (...args_1) => {
        if (args_1.length !== 2) {
          throw new __compactRuntime.CompactError(`registerCredential: expected 2 arguments (as invoked from Typescript), received ${args_1.length}`);
        }
        const contextOrig_0 = args_1[0];
        const credentialId_0 = args_1[1];
        if (!(typeof(contextOrig_0) === 'object' && contextOrig_0.callContext.currentQueryContext != undefined)) {
          __compactRuntime.typeError('registerCredential',
                                     'argument 1 (as invoked from Typescript)',
                                     'zkclinic.compact line 117 char 1',
                                     'CircuitContext',
                                     contextOrig_0)
        }
        if (!(credentialId_0.buffer instanceof ArrayBuffer && credentialId_0.BYTES_PER_ELEMENT === 1 && credentialId_0.length === 32)) {
          __compactRuntime.typeError('registerCredential',
                                     'argument 1 (argument 2 as invoked from Typescript)',
                                     'zkclinic.compact line 117 char 1',
                                     'Bytes<32>',
                                     credentialId_0)
        }
        const context = __compactRuntime.copyCircuitContext(contextOrig_0);
        const partialProofData = {
          input: {
            value: _descriptor_0.toValue(credentialId_0),
            alignment: _descriptor_0.alignment()
          },
          output: undefined,
          publicTranscript: [],
          privateTranscriptOutputs: []
        };
        const result_0 = await this._registerCredential_0(context,
                                                          partialProofData,
                                                          credentialId_0);
        partialProofData.output = { value: [], alignment: [] };
        __compactRuntime.finalizeCallProofData(context, partialProofData);
        return { result: result_0, context: context, gasCost: context.callContext.currentGasCost };
      },
      appendDiagnosisToCredential: async (...args_1) => {
        if (args_1.length !== 3) {
          throw new __compactRuntime.CompactError(`appendDiagnosisToCredential: expected 3 arguments (as invoked from Typescript), received ${args_1.length}`);
        }
        const contextOrig_0 = args_1[0];
        const credentialId_0 = args_1[1];
        const entryCommitment_0 = args_1[2];
        if (!(typeof(contextOrig_0) === 'object' && contextOrig_0.callContext.currentQueryContext != undefined)) {
          __compactRuntime.typeError('appendDiagnosisToCredential',
                                     'argument 1 (as invoked from Typescript)',
                                     'zkclinic.compact line 140 char 1',
                                     'CircuitContext',
                                     contextOrig_0)
        }
        if (!(credentialId_0.buffer instanceof ArrayBuffer && credentialId_0.BYTES_PER_ELEMENT === 1 && credentialId_0.length === 32)) {
          __compactRuntime.typeError('appendDiagnosisToCredential',
                                     'argument 1 (argument 2 as invoked from Typescript)',
                                     'zkclinic.compact line 140 char 1',
                                     'Bytes<32>',
                                     credentialId_0)
        }
        if (!(entryCommitment_0.buffer instanceof ArrayBuffer && entryCommitment_0.BYTES_PER_ELEMENT === 1 && entryCommitment_0.length === 32)) {
          __compactRuntime.typeError('appendDiagnosisToCredential',
                                     'argument 2 (argument 3 as invoked from Typescript)',
                                     'zkclinic.compact line 140 char 1',
                                     'Bytes<32>',
                                     entryCommitment_0)
        }
        const context = __compactRuntime.copyCircuitContext(contextOrig_0);
        const partialProofData = {
          input: {
            value: _descriptor_0.toValue(credentialId_0).concat(_descriptor_0.toValue(entryCommitment_0)),
            alignment: _descriptor_0.alignment().concat(_descriptor_0.alignment())
          },
          output: undefined,
          publicTranscript: [],
          privateTranscriptOutputs: []
        };
        const result_0 = await this._appendDiagnosisToCredential_0(context,
                                                                   partialProofData,
                                                                   credentialId_0,
                                                                   entryCommitment_0);
        partialProofData.output = { value: [], alignment: [] };
        __compactRuntime.finalizeCallProofData(context, partialProofData);
        return { result: result_0, context: context, gasCost: context.callContext.currentGasCost };
      },
      revokeCredential: async (...args_1) => {
        if (args_1.length !== 2) {
          throw new __compactRuntime.CompactError(`revokeCredential: expected 2 arguments (as invoked from Typescript), received ${args_1.length}`);
        }
        const contextOrig_0 = args_1[0];
        const credentialId_0 = args_1[1];
        if (!(typeof(contextOrig_0) === 'object' && contextOrig_0.callContext.currentQueryContext != undefined)) {
          __compactRuntime.typeError('revokeCredential',
                                     'argument 1 (as invoked from Typescript)',
                                     'zkclinic.compact line 158 char 1',
                                     'CircuitContext',
                                     contextOrig_0)
        }
        if (!(credentialId_0.buffer instanceof ArrayBuffer && credentialId_0.BYTES_PER_ELEMENT === 1 && credentialId_0.length === 32)) {
          __compactRuntime.typeError('revokeCredential',
                                     'argument 1 (argument 2 as invoked from Typescript)',
                                     'zkclinic.compact line 158 char 1',
                                     'Bytes<32>',
                                     credentialId_0)
        }
        const context = __compactRuntime.copyCircuitContext(contextOrig_0);
        const partialProofData = {
          input: {
            value: _descriptor_0.toValue(credentialId_0),
            alignment: _descriptor_0.alignment()
          },
          output: undefined,
          publicTranscript: [],
          privateTranscriptOutputs: []
        };
        const result_0 = await this._revokeCredential_0(context,
                                                        partialProofData,
                                                        credentialId_0);
        partialProofData.output = { value: [], alignment: [] };
        __compactRuntime.finalizeCallProofData(context, partialProofData);
        return { result: result_0, context: context, gasCost: context.callContext.currentGasCost };
      },
      createTrial: async (...args_1) => {
        if (args_1.length !== 6) {
          throw new __compactRuntime.CompactError(`createTrial: expected 6 arguments (as invoked from Typescript), received ${args_1.length}`);
        }
        const contextOrig_0 = args_1[0];
        const trialId_0 = args_1[1];
        const slotsTotal_0 = args_1[2];
        const deadline_0 = args_1[3];
        const criteriaHash_0 = args_1[4];
        const eligibilityThresholdBps_0 = args_1[5];
        if (!(typeof(contextOrig_0) === 'object' && contextOrig_0.callContext.currentQueryContext != undefined)) {
          __compactRuntime.typeError('createTrial',
                                     'argument 1 (as invoked from Typescript)',
                                     'zkclinic.compact line 171 char 1',
                                     'CircuitContext',
                                     contextOrig_0)
        }
        if (!(trialId_0.buffer instanceof ArrayBuffer && trialId_0.BYTES_PER_ELEMENT === 1 && trialId_0.length === 32)) {
          __compactRuntime.typeError('createTrial',
                                     'argument 1 (argument 2 as invoked from Typescript)',
                                     'zkclinic.compact line 171 char 1',
                                     'Bytes<32>',
                                     trialId_0)
        }
        if (!(typeof(slotsTotal_0) === 'bigint' && slotsTotal_0 >= 0n && slotsTotal_0 <= 18446744073709551615n)) {
          __compactRuntime.typeError('createTrial',
                                     'argument 2 (argument 3 as invoked from Typescript)',
                                     'zkclinic.compact line 171 char 1',
                                     'Uint<0..18446744073709551616>',
                                     slotsTotal_0)
        }
        if (!(typeof(deadline_0) === 'bigint' && deadline_0 >= 0n && deadline_0 <= 18446744073709551615n)) {
          __compactRuntime.typeError('createTrial',
                                     'argument 3 (argument 4 as invoked from Typescript)',
                                     'zkclinic.compact line 171 char 1',
                                     'Uint<0..18446744073709551616>',
                                     deadline_0)
        }
        if (!(criteriaHash_0.buffer instanceof ArrayBuffer && criteriaHash_0.BYTES_PER_ELEMENT === 1 && criteriaHash_0.length === 32)) {
          __compactRuntime.typeError('createTrial',
                                     'argument 4 (argument 5 as invoked from Typescript)',
                                     'zkclinic.compact line 171 char 1',
                                     'Bytes<32>',
                                     criteriaHash_0)
        }
        if (!(typeof(eligibilityThresholdBps_0) === 'bigint' && eligibilityThresholdBps_0 >= 0n && eligibilityThresholdBps_0 <= 18446744073709551615n)) {
          __compactRuntime.typeError('createTrial',
                                     'argument 5 (argument 6 as invoked from Typescript)',
                                     'zkclinic.compact line 171 char 1',
                                     'Uint<0..18446744073709551616>',
                                     eligibilityThresholdBps_0)
        }
        const context = __compactRuntime.copyCircuitContext(contextOrig_0);
        const partialProofData = {
          input: {
            value: _descriptor_0.toValue(trialId_0).concat(_descriptor_6.toValue(slotsTotal_0).concat(_descriptor_6.toValue(deadline_0).concat(_descriptor_0.toValue(criteriaHash_0).concat(_descriptor_6.toValue(eligibilityThresholdBps_0))))),
            alignment: _descriptor_0.alignment().concat(_descriptor_6.alignment().concat(_descriptor_6.alignment().concat(_descriptor_0.alignment().concat(_descriptor_6.alignment()))))
          },
          output: undefined,
          publicTranscript: [],
          privateTranscriptOutputs: []
        };
        const result_0 = await this._createTrial_0(context,
                                                   partialProofData,
                                                   trialId_0,
                                                   slotsTotal_0,
                                                   deadline_0,
                                                   criteriaHash_0,
                                                   eligibilityThresholdBps_0);
        partialProofData.output = { value: [], alignment: [] };
        __compactRuntime.finalizeCallProofData(context, partialProofData);
        return { result: result_0, context: context, gasCost: context.callContext.currentGasCost };
      },
      closeTrial: async (...args_1) => {
        if (args_1.length !== 2) {
          throw new __compactRuntime.CompactError(`closeTrial: expected 2 arguments (as invoked from Typescript), received ${args_1.length}`);
        }
        const contextOrig_0 = args_1[0];
        const trialId_0 = args_1[1];
        if (!(typeof(contextOrig_0) === 'object' && contextOrig_0.callContext.currentQueryContext != undefined)) {
          __compactRuntime.typeError('closeTrial',
                                     'argument 1 (as invoked from Typescript)',
                                     'zkclinic.compact line 196 char 1',
                                     'CircuitContext',
                                     contextOrig_0)
        }
        if (!(trialId_0.buffer instanceof ArrayBuffer && trialId_0.BYTES_PER_ELEMENT === 1 && trialId_0.length === 32)) {
          __compactRuntime.typeError('closeTrial',
                                     'argument 1 (argument 2 as invoked from Typescript)',
                                     'zkclinic.compact line 196 char 1',
                                     'Bytes<32>',
                                     trialId_0)
        }
        const context = __compactRuntime.copyCircuitContext(contextOrig_0);
        const partialProofData = {
          input: {
            value: _descriptor_0.toValue(trialId_0),
            alignment: _descriptor_0.alignment()
          },
          output: undefined,
          publicTranscript: [],
          privateTranscriptOutputs: []
        };
        const result_0 = await this._closeTrial_0(context,
                                                  partialProofData,
                                                  trialId_0);
        partialProofData.output = { value: [], alignment: [] };
        __compactRuntime.finalizeCallProofData(context, partialProofData);
        return { result: result_0, context: context, gasCost: context.callContext.currentGasCost };
      },
      async patientPublicKey(context, ...args_1) {
        return { result: pureCircuits.patientPublicKey(...args_1), context };
      },
      async credentialCommitment(context, ...args_1) {
        return { result: pureCircuits.credentialCommitment(...args_1), context };
      },
      async trialNullifier(context, ...args_1) {
        return { result: pureCircuits.trialNullifier(...args_1), context };
      },
      issueCredentialCommitment: async (...args_1) => {
        if (args_1.length !== 2) {
          throw new __compactRuntime.CompactError(`issueCredentialCommitment: expected 2 arguments (as invoked from Typescript), received ${args_1.length}`);
        }
        const contextOrig_0 = args_1[0];
        const commitment_0 = args_1[1];
        if (!(typeof(contextOrig_0) === 'object' && contextOrig_0.callContext.currentQueryContext != undefined)) {
          __compactRuntime.typeError('issueCredentialCommitment',
                                     'argument 1 (as invoked from Typescript)',
                                     'zkclinic.compact line 300 char 1',
                                     'CircuitContext',
                                     contextOrig_0)
        }
        if (!(commitment_0.buffer instanceof ArrayBuffer && commitment_0.BYTES_PER_ELEMENT === 1 && commitment_0.length === 32)) {
          __compactRuntime.typeError('issueCredentialCommitment',
                                     'argument 1 (argument 2 as invoked from Typescript)',
                                     'zkclinic.compact line 300 char 1',
                                     'Bytes<32>',
                                     commitment_0)
        }
        const context = __compactRuntime.copyCircuitContext(contextOrig_0);
        const partialProofData = {
          input: {
            value: _descriptor_0.toValue(commitment_0),
            alignment: _descriptor_0.alignment()
          },
          output: undefined,
          publicTranscript: [],
          privateTranscriptOutputs: []
        };
        const result_0 = await this._issueCredentialCommitment_0(context,
                                                                 partialProofData,
                                                                 commitment_0);
        partialProofData.output = { value: [], alignment: [] };
        __compactRuntime.finalizeCallProofData(context, partialProofData);
        return { result: result_0, context: context, gasCost: context.callContext.currentGasCost };
      },
      publishTrialCriteria: async (...args_1) => {
        if (args_1.length !== 3) {
          throw new __compactRuntime.CompactError(`publishTrialCriteria: expected 3 arguments (as invoked from Typescript), received ${args_1.length}`);
        }
        const contextOrig_0 = args_1[0];
        const trialId_0 = args_1[1];
        const criteria_0 = args_1[2];
        if (!(typeof(contextOrig_0) === 'object' && contextOrig_0.callContext.currentQueryContext != undefined)) {
          __compactRuntime.typeError('publishTrialCriteria',
                                     'argument 1 (as invoked from Typescript)',
                                     'zkclinic.compact line 310 char 1',
                                     'CircuitContext',
                                     contextOrig_0)
        }
        if (!(trialId_0.buffer instanceof ArrayBuffer && trialId_0.BYTES_PER_ELEMENT === 1 && trialId_0.length === 32)) {
          __compactRuntime.typeError('publishTrialCriteria',
                                     'argument 1 (argument 2 as invoked from Typescript)',
                                     'zkclinic.compact line 310 char 1',
                                     'Bytes<32>',
                                     trialId_0)
        }
        if (!(typeof(criteria_0) === 'object' && typeof(criteria_0.minAge) === 'bigint' && criteria_0.minAge >= 0n && criteria_0.minAge <= 255n && typeof(criteria_0.maxAge) === 'bigint' && criteria_0.maxAge >= 0n && criteria_0.maxAge <= 255n && criteria_0.requiredDiagnosis.buffer instanceof ArrayBuffer && criteria_0.requiredDiagnosis.BYTES_PER_ELEMENT === 1 && criteria_0.requiredDiagnosis.length === 32 && criteria_0.excludedDiagnosis.buffer instanceof ArrayBuffer && criteria_0.excludedDiagnosis.BYTES_PER_ELEMENT === 1 && criteria_0.excludedDiagnosis.length === 32 && criteria_0.labCode.buffer instanceof ArrayBuffer && criteria_0.labCode.BYTES_PER_ELEMENT === 1 && criteria_0.labCode.length === 32 && typeof(criteria_0.labMin) === 'bigint' && criteria_0.labMin >= 0n && criteria_0.labMin <= 4294967295n && typeof(criteria_0.labMax) === 'bigint' && criteria_0.labMax >= 0n && criteria_0.labMax <= 4294967295n)) {
          __compactRuntime.typeError('publishTrialCriteria',
                                     'argument 2 (argument 3 as invoked from Typescript)',
                                     'zkclinic.compact line 310 char 1',
                                     'struct EligibilityCriteria<minAge: Uint<0..256>, maxAge: Uint<0..256>, requiredDiagnosis: Bytes<32>, excludedDiagnosis: Bytes<32>, labCode: Bytes<32>, labMin: Uint<0..4294967296>, labMax: Uint<0..4294967296>>',
                                     criteria_0)
        }
        const context = __compactRuntime.copyCircuitContext(contextOrig_0);
        const partialProofData = {
          input: {
            value: _descriptor_0.toValue(trialId_0).concat(_descriptor_3.toValue(criteria_0)),
            alignment: _descriptor_0.alignment().concat(_descriptor_3.alignment())
          },
          output: undefined,
          publicTranscript: [],
          privateTranscriptOutputs: []
        };
        const result_0 = await this._publishTrialCriteria_0(context,
                                                            partialProofData,
                                                            trialId_0,
                                                            criteria_0);
        partialProofData.output = { value: [], alignment: [] };
        __compactRuntime.finalizeCallProofData(context, partialProofData);
        return { result: result_0, context: context, gasCost: context.callContext.currentGasCost };
      },
      proveEligibility: async (...args_1) => {
        if (args_1.length !== 3) {
          throw new __compactRuntime.CompactError(`proveEligibility: expected 3 arguments (as invoked from Typescript), received ${args_1.length}`);
        }
        const contextOrig_0 = args_1[0];
        const trialId_0 = args_1[1];
        const asOf_0 = args_1[2];
        if (!(typeof(contextOrig_0) === 'object' && contextOrig_0.callContext.currentQueryContext != undefined)) {
          __compactRuntime.typeError('proveEligibility',
                                     'argument 1 (as invoked from Typescript)',
                                     'zkclinic.compact line 329 char 1',
                                     'CircuitContext',
                                     contextOrig_0)
        }
        if (!(trialId_0.buffer instanceof ArrayBuffer && trialId_0.BYTES_PER_ELEMENT === 1 && trialId_0.length === 32)) {
          __compactRuntime.typeError('proveEligibility',
                                     'argument 1 (argument 2 as invoked from Typescript)',
                                     'zkclinic.compact line 329 char 1',
                                     'Bytes<32>',
                                     trialId_0)
        }
        if (!(typeof(asOf_0) === 'bigint' && asOf_0 >= 0n && asOf_0 <= 18446744073709551615n)) {
          __compactRuntime.typeError('proveEligibility',
                                     'argument 2 (argument 3 as invoked from Typescript)',
                                     'zkclinic.compact line 329 char 1',
                                     'Uint<0..18446744073709551616>',
                                     asOf_0)
        }
        const context = __compactRuntime.copyCircuitContext(contextOrig_0);
        const partialProofData = {
          input: {
            value: _descriptor_0.toValue(trialId_0).concat(_descriptor_6.toValue(asOf_0)),
            alignment: _descriptor_0.alignment().concat(_descriptor_6.alignment())
          },
          output: undefined,
          publicTranscript: [],
          privateTranscriptOutputs: []
        };
        const result_0 = await this._proveEligibility_0(context,
                                                        partialProofData,
                                                        trialId_0,
                                                        asOf_0);
        partialProofData.output = { value: _descriptor_0.toValue(result_0), alignment: _descriptor_0.alignment() };
        __compactRuntime.finalizeCallProofData(context, partialProofData);
        return { result: result_0, context: context, gasCost: context.callContext.currentGasCost };
      },
      recordEnrollment: async (...args_1) => {
        if (args_1.length !== 3) {
          throw new __compactRuntime.CompactError(`recordEnrollment: expected 3 arguments (as invoked from Typescript), received ${args_1.length}`);
        }
        const contextOrig_0 = args_1[0];
        const trialId_0 = args_1[1];
        const nullifier_0 = args_1[2];
        if (!(typeof(contextOrig_0) === 'object' && contextOrig_0.callContext.currentQueryContext != undefined)) {
          __compactRuntime.typeError('recordEnrollment',
                                     'argument 1 (as invoked from Typescript)',
                                     'zkclinic.compact line 369 char 1',
                                     'CircuitContext',
                                     contextOrig_0)
        }
        if (!(trialId_0.buffer instanceof ArrayBuffer && trialId_0.BYTES_PER_ELEMENT === 1 && trialId_0.length === 32)) {
          __compactRuntime.typeError('recordEnrollment',
                                     'argument 1 (argument 2 as invoked from Typescript)',
                                     'zkclinic.compact line 369 char 1',
                                     'Bytes<32>',
                                     trialId_0)
        }
        if (!(nullifier_0.buffer instanceof ArrayBuffer && nullifier_0.BYTES_PER_ELEMENT === 1 && nullifier_0.length === 32)) {
          __compactRuntime.typeError('recordEnrollment',
                                     'argument 2 (argument 3 as invoked from Typescript)',
                                     'zkclinic.compact line 369 char 1',
                                     'Bytes<32>',
                                     nullifier_0)
        }
        const context = __compactRuntime.copyCircuitContext(contextOrig_0);
        const partialProofData = {
          input: {
            value: _descriptor_0.toValue(trialId_0).concat(_descriptor_0.toValue(nullifier_0)),
            alignment: _descriptor_0.alignment().concat(_descriptor_0.alignment())
          },
          output: undefined,
          publicTranscript: [],
          privateTranscriptOutputs: []
        };
        const result_0 = await this._recordEnrollment_0(context,
                                                        partialProofData,
                                                        trialId_0,
                                                        nullifier_0);
        partialProofData.output = { value: [], alignment: [] };
        __compactRuntime.finalizeCallProofData(context, partialProofData);
        return { result: result_0, context: context, gasCost: context.callContext.currentGasCost };
      }
    };
    this.impureCircuits = {
      submitIssuerRequest: this.circuits.submitIssuerRequest,
      approveIssuer: this.circuits.approveIssuer,
      revokeIssuer: this.circuits.revokeIssuer,
      transferAdmin: this.circuits.transferAdmin,
      registerCredential: this.circuits.registerCredential,
      appendDiagnosisToCredential: this.circuits.appendDiagnosisToCredential,
      revokeCredential: this.circuits.revokeCredential,
      createTrial: this.circuits.createTrial,
      closeTrial: this.circuits.closeTrial,
      issueCredentialCommitment: this.circuits.issueCredentialCommitment,
      publishTrialCriteria: this.circuits.publishTrialCriteria,
      proveEligibility: this.circuits.proveEligibility,
      recordEnrollment: this.circuits.recordEnrollment
    };
    this.provableCircuits = {
      submitIssuerRequest: this.circuits.submitIssuerRequest,
      approveIssuer: this.circuits.approveIssuer,
      revokeIssuer: this.circuits.revokeIssuer,
      transferAdmin: this.circuits.transferAdmin,
      registerCredential: this.circuits.registerCredential,
      appendDiagnosisToCredential: this.circuits.appendDiagnosisToCredential,
      revokeCredential: this.circuits.revokeCredential,
      createTrial: this.circuits.createTrial,
      closeTrial: this.circuits.closeTrial,
      issueCredentialCommitment: this.circuits.issueCredentialCommitment,
      publishTrialCriteria: this.circuits.publishTrialCriteria,
      proveEligibility: this.circuits.proveEligibility,
      recordEnrollment: this.circuits.recordEnrollment
    };
  }
  async initialState(...args_0) {
    if (args_0.length !== 1) {
      throw new __compactRuntime.CompactError(`Contract state constructor: expected 1 argument (as invoked from Typescript), received ${args_0.length}`);
    }
    const constructorContext_0 = args_0[0];
    if (typeof(constructorContext_0) !== 'object') {
      throw new __compactRuntime.CompactError(`Contract state constructor: expected 'constructorContext' in argument 1 (as invoked from Typescript) to be an object`);
    }
    if (!('initialPrivateState' in constructorContext_0)) {
      throw new __compactRuntime.CompactError(`Contract state constructor: expected 'initialPrivateState' in argument 1 (as invoked from Typescript)`);
    }
    if (!('initialZswapLocalState' in constructorContext_0)) {
      throw new __compactRuntime.CompactError(`Contract state constructor: expected 'initialZswapLocalState' in argument 1 (as invoked from Typescript)`);
    }
    if (typeof(constructorContext_0.initialZswapLocalState) !== 'object') {
      throw new __compactRuntime.CompactError(`Contract state constructor: expected 'initialZswapLocalState' in argument 1 (as invoked from Typescript) to be an object`);
    }
    const state_0 = new __compactRuntime.ContractState();
    let stateValue_0 = __compactRuntime.StateValue.newArray();
    stateValue_0 = stateValue_0.arrayPush(__compactRuntime.StateValue.newNull());
    stateValue_0 = stateValue_0.arrayPush(__compactRuntime.StateValue.newNull());
    stateValue_0 = stateValue_0.arrayPush(__compactRuntime.StateValue.newNull());
    stateValue_0 = stateValue_0.arrayPush(__compactRuntime.StateValue.newNull());
    stateValue_0 = stateValue_0.arrayPush(__compactRuntime.StateValue.newNull());
    stateValue_0 = stateValue_0.arrayPush(__compactRuntime.StateValue.newNull());
    stateValue_0 = stateValue_0.arrayPush(__compactRuntime.StateValue.newNull());
    stateValue_0 = stateValue_0.arrayPush(__compactRuntime.StateValue.newNull());
    stateValue_0 = stateValue_0.arrayPush(__compactRuntime.StateValue.newNull());
    stateValue_0 = stateValue_0.arrayPush(__compactRuntime.StateValue.newNull());
    stateValue_0 = stateValue_0.arrayPush(__compactRuntime.StateValue.newNull());
    stateValue_0 = stateValue_0.arrayPush(__compactRuntime.StateValue.newNull());
    stateValue_0 = stateValue_0.arrayPush(__compactRuntime.StateValue.newNull());
    stateValue_0 = stateValue_0.arrayPush(__compactRuntime.StateValue.newNull());
    state_0.data = new __compactRuntime.ChargedState(stateValue_0);
    state_0.setOperation('submitIssuerRequest', new __compactRuntime.ContractOperation());
    state_0.setOperation('approveIssuer', new __compactRuntime.ContractOperation());
    state_0.setOperation('revokeIssuer', new __compactRuntime.ContractOperation());
    state_0.setOperation('transferAdmin', new __compactRuntime.ContractOperation());
    state_0.setOperation('registerCredential', new __compactRuntime.ContractOperation());
    state_0.setOperation('appendDiagnosisToCredential', new __compactRuntime.ContractOperation());
    state_0.setOperation('revokeCredential', new __compactRuntime.ContractOperation());
    state_0.setOperation('createTrial', new __compactRuntime.ContractOperation());
    state_0.setOperation('closeTrial', new __compactRuntime.ContractOperation());
    state_0.setOperation('issueCredentialCommitment', new __compactRuntime.ContractOperation());
    state_0.setOperation('publishTrialCriteria', new __compactRuntime.ContractOperation());
    state_0.setOperation('proveEligibility', new __compactRuntime.ContractOperation());
    state_0.setOperation('recordEnrollment', new __compactRuntime.ContractOperation());
    const context = __compactRuntime.createCircuitContext({circuitId: 'constructor', contractAddress: __compactRuntime.dummyContractAddress(), coinPublicKeyOrZswapState: constructorContext_0.initialZswapLocalState.coinPublicKey, contractState: state_0.data, privateState: constructorContext_0.initialPrivateState});
    const partialProofData = {
      input: { value: [], alignment: [] },
      output: undefined,
      publicTranscript: [],
      privateTranscriptOutputs: []
    };
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_1.toValue(0n),
                                                                                              alignment: _descriptor_1.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_5.toValue({ bytes: new Uint8Array(32) }),
                                                                                              alignment: _descriptor_5.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_1.toValue(1n),
                                                                                              alignment: _descriptor_1.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newMap(
                                                          new __compactRuntime.StateMap()
                                                        ).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_1.toValue(2n),
                                                                                              alignment: _descriptor_1.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newMap(
                                                          new __compactRuntime.StateMap()
                                                        ).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_1.toValue(3n),
                                                                                              alignment: _descriptor_1.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newMap(
                                                          new __compactRuntime.StateMap()
                                                        ).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_1.toValue(4n),
                                                                                              alignment: _descriptor_1.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newMap(
                                                          new __compactRuntime.StateMap()
                                                        ).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_1.toValue(5n),
                                                                                              alignment: _descriptor_1.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newMap(
                                                          new __compactRuntime.StateMap()
                                                        ).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_1.toValue(6n),
                                                                                              alignment: _descriptor_1.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newMap(
                                                          new __compactRuntime.StateMap()
                                                        ).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_1.toValue(7n),
                                                                                              alignment: _descriptor_1.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newMap(
                                                          new __compactRuntime.StateMap()
                                                        ).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_1.toValue(8n),
                                                                                              alignment: _descriptor_1.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newArray()
                                                          .arrayPush(__compactRuntime.StateValue.newBoundedMerkleTree(
                                                                       new __compactRuntime.StateBoundedMerkleTree(16)
                                                                     )).arrayPush(__compactRuntime.StateValue.newCell({ value: _descriptor_6.toValue(0n),
                                                                                                                        alignment: _descriptor_6.alignment() })).arrayPush(__compactRuntime.StateValue.newMap(
                                                                                                                                                                             new __compactRuntime.StateMap()
                                                                                                                                                                           ))
                                                          .encode() } },
                                       { idx: { cached: false,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_1.toValue(2n),
                                                                  alignment: _descriptor_1.alignment() } }] } },
                                       { dup: { n: 2 } },
                                       { idx: { cached: false,
                                                pushPath: false,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_1.toValue(0n),
                                                                  alignment: _descriptor_1.alignment() } }] } },
                                       'root',
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newNull().encode() } },
                                       { ins: { cached: true, n: 2 } },
                                       { ins: { cached: false, n: 1 } }]);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_1.toValue(9n),
                                                                                              alignment: _descriptor_1.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_6.toValue(0n),
                                                                                              alignment: _descriptor_6.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_1.toValue(10n),
                                                                                              alignment: _descriptor_1.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newMap(
                                                          new __compactRuntime.StateMap()
                                                        ).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_1.toValue(11n),
                                                                                              alignment: _descriptor_1.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newMap(
                                                          new __compactRuntime.StateMap()
                                                        ).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_1.toValue(12n),
                                                                                              alignment: _descriptor_1.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newMap(
                                                          new __compactRuntime.StateMap()
                                                        ).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_1.toValue(13n),
                                                                                              alignment: _descriptor_1.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newMap(
                                                          new __compactRuntime.StateMap()
                                                        ).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    const tmp_0 = this._ownPublicKey_0(context, partialProofData);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_1.toValue(0n),
                                                                                              alignment: _descriptor_1.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_5.toValue(tmp_0),
                                                                                              alignment: _descriptor_5.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    state_0.data = new __compactRuntime.ChargedState(context.callContext.currentQueryContext.state.state);
    return {
      currentContractState: state_0,
      currentPrivateState: context.callContext.currentPrivateState,
      currentZswapLocalState: context.callContext.currentZswapLocalState
    }
  }
  _merkleTreePathRoot_0(path_0) {
    return { field:
               this._folder_0((...args_0) =>
                                this._merkleTreePathEntryRoot_0(...args_0),
                              this._degradeToTransient_0(this._persistentHash_4({ domain_sep:
                                                                                    new Uint8Array([109, 100, 110, 58, 108, 104]),
                                                                                  data:
                                                                                    path_0.leaf })),
                              path_0.path) };
  }
  _merkleTreePathEntryRoot_0(recursiveDigest_0, entry_0) {
    const left_0 = entry_0.goes_left ? recursiveDigest_0 : entry_0.sibling.field;
    const right_0 = entry_0.goes_left ?
                    entry_0.sibling.field :
                    recursiveDigest_0;
    return this._transientHash_0([left_0, right_0]);
  }
  async _blockTimeGt_0(context, partialProofData, time_0) {
    return _descriptor_4.fromValue(__compactRuntime.queryLedgerState(context,
                                                                     partialProofData,
                                                                     [
                                                                      { push: { storage: false,
                                                                                value: __compactRuntime.StateValue.newCell({ value: _descriptor_6.toValue(time_0),
                                                                                                                             alignment: _descriptor_6.alignment() }).encode() } },
                                                                      { dup: { n: 3 } },
                                                                      { idx: { cached: true,
                                                                               pushPath: false,
                                                                               path: [
                                                                                      { tag: 'value',
                                                                                        value: { value: _descriptor_1.toValue(2n),
                                                                                                 alignment: _descriptor_1.alignment() } }] } },
                                                                      'lt',
                                                                      { popeq: { cached: true,
                                                                                 result: undefined } }]).value);
  }
  async _blockTimeLte_0(context, partialProofData, time_0) {
    return !await this._blockTimeGt_0(context, partialProofData, time_0);
  }
  _transientHash_0(value_0) {
    const result_0 = __compactRuntime.transientHash(_descriptor_25, value_0);
    return result_0;
  }
  _persistentHash_0(value_0) {
    const result_0 = __compactRuntime.persistentHash(_descriptor_6, value_0);
    return result_0;
  }
  _persistentHash_1(value_0) {
    const result_0 = __compactRuntime.persistentHash(_descriptor_24, value_0);
    return result_0;
  }
  _persistentHash_2(value_0) {
    const result_0 = __compactRuntime.persistentHash(_descriptor_17, value_0);
    return result_0;
  }
  _persistentHash_3(value_0) {
    const result_0 = __compactRuntime.persistentHash(_descriptor_23, value_0);
    return result_0;
  }
  _persistentHash_4(value_0) {
    const result_0 = __compactRuntime.persistentHash(_descriptor_22, value_0);
    return result_0;
  }
  _degradeToTransient_0(x_0) {
    const result_0 = __compactRuntime.degradeToTransient(x_0);
    return result_0;
  }
  _ownPublicKey_0(context, partialProofData) {
    const result_0 = __compactRuntime.ownPublicKey(context);
    partialProofData.privateTranscriptOutputs.push({
      value: _descriptor_5.toValue(result_0),
      alignment: _descriptor_5.alignment()
    });
    return result_0;
  }
  async _submitIssuerRequest_0(context, partialProofData, licenseHash_0) {
    const caller_0 = this._ownPublicKey_0(context, partialProofData);
    __compactRuntime.assert(!_descriptor_4.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                       partialProofData,
                                                                                       [
                                                                                        { dup: { n: 0 } },
                                                                                        { idx: { cached: false,
                                                                                                 pushPath: false,
                                                                                                 path: [
                                                                                                        { tag: 'value',
                                                                                                          value: { value: _descriptor_1.toValue(1n),
                                                                                                                   alignment: _descriptor_1.alignment() } }] } },
                                                                                        { push: { storage: false,
                                                                                                  value: __compactRuntime.StateValue.newCell({ value: _descriptor_5.toValue(caller_0),
                                                                                                                                               alignment: _descriptor_5.alignment() }).encode() } },
                                                                                        'member',
                                                                                        { popeq: { cached: true,
                                                                                                   result: undefined } }]).value),
                            'Issuer request already pending');
    if (_descriptor_4.fromValue(__compactRuntime.queryLedgerState(context,
                                                                  partialProofData,
                                                                  [
                                                                   { dup: { n: 0 } },
                                                                   { idx: { cached: false,
                                                                            pushPath: false,
                                                                            path: [
                                                                                   { tag: 'value',
                                                                                     value: { value: _descriptor_1.toValue(2n),
                                                                                              alignment: _descriptor_1.alignment() } }] } },
                                                                   { push: { storage: false,
                                                                             value: __compactRuntime.StateValue.newCell({ value: _descriptor_5.toValue(caller_0),
                                                                                                                          alignment: _descriptor_5.alignment() }).encode() } },
                                                                   'member',
                                                                   { popeq: { cached: true,
                                                                              result: undefined } }]).value))
    {
      const record_0 = _descriptor_13.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                  partialProofData,
                                                                                  [
                                                                                   { dup: { n: 0 } },
                                                                                   { idx: { cached: false,
                                                                                            pushPath: false,
                                                                                            path: [
                                                                                                   { tag: 'value',
                                                                                                     value: { value: _descriptor_1.toValue(2n),
                                                                                                              alignment: _descriptor_1.alignment() } }] } },
                                                                                   { idx: { cached: false,
                                                                                            pushPath: false,
                                                                                            path: [
                                                                                                   { tag: 'value',
                                                                                                     value: { value: _descriptor_5.toValue(caller_0),
                                                                                                              alignment: _descriptor_5.alignment() } }] } },
                                                                                   { popeq: { cached: false,
                                                                                              result: undefined } }]).value);
      __compactRuntime.assert(record_0.status !== 2, 'Issuer already approved');
    }
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { idx: { cached: false,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_1.toValue(1n),
                                                                  alignment: _descriptor_1.alignment() } }] } },
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_5.toValue(caller_0),
                                                                                              alignment: _descriptor_5.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(licenseHash_0),
                                                                                              alignment: _descriptor_0.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } },
                                       { ins: { cached: true, n: 1 } }]);
    return [];
  }
  async _approveIssuer_0(context,
                         partialProofData,
                         doctor_0,
                         attestationHash_0,
                         issuerVerificationHash_0)
  {
    __compactRuntime.assert(this._equal_0(this._ownPublicKey_0(context,
                                                               partialProofData),
                                          _descriptor_5.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                                    partialProofData,
                                                                                                    [
                                                                                                     { dup: { n: 0 } },
                                                                                                     { idx: { cached: false,
                                                                                                              pushPath: false,
                                                                                                              path: [
                                                                                                                     { tag: 'value',
                                                                                                                       value: { value: _descriptor_1.toValue(0n),
                                                                                                                                alignment: _descriptor_1.alignment() } }] } },
                                                                                                     { popeq: { cached: false,
                                                                                                                result: undefined } }]).value)),
                            'Only admin can approve issuer');
    __compactRuntime.assert(_descriptor_4.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                      partialProofData,
                                                                                      [
                                                                                       { dup: { n: 0 } },
                                                                                       { idx: { cached: false,
                                                                                                pushPath: false,
                                                                                                path: [
                                                                                                       { tag: 'value',
                                                                                                         value: { value: _descriptor_1.toValue(1n),
                                                                                                                  alignment: _descriptor_1.alignment() } }] } },
                                                                                       { push: { storage: false,
                                                                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_5.toValue(doctor_0),
                                                                                                                                              alignment: _descriptor_5.alignment() }).encode() } },
                                                                                       'member',
                                                                                       { popeq: { cached: true,
                                                                                                  result: undefined } }]).value),
                            'Issuer request not found');
    const hash_0 = _descriptor_0.fromValue(__compactRuntime.queryLedgerState(context,
                                                                             partialProofData,
                                                                             [
                                                                              { dup: { n: 0 } },
                                                                              { idx: { cached: false,
                                                                                       pushPath: false,
                                                                                       path: [
                                                                                              { tag: 'value',
                                                                                                value: { value: _descriptor_1.toValue(1n),
                                                                                                         alignment: _descriptor_1.alignment() } }] } },
                                                                              { idx: { cached: false,
                                                                                       pushPath: false,
                                                                                       path: [
                                                                                              { tag: 'value',
                                                                                                value: { value: _descriptor_5.toValue(doctor_0),
                                                                                                         alignment: _descriptor_5.alignment() } }] } },
                                                                              { popeq: { cached: false,
                                                                                         result: undefined } }]).value);
    const record_0 = { doctorKey: doctor_0,
                       licenseHash: hash_0,
                       attestationHash: attestationHash_0,
                       issuerVerificationHash: issuerVerificationHash_0,
                       status: 2,
                       submittedAt: 0n,
                       approvedAt: 0n,
                       revokedAt: 0n };
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { idx: { cached: false,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_1.toValue(2n),
                                                                  alignment: _descriptor_1.alignment() } }] } },
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_5.toValue(doctor_0),
                                                                                              alignment: _descriptor_5.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_13.toValue(record_0),
                                                                                              alignment: _descriptor_13.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } },
                                       { ins: { cached: true, n: 1 } }]);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { idx: { cached: false,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_1.toValue(1n),
                                                                  alignment: _descriptor_1.alignment() } }] } },
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_5.toValue(doctor_0),
                                                                                              alignment: _descriptor_5.alignment() }).encode() } },
                                       { rem: { cached: false } },
                                       { ins: { cached: true, n: 1 } }]);
    return [];
  }
  async _revokeIssuer_0(context, partialProofData, doctor_0) {
    __compactRuntime.assert(this._equal_1(this._ownPublicKey_0(context,
                                                               partialProofData),
                                          _descriptor_5.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                                    partialProofData,
                                                                                                    [
                                                                                                     { dup: { n: 0 } },
                                                                                                     { idx: { cached: false,
                                                                                                              pushPath: false,
                                                                                                              path: [
                                                                                                                     { tag: 'value',
                                                                                                                       value: { value: _descriptor_1.toValue(0n),
                                                                                                                                alignment: _descriptor_1.alignment() } }] } },
                                                                                                     { popeq: { cached: false,
                                                                                                                result: undefined } }]).value)),
                            'Only admin can revoke issuer');
    __compactRuntime.assert(_descriptor_4.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                      partialProofData,
                                                                                      [
                                                                                       { dup: { n: 0 } },
                                                                                       { idx: { cached: false,
                                                                                                pushPath: false,
                                                                                                path: [
                                                                                                       { tag: 'value',
                                                                                                         value: { value: _descriptor_1.toValue(2n),
                                                                                                                  alignment: _descriptor_1.alignment() } }] } },
                                                                                       { push: { storage: false,
                                                                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_5.toValue(doctor_0),
                                                                                                                                              alignment: _descriptor_5.alignment() }).encode() } },
                                                                                       'member',
                                                                                       { popeq: { cached: true,
                                                                                                  result: undefined } }]).value),
                            'Issuer not found');
    const current_0 = _descriptor_13.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                 partialProofData,
                                                                                 [
                                                                                  { dup: { n: 0 } },
                                                                                  { idx: { cached: false,
                                                                                           pushPath: false,
                                                                                           path: [
                                                                                                  { tag: 'value',
                                                                                                    value: { value: _descriptor_1.toValue(2n),
                                                                                                             alignment: _descriptor_1.alignment() } }] } },
                                                                                  { idx: { cached: false,
                                                                                           pushPath: false,
                                                                                           path: [
                                                                                                  { tag: 'value',
                                                                                                    value: { value: _descriptor_5.toValue(doctor_0),
                                                                                                             alignment: _descriptor_5.alignment() } }] } },
                                                                                  { popeq: { cached: false,
                                                                                             result: undefined } }]).value);
    const updated_0 = { doctorKey: current_0.doctorKey,
                        licenseHash: current_0.licenseHash,
                        attestationHash: current_0.attestationHash,
                        issuerVerificationHash: current_0.issuerVerificationHash,
                        status: 3,
                        submittedAt: current_0.submittedAt,
                        approvedAt: current_0.approvedAt,
                        revokedAt: 0n };
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { idx: { cached: false,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_1.toValue(2n),
                                                                  alignment: _descriptor_1.alignment() } }] } },
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_5.toValue(doctor_0),
                                                                                              alignment: _descriptor_5.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_13.toValue(updated_0),
                                                                                              alignment: _descriptor_13.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } },
                                       { ins: { cached: true, n: 1 } }]);
    return [];
  }
  async _transferAdmin_0(context, partialProofData, newAdmin_0) {
    __compactRuntime.assert(this._equal_2(this._ownPublicKey_0(context,
                                                               partialProofData),
                                          _descriptor_5.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                                    partialProofData,
                                                                                                    [
                                                                                                     { dup: { n: 0 } },
                                                                                                     { idx: { cached: false,
                                                                                                              pushPath: false,
                                                                                                              path: [
                                                                                                                     { tag: 'value',
                                                                                                                       value: { value: _descriptor_1.toValue(0n),
                                                                                                                                alignment: _descriptor_1.alignment() } }] } },
                                                                                                     { popeq: { cached: false,
                                                                                                                result: undefined } }]).value)),
                            'Only admin can transfer admin role');
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_1.toValue(0n),
                                                                                              alignment: _descriptor_1.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_5.toValue(newAdmin_0),
                                                                                              alignment: _descriptor_5.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    return [];
  }
  async _registerCredential_0(context, partialProofData, credentialId_0) {
    const caller_0 = this._ownPublicKey_0(context, partialProofData);
    __compactRuntime.assert(_descriptor_4.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                      partialProofData,
                                                                                      [
                                                                                       { dup: { n: 0 } },
                                                                                       { idx: { cached: false,
                                                                                                pushPath: false,
                                                                                                path: [
                                                                                                       { tag: 'value',
                                                                                                         value: { value: _descriptor_1.toValue(2n),
                                                                                                                  alignment: _descriptor_1.alignment() } }] } },
                                                                                       { push: { storage: false,
                                                                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_5.toValue(caller_0),
                                                                                                                                              alignment: _descriptor_5.alignment() }).encode() } },
                                                                                       'member',
                                                                                       { popeq: { cached: true,
                                                                                                  result: undefined } }]).value),
                            'Caller is not a registered issuer');
    const record_0 = _descriptor_13.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                partialProofData,
                                                                                [
                                                                                 { dup: { n: 0 } },
                                                                                 { idx: { cached: false,
                                                                                          pushPath: false,
                                                                                          path: [
                                                                                                 { tag: 'value',
                                                                                                   value: { value: _descriptor_1.toValue(2n),
                                                                                                            alignment: _descriptor_1.alignment() } }] } },
                                                                                 { idx: { cached: false,
                                                                                          pushPath: false,
                                                                                          path: [
                                                                                                 { tag: 'value',
                                                                                                   value: { value: _descriptor_5.toValue(caller_0),
                                                                                                            alignment: _descriptor_5.alignment() } }] } },
                                                                                 { popeq: { cached: false,
                                                                                            result: undefined } }]).value);
    __compactRuntime.assert(record_0.status === 2,
                            'Issuer must be approved to register credentials');
    __compactRuntime.assert(!_descriptor_4.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                       partialProofData,
                                                                                       [
                                                                                        { dup: { n: 0 } },
                                                                                        { idx: { cached: false,
                                                                                                 pushPath: false,
                                                                                                 path: [
                                                                                                        { tag: 'value',
                                                                                                          value: { value: _descriptor_1.toValue(3n),
                                                                                                                   alignment: _descriptor_1.alignment() } }] } },
                                                                                        { push: { storage: false,
                                                                                                  value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(credentialId_0),
                                                                                                                                               alignment: _descriptor_0.alignment() }).encode() } },
                                                                                        'member',
                                                                                        { popeq: { cached: true,
                                                                                                   result: undefined } }]).value),
                            'Credential already registered');
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { idx: { cached: false,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_1.toValue(3n),
                                                                  alignment: _descriptor_1.alignment() } }] } },
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(credentialId_0),
                                                                                              alignment: _descriptor_0.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_5.toValue(caller_0),
                                                                                              alignment: _descriptor_5.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } },
                                       { ins: { cached: true, n: 1 } }]);
    return [];
  }
  _diagnosisSlotKey_0(credentialId_0, slot_0) {
    const slotBytes_0 = this._persistentHash_0(slot_0);
    return this._persistentHash_1([credentialId_0, slotBytes_0]);
  }
  async _nextDiagnosisSlotForCard_0(context, partialProofData, credentialId_0) {
    if (_descriptor_4.fromValue(__compactRuntime.queryLedgerState(context,
                                                                  partialProofData,
                                                                  [
                                                                   { dup: { n: 0 } },
                                                                   { idx: { cached: false,
                                                                            pushPath: false,
                                                                            path: [
                                                                                   { tag: 'value',
                                                                                     value: { value: _descriptor_1.toValue(5n),
                                                                                              alignment: _descriptor_1.alignment() } }] } },
                                                                   { push: { storage: false,
                                                                             value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(credentialId_0),
                                                                                                                          alignment: _descriptor_0.alignment() }).encode() } },
                                                                   'member',
                                                                   { popeq: { cached: true,
                                                                              result: undefined } }]).value))
    {
      return _descriptor_6.fromValue(__compactRuntime.queryLedgerState(context,
                                                                       partialProofData,
                                                                       [
                                                                        { dup: { n: 0 } },
                                                                        { idx: { cached: false,
                                                                                 pushPath: false,
                                                                                 path: [
                                                                                        { tag: 'value',
                                                                                          value: { value: _descriptor_1.toValue(5n),
                                                                                                   alignment: _descriptor_1.alignment() } }] } },
                                                                        { idx: { cached: false,
                                                                                 pushPath: false,
                                                                                 path: [
                                                                                        { tag: 'value',
                                                                                          value: { value: _descriptor_0.toValue(credentialId_0),
                                                                                                   alignment: _descriptor_0.alignment() } }] } },
                                                                        { popeq: { cached: false,
                                                                                   result: undefined } }]).value);
    } else {
      return 0n;
    }
  }
  async _appendDiagnosisToCredential_0(context,
                                       partialProofData,
                                       credentialId_0,
                                       entryCommitment_0)
  {
    const caller_0 = this._ownPublicKey_0(context, partialProofData);
    __compactRuntime.assert(_descriptor_4.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                      partialProofData,
                                                                                      [
                                                                                       { dup: { n: 0 } },
                                                                                       { idx: { cached: false,
                                                                                                pushPath: false,
                                                                                                path: [
                                                                                                       { tag: 'value',
                                                                                                         value: { value: _descriptor_1.toValue(2n),
                                                                                                                  alignment: _descriptor_1.alignment() } }] } },
                                                                                       { push: { storage: false,
                                                                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_5.toValue(caller_0),
                                                                                                                                              alignment: _descriptor_5.alignment() }).encode() } },
                                                                                       'member',
                                                                                       { popeq: { cached: true,
                                                                                                  result: undefined } }]).value),
                            'Caller is not a registered issuer');
    const record_0 = _descriptor_13.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                partialProofData,
                                                                                [
                                                                                 { dup: { n: 0 } },
                                                                                 { idx: { cached: false,
                                                                                          pushPath: false,
                                                                                          path: [
                                                                                                 { tag: 'value',
                                                                                                   value: { value: _descriptor_1.toValue(2n),
                                                                                                            alignment: _descriptor_1.alignment() } }] } },
                                                                                 { idx: { cached: false,
                                                                                          pushPath: false,
                                                                                          path: [
                                                                                                 { tag: 'value',
                                                                                                   value: { value: _descriptor_5.toValue(caller_0),
                                                                                                            alignment: _descriptor_5.alignment() } }] } },
                                                                                 { popeq: { cached: false,
                                                                                            result: undefined } }]).value);
    __compactRuntime.assert(record_0.status === 2,
                            'Issuer must be approved to append diagnoses');
    __compactRuntime.assert(_descriptor_4.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                      partialProofData,
                                                                                      [
                                                                                       { dup: { n: 0 } },
                                                                                       { idx: { cached: false,
                                                                                                pushPath: false,
                                                                                                path: [
                                                                                                       { tag: 'value',
                                                                                                         value: { value: _descriptor_1.toValue(3n),
                                                                                                                  alignment: _descriptor_1.alignment() } }] } },
                                                                                       { push: { storage: false,
                                                                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(credentialId_0),
                                                                                                                                              alignment: _descriptor_0.alignment() }).encode() } },
                                                                                       'member',
                                                                                       { popeq: { cached: true,
                                                                                                  result: undefined } }]).value),
                            'Credential not registered');
    __compactRuntime.assert(!_descriptor_4.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                       partialProofData,
                                                                                       [
                                                                                        { dup: { n: 0 } },
                                                                                        { idx: { cached: false,
                                                                                                 pushPath: false,
                                                                                                 path: [
                                                                                                        { tag: 'value',
                                                                                                          value: { value: _descriptor_1.toValue(4n),
                                                                                                                   alignment: _descriptor_1.alignment() } }] } },
                                                                                        { push: { storage: false,
                                                                                                  value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(credentialId_0),
                                                                                                                                               alignment: _descriptor_0.alignment() }).encode() } },
                                                                                        'member',
                                                                                        { popeq: { cached: true,
                                                                                                   result: undefined } }]).value),
                            'Credential revoked');
    const issuer_0 = _descriptor_5.fromValue(__compactRuntime.queryLedgerState(context,
                                                                               partialProofData,
                                                                               [
                                                                                { dup: { n: 0 } },
                                                                                { idx: { cached: false,
                                                                                         pushPath: false,
                                                                                         path: [
                                                                                                { tag: 'value',
                                                                                                  value: { value: _descriptor_1.toValue(3n),
                                                                                                           alignment: _descriptor_1.alignment() } }] } },
                                                                                { idx: { cached: false,
                                                                                         pushPath: false,
                                                                                         path: [
                                                                                                { tag: 'value',
                                                                                                  value: { value: _descriptor_0.toValue(credentialId_0),
                                                                                                           alignment: _descriptor_0.alignment() } }] } },
                                                                                { popeq: { cached: false,
                                                                                           result: undefined } }]).value);
    __compactRuntime.assert(this._equal_3(issuer_0, caller_0),
                            'Only the issuing doctor can append to this card');
    const nextIdx_0 = await this._nextDiagnosisSlotForCard_0(context,
                                                             partialProofData,
                                                             credentialId_0);
    const slotKey_0 = this._diagnosisSlotKey_0(credentialId_0, nextIdx_0);
    __compactRuntime.assert(!_descriptor_4.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                       partialProofData,
                                                                                       [
                                                                                        { dup: { n: 0 } },
                                                                                        { idx: { cached: false,
                                                                                                 pushPath: false,
                                                                                                 path: [
                                                                                                        { tag: 'value',
                                                                                                          value: { value: _descriptor_1.toValue(6n),
                                                                                                                   alignment: _descriptor_1.alignment() } }] } },
                                                                                        { push: { storage: false,
                                                                                                  value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(slotKey_0),
                                                                                                                                               alignment: _descriptor_0.alignment() }).encode() } },
                                                                                        'member',
                                                                                        { popeq: { cached: true,
                                                                                                   result: undefined } }]).value),
                            'Diagnosis slot collision');
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { idx: { cached: false,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_1.toValue(6n),
                                                                  alignment: _descriptor_1.alignment() } }] } },
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(slotKey_0),
                                                                                              alignment: _descriptor_0.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(entryCommitment_0),
                                                                                              alignment: _descriptor_0.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } },
                                       { ins: { cached: true, n: 1 } }]);
    const tmp_0 = ((t1) => {
                    if (t1 > 18446744073709551615n) {
                      throw new __compactRuntime.CompactError('zkclinic.compact line 153 char 65: cast from Field or Uint value to smaller Uint value failed: ' + t1 + ' is greater than 18446744073709551615');
                    }
                    return t1;
                  })(nextIdx_0 + 1n);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { idx: { cached: false,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_1.toValue(5n),
                                                                  alignment: _descriptor_1.alignment() } }] } },
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(credentialId_0),
                                                                                              alignment: _descriptor_0.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_6.toValue(tmp_0),
                                                                                              alignment: _descriptor_6.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } },
                                       { ins: { cached: true, n: 1 } }]);
    return [];
  }
  async _revokeCredential_0(context, partialProofData, credentialId_0) {
    const caller_0 = this._ownPublicKey_0(context, partialProofData);
    __compactRuntime.assert(_descriptor_4.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                      partialProofData,
                                                                                      [
                                                                                       { dup: { n: 0 } },
                                                                                       { idx: { cached: false,
                                                                                                pushPath: false,
                                                                                                path: [
                                                                                                       { tag: 'value',
                                                                                                         value: { value: _descriptor_1.toValue(2n),
                                                                                                                  alignment: _descriptor_1.alignment() } }] } },
                                                                                       { push: { storage: false,
                                                                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_5.toValue(caller_0),
                                                                                                                                              alignment: _descriptor_5.alignment() }).encode() } },
                                                                                       'member',
                                                                                       { popeq: { cached: true,
                                                                                                  result: undefined } }]).value),
                            'Caller is not a registered issuer');
    const record_0 = _descriptor_13.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                partialProofData,
                                                                                [
                                                                                 { dup: { n: 0 } },
                                                                                 { idx: { cached: false,
                                                                                          pushPath: false,
                                                                                          path: [
                                                                                                 { tag: 'value',
                                                                                                   value: { value: _descriptor_1.toValue(2n),
                                                                                                            alignment: _descriptor_1.alignment() } }] } },
                                                                                 { idx: { cached: false,
                                                                                          pushPath: false,
                                                                                          path: [
                                                                                                 { tag: 'value',
                                                                                                   value: { value: _descriptor_5.toValue(caller_0),
                                                                                                            alignment: _descriptor_5.alignment() } }] } },
                                                                                 { popeq: { cached: false,
                                                                                            result: undefined } }]).value);
    __compactRuntime.assert(record_0.status === 2,
                            'Issuer must be approved to revoke credentials');
    __compactRuntime.assert(_descriptor_4.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                      partialProofData,
                                                                                      [
                                                                                       { dup: { n: 0 } },
                                                                                       { idx: { cached: false,
                                                                                                pushPath: false,
                                                                                                path: [
                                                                                                       { tag: 'value',
                                                                                                         value: { value: _descriptor_1.toValue(3n),
                                                                                                                  alignment: _descriptor_1.alignment() } }] } },
                                                                                       { push: { storage: false,
                                                                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(credentialId_0),
                                                                                                                                              alignment: _descriptor_0.alignment() }).encode() } },
                                                                                       'member',
                                                                                       { popeq: { cached: true,
                                                                                                  result: undefined } }]).value),
                            'Credential not found');
    const issuer_0 = _descriptor_5.fromValue(__compactRuntime.queryLedgerState(context,
                                                                               partialProofData,
                                                                               [
                                                                                { dup: { n: 0 } },
                                                                                { idx: { cached: false,
                                                                                         pushPath: false,
                                                                                         path: [
                                                                                                { tag: 'value',
                                                                                                  value: { value: _descriptor_1.toValue(3n),
                                                                                                           alignment: _descriptor_1.alignment() } }] } },
                                                                                { idx: { cached: false,
                                                                                         pushPath: false,
                                                                                         path: [
                                                                                                { tag: 'value',
                                                                                                  value: { value: _descriptor_0.toValue(credentialId_0),
                                                                                                           alignment: _descriptor_0.alignment() } }] } },
                                                                                { popeq: { cached: false,
                                                                                           result: undefined } }]).value);
    __compactRuntime.assert(this._equal_4(issuer_0, caller_0),
                            'Only the issuing doctor can revoke this credential');
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { idx: { cached: false,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_1.toValue(4n),
                                                                  alignment: _descriptor_1.alignment() } }] } },
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(credentialId_0),
                                                                                              alignment: _descriptor_0.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newNull().encode() } },
                                       { ins: { cached: false, n: 1 } },
                                       { ins: { cached: true, n: 1 } }]);
    return [];
  }
  async _createTrial_0(context,
                       partialProofData,
                       trialId_0,
                       slotsTotal_0,
                       deadline_0,
                       criteriaHash_0,
                       eligibilityThresholdBps_0)
  {
    const caller_0 = this._ownPublicKey_0(context, partialProofData);
    __compactRuntime.assert(!_descriptor_4.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                       partialProofData,
                                                                                       [
                                                                                        { dup: { n: 0 } },
                                                                                        { idx: { cached: false,
                                                                                                 pushPath: false,
                                                                                                 path: [
                                                                                                        { tag: 'value',
                                                                                                          value: { value: _descriptor_1.toValue(7n),
                                                                                                                   alignment: _descriptor_1.alignment() } }] } },
                                                                                        { push: { storage: false,
                                                                                                  value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(trialId_0),
                                                                                                                                               alignment: _descriptor_0.alignment() }).encode() } },
                                                                                        'member',
                                                                                        { popeq: { cached: true,
                                                                                                   result: undefined } }]).value),
                            'Trial id already exists');
    __compactRuntime.assert(slotsTotal_0 > 0n, 'Slots must be positive');
    __compactRuntime.assert(eligibilityThresholdBps_0 > 0n,
                            'Threshold must be positive');
    __compactRuntime.assert(eligibilityThresholdBps_0 <= 10000n,
                            'Threshold cannot exceed 100%');
    const record_0 = { manager: caller_0,
                       slotsTotal: slotsTotal_0,
                       slotsFilled: 0n,
                       deadline: deadline_0,
                       status: 0,
                       criteriaHash: criteriaHash_0,
                       eligibilityThresholdBps: eligibilityThresholdBps_0 };
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { idx: { cached: false,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_1.toValue(7n),
                                                                  alignment: _descriptor_1.alignment() } }] } },
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(trialId_0),
                                                                                              alignment: _descriptor_0.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_8.toValue(record_0),
                                                                                              alignment: _descriptor_8.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } },
                                       { ins: { cached: true, n: 1 } }]);
    return [];
  }
  async _closeTrial_0(context, partialProofData, trialId_0) {
    const caller_0 = this._ownPublicKey_0(context, partialProofData);
    __compactRuntime.assert(_descriptor_4.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                      partialProofData,
                                                                                      [
                                                                                       { dup: { n: 0 } },
                                                                                       { idx: { cached: false,
                                                                                                pushPath: false,
                                                                                                path: [
                                                                                                       { tag: 'value',
                                                                                                         value: { value: _descriptor_1.toValue(7n),
                                                                                                                  alignment: _descriptor_1.alignment() } }] } },
                                                                                       { push: { storage: false,
                                                                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(trialId_0),
                                                                                                                                              alignment: _descriptor_0.alignment() }).encode() } },
                                                                                       'member',
                                                                                       { popeq: { cached: true,
                                                                                                  result: undefined } }]).value),
                            'Trial not found');
    const t_0 = _descriptor_8.fromValue(__compactRuntime.queryLedgerState(context,
                                                                          partialProofData,
                                                                          [
                                                                           { dup: { n: 0 } },
                                                                           { idx: { cached: false,
                                                                                    pushPath: false,
                                                                                    path: [
                                                                                           { tag: 'value',
                                                                                             value: { value: _descriptor_1.toValue(7n),
                                                                                                      alignment: _descriptor_1.alignment() } }] } },
                                                                           { idx: { cached: false,
                                                                                    pushPath: false,
                                                                                    path: [
                                                                                           { tag: 'value',
                                                                                             value: { value: _descriptor_0.toValue(trialId_0),
                                                                                                      alignment: _descriptor_0.alignment() } }] } },
                                                                           { popeq: { cached: false,
                                                                                      result: undefined } }]).value);
    __compactRuntime.assert(this._equal_5(t_0.manager, caller_0),
                            'Only trial manager can close');
    __compactRuntime.assert(t_0.status === 0, 'Trial not open');
    const updated_0 = { manager: t_0.manager,
                        slotsTotal: t_0.slotsTotal,
                        slotsFilled: t_0.slotsFilled,
                        deadline: t_0.deadline,
                        status: 1,
                        criteriaHash: t_0.criteriaHash,
                        eligibilityThresholdBps: t_0.eligibilityThresholdBps };
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { idx: { cached: false,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_1.toValue(7n),
                                                                  alignment: _descriptor_1.alignment() } }] } },
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(trialId_0),
                                                                                              alignment: _descriptor_0.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_8.toValue(updated_0),
                                                                                              alignment: _descriptor_8.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } },
                                       { ins: { cached: true, n: 1 } }]);
    return [];
  }
  async _fillOneSlot_0(context, partialProofData, trialId_0) {
    const t_0 = _descriptor_8.fromValue(__compactRuntime.queryLedgerState(context,
                                                                          partialProofData,
                                                                          [
                                                                           { dup: { n: 0 } },
                                                                           { idx: { cached: false,
                                                                                    pushPath: false,
                                                                                    path: [
                                                                                           { tag: 'value',
                                                                                             value: { value: _descriptor_1.toValue(7n),
                                                                                                      alignment: _descriptor_1.alignment() } }] } },
                                                                           { idx: { cached: false,
                                                                                    pushPath: false,
                                                                                    path: [
                                                                                           { tag: 'value',
                                                                                             value: { value: _descriptor_0.toValue(trialId_0),
                                                                                                      alignment: _descriptor_0.alignment() } }] } },
                                                                           { popeq: { cached: false,
                                                                                      result: undefined } }]).value);
    __compactRuntime.assert(t_0.status === 0, 'Trial not open');
    let t_1;
    __compactRuntime.assert((t_1 = t_0.slotsFilled, t_1 < t_0.slotsTotal),
                            'No slots left');
    const newFilled_0 = ((t1) => {
                          if (t1 > 18446744073709551615n) {
                            throw new __compactRuntime.CompactError('zkclinic.compact line 220 char 23: cast from Field or Uint value to smaller Uint value failed: ' + t1 + ' is greater than 18446744073709551615');
                          }
                          return t1;
                        })(t_0.slotsFilled + 1n);
    const tmp_0 = { manager: t_0.manager,
                    slotsTotal: t_0.slotsTotal,
                    slotsFilled: newFilled_0,
                    deadline: t_0.deadline,
                    status: newFilled_0 === t_0.slotsTotal ? 2 : 0,
                    criteriaHash: t_0.criteriaHash,
                    eligibilityThresholdBps: t_0.eligibilityThresholdBps };
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { idx: { cached: false,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_1.toValue(7n),
                                                                  alignment: _descriptor_1.alignment() } }] } },
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(trialId_0),
                                                                                              alignment: _descriptor_0.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_8.toValue(tmp_0),
                                                                                              alignment: _descriptor_8.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } },
                                       { ins: { cached: true, n: 1 } }]);
    return [];
  }
  _patientSecretKey_0(context, partialProofData) {
    const witnessContext_0 = __compactRuntime.createWitnessContext(ledger(context.callContext.currentQueryContext.state), context.callContext.currentPrivateState, context.callContext.currentQueryContext.address);
    const [nextPrivateState_0, result_0] = this.witnesses.patientSecretKey(witnessContext_0);
    context.callContext.currentPrivateState = nextPrivateState_0;
    if (!(result_0.buffer instanceof ArrayBuffer && result_0.BYTES_PER_ELEMENT === 1 && result_0.length === 32)) {
      __compactRuntime.typeError('patientSecretKey',
                                 'return value',
                                 'zkclinic.compact line 278 char 1',
                                 'Bytes<32>',
                                 result_0)
    }
    partialProofData.privateTranscriptOutputs.push({
      value: _descriptor_0.toValue(result_0),
      alignment: _descriptor_0.alignment()
    });
    return result_0;
  }
  _healthAttributes_0(context, partialProofData) {
    const witnessContext_0 = __compactRuntime.createWitnessContext(ledger(context.callContext.currentQueryContext.state), context.callContext.currentPrivateState, context.callContext.currentQueryContext.address);
    const [nextPrivateState_0, result_0] = this.witnesses.healthAttributes(witnessContext_0);
    context.callContext.currentPrivateState = nextPrivateState_0;
    if (!(typeof(result_0) === 'object' && typeof(result_0.ageYears) === 'bigint' && result_0.ageYears >= 0n && result_0.ageYears <= 255n && Array.isArray(result_0.diagnoses) && result_0.diagnoses.length === 4 && result_0.diagnoses.every((t) => t.buffer instanceof ArrayBuffer && t.BYTES_PER_ELEMENT === 1 && t.length === 32) && Array.isArray(result_0.labs) && result_0.labs.length === 4 && result_0.labs.every((t) => typeof(t) === 'object' && t.code.buffer instanceof ArrayBuffer && t.code.BYTES_PER_ELEMENT === 1 && t.code.length === 32 && typeof(t.value) === 'bigint' && t.value >= 0n && t.value <= 4294967295n) && typeof(result_0.expiresAt) === 'bigint' && result_0.expiresAt >= 0n && result_0.expiresAt <= 18446744073709551615n && result_0.salt.buffer instanceof ArrayBuffer && result_0.salt.BYTES_PER_ELEMENT === 1 && result_0.salt.length === 32)) {
      __compactRuntime.typeError('healthAttributes',
                                 'return value',
                                 'zkclinic.compact line 279 char 1',
                                 'struct HealthAttributes<ageYears: Uint<0..256>, diagnoses: Vector<4, Bytes<32>>, labs: Vector<4, struct LabResult<code: Bytes<32>, value: Uint<0..4294967296>>>, expiresAt: Uint<0..18446744073709551616>, salt: Bytes<32>>',
                                 result_0)
    }
    partialProofData.privateTranscriptOutputs.push({
      value: _descriptor_17.toValue(result_0),
      alignment: _descriptor_17.alignment()
    });
    return result_0;
  }
  _credentialPath_0(context, partialProofData, commitment_0) {
    const witnessContext_0 = __compactRuntime.createWitnessContext(ledger(context.callContext.currentQueryContext.state), context.callContext.currentPrivateState, context.callContext.currentQueryContext.address);
    const [nextPrivateState_0, result_0] = this.witnesses.credentialPath(witnessContext_0,
                                                                         commitment_0);
    context.callContext.currentPrivateState = nextPrivateState_0;
    if (!(typeof(result_0) === 'object' && result_0.leaf.buffer instanceof ArrayBuffer && result_0.leaf.BYTES_PER_ELEMENT === 1 && result_0.leaf.length === 32 && Array.isArray(result_0.path) && result_0.path.length === 16 && result_0.path.every((t) => typeof(t) === 'object' && typeof(t.sibling) === 'object' && typeof(t.sibling.field) === 'bigint' && t.sibling.field >= 0 && t.sibling.field <= __compactRuntime.MAX_FIELD && typeof(t.goes_left) === 'boolean'))) {
      __compactRuntime.typeError('credentialPath',
                                 'return value',
                                 'zkclinic.compact line 280 char 1',
                                 'struct MerkleTreePath<leaf: Bytes<32>, path: Vector<16, struct MerkleTreePathEntry<sibling: struct MerkleTreeDigest<field: Field>, goes_left: Boolean>>>',
                                 result_0)
    }
    partialProofData.privateTranscriptOutputs.push({
      value: _descriptor_20.toValue(result_0),
      alignment: _descriptor_20.alignment()
    });
    return result_0;
  }
  _recordApplication_0(context, partialProofData, trialId_0, nullifier_0) {
    const witnessContext_0 = __compactRuntime.createWitnessContext(ledger(context.callContext.currentQueryContext.state), context.callContext.currentPrivateState, context.callContext.currentQueryContext.address);
    const [nextPrivateState_0, result_0] = this.witnesses.recordApplication(witnessContext_0,
                                                                            trialId_0,
                                                                            nullifier_0);
    context.callContext.currentPrivateState = nextPrivateState_0;
    if (!(Array.isArray(result_0) && result_0.length === 0 )) {
      __compactRuntime.typeError('recordApplication',
                                 'return value',
                                 'zkclinic.compact line 282 char 1',
                                 '[]',
                                 result_0)
    }
    partialProofData.privateTranscriptOutputs.push({
      value: [],
      alignment: []
    });
    return result_0;
  }
  _patientPublicKey_0(sk_0) {
    return this._persistentHash_1([new Uint8Array([122, 107, 99, 108, 105, 110, 105, 99, 58, 112, 107, 58, 118, 49, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]),
                                   sk_0]);
  }
  _credentialCommitment_0(ownerPk_0, attrs_0) {
    return this._persistentHash_3([new Uint8Array([122, 107, 99, 108, 105, 110, 105, 99, 58, 99, 114, 101, 100, 58, 118, 49, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]),
                                   ownerPk_0,
                                   this._persistentHash_2(attrs_0)]);
  }
  _trialNullifier_0(trialId_0, sk_0) {
    return this._persistentHash_3([new Uint8Array([122, 107, 99, 108, 105, 110, 105, 99, 58, 110, 117, 108, 58, 118, 49, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]),
                                   trialId_0,
                                   sk_0]);
  }
  async _issueCredentialCommitment_0(context, partialProofData, commitment_0) {
    const caller_0 = this._ownPublicKey_0(context, partialProofData);
    __compactRuntime.assert(_descriptor_4.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                      partialProofData,
                                                                                      [
                                                                                       { dup: { n: 0 } },
                                                                                       { idx: { cached: false,
                                                                                                pushPath: false,
                                                                                                path: [
                                                                                                       { tag: 'value',
                                                                                                         value: { value: _descriptor_1.toValue(2n),
                                                                                                                  alignment: _descriptor_1.alignment() } }] } },
                                                                                       { push: { storage: false,
                                                                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_5.toValue(caller_0),
                                                                                                                                              alignment: _descriptor_5.alignment() }).encode() } },
                                                                                       'member',
                                                                                       { popeq: { cached: true,
                                                                                                  result: undefined } }]).value),
                            'Caller is not a registered issuer');
    __compactRuntime.assert(_descriptor_13.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                       partialProofData,
                                                                                       [
                                                                                        { dup: { n: 0 } },
                                                                                        { idx: { cached: false,
                                                                                                 pushPath: false,
                                                                                                 path: [
                                                                                                        { tag: 'value',
                                                                                                          value: { value: _descriptor_1.toValue(2n),
                                                                                                                   alignment: _descriptor_1.alignment() } }] } },
                                                                                        { idx: { cached: false,
                                                                                                 pushPath: false,
                                                                                                 path: [
                                                                                                        { tag: 'value',
                                                                                                          value: { value: _descriptor_5.toValue(caller_0),
                                                                                                                   alignment: _descriptor_5.alignment() } }] } },
                                                                                        { popeq: { cached: false,
                                                                                                   result: undefined } }]).value).status
                            ===
                            2,
                            'Issuer must be approved to attest credentials');
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { idx: { cached: false,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_1.toValue(8n),
                                                                  alignment: _descriptor_1.alignment() } }] } },
                                       { idx: { cached: false,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_1.toValue(0n),
                                                                  alignment: _descriptor_1.alignment() } }] } },
                                       { dup: { n: 2 } },
                                       { idx: { cached: false,
                                                pushPath: false,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_1.toValue(1n),
                                                                  alignment: _descriptor_1.alignment() } }] } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell(__compactRuntime.leafHash(
                                                                                              { value: _descriptor_0.toValue(commitment_0),
                                                                                                alignment: _descriptor_0.alignment() }
                                                                                            )).encode() } },
                                       { ins: { cached: false, n: 1 } },
                                       { ins: { cached: true, n: 1 } },
                                       { idx: { cached: false,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_1.toValue(1n),
                                                                  alignment: _descriptor_1.alignment() } }] } },
                                       { addi: { immediate: 1 } },
                                       { ins: { cached: true, n: 1 } },
                                       { idx: { cached: false,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_1.toValue(2n),
                                                                  alignment: _descriptor_1.alignment() } }] } },
                                       { dup: { n: 2 } },
                                       { idx: { cached: false,
                                                pushPath: false,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_1.toValue(0n),
                                                                  alignment: _descriptor_1.alignment() } }] } },
                                       'root',
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newNull().encode() } },
                                       { ins: { cached: false, n: 1 } },
                                       { ins: { cached: true, n: 2 } }]);
    const tmp_0 = 1n;
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { idx: { cached: false,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_1.toValue(9n),
                                                                  alignment: _descriptor_1.alignment() } }] } },
                                       { addi: { immediate: parseInt(__compactRuntime.valueToBigInt(
                                                              { value: _descriptor_11.toValue(tmp_0),
                                                                alignment: _descriptor_11.alignment() }
                                                                .value
                                                            )) } },
                                       { ins: { cached: true, n: 1 } }]);
    return [];
  }
  async _publishTrialCriteria_0(context, partialProofData, trialId_0, criteria_0)
  {
    const tid_0 = trialId_0;
    const c_0 = criteria_0;
    __compactRuntime.assert(_descriptor_4.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                      partialProofData,
                                                                                      [
                                                                                       { dup: { n: 0 } },
                                                                                       { idx: { cached: false,
                                                                                                pushPath: false,
                                                                                                path: [
                                                                                                       { tag: 'value',
                                                                                                         value: { value: _descriptor_1.toValue(7n),
                                                                                                                  alignment: _descriptor_1.alignment() } }] } },
                                                                                       { push: { storage: false,
                                                                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(tid_0),
                                                                                                                                              alignment: _descriptor_0.alignment() }).encode() } },
                                                                                       'member',
                                                                                       { popeq: { cached: true,
                                                                                                  result: undefined } }]).value),
                            'Trial not found');
    __compactRuntime.assert(this._equal_6(_descriptor_8.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                                    partialProofData,
                                                                                                    [
                                                                                                     { dup: { n: 0 } },
                                                                                                     { idx: { cached: false,
                                                                                                              pushPath: false,
                                                                                                              path: [
                                                                                                                     { tag: 'value',
                                                                                                                       value: { value: _descriptor_1.toValue(7n),
                                                                                                                                alignment: _descriptor_1.alignment() } }] } },
                                                                                                     { idx: { cached: false,
                                                                                                              pushPath: false,
                                                                                                              path: [
                                                                                                                     { tag: 'value',
                                                                                                                       value: { value: _descriptor_0.toValue(tid_0),
                                                                                                                                alignment: _descriptor_0.alignment() } }] } },
                                                                                                     { popeq: { cached: false,
                                                                                                                result: undefined } }]).value).manager,
                                          this._ownPublicKey_0(context,
                                                               partialProofData)),
                            'Only trial manager can publish criteria');
    __compactRuntime.assert(!_descriptor_4.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                       partialProofData,
                                                                                       [
                                                                                        { dup: { n: 0 } },
                                                                                        { idx: { cached: false,
                                                                                                 pushPath: false,
                                                                                                 path: [
                                                                                                        { tag: 'value',
                                                                                                          value: { value: _descriptor_1.toValue(10n),
                                                                                                                   alignment: _descriptor_1.alignment() } }] } },
                                                                                        { push: { storage: false,
                                                                                                  value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(tid_0),
                                                                                                                                               alignment: _descriptor_0.alignment() }).encode() } },
                                                                                        'member',
                                                                                        { popeq: { cached: true,
                                                                                                   result: undefined } }]).value),
                            'Criteria already published');
    let t_0;
    __compactRuntime.assert((t_0 = c_0.minAge, t_0 <= c_0.maxAge),
                            'minAge cannot exceed maxAge');
    let t_1;
    __compactRuntime.assert((t_1 = c_0.labMin, t_1 <= c_0.labMax),
                            'labMin cannot exceed labMax');
    __compactRuntime.assert(!this._equal_7(c_0.requiredDiagnosis,
                                           new Uint8Array(32)),
                            'Required diagnosis missing');
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { idx: { cached: false,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_1.toValue(10n),
                                                                  alignment: _descriptor_1.alignment() } }] } },
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(tid_0),
                                                                                              alignment: _descriptor_0.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_3.toValue(c_0),
                                                                                              alignment: _descriptor_3.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } },
                                       { ins: { cached: true, n: 1 } }]);
    return [];
  }
  async _proveEligibility_0(context, partialProofData, trialId_0, asOf_0) {
    const tid_0 = trialId_0;
    const now_0 = asOf_0;
    __compactRuntime.assert(_descriptor_4.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                      partialProofData,
                                                                                      [
                                                                                       { dup: { n: 0 } },
                                                                                       { idx: { cached: false,
                                                                                                pushPath: false,
                                                                                                path: [
                                                                                                       { tag: 'value',
                                                                                                         value: { value: _descriptor_1.toValue(7n),
                                                                                                                  alignment: _descriptor_1.alignment() } }] } },
                                                                                       { push: { storage: false,
                                                                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(tid_0),
                                                                                                                                              alignment: _descriptor_0.alignment() }).encode() } },
                                                                                       'member',
                                                                                       { popeq: { cached: true,
                                                                                                  result: undefined } }]).value),
                            'Trial not found');
    __compactRuntime.assert(_descriptor_8.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                      partialProofData,
                                                                                      [
                                                                                       { dup: { n: 0 } },
                                                                                       { idx: { cached: false,
                                                                                                pushPath: false,
                                                                                                path: [
                                                                                                       { tag: 'value',
                                                                                                         value: { value: _descriptor_1.toValue(7n),
                                                                                                                  alignment: _descriptor_1.alignment() } }] } },
                                                                                       { idx: { cached: false,
                                                                                                pushPath: false,
                                                                                                path: [
                                                                                                       { tag: 'value',
                                                                                                         value: { value: _descriptor_0.toValue(tid_0),
                                                                                                                  alignment: _descriptor_0.alignment() } }] } },
                                                                                       { popeq: { cached: false,
                                                                                                  result: undefined } }]).value).status
                            ===
                            0,
                            'Trial not open');
    __compactRuntime.assert(_descriptor_4.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                      partialProofData,
                                                                                      [
                                                                                       { dup: { n: 0 } },
                                                                                       { idx: { cached: false,
                                                                                                pushPath: false,
                                                                                                path: [
                                                                                                       { tag: 'value',
                                                                                                         value: { value: _descriptor_1.toValue(10n),
                                                                                                                  alignment: _descriptor_1.alignment() } }] } },
                                                                                       { push: { storage: false,
                                                                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(tid_0),
                                                                                                                                              alignment: _descriptor_0.alignment() }).encode() } },
                                                                                       'member',
                                                                                       { popeq: { cached: true,
                                                                                                  result: undefined } }]).value),
                            'Trial has no on-chain criteria');
    const c_0 = _descriptor_3.fromValue(__compactRuntime.queryLedgerState(context,
                                                                          partialProofData,
                                                                          [
                                                                           { dup: { n: 0 } },
                                                                           { idx: { cached: false,
                                                                                    pushPath: false,
                                                                                    path: [
                                                                                           { tag: 'value',
                                                                                             value: { value: _descriptor_1.toValue(10n),
                                                                                                      alignment: _descriptor_1.alignment() } }] } },
                                                                           { idx: { cached: false,
                                                                                    pushPath: false,
                                                                                    path: [
                                                                                           { tag: 'value',
                                                                                             value: { value: _descriptor_0.toValue(tid_0),
                                                                                                      alignment: _descriptor_0.alignment() } }] } },
                                                                           { popeq: { cached: false,
                                                                                      result: undefined } }]).value);
    const sk_0 = this._patientSecretKey_0(context, partialProofData);
    const attrs_0 = this._healthAttributes_0(context, partialProofData);
    const commitment_0 = this._credentialCommitment_0(this._patientPublicKey_0(sk_0),
                                                      attrs_0);
    const path_0 = this._credentialPath_0(context,
                                          partialProofData,
                                          commitment_0);
    __compactRuntime.assert(this._equal_8(path_0.leaf, commitment_0),
                            'Merkle path is not for this credential');
    let tmp_0;
    __compactRuntime.assert((tmp_0 = this._merkleTreePathRoot_0(path_0),
                             _descriptor_4.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                       partialProofData,
                                                                                       [
                                                                                        { dup: { n: 0 } },
                                                                                        { idx: { cached: false,
                                                                                                 pushPath: false,
                                                                                                 path: [
                                                                                                        { tag: 'value',
                                                                                                          value: { value: _descriptor_1.toValue(8n),
                                                                                                                   alignment: _descriptor_1.alignment() } }] } },
                                                                                        { idx: { cached: false,
                                                                                                 pushPath: false,
                                                                                                 path: [
                                                                                                        { tag: 'value',
                                                                                                          value: { value: _descriptor_1.toValue(2n),
                                                                                                                   alignment: _descriptor_1.alignment() } }] } },
                                                                                        { push: { storage: false,
                                                                                                  value: __compactRuntime.StateValue.newCell({ value: _descriptor_10.toValue(tmp_0),
                                                                                                                                               alignment: _descriptor_10.alignment() }).encode() } },
                                                                                        'member',
                                                                                        { popeq: { cached: true,
                                                                                                   result: undefined } }]).value)),
                            'Credential was not attested by an approved doctor');
    __compactRuntime.assert(await this._blockTimeLte_0(context,
                                                       partialProofData,
                                                       now_0),
                            'asOf is in the past');
    let t_0;
    __compactRuntime.assert((t_0 = attrs_0.expiresAt, t_0 > now_0),
                            'Credential expired');
    let t_1, t_2;
    __compactRuntime.assert((t_2 = attrs_0.ageYears, t_2 >= c_0.minAge)
                            &&
                            (t_1 = attrs_0.ageYears, t_1 <= c_0.maxAge),
                            'Age outside trial range');
    __compactRuntime.assert(await this._folder_1(context,
                                                 partialProofData,
                                                 (async (context,
                                                         partialProofData,
                                                         hit_0,
                                                         d_0) =>
                                                  {
                                                    return hit_0
                                                           ||
                                                           this._equal_9(d_0,
                                                                         c_0.requiredDiagnosis);
                                                  }),
                                                 false,
                                                 attrs_0.diagnoses),
                            'Required diagnosis not present');
    if (!this._equal_10(c_0.excludedDiagnosis, new Uint8Array(32))) {
      __compactRuntime.assert(!await this._folder_2(context,
                                                    partialProofData,
                                                    (async (context,
                                                            partialProofData,
                                                            hit_1,
                                                            d_1) =>
                                                     {
                                                       return hit_1
                                                              ||
                                                              this._equal_11(d_1,
                                                                             c_0.excludedDiagnosis);
                                                     }),
                                                    false,
                                                    attrs_0.diagnoses),
                              'Excluded diagnosis present');
    }
    if (!this._equal_12(c_0.labCode, new Uint8Array(32))) {
      __compactRuntime.assert(await this._folder_3(context,
                                                   partialProofData,
                                                   (async (context,
                                                           partialProofData,
                                                           hit_2,
                                                           l_0) =>
                                                    {
                                                      let t_3, t_4;
                                                      return hit_2
                                                             ||
                                                             this._equal_13(l_0.code,
                                                                            c_0.labCode)
                                                             &&
                                                             (t_4 = l_0.value,
                                                              t_4 >= c_0.labMin)
                                                             &&
                                                             (t_3 = l_0.value,
                                                              t_3 <= c_0.labMax);
                                                    }),
                                                   false,
                                                   attrs_0.labs),
                              'Lab requirement not met');
    }
    const nul_0 = this._trialNullifier_0(tid_0, sk_0);
    __compactRuntime.assert(!_descriptor_4.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                       partialProofData,
                                                                                       [
                                                                                        { dup: { n: 0 } },
                                                                                        { idx: { cached: false,
                                                                                                 pushPath: false,
                                                                                                 path: [
                                                                                                        { tag: 'value',
                                                                                                          value: { value: _descriptor_1.toValue(11n),
                                                                                                                   alignment: _descriptor_1.alignment() } }] } },
                                                                                        { push: { storage: false,
                                                                                                  value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(nul_0),
                                                                                                                                               alignment: _descriptor_0.alignment() }).encode() } },
                                                                                        'member',
                                                                                        { popeq: { cached: true,
                                                                                                   result: undefined } }]).value),
                            'Already proven for this trial');
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { idx: { cached: false,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_1.toValue(11n),
                                                                  alignment: _descriptor_1.alignment() } }] } },
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(nul_0),
                                                                                              alignment: _descriptor_0.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(tid_0),
                                                                                              alignment: _descriptor_0.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } },
                                       { ins: { cached: true, n: 1 } }]);
    const prior_0 = _descriptor_4.fromValue(__compactRuntime.queryLedgerState(context,
                                                                              partialProofData,
                                                                              [
                                                                               { dup: { n: 0 } },
                                                                               { idx: { cached: false,
                                                                                        pushPath: false,
                                                                                        path: [
                                                                                               { tag: 'value',
                                                                                                 value: { value: _descriptor_1.toValue(12n),
                                                                                                          alignment: _descriptor_1.alignment() } }] } },
                                                                               { push: { storage: false,
                                                                                         value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(tid_0),
                                                                                                                                      alignment: _descriptor_0.alignment() }).encode() } },
                                                                               'member',
                                                                               { popeq: { cached: true,
                                                                                          result: undefined } }]).value)
                    ?
                    _descriptor_6.fromValue(__compactRuntime.queryLedgerState(context,
                                                                              partialProofData,
                                                                              [
                                                                               { dup: { n: 0 } },
                                                                               { idx: { cached: false,
                                                                                        pushPath: false,
                                                                                        path: [
                                                                                               { tag: 'value',
                                                                                                 value: { value: _descriptor_1.toValue(12n),
                                                                                                          alignment: _descriptor_1.alignment() } }] } },
                                                                               { idx: { cached: false,
                                                                                        pushPath: false,
                                                                                        path: [
                                                                                               { tag: 'value',
                                                                                                 value: { value: _descriptor_0.toValue(tid_0),
                                                                                                          alignment: _descriptor_0.alignment() } }] } },
                                                                               { popeq: { cached: false,
                                                                                          result: undefined } }]).value)
                    :
                    0n;
    const tmp_1 = ((t1) => {
                    if (t1 > 18446744073709551615n) {
                      throw new __compactRuntime.CompactError('zkclinic.compact line 363 char 36: cast from Field or Uint value to smaller Uint value failed: ' + t1 + ' is greater than 18446744073709551615');
                    }
                    return t1;
                  })(prior_0 + 1n);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { idx: { cached: false,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_1.toValue(12n),
                                                                  alignment: _descriptor_1.alignment() } }] } },
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(tid_0),
                                                                                              alignment: _descriptor_0.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_6.toValue(tmp_1),
                                                                                              alignment: _descriptor_6.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } },
                                       { ins: { cached: true, n: 1 } }]);
    this._recordApplication_0(context, partialProofData, tid_0, nul_0);
    return nul_0;
  }
  async _recordEnrollment_0(context, partialProofData, trialId_0, nullifier_0) {
    const tid_0 = trialId_0;
    const nul_0 = nullifier_0;
    __compactRuntime.assert(_descriptor_4.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                      partialProofData,
                                                                                      [
                                                                                       { dup: { n: 0 } },
                                                                                       { idx: { cached: false,
                                                                                                pushPath: false,
                                                                                                path: [
                                                                                                       { tag: 'value',
                                                                                                         value: { value: _descriptor_1.toValue(7n),
                                                                                                                  alignment: _descriptor_1.alignment() } }] } },
                                                                                       { push: { storage: false,
                                                                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(tid_0),
                                                                                                                                              alignment: _descriptor_0.alignment() }).encode() } },
                                                                                       'member',
                                                                                       { popeq: { cached: true,
                                                                                                  result: undefined } }]).value),
                            'Trial not found');
    __compactRuntime.assert(this._equal_14(_descriptor_8.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                                     partialProofData,
                                                                                                     [
                                                                                                      { dup: { n: 0 } },
                                                                                                      { idx: { cached: false,
                                                                                                               pushPath: false,
                                                                                                               path: [
                                                                                                                      { tag: 'value',
                                                                                                                        value: { value: _descriptor_1.toValue(7n),
                                                                                                                                 alignment: _descriptor_1.alignment() } }] } },
                                                                                                      { idx: { cached: false,
                                                                                                               pushPath: false,
                                                                                                               path: [
                                                                                                                      { tag: 'value',
                                                                                                                        value: { value: _descriptor_0.toValue(tid_0),
                                                                                                                                 alignment: _descriptor_0.alignment() } }] } },
                                                                                                      { popeq: { cached: false,
                                                                                                                 result: undefined } }]).value).manager,
                                           this._ownPublicKey_0(context,
                                                                partialProofData)),
                            'Only trial manager can record enrollment');
    __compactRuntime.assert(_descriptor_4.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                      partialProofData,
                                                                                      [
                                                                                       { dup: { n: 0 } },
                                                                                       { idx: { cached: false,
                                                                                                pushPath: false,
                                                                                                path: [
                                                                                                       { tag: 'value',
                                                                                                         value: { value: _descriptor_1.toValue(11n),
                                                                                                                  alignment: _descriptor_1.alignment() } }] } },
                                                                                       { push: { storage: false,
                                                                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(nul_0),
                                                                                                                                              alignment: _descriptor_0.alignment() }).encode() } },
                                                                                       'member',
                                                                                       { popeq: { cached: true,
                                                                                                  result: undefined } }]).value),
                            'No eligibility proof for this pseudonym');
    __compactRuntime.assert(this._equal_15(_descriptor_0.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                                     partialProofData,
                                                                                                     [
                                                                                                      { dup: { n: 0 } },
                                                                                                      { idx: { cached: false,
                                                                                                               pushPath: false,
                                                                                                               path: [
                                                                                                                      { tag: 'value',
                                                                                                                        value: { value: _descriptor_1.toValue(11n),
                                                                                                                                 alignment: _descriptor_1.alignment() } }] } },
                                                                                                      { idx: { cached: false,
                                                                                                               pushPath: false,
                                                                                                               path: [
                                                                                                                      { tag: 'value',
                                                                                                                        value: { value: _descriptor_0.toValue(nul_0),
                                                                                                                                 alignment: _descriptor_0.alignment() } }] } },
                                                                                                      { popeq: { cached: false,
                                                                                                                 result: undefined } }]).value),
                                           tid_0),
                            'Proof is bound to a different trial');
    __compactRuntime.assert(!_descriptor_4.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                       partialProofData,
                                                                                       [
                                                                                        { dup: { n: 0 } },
                                                                                        { idx: { cached: false,
                                                                                                 pushPath: false,
                                                                                                 path: [
                                                                                                        { tag: 'value',
                                                                                                          value: { value: _descriptor_1.toValue(13n),
                                                                                                                   alignment: _descriptor_1.alignment() } }] } },
                                                                                        { push: { storage: false,
                                                                                                  value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(nul_0),
                                                                                                                                               alignment: _descriptor_0.alignment() }).encode() } },
                                                                                        'member',
                                                                                        { popeq: { cached: true,
                                                                                                   result: undefined } }]).value),
                            'Pseudonym already enrolled');
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { idx: { cached: false,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_1.toValue(13n),
                                                                  alignment: _descriptor_1.alignment() } }] } },
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(nul_0),
                                                                                              alignment: _descriptor_0.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newNull().encode() } },
                                       { ins: { cached: false, n: 1 } },
                                       { ins: { cached: true, n: 1 } }]);
    await this._fillOneSlot_0(context, partialProofData, tid_0);
    return [];
  }
  _folder_0(f, x, a0) {
    for (let i = 0; i < 16; i++) { x = f(x, a0[i]); }
    return x;
  }
  _equal_0(x0, y0) {
    {
      let x1 = x0.bytes;
      let y1 = y0.bytes;
      if (!x1.every((x, i) => y1[i] === x)) { return false; }
    }
    return true;
  }
  _equal_1(x0, y0) {
    {
      let x1 = x0.bytes;
      let y1 = y0.bytes;
      if (!x1.every((x, i) => y1[i] === x)) { return false; }
    }
    return true;
  }
  _equal_2(x0, y0) {
    {
      let x1 = x0.bytes;
      let y1 = y0.bytes;
      if (!x1.every((x, i) => y1[i] === x)) { return false; }
    }
    return true;
  }
  _equal_3(x0, y0) {
    {
      let x1 = x0.bytes;
      let y1 = y0.bytes;
      if (!x1.every((x, i) => y1[i] === x)) { return false; }
    }
    return true;
  }
  _equal_4(x0, y0) {
    {
      let x1 = x0.bytes;
      let y1 = y0.bytes;
      if (!x1.every((x, i) => y1[i] === x)) { return false; }
    }
    return true;
  }
  _equal_5(x0, y0) {
    {
      let x1 = x0.bytes;
      let y1 = y0.bytes;
      if (!x1.every((x, i) => y1[i] === x)) { return false; }
    }
    return true;
  }
  _equal_6(x0, y0) {
    {
      let x1 = x0.bytes;
      let y1 = y0.bytes;
      if (!x1.every((x, i) => y1[i] === x)) { return false; }
    }
    return true;
  }
  _equal_7(x0, y0) {
    if (!x0.every((x, i) => y0[i] === x)) { return false; }
    return true;
  }
  _equal_8(x0, y0) {
    if (!x0.every((x, i) => y0[i] === x)) { return false; }
    return true;
  }
  _equal_9(x0, y0) {
    if (!x0.every((x, i) => y0[i] === x)) { return false; }
    return true;
  }
  async _folder_1(context, partialProofData, f, x, a0) {
    for (let i = 0; i < 4; i++) { x = await f(context, partialProofData, x, a0[i]); }
    return x;
  }
  _equal_10(x0, y0) {
    if (!x0.every((x, i) => y0[i] === x)) { return false; }
    return true;
  }
  _equal_11(x0, y0) {
    if (!x0.every((x, i) => y0[i] === x)) { return false; }
    return true;
  }
  async _folder_2(context, partialProofData, f, x, a0) {
    for (let i = 0; i < 4; i++) { x = await f(context, partialProofData, x, a0[i]); }
    return x;
  }
  _equal_12(x0, y0) {
    if (!x0.every((x, i) => y0[i] === x)) { return false; }
    return true;
  }
  _equal_13(x0, y0) {
    if (!x0.every((x, i) => y0[i] === x)) { return false; }
    return true;
  }
  async _folder_3(context, partialProofData, f, x, a0) {
    for (let i = 0; i < 4; i++) { x = await f(context, partialProofData, x, a0[i]); }
    return x;
  }
  _equal_14(x0, y0) {
    {
      let x1 = x0.bytes;
      let y1 = y0.bytes;
      if (!x1.every((x, i) => y1[i] === x)) { return false; }
    }
    return true;
  }
  _equal_15(x0, y0) {
    if (!x0.every((x, i) => y0[i] === x)) { return false; }
    return true;
  }
}
export function ledger(stateOrChargedState) {
  const state = stateOrChargedState instanceof __compactRuntime.StateValue ? stateOrChargedState : stateOrChargedState.state;
  const chargedState = stateOrChargedState instanceof __compactRuntime.StateValue ? new __compactRuntime.ChargedState(stateOrChargedState) : stateOrChargedState;
  const context = {
    callContext: { currentQueryContext: new __compactRuntime.QueryContext(chargedState, __compactRuntime.dummyContractAddress()), currentGasCost: __compactRuntime.emptyRunningCost() },
    costModel: __compactRuntime.CostModel.initialCostModel()
  };
  const partialProofData = {
    input: { value: [], alignment: [] },
    output: undefined,
    publicTranscript: [],
    privateTranscriptOutputs: []
  };
  return {
    get admin() {
      return _descriptor_5.fromValue(__compactRuntime.queryLedgerState(context,
                                                                       partialProofData,
                                                                       [
                                                                        { dup: { n: 0 } },
                                                                        { idx: { cached: false,
                                                                                 pushPath: false,
                                                                                 path: [
                                                                                        { tag: 'value',
                                                                                          value: { value: _descriptor_1.toValue(0n),
                                                                                                   alignment: _descriptor_1.alignment() } }] } },
                                                                        { popeq: { cached: false,
                                                                                   result: undefined } }]).value);
    },
    pendingIssuers: {
      isEmpty(...args_0) {
        if (args_0.length !== 0) {
          throw new __compactRuntime.CompactError(`isEmpty: expected 0 arguments, received ${args_0.length}`);
        }
        return _descriptor_4.fromValue(__compactRuntime.queryLedgerState(context,
                                                                         partialProofData,
                                                                         [
                                                                          { dup: { n: 0 } },
                                                                          { idx: { cached: false,
                                                                                   pushPath: false,
                                                                                   path: [
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_1.toValue(1n),
                                                                                                     alignment: _descriptor_1.alignment() } }] } },
                                                                          'size',
                                                                          { push: { storage: false,
                                                                                    value: __compactRuntime.StateValue.newCell({ value: _descriptor_6.toValue(0n),
                                                                                                                                 alignment: _descriptor_6.alignment() }).encode() } },
                                                                          'eq',
                                                                          { popeq: { cached: true,
                                                                                     result: undefined } }]).value);
      },
      size(...args_0) {
        if (args_0.length !== 0) {
          throw new __compactRuntime.CompactError(`size: expected 0 arguments, received ${args_0.length}`);
        }
        return _descriptor_6.fromValue(__compactRuntime.queryLedgerState(context,
                                                                         partialProofData,
                                                                         [
                                                                          { dup: { n: 0 } },
                                                                          { idx: { cached: false,
                                                                                   pushPath: false,
                                                                                   path: [
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_1.toValue(1n),
                                                                                                     alignment: _descriptor_1.alignment() } }] } },
                                                                          'size',
                                                                          { popeq: { cached: true,
                                                                                     result: undefined } }]).value);
      },
      member(...args_0) {
        if (args_0.length !== 1) {
          throw new __compactRuntime.CompactError(`member: expected 1 argument, received ${args_0.length}`);
        }
        const key_0 = args_0[0];
        if (!(typeof(key_0) === 'object' && key_0.bytes.buffer instanceof ArrayBuffer && key_0.bytes.BYTES_PER_ELEMENT === 1 && key_0.bytes.length === 32)) {
          __compactRuntime.typeError('member',
                                     'argument 1',
                                     'zkclinic.compact line 27 char 1',
                                     'struct ZswapCoinPublicKey<bytes: Bytes<32>>',
                                     key_0)
        }
        return _descriptor_4.fromValue(__compactRuntime.queryLedgerState(context,
                                                                         partialProofData,
                                                                         [
                                                                          { dup: { n: 0 } },
                                                                          { idx: { cached: false,
                                                                                   pushPath: false,
                                                                                   path: [
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_1.toValue(1n),
                                                                                                     alignment: _descriptor_1.alignment() } }] } },
                                                                          { push: { storage: false,
                                                                                    value: __compactRuntime.StateValue.newCell({ value: _descriptor_5.toValue(key_0),
                                                                                                                                 alignment: _descriptor_5.alignment() }).encode() } },
                                                                          'member',
                                                                          { popeq: { cached: true,
                                                                                     result: undefined } }]).value);
      },
      lookup(...args_0) {
        if (args_0.length !== 1) {
          throw new __compactRuntime.CompactError(`lookup: expected 1 argument, received ${args_0.length}`);
        }
        const key_0 = args_0[0];
        if (!(typeof(key_0) === 'object' && key_0.bytes.buffer instanceof ArrayBuffer && key_0.bytes.BYTES_PER_ELEMENT === 1 && key_0.bytes.length === 32)) {
          __compactRuntime.typeError('lookup',
                                     'argument 1',
                                     'zkclinic.compact line 27 char 1',
                                     'struct ZswapCoinPublicKey<bytes: Bytes<32>>',
                                     key_0)
        }
        return _descriptor_0.fromValue(__compactRuntime.queryLedgerState(context,
                                                                         partialProofData,
                                                                         [
                                                                          { dup: { n: 0 } },
                                                                          { idx: { cached: false,
                                                                                   pushPath: false,
                                                                                   path: [
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_1.toValue(1n),
                                                                                                     alignment: _descriptor_1.alignment() } }] } },
                                                                          { idx: { cached: false,
                                                                                   pushPath: false,
                                                                                   path: [
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_5.toValue(key_0),
                                                                                                     alignment: _descriptor_5.alignment() } }] } },
                                                                          { popeq: { cached: false,
                                                                                     result: undefined } }]).value);
      },
      [Symbol.iterator](...args_0) {
        if (args_0.length !== 0) {
          throw new __compactRuntime.CompactError(`iter: expected 0 arguments, received ${args_0.length}`);
        }
        const self_0 = state.asArray()[1];
        return self_0.asMap().keys().map(  (key) => {    const value = self_0.asMap().get(key).asCell();    return [      _descriptor_5.fromValue(key.value),      _descriptor_0.fromValue(value.value)    ];  })[Symbol.iterator]();
      }
    },
    issuers: {
      isEmpty(...args_0) {
        if (args_0.length !== 0) {
          throw new __compactRuntime.CompactError(`isEmpty: expected 0 arguments, received ${args_0.length}`);
        }
        return _descriptor_4.fromValue(__compactRuntime.queryLedgerState(context,
                                                                         partialProofData,
                                                                         [
                                                                          { dup: { n: 0 } },
                                                                          { idx: { cached: false,
                                                                                   pushPath: false,
                                                                                   path: [
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_1.toValue(2n),
                                                                                                     alignment: _descriptor_1.alignment() } }] } },
                                                                          'size',
                                                                          { push: { storage: false,
                                                                                    value: __compactRuntime.StateValue.newCell({ value: _descriptor_6.toValue(0n),
                                                                                                                                 alignment: _descriptor_6.alignment() }).encode() } },
                                                                          'eq',
                                                                          { popeq: { cached: true,
                                                                                     result: undefined } }]).value);
      },
      size(...args_0) {
        if (args_0.length !== 0) {
          throw new __compactRuntime.CompactError(`size: expected 0 arguments, received ${args_0.length}`);
        }
        return _descriptor_6.fromValue(__compactRuntime.queryLedgerState(context,
                                                                         partialProofData,
                                                                         [
                                                                          { dup: { n: 0 } },
                                                                          { idx: { cached: false,
                                                                                   pushPath: false,
                                                                                   path: [
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_1.toValue(2n),
                                                                                                     alignment: _descriptor_1.alignment() } }] } },
                                                                          'size',
                                                                          { popeq: { cached: true,
                                                                                     result: undefined } }]).value);
      },
      member(...args_0) {
        if (args_0.length !== 1) {
          throw new __compactRuntime.CompactError(`member: expected 1 argument, received ${args_0.length}`);
        }
        const key_0 = args_0[0];
        if (!(typeof(key_0) === 'object' && key_0.bytes.buffer instanceof ArrayBuffer && key_0.bytes.BYTES_PER_ELEMENT === 1 && key_0.bytes.length === 32)) {
          __compactRuntime.typeError('member',
                                     'argument 1',
                                     'zkclinic.compact line 28 char 1',
                                     'struct ZswapCoinPublicKey<bytes: Bytes<32>>',
                                     key_0)
        }
        return _descriptor_4.fromValue(__compactRuntime.queryLedgerState(context,
                                                                         partialProofData,
                                                                         [
                                                                          { dup: { n: 0 } },
                                                                          { idx: { cached: false,
                                                                                   pushPath: false,
                                                                                   path: [
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_1.toValue(2n),
                                                                                                     alignment: _descriptor_1.alignment() } }] } },
                                                                          { push: { storage: false,
                                                                                    value: __compactRuntime.StateValue.newCell({ value: _descriptor_5.toValue(key_0),
                                                                                                                                 alignment: _descriptor_5.alignment() }).encode() } },
                                                                          'member',
                                                                          { popeq: { cached: true,
                                                                                     result: undefined } }]).value);
      },
      lookup(...args_0) {
        if (args_0.length !== 1) {
          throw new __compactRuntime.CompactError(`lookup: expected 1 argument, received ${args_0.length}`);
        }
        const key_0 = args_0[0];
        if (!(typeof(key_0) === 'object' && key_0.bytes.buffer instanceof ArrayBuffer && key_0.bytes.BYTES_PER_ELEMENT === 1 && key_0.bytes.length === 32)) {
          __compactRuntime.typeError('lookup',
                                     'argument 1',
                                     'zkclinic.compact line 28 char 1',
                                     'struct ZswapCoinPublicKey<bytes: Bytes<32>>',
                                     key_0)
        }
        return _descriptor_13.fromValue(__compactRuntime.queryLedgerState(context,
                                                                          partialProofData,
                                                                          [
                                                                           { dup: { n: 0 } },
                                                                           { idx: { cached: false,
                                                                                    pushPath: false,
                                                                                    path: [
                                                                                           { tag: 'value',
                                                                                             value: { value: _descriptor_1.toValue(2n),
                                                                                                      alignment: _descriptor_1.alignment() } }] } },
                                                                           { idx: { cached: false,
                                                                                    pushPath: false,
                                                                                    path: [
                                                                                           { tag: 'value',
                                                                                             value: { value: _descriptor_5.toValue(key_0),
                                                                                                      alignment: _descriptor_5.alignment() } }] } },
                                                                           { popeq: { cached: false,
                                                                                      result: undefined } }]).value);
      },
      [Symbol.iterator](...args_0) {
        if (args_0.length !== 0) {
          throw new __compactRuntime.CompactError(`iter: expected 0 arguments, received ${args_0.length}`);
        }
        const self_0 = state.asArray()[2];
        return self_0.asMap().keys().map(  (key) => {    const value = self_0.asMap().get(key).asCell();    return [      _descriptor_5.fromValue(key.value),      _descriptor_13.fromValue(value.value)    ];  })[Symbol.iterator]();
      }
    },
    issuedCredentials: {
      isEmpty(...args_0) {
        if (args_0.length !== 0) {
          throw new __compactRuntime.CompactError(`isEmpty: expected 0 arguments, received ${args_0.length}`);
        }
        return _descriptor_4.fromValue(__compactRuntime.queryLedgerState(context,
                                                                         partialProofData,
                                                                         [
                                                                          { dup: { n: 0 } },
                                                                          { idx: { cached: false,
                                                                                   pushPath: false,
                                                                                   path: [
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_1.toValue(3n),
                                                                                                     alignment: _descriptor_1.alignment() } }] } },
                                                                          'size',
                                                                          { push: { storage: false,
                                                                                    value: __compactRuntime.StateValue.newCell({ value: _descriptor_6.toValue(0n),
                                                                                                                                 alignment: _descriptor_6.alignment() }).encode() } },
                                                                          'eq',
                                                                          { popeq: { cached: true,
                                                                                     result: undefined } }]).value);
      },
      size(...args_0) {
        if (args_0.length !== 0) {
          throw new __compactRuntime.CompactError(`size: expected 0 arguments, received ${args_0.length}`);
        }
        return _descriptor_6.fromValue(__compactRuntime.queryLedgerState(context,
                                                                         partialProofData,
                                                                         [
                                                                          { dup: { n: 0 } },
                                                                          { idx: { cached: false,
                                                                                   pushPath: false,
                                                                                   path: [
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_1.toValue(3n),
                                                                                                     alignment: _descriptor_1.alignment() } }] } },
                                                                          'size',
                                                                          { popeq: { cached: true,
                                                                                     result: undefined } }]).value);
      },
      member(...args_0) {
        if (args_0.length !== 1) {
          throw new __compactRuntime.CompactError(`member: expected 1 argument, received ${args_0.length}`);
        }
        const key_0 = args_0[0];
        if (!(key_0.buffer instanceof ArrayBuffer && key_0.BYTES_PER_ELEMENT === 1 && key_0.length === 32)) {
          __compactRuntime.typeError('member',
                                     'argument 1',
                                     'zkclinic.compact line 30 char 1',
                                     'Bytes<32>',
                                     key_0)
        }
        return _descriptor_4.fromValue(__compactRuntime.queryLedgerState(context,
                                                                         partialProofData,
                                                                         [
                                                                          { dup: { n: 0 } },
                                                                          { idx: { cached: false,
                                                                                   pushPath: false,
                                                                                   path: [
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_1.toValue(3n),
                                                                                                     alignment: _descriptor_1.alignment() } }] } },
                                                                          { push: { storage: false,
                                                                                    value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(key_0),
                                                                                                                                 alignment: _descriptor_0.alignment() }).encode() } },
                                                                          'member',
                                                                          { popeq: { cached: true,
                                                                                     result: undefined } }]).value);
      },
      lookup(...args_0) {
        if (args_0.length !== 1) {
          throw new __compactRuntime.CompactError(`lookup: expected 1 argument, received ${args_0.length}`);
        }
        const key_0 = args_0[0];
        if (!(key_0.buffer instanceof ArrayBuffer && key_0.BYTES_PER_ELEMENT === 1 && key_0.length === 32)) {
          __compactRuntime.typeError('lookup',
                                     'argument 1',
                                     'zkclinic.compact line 30 char 1',
                                     'Bytes<32>',
                                     key_0)
        }
        return _descriptor_5.fromValue(__compactRuntime.queryLedgerState(context,
                                                                         partialProofData,
                                                                         [
                                                                          { dup: { n: 0 } },
                                                                          { idx: { cached: false,
                                                                                   pushPath: false,
                                                                                   path: [
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_1.toValue(3n),
                                                                                                     alignment: _descriptor_1.alignment() } }] } },
                                                                          { idx: { cached: false,
                                                                                   pushPath: false,
                                                                                   path: [
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_0.toValue(key_0),
                                                                                                     alignment: _descriptor_0.alignment() } }] } },
                                                                          { popeq: { cached: false,
                                                                                     result: undefined } }]).value);
      },
      [Symbol.iterator](...args_0) {
        if (args_0.length !== 0) {
          throw new __compactRuntime.CompactError(`iter: expected 0 arguments, received ${args_0.length}`);
        }
        const self_0 = state.asArray()[3];
        return self_0.asMap().keys().map(  (key) => {    const value = self_0.asMap().get(key).asCell();    return [      _descriptor_0.fromValue(key.value),      _descriptor_5.fromValue(value.value)    ];  })[Symbol.iterator]();
      }
    },
    revokedCredentials: {
      isEmpty(...args_0) {
        if (args_0.length !== 0) {
          throw new __compactRuntime.CompactError(`isEmpty: expected 0 arguments, received ${args_0.length}`);
        }
        return _descriptor_4.fromValue(__compactRuntime.queryLedgerState(context,
                                                                         partialProofData,
                                                                         [
                                                                          { dup: { n: 0 } },
                                                                          { idx: { cached: false,
                                                                                   pushPath: false,
                                                                                   path: [
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_1.toValue(4n),
                                                                                                     alignment: _descriptor_1.alignment() } }] } },
                                                                          'size',
                                                                          { push: { storage: false,
                                                                                    value: __compactRuntime.StateValue.newCell({ value: _descriptor_6.toValue(0n),
                                                                                                                                 alignment: _descriptor_6.alignment() }).encode() } },
                                                                          'eq',
                                                                          { popeq: { cached: true,
                                                                                     result: undefined } }]).value);
      },
      size(...args_0) {
        if (args_0.length !== 0) {
          throw new __compactRuntime.CompactError(`size: expected 0 arguments, received ${args_0.length}`);
        }
        return _descriptor_6.fromValue(__compactRuntime.queryLedgerState(context,
                                                                         partialProofData,
                                                                         [
                                                                          { dup: { n: 0 } },
                                                                          { idx: { cached: false,
                                                                                   pushPath: false,
                                                                                   path: [
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_1.toValue(4n),
                                                                                                     alignment: _descriptor_1.alignment() } }] } },
                                                                          'size',
                                                                          { popeq: { cached: true,
                                                                                     result: undefined } }]).value);
      },
      member(...args_0) {
        if (args_0.length !== 1) {
          throw new __compactRuntime.CompactError(`member: expected 1 argument, received ${args_0.length}`);
        }
        const elem_0 = args_0[0];
        if (!(elem_0.buffer instanceof ArrayBuffer && elem_0.BYTES_PER_ELEMENT === 1 && elem_0.length === 32)) {
          __compactRuntime.typeError('member',
                                     'argument 1',
                                     'zkclinic.compact line 31 char 1',
                                     'Bytes<32>',
                                     elem_0)
        }
        return _descriptor_4.fromValue(__compactRuntime.queryLedgerState(context,
                                                                         partialProofData,
                                                                         [
                                                                          { dup: { n: 0 } },
                                                                          { idx: { cached: false,
                                                                                   pushPath: false,
                                                                                   path: [
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_1.toValue(4n),
                                                                                                     alignment: _descriptor_1.alignment() } }] } },
                                                                          { push: { storage: false,
                                                                                    value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(elem_0),
                                                                                                                                 alignment: _descriptor_0.alignment() }).encode() } },
                                                                          'member',
                                                                          { popeq: { cached: true,
                                                                                     result: undefined } }]).value);
      },
      [Symbol.iterator](...args_0) {
        if (args_0.length !== 0) {
          throw new __compactRuntime.CompactError(`iter: expected 0 arguments, received ${args_0.length}`);
        }
        const self_0 = state.asArray()[4];
        return self_0.asMap().keys().map((elem) => _descriptor_0.fromValue(elem.value))[Symbol.iterator]();
      }
    },
    credentialDiagnosisNextIndex: {
      isEmpty(...args_0) {
        if (args_0.length !== 0) {
          throw new __compactRuntime.CompactError(`isEmpty: expected 0 arguments, received ${args_0.length}`);
        }
        return _descriptor_4.fromValue(__compactRuntime.queryLedgerState(context,
                                                                         partialProofData,
                                                                         [
                                                                          { dup: { n: 0 } },
                                                                          { idx: { cached: false,
                                                                                   pushPath: false,
                                                                                   path: [
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_1.toValue(5n),
                                                                                                     alignment: _descriptor_1.alignment() } }] } },
                                                                          'size',
                                                                          { push: { storage: false,
                                                                                    value: __compactRuntime.StateValue.newCell({ value: _descriptor_6.toValue(0n),
                                                                                                                                 alignment: _descriptor_6.alignment() }).encode() } },
                                                                          'eq',
                                                                          { popeq: { cached: true,
                                                                                     result: undefined } }]).value);
      },
      size(...args_0) {
        if (args_0.length !== 0) {
          throw new __compactRuntime.CompactError(`size: expected 0 arguments, received ${args_0.length}`);
        }
        return _descriptor_6.fromValue(__compactRuntime.queryLedgerState(context,
                                                                         partialProofData,
                                                                         [
                                                                          { dup: { n: 0 } },
                                                                          { idx: { cached: false,
                                                                                   pushPath: false,
                                                                                   path: [
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_1.toValue(5n),
                                                                                                     alignment: _descriptor_1.alignment() } }] } },
                                                                          'size',
                                                                          { popeq: { cached: true,
                                                                                     result: undefined } }]).value);
      },
      member(...args_0) {
        if (args_0.length !== 1) {
          throw new __compactRuntime.CompactError(`member: expected 1 argument, received ${args_0.length}`);
        }
        const key_0 = args_0[0];
        if (!(key_0.buffer instanceof ArrayBuffer && key_0.BYTES_PER_ELEMENT === 1 && key_0.length === 32)) {
          __compactRuntime.typeError('member',
                                     'argument 1',
                                     'zkclinic.compact line 33 char 1',
                                     'Bytes<32>',
                                     key_0)
        }
        return _descriptor_4.fromValue(__compactRuntime.queryLedgerState(context,
                                                                         partialProofData,
                                                                         [
                                                                          { dup: { n: 0 } },
                                                                          { idx: { cached: false,
                                                                                   pushPath: false,
                                                                                   path: [
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_1.toValue(5n),
                                                                                                     alignment: _descriptor_1.alignment() } }] } },
                                                                          { push: { storage: false,
                                                                                    value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(key_0),
                                                                                                                                 alignment: _descriptor_0.alignment() }).encode() } },
                                                                          'member',
                                                                          { popeq: { cached: true,
                                                                                     result: undefined } }]).value);
      },
      lookup(...args_0) {
        if (args_0.length !== 1) {
          throw new __compactRuntime.CompactError(`lookup: expected 1 argument, received ${args_0.length}`);
        }
        const key_0 = args_0[0];
        if (!(key_0.buffer instanceof ArrayBuffer && key_0.BYTES_PER_ELEMENT === 1 && key_0.length === 32)) {
          __compactRuntime.typeError('lookup',
                                     'argument 1',
                                     'zkclinic.compact line 33 char 1',
                                     'Bytes<32>',
                                     key_0)
        }
        return _descriptor_6.fromValue(__compactRuntime.queryLedgerState(context,
                                                                         partialProofData,
                                                                         [
                                                                          { dup: { n: 0 } },
                                                                          { idx: { cached: false,
                                                                                   pushPath: false,
                                                                                   path: [
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_1.toValue(5n),
                                                                                                     alignment: _descriptor_1.alignment() } }] } },
                                                                          { idx: { cached: false,
                                                                                   pushPath: false,
                                                                                   path: [
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_0.toValue(key_0),
                                                                                                     alignment: _descriptor_0.alignment() } }] } },
                                                                          { popeq: { cached: false,
                                                                                     result: undefined } }]).value);
      },
      [Symbol.iterator](...args_0) {
        if (args_0.length !== 0) {
          throw new __compactRuntime.CompactError(`iter: expected 0 arguments, received ${args_0.length}`);
        }
        const self_0 = state.asArray()[5];
        return self_0.asMap().keys().map(  (key) => {    const value = self_0.asMap().get(key).asCell();    return [      _descriptor_0.fromValue(key.value),      _descriptor_6.fromValue(value.value)    ];  })[Symbol.iterator]();
      }
    },
    diagnosisCommitmentBySlot: {
      isEmpty(...args_0) {
        if (args_0.length !== 0) {
          throw new __compactRuntime.CompactError(`isEmpty: expected 0 arguments, received ${args_0.length}`);
        }
        return _descriptor_4.fromValue(__compactRuntime.queryLedgerState(context,
                                                                         partialProofData,
                                                                         [
                                                                          { dup: { n: 0 } },
                                                                          { idx: { cached: false,
                                                                                   pushPath: false,
                                                                                   path: [
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_1.toValue(6n),
                                                                                                     alignment: _descriptor_1.alignment() } }] } },
                                                                          'size',
                                                                          { push: { storage: false,
                                                                                    value: __compactRuntime.StateValue.newCell({ value: _descriptor_6.toValue(0n),
                                                                                                                                 alignment: _descriptor_6.alignment() }).encode() } },
                                                                          'eq',
                                                                          { popeq: { cached: true,
                                                                                     result: undefined } }]).value);
      },
      size(...args_0) {
        if (args_0.length !== 0) {
          throw new __compactRuntime.CompactError(`size: expected 0 arguments, received ${args_0.length}`);
        }
        return _descriptor_6.fromValue(__compactRuntime.queryLedgerState(context,
                                                                         partialProofData,
                                                                         [
                                                                          { dup: { n: 0 } },
                                                                          { idx: { cached: false,
                                                                                   pushPath: false,
                                                                                   path: [
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_1.toValue(6n),
                                                                                                     alignment: _descriptor_1.alignment() } }] } },
                                                                          'size',
                                                                          { popeq: { cached: true,
                                                                                     result: undefined } }]).value);
      },
      member(...args_0) {
        if (args_0.length !== 1) {
          throw new __compactRuntime.CompactError(`member: expected 1 argument, received ${args_0.length}`);
        }
        const key_0 = args_0[0];
        if (!(key_0.buffer instanceof ArrayBuffer && key_0.BYTES_PER_ELEMENT === 1 && key_0.length === 32)) {
          __compactRuntime.typeError('member',
                                     'argument 1',
                                     'zkclinic.compact line 34 char 1',
                                     'Bytes<32>',
                                     key_0)
        }
        return _descriptor_4.fromValue(__compactRuntime.queryLedgerState(context,
                                                                         partialProofData,
                                                                         [
                                                                          { dup: { n: 0 } },
                                                                          { idx: { cached: false,
                                                                                   pushPath: false,
                                                                                   path: [
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_1.toValue(6n),
                                                                                                     alignment: _descriptor_1.alignment() } }] } },
                                                                          { push: { storage: false,
                                                                                    value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(key_0),
                                                                                                                                 alignment: _descriptor_0.alignment() }).encode() } },
                                                                          'member',
                                                                          { popeq: { cached: true,
                                                                                     result: undefined } }]).value);
      },
      lookup(...args_0) {
        if (args_0.length !== 1) {
          throw new __compactRuntime.CompactError(`lookup: expected 1 argument, received ${args_0.length}`);
        }
        const key_0 = args_0[0];
        if (!(key_0.buffer instanceof ArrayBuffer && key_0.BYTES_PER_ELEMENT === 1 && key_0.length === 32)) {
          __compactRuntime.typeError('lookup',
                                     'argument 1',
                                     'zkclinic.compact line 34 char 1',
                                     'Bytes<32>',
                                     key_0)
        }
        return _descriptor_0.fromValue(__compactRuntime.queryLedgerState(context,
                                                                         partialProofData,
                                                                         [
                                                                          { dup: { n: 0 } },
                                                                          { idx: { cached: false,
                                                                                   pushPath: false,
                                                                                   path: [
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_1.toValue(6n),
                                                                                                     alignment: _descriptor_1.alignment() } }] } },
                                                                          { idx: { cached: false,
                                                                                   pushPath: false,
                                                                                   path: [
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_0.toValue(key_0),
                                                                                                     alignment: _descriptor_0.alignment() } }] } },
                                                                          { popeq: { cached: false,
                                                                                     result: undefined } }]).value);
      },
      [Symbol.iterator](...args_0) {
        if (args_0.length !== 0) {
          throw new __compactRuntime.CompactError(`iter: expected 0 arguments, received ${args_0.length}`);
        }
        const self_0 = state.asArray()[6];
        return self_0.asMap().keys().map(  (key) => {    const value = self_0.asMap().get(key).asCell();    return [      _descriptor_0.fromValue(key.value),      _descriptor_0.fromValue(value.value)    ];  })[Symbol.iterator]();
      }
    },
    trials: {
      isEmpty(...args_0) {
        if (args_0.length !== 0) {
          throw new __compactRuntime.CompactError(`isEmpty: expected 0 arguments, received ${args_0.length}`);
        }
        return _descriptor_4.fromValue(__compactRuntime.queryLedgerState(context,
                                                                         partialProofData,
                                                                         [
                                                                          { dup: { n: 0 } },
                                                                          { idx: { cached: false,
                                                                                   pushPath: false,
                                                                                   path: [
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_1.toValue(7n),
                                                                                                     alignment: _descriptor_1.alignment() } }] } },
                                                                          'size',
                                                                          { push: { storage: false,
                                                                                    value: __compactRuntime.StateValue.newCell({ value: _descriptor_6.toValue(0n),
                                                                                                                                 alignment: _descriptor_6.alignment() }).encode() } },
                                                                          'eq',
                                                                          { popeq: { cached: true,
                                                                                     result: undefined } }]).value);
      },
      size(...args_0) {
        if (args_0.length !== 0) {
          throw new __compactRuntime.CompactError(`size: expected 0 arguments, received ${args_0.length}`);
        }
        return _descriptor_6.fromValue(__compactRuntime.queryLedgerState(context,
                                                                         partialProofData,
                                                                         [
                                                                          { dup: { n: 0 } },
                                                                          { idx: { cached: false,
                                                                                   pushPath: false,
                                                                                   path: [
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_1.toValue(7n),
                                                                                                     alignment: _descriptor_1.alignment() } }] } },
                                                                          'size',
                                                                          { popeq: { cached: true,
                                                                                     result: undefined } }]).value);
      },
      member(...args_0) {
        if (args_0.length !== 1) {
          throw new __compactRuntime.CompactError(`member: expected 1 argument, received ${args_0.length}`);
        }
        const key_0 = args_0[0];
        if (!(key_0.buffer instanceof ArrayBuffer && key_0.BYTES_PER_ELEMENT === 1 && key_0.length === 32)) {
          __compactRuntime.typeError('member',
                                     'argument 1',
                                     'zkclinic.compact line 54 char 1',
                                     'Bytes<32>',
                                     key_0)
        }
        return _descriptor_4.fromValue(__compactRuntime.queryLedgerState(context,
                                                                         partialProofData,
                                                                         [
                                                                          { dup: { n: 0 } },
                                                                          { idx: { cached: false,
                                                                                   pushPath: false,
                                                                                   path: [
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_1.toValue(7n),
                                                                                                     alignment: _descriptor_1.alignment() } }] } },
                                                                          { push: { storage: false,
                                                                                    value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(key_0),
                                                                                                                                 alignment: _descriptor_0.alignment() }).encode() } },
                                                                          'member',
                                                                          { popeq: { cached: true,
                                                                                     result: undefined } }]).value);
      },
      lookup(...args_0) {
        if (args_0.length !== 1) {
          throw new __compactRuntime.CompactError(`lookup: expected 1 argument, received ${args_0.length}`);
        }
        const key_0 = args_0[0];
        if (!(key_0.buffer instanceof ArrayBuffer && key_0.BYTES_PER_ELEMENT === 1 && key_0.length === 32)) {
          __compactRuntime.typeError('lookup',
                                     'argument 1',
                                     'zkclinic.compact line 54 char 1',
                                     'Bytes<32>',
                                     key_0)
        }
        return _descriptor_8.fromValue(__compactRuntime.queryLedgerState(context,
                                                                         partialProofData,
                                                                         [
                                                                          { dup: { n: 0 } },
                                                                          { idx: { cached: false,
                                                                                   pushPath: false,
                                                                                   path: [
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_1.toValue(7n),
                                                                                                     alignment: _descriptor_1.alignment() } }] } },
                                                                          { idx: { cached: false,
                                                                                   pushPath: false,
                                                                                   path: [
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_0.toValue(key_0),
                                                                                                     alignment: _descriptor_0.alignment() } }] } },
                                                                          { popeq: { cached: false,
                                                                                     result: undefined } }]).value);
      },
      [Symbol.iterator](...args_0) {
        if (args_0.length !== 0) {
          throw new __compactRuntime.CompactError(`iter: expected 0 arguments, received ${args_0.length}`);
        }
        const self_0 = state.asArray()[7];
        return self_0.asMap().keys().map(  (key) => {    const value = self_0.asMap().get(key).asCell();    return [      _descriptor_0.fromValue(key.value),      _descriptor_8.fromValue(value.value)    ];  })[Symbol.iterator]();
      }
    },
    credentialCommitments: {
      isFull(...args_0) {
        if (args_0.length !== 0) {
          throw new __compactRuntime.CompactError(`isFull: expected 0 arguments, received ${args_0.length}`);
        }
        return _descriptor_4.fromValue(__compactRuntime.queryLedgerState(context,
                                                                         partialProofData,
                                                                         [
                                                                          { dup: { n: 0 } },
                                                                          { idx: { cached: false,
                                                                                   pushPath: false,
                                                                                   path: [
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_1.toValue(8n),
                                                                                                     alignment: _descriptor_1.alignment() } }] } },
                                                                          { idx: { cached: false,
                                                                                   pushPath: false,
                                                                                   path: [
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_1.toValue(1n),
                                                                                                     alignment: _descriptor_1.alignment() } }] } },
                                                                          { push: { storage: false,
                                                                                    value: __compactRuntime.StateValue.newCell({ value: _descriptor_6.toValue(65536n),
                                                                                                                                 alignment: _descriptor_6.alignment() }).encode() } },
                                                                          'lt',
                                                                          'neg',
                                                                          { popeq: { cached: true,
                                                                                     result: undefined } }]).value);
      },
      checkRoot(...args_0) {
        if (args_0.length !== 1) {
          throw new __compactRuntime.CompactError(`checkRoot: expected 1 argument, received ${args_0.length}`);
        }
        const rt_0 = args_0[0];
        if (!(typeof(rt_0) === 'object' && typeof(rt_0.field) === 'bigint' && rt_0.field >= 0 && rt_0.field <= __compactRuntime.MAX_FIELD)) {
          __compactRuntime.typeError('checkRoot',
                                     'argument 1',
                                     'zkclinic.compact line 270 char 1',
                                     'struct MerkleTreeDigest<field: Field>',
                                     rt_0)
        }
        return _descriptor_4.fromValue(__compactRuntime.queryLedgerState(context,
                                                                         partialProofData,
                                                                         [
                                                                          { dup: { n: 0 } },
                                                                          { idx: { cached: false,
                                                                                   pushPath: false,
                                                                                   path: [
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_1.toValue(8n),
                                                                                                     alignment: _descriptor_1.alignment() } }] } },
                                                                          { idx: { cached: false,
                                                                                   pushPath: false,
                                                                                   path: [
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_1.toValue(2n),
                                                                                                     alignment: _descriptor_1.alignment() } }] } },
                                                                          { push: { storage: false,
                                                                                    value: __compactRuntime.StateValue.newCell({ value: _descriptor_10.toValue(rt_0),
                                                                                                                                 alignment: _descriptor_10.alignment() }).encode() } },
                                                                          'member',
                                                                          { popeq: { cached: true,
                                                                                     result: undefined } }]).value);
      },
      root(...args_0) {
        if (args_0.length !== 0) {
          throw new __compactRuntime.CompactError(`root: expected 0 arguments, received ${args_0.length}`);
        }
        const self_0 = state.asArray()[8];
        return ((result) => result             ? __compactRuntime.CompactTypeMerkleTreeDigest.fromValue(result)             : undefined)(self_0.asArray()[0].asBoundedMerkleTree().rehash().root()?.value);
      },
      firstFree(...args_0) {
        if (args_0.length !== 0) {
          throw new __compactRuntime.CompactError(`first_free: expected 0 arguments, received ${args_0.length}`);
        }
        const self_0 = state.asArray()[8];
        return __compactRuntime.CompactTypeField.fromValue(self_0.asArray()[1].asCell().value);
      },
      pathForLeaf(...args_0) {
        if (args_0.length !== 2) {
          throw new __compactRuntime.CompactError(`path_for_leaf: expected 2 arguments, received ${args_0.length}`);
        }
        const index_0 = args_0[0];
        const leaf_0 = args_0[1];
        if (!(typeof(index_0) === 'bigint' && index_0 >= 0 && index_0 <= __compactRuntime.MAX_FIELD)) {
          __compactRuntime.typeError('path_for_leaf',
                                     'argument 1',
                                     'zkclinic.compact line 270 char 1',
                                     'Field',
                                     index_0)
        }
        if (!(leaf_0.buffer instanceof ArrayBuffer && leaf_0.BYTES_PER_ELEMENT === 1 && leaf_0.length === 32)) {
          __compactRuntime.typeError('path_for_leaf',
                                     'argument 2',
                                     'zkclinic.compact line 270 char 1',
                                     'Bytes<32>',
                                     leaf_0)
        }
        const self_0 = state.asArray()[8];
        return ((result) => result             ? new __compactRuntime.CompactTypeMerkleTreePath(16, _descriptor_0).fromValue(result)             : undefined)(  self_0.asArray()[0].asBoundedMerkleTree().rehash().pathForLeaf(    index_0,    {      value: _descriptor_0.toValue(leaf_0),      alignment: _descriptor_0.alignment()    }  )?.value);
      },
      findPathForLeaf(...args_0) {
        if (args_0.length !== 1) {
          throw new __compactRuntime.CompactError(`find_path_for_leaf: expected 1 argument, received ${args_0.length}`);
        }
        const leaf_0 = args_0[0];
        if (!(leaf_0.buffer instanceof ArrayBuffer && leaf_0.BYTES_PER_ELEMENT === 1 && leaf_0.length === 32)) {
          __compactRuntime.typeError('find_path_for_leaf',
                                     'argument 1',
                                     'zkclinic.compact line 270 char 1',
                                     'Bytes<32>',
                                     leaf_0)
        }
        const self_0 = state.asArray()[8];
        return ((result) => result             ? new __compactRuntime.CompactTypeMerkleTreePath(16, _descriptor_0).fromValue(result)             : undefined)(  self_0.asArray()[0].asBoundedMerkleTree().rehash().findPathForLeaf(    {      value: _descriptor_0.toValue(leaf_0),      alignment: _descriptor_0.alignment()    }  )?.value);
      },
      history(...args_0) {
        if (args_0.length !== 0) {
          throw new __compactRuntime.CompactError(`history: expected 0 arguments, received ${args_0.length}`);
        }
        const self_0 = state.asArray()[8];
        return self_0.asArray()[2].asMap().keys().map(  (elem) => __compactRuntime.CompactTypeMerkleTreeDigest.fromValue(elem.value))[Symbol.iterator]();
      }
    },
    get credentialCommitmentCount() {
      return _descriptor_6.fromValue(__compactRuntime.queryLedgerState(context,
                                                                       partialProofData,
                                                                       [
                                                                        { dup: { n: 0 } },
                                                                        { idx: { cached: false,
                                                                                 pushPath: false,
                                                                                 path: [
                                                                                        { tag: 'value',
                                                                                          value: { value: _descriptor_1.toValue(9n),
                                                                                                   alignment: _descriptor_1.alignment() } }] } },
                                                                        { popeq: { cached: true,
                                                                                   result: undefined } }]).value);
    },
    trialCriteria: {
      isEmpty(...args_0) {
        if (args_0.length !== 0) {
          throw new __compactRuntime.CompactError(`isEmpty: expected 0 arguments, received ${args_0.length}`);
        }
        return _descriptor_4.fromValue(__compactRuntime.queryLedgerState(context,
                                                                         partialProofData,
                                                                         [
                                                                          { dup: { n: 0 } },
                                                                          { idx: { cached: false,
                                                                                   pushPath: false,
                                                                                   path: [
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_1.toValue(10n),
                                                                                                     alignment: _descriptor_1.alignment() } }] } },
                                                                          'size',
                                                                          { push: { storage: false,
                                                                                    value: __compactRuntime.StateValue.newCell({ value: _descriptor_6.toValue(0n),
                                                                                                                                 alignment: _descriptor_6.alignment() }).encode() } },
                                                                          'eq',
                                                                          { popeq: { cached: true,
                                                                                     result: undefined } }]).value);
      },
      size(...args_0) {
        if (args_0.length !== 0) {
          throw new __compactRuntime.CompactError(`size: expected 0 arguments, received ${args_0.length}`);
        }
        return _descriptor_6.fromValue(__compactRuntime.queryLedgerState(context,
                                                                         partialProofData,
                                                                         [
                                                                          { dup: { n: 0 } },
                                                                          { idx: { cached: false,
                                                                                   pushPath: false,
                                                                                   path: [
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_1.toValue(10n),
                                                                                                     alignment: _descriptor_1.alignment() } }] } },
                                                                          'size',
                                                                          { popeq: { cached: true,
                                                                                     result: undefined } }]).value);
      },
      member(...args_0) {
        if (args_0.length !== 1) {
          throw new __compactRuntime.CompactError(`member: expected 1 argument, received ${args_0.length}`);
        }
        const key_0 = args_0[0];
        if (!(key_0.buffer instanceof ArrayBuffer && key_0.BYTES_PER_ELEMENT === 1 && key_0.length === 32)) {
          __compactRuntime.typeError('member',
                                     'argument 1',
                                     'zkclinic.compact line 272 char 1',
                                     'Bytes<32>',
                                     key_0)
        }
        return _descriptor_4.fromValue(__compactRuntime.queryLedgerState(context,
                                                                         partialProofData,
                                                                         [
                                                                          { dup: { n: 0 } },
                                                                          { idx: { cached: false,
                                                                                   pushPath: false,
                                                                                   path: [
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_1.toValue(10n),
                                                                                                     alignment: _descriptor_1.alignment() } }] } },
                                                                          { push: { storage: false,
                                                                                    value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(key_0),
                                                                                                                                 alignment: _descriptor_0.alignment() }).encode() } },
                                                                          'member',
                                                                          { popeq: { cached: true,
                                                                                     result: undefined } }]).value);
      },
      lookup(...args_0) {
        if (args_0.length !== 1) {
          throw new __compactRuntime.CompactError(`lookup: expected 1 argument, received ${args_0.length}`);
        }
        const key_0 = args_0[0];
        if (!(key_0.buffer instanceof ArrayBuffer && key_0.BYTES_PER_ELEMENT === 1 && key_0.length === 32)) {
          __compactRuntime.typeError('lookup',
                                     'argument 1',
                                     'zkclinic.compact line 272 char 1',
                                     'Bytes<32>',
                                     key_0)
        }
        return _descriptor_3.fromValue(__compactRuntime.queryLedgerState(context,
                                                                         partialProofData,
                                                                         [
                                                                          { dup: { n: 0 } },
                                                                          { idx: { cached: false,
                                                                                   pushPath: false,
                                                                                   path: [
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_1.toValue(10n),
                                                                                                     alignment: _descriptor_1.alignment() } }] } },
                                                                          { idx: { cached: false,
                                                                                   pushPath: false,
                                                                                   path: [
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_0.toValue(key_0),
                                                                                                     alignment: _descriptor_0.alignment() } }] } },
                                                                          { popeq: { cached: false,
                                                                                     result: undefined } }]).value);
      },
      [Symbol.iterator](...args_0) {
        if (args_0.length !== 0) {
          throw new __compactRuntime.CompactError(`iter: expected 0 arguments, received ${args_0.length}`);
        }
        const self_0 = state.asArray()[10];
        return self_0.asMap().keys().map(  (key) => {    const value = self_0.asMap().get(key).asCell();    return [      _descriptor_0.fromValue(key.value),      _descriptor_3.fromValue(value.value)    ];  })[Symbol.iterator]();
      }
    },
    eligibilityProofs: {
      isEmpty(...args_0) {
        if (args_0.length !== 0) {
          throw new __compactRuntime.CompactError(`isEmpty: expected 0 arguments, received ${args_0.length}`);
        }
        return _descriptor_4.fromValue(__compactRuntime.queryLedgerState(context,
                                                                         partialProofData,
                                                                         [
                                                                          { dup: { n: 0 } },
                                                                          { idx: { cached: false,
                                                                                   pushPath: false,
                                                                                   path: [
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_1.toValue(11n),
                                                                                                     alignment: _descriptor_1.alignment() } }] } },
                                                                          'size',
                                                                          { push: { storage: false,
                                                                                    value: __compactRuntime.StateValue.newCell({ value: _descriptor_6.toValue(0n),
                                                                                                                                 alignment: _descriptor_6.alignment() }).encode() } },
                                                                          'eq',
                                                                          { popeq: { cached: true,
                                                                                     result: undefined } }]).value);
      },
      size(...args_0) {
        if (args_0.length !== 0) {
          throw new __compactRuntime.CompactError(`size: expected 0 arguments, received ${args_0.length}`);
        }
        return _descriptor_6.fromValue(__compactRuntime.queryLedgerState(context,
                                                                         partialProofData,
                                                                         [
                                                                          { dup: { n: 0 } },
                                                                          { idx: { cached: false,
                                                                                   pushPath: false,
                                                                                   path: [
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_1.toValue(11n),
                                                                                                     alignment: _descriptor_1.alignment() } }] } },
                                                                          'size',
                                                                          { popeq: { cached: true,
                                                                                     result: undefined } }]).value);
      },
      member(...args_0) {
        if (args_0.length !== 1) {
          throw new __compactRuntime.CompactError(`member: expected 1 argument, received ${args_0.length}`);
        }
        const key_0 = args_0[0];
        if (!(key_0.buffer instanceof ArrayBuffer && key_0.BYTES_PER_ELEMENT === 1 && key_0.length === 32)) {
          __compactRuntime.typeError('member',
                                     'argument 1',
                                     'zkclinic.compact line 274 char 1',
                                     'Bytes<32>',
                                     key_0)
        }
        return _descriptor_4.fromValue(__compactRuntime.queryLedgerState(context,
                                                                         partialProofData,
                                                                         [
                                                                          { dup: { n: 0 } },
                                                                          { idx: { cached: false,
                                                                                   pushPath: false,
                                                                                   path: [
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_1.toValue(11n),
                                                                                                     alignment: _descriptor_1.alignment() } }] } },
                                                                          { push: { storage: false,
                                                                                    value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(key_0),
                                                                                                                                 alignment: _descriptor_0.alignment() }).encode() } },
                                                                          'member',
                                                                          { popeq: { cached: true,
                                                                                     result: undefined } }]).value);
      },
      lookup(...args_0) {
        if (args_0.length !== 1) {
          throw new __compactRuntime.CompactError(`lookup: expected 1 argument, received ${args_0.length}`);
        }
        const key_0 = args_0[0];
        if (!(key_0.buffer instanceof ArrayBuffer && key_0.BYTES_PER_ELEMENT === 1 && key_0.length === 32)) {
          __compactRuntime.typeError('lookup',
                                     'argument 1',
                                     'zkclinic.compact line 274 char 1',
                                     'Bytes<32>',
                                     key_0)
        }
        return _descriptor_0.fromValue(__compactRuntime.queryLedgerState(context,
                                                                         partialProofData,
                                                                         [
                                                                          { dup: { n: 0 } },
                                                                          { idx: { cached: false,
                                                                                   pushPath: false,
                                                                                   path: [
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_1.toValue(11n),
                                                                                                     alignment: _descriptor_1.alignment() } }] } },
                                                                          { idx: { cached: false,
                                                                                   pushPath: false,
                                                                                   path: [
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_0.toValue(key_0),
                                                                                                     alignment: _descriptor_0.alignment() } }] } },
                                                                          { popeq: { cached: false,
                                                                                     result: undefined } }]).value);
      },
      [Symbol.iterator](...args_0) {
        if (args_0.length !== 0) {
          throw new __compactRuntime.CompactError(`iter: expected 0 arguments, received ${args_0.length}`);
        }
        const self_0 = state.asArray()[11];
        return self_0.asMap().keys().map(  (key) => {    const value = self_0.asMap().get(key).asCell();    return [      _descriptor_0.fromValue(key.value),      _descriptor_0.fromValue(value.value)    ];  })[Symbol.iterator]();
      }
    },
    trialEligibleCount: {
      isEmpty(...args_0) {
        if (args_0.length !== 0) {
          throw new __compactRuntime.CompactError(`isEmpty: expected 0 arguments, received ${args_0.length}`);
        }
        return _descriptor_4.fromValue(__compactRuntime.queryLedgerState(context,
                                                                         partialProofData,
                                                                         [
                                                                          { dup: { n: 0 } },
                                                                          { idx: { cached: false,
                                                                                   pushPath: false,
                                                                                   path: [
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_1.toValue(12n),
                                                                                                     alignment: _descriptor_1.alignment() } }] } },
                                                                          'size',
                                                                          { push: { storage: false,
                                                                                    value: __compactRuntime.StateValue.newCell({ value: _descriptor_6.toValue(0n),
                                                                                                                                 alignment: _descriptor_6.alignment() }).encode() } },
                                                                          'eq',
                                                                          { popeq: { cached: true,
                                                                                     result: undefined } }]).value);
      },
      size(...args_0) {
        if (args_0.length !== 0) {
          throw new __compactRuntime.CompactError(`size: expected 0 arguments, received ${args_0.length}`);
        }
        return _descriptor_6.fromValue(__compactRuntime.queryLedgerState(context,
                                                                         partialProofData,
                                                                         [
                                                                          { dup: { n: 0 } },
                                                                          { idx: { cached: false,
                                                                                   pushPath: false,
                                                                                   path: [
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_1.toValue(12n),
                                                                                                     alignment: _descriptor_1.alignment() } }] } },
                                                                          'size',
                                                                          { popeq: { cached: true,
                                                                                     result: undefined } }]).value);
      },
      member(...args_0) {
        if (args_0.length !== 1) {
          throw new __compactRuntime.CompactError(`member: expected 1 argument, received ${args_0.length}`);
        }
        const key_0 = args_0[0];
        if (!(key_0.buffer instanceof ArrayBuffer && key_0.BYTES_PER_ELEMENT === 1 && key_0.length === 32)) {
          __compactRuntime.typeError('member',
                                     'argument 1',
                                     'zkclinic.compact line 275 char 1',
                                     'Bytes<32>',
                                     key_0)
        }
        return _descriptor_4.fromValue(__compactRuntime.queryLedgerState(context,
                                                                         partialProofData,
                                                                         [
                                                                          { dup: { n: 0 } },
                                                                          { idx: { cached: false,
                                                                                   pushPath: false,
                                                                                   path: [
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_1.toValue(12n),
                                                                                                     alignment: _descriptor_1.alignment() } }] } },
                                                                          { push: { storage: false,
                                                                                    value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(key_0),
                                                                                                                                 alignment: _descriptor_0.alignment() }).encode() } },
                                                                          'member',
                                                                          { popeq: { cached: true,
                                                                                     result: undefined } }]).value);
      },
      lookup(...args_0) {
        if (args_0.length !== 1) {
          throw new __compactRuntime.CompactError(`lookup: expected 1 argument, received ${args_0.length}`);
        }
        const key_0 = args_0[0];
        if (!(key_0.buffer instanceof ArrayBuffer && key_0.BYTES_PER_ELEMENT === 1 && key_0.length === 32)) {
          __compactRuntime.typeError('lookup',
                                     'argument 1',
                                     'zkclinic.compact line 275 char 1',
                                     'Bytes<32>',
                                     key_0)
        }
        return _descriptor_6.fromValue(__compactRuntime.queryLedgerState(context,
                                                                         partialProofData,
                                                                         [
                                                                          { dup: { n: 0 } },
                                                                          { idx: { cached: false,
                                                                                   pushPath: false,
                                                                                   path: [
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_1.toValue(12n),
                                                                                                     alignment: _descriptor_1.alignment() } }] } },
                                                                          { idx: { cached: false,
                                                                                   pushPath: false,
                                                                                   path: [
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_0.toValue(key_0),
                                                                                                     alignment: _descriptor_0.alignment() } }] } },
                                                                          { popeq: { cached: false,
                                                                                     result: undefined } }]).value);
      },
      [Symbol.iterator](...args_0) {
        if (args_0.length !== 0) {
          throw new __compactRuntime.CompactError(`iter: expected 0 arguments, received ${args_0.length}`);
        }
        const self_0 = state.asArray()[12];
        return self_0.asMap().keys().map(  (key) => {    const value = self_0.asMap().get(key).asCell();    return [      _descriptor_0.fromValue(key.value),      _descriptor_6.fromValue(value.value)    ];  })[Symbol.iterator]();
      }
    },
    enrolledProofs: {
      isEmpty(...args_0) {
        if (args_0.length !== 0) {
          throw new __compactRuntime.CompactError(`isEmpty: expected 0 arguments, received ${args_0.length}`);
        }
        return _descriptor_4.fromValue(__compactRuntime.queryLedgerState(context,
                                                                         partialProofData,
                                                                         [
                                                                          { dup: { n: 0 } },
                                                                          { idx: { cached: false,
                                                                                   pushPath: false,
                                                                                   path: [
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_1.toValue(13n),
                                                                                                     alignment: _descriptor_1.alignment() } }] } },
                                                                          'size',
                                                                          { push: { storage: false,
                                                                                    value: __compactRuntime.StateValue.newCell({ value: _descriptor_6.toValue(0n),
                                                                                                                                 alignment: _descriptor_6.alignment() }).encode() } },
                                                                          'eq',
                                                                          { popeq: { cached: true,
                                                                                     result: undefined } }]).value);
      },
      size(...args_0) {
        if (args_0.length !== 0) {
          throw new __compactRuntime.CompactError(`size: expected 0 arguments, received ${args_0.length}`);
        }
        return _descriptor_6.fromValue(__compactRuntime.queryLedgerState(context,
                                                                         partialProofData,
                                                                         [
                                                                          { dup: { n: 0 } },
                                                                          { idx: { cached: false,
                                                                                   pushPath: false,
                                                                                   path: [
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_1.toValue(13n),
                                                                                                     alignment: _descriptor_1.alignment() } }] } },
                                                                          'size',
                                                                          { popeq: { cached: true,
                                                                                     result: undefined } }]).value);
      },
      member(...args_0) {
        if (args_0.length !== 1) {
          throw new __compactRuntime.CompactError(`member: expected 1 argument, received ${args_0.length}`);
        }
        const elem_0 = args_0[0];
        if (!(elem_0.buffer instanceof ArrayBuffer && elem_0.BYTES_PER_ELEMENT === 1 && elem_0.length === 32)) {
          __compactRuntime.typeError('member',
                                     'argument 1',
                                     'zkclinic.compact line 276 char 1',
                                     'Bytes<32>',
                                     elem_0)
        }
        return _descriptor_4.fromValue(__compactRuntime.queryLedgerState(context,
                                                                         partialProofData,
                                                                         [
                                                                          { dup: { n: 0 } },
                                                                          { idx: { cached: false,
                                                                                   pushPath: false,
                                                                                   path: [
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_1.toValue(13n),
                                                                                                     alignment: _descriptor_1.alignment() } }] } },
                                                                          { push: { storage: false,
                                                                                    value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(elem_0),
                                                                                                                                 alignment: _descriptor_0.alignment() }).encode() } },
                                                                          'member',
                                                                          { popeq: { cached: true,
                                                                                     result: undefined } }]).value);
      },
      [Symbol.iterator](...args_0) {
        if (args_0.length !== 0) {
          throw new __compactRuntime.CompactError(`iter: expected 0 arguments, received ${args_0.length}`);
        }
        const self_0 = state.asArray()[13];
        return self_0.asMap().keys().map((elem) => _descriptor_0.fromValue(elem.value))[Symbol.iterator]();
      }
    }
  };
}
const _emptyContext = {
  callContext: { currentQueryContext: new __compactRuntime.QueryContext(new __compactRuntime.ContractState().data, __compactRuntime.dummyContractAddress()), currentGasCost: __compactRuntime.emptyRunningCost() }
};
const _dummyContract = new Contract({
  patientSecretKey: (...args) => undefined,
  healthAttributes: (...args) => undefined,
  credentialPath: (...args) => undefined,
  recordApplication: (...args) => undefined
});
export const pureCircuits = {
  patientPublicKey: (...args_0) => {
    if (args_0.length !== 1) {
      throw new __compactRuntime.CompactError(`patientPublicKey: expected 1 argument (as invoked from Typescript), received ${args_0.length}`);
    }
    const sk_0 = args_0[0];
    if (!(sk_0.buffer instanceof ArrayBuffer && sk_0.BYTES_PER_ELEMENT === 1 && sk_0.length === 32)) {
      __compactRuntime.typeError('patientPublicKey',
                                 'argument 1',
                                 'zkclinic.compact line 285 char 1',
                                 'Bytes<32>',
                                 sk_0)
    }
    return _dummyContract._patientPublicKey_0(sk_0);
  },
  credentialCommitment: (...args_0) => {
    if (args_0.length !== 2) {
      throw new __compactRuntime.CompactError(`credentialCommitment: expected 2 arguments (as invoked from Typescript), received ${args_0.length}`);
    }
    const ownerPk_0 = args_0[0];
    const attrs_0 = args_0[1];
    if (!(ownerPk_0.buffer instanceof ArrayBuffer && ownerPk_0.BYTES_PER_ELEMENT === 1 && ownerPk_0.length === 32)) {
      __compactRuntime.typeError('credentialCommitment',
                                 'argument 1',
                                 'zkclinic.compact line 289 char 1',
                                 'Bytes<32>',
                                 ownerPk_0)
    }
    if (!(typeof(attrs_0) === 'object' && typeof(attrs_0.ageYears) === 'bigint' && attrs_0.ageYears >= 0n && attrs_0.ageYears <= 255n && Array.isArray(attrs_0.diagnoses) && attrs_0.diagnoses.length === 4 && attrs_0.diagnoses.every((t) => t.buffer instanceof ArrayBuffer && t.BYTES_PER_ELEMENT === 1 && t.length === 32) && Array.isArray(attrs_0.labs) && attrs_0.labs.length === 4 && attrs_0.labs.every((t) => typeof(t) === 'object' && t.code.buffer instanceof ArrayBuffer && t.code.BYTES_PER_ELEMENT === 1 && t.code.length === 32 && typeof(t.value) === 'bigint' && t.value >= 0n && t.value <= 4294967295n) && typeof(attrs_0.expiresAt) === 'bigint' && attrs_0.expiresAt >= 0n && attrs_0.expiresAt <= 18446744073709551615n && attrs_0.salt.buffer instanceof ArrayBuffer && attrs_0.salt.BYTES_PER_ELEMENT === 1 && attrs_0.salt.length === 32)) {
      __compactRuntime.typeError('credentialCommitment',
                                 'argument 2',
                                 'zkclinic.compact line 289 char 1',
                                 'struct HealthAttributes<ageYears: Uint<0..256>, diagnoses: Vector<4, Bytes<32>>, labs: Vector<4, struct LabResult<code: Bytes<32>, value: Uint<0..4294967296>>>, expiresAt: Uint<0..18446744073709551616>, salt: Bytes<32>>',
                                 attrs_0)
    }
    return _dummyContract._credentialCommitment_0(ownerPk_0, attrs_0);
  },
  trialNullifier: (...args_0) => {
    if (args_0.length !== 2) {
      throw new __compactRuntime.CompactError(`trialNullifier: expected 2 arguments (as invoked from Typescript), received ${args_0.length}`);
    }
    const trialId_0 = args_0[0];
    const sk_0 = args_0[1];
    if (!(trialId_0.buffer instanceof ArrayBuffer && trialId_0.BYTES_PER_ELEMENT === 1 && trialId_0.length === 32)) {
      __compactRuntime.typeError('trialNullifier',
                                 'argument 1',
                                 'zkclinic.compact line 295 char 1',
                                 'Bytes<32>',
                                 trialId_0)
    }
    if (!(sk_0.buffer instanceof ArrayBuffer && sk_0.BYTES_PER_ELEMENT === 1 && sk_0.length === 32)) {
      __compactRuntime.typeError('trialNullifier',
                                 'argument 2',
                                 'zkclinic.compact line 295 char 1',
                                 'Bytes<32>',
                                 sk_0)
    }
    return _dummyContract._trialNullifier_0(trialId_0, sk_0);
  }
};
export const expectedVk = {
  'appendDiagnosisToCredential': '03b3f4bcb553b8b8045b23752fe5a7e9b9ab3363b4abc8e51b43336496908e10',
  'approveIssuer': '54ac13d8a22b3e0c13e061061a655e30b90fee42eb24634140108019cbba706d',
  'closeTrial': '9445c3a9f9dae1ae5849cb502a8c6964679cc7efcbb8f5f3c5d2c4413b0c69ba',
  'createTrial': '43480fa1970ba9fab87d5d93c0e900727797b575906ff646f90f3e305d0ee018',
  'issueCredentialCommitment': 'eaf6ffceda58a1d80692fd39721d3591849c7d9bb1abbfc7b24ff818e15ac1c6',
  'proveEligibility': 'd47d334ef508a096743ee9554aa08435d71a116e855fc174be37341ecff9acd9',
  'publishTrialCriteria': '92441ca9bf04603090944d0ed8f51271bc7686ddb20add6b95971270b0801a1d',
  'recordEnrollment': '0973ec394e97cb146ff1f243a7acf6b52748447b89aeb7cda3b49e30598b15d5',
  'registerCredential': '6a637a4d176058ed7ff0c51262988b065f841ea3a1c31dab732840c3e31c246e',
  'revokeCredential': 'bc0bc9d14019d2da2c0bc2ecbae414a86df16f308d2cf3f48f3fcd9417e86fec',
  'revokeIssuer': '95cec0c29c504634653bc5e8aa74e834650d337b587d40f19b478f26e9089d0a',
  'submitIssuerRequest': '185107e21dc87efcf32851f728ecd1485a2875187f1feb5139a98b8a1fd25337',
  'transferAdmin': '4816b0578a164158a5f06ecee2b58e1f67c07b97d5f6d58824c73b0d9e9ed3d6',
};

export const circuitSignatures = {
  'submitIssuerRequest': {pure: false, provable: true, argumentTypes: [{tag: 'Bytes', length: 32}], resultType: {tag: 'Tuple', types: []}},
  'approveIssuer': {pure: false, provable: true, argumentTypes: [{tag: 'Struct', name: 'ZswapCoinPublicKey', elements: [{name: 'bytes', type: {tag: 'Bytes', length: 32}}]}, {tag: 'Bytes', length: 32}, {tag: 'Bytes', length: 32}], resultType: {tag: 'Tuple', types: []}},
  'revokeIssuer': {pure: false, provable: true, argumentTypes: [{tag: 'Struct', name: 'ZswapCoinPublicKey', elements: [{name: 'bytes', type: {tag: 'Bytes', length: 32}}]}], resultType: {tag: 'Tuple', types: []}},
  'transferAdmin': {pure: false, provable: true, argumentTypes: [{tag: 'Struct', name: 'ZswapCoinPublicKey', elements: [{name: 'bytes', type: {tag: 'Bytes', length: 32}}]}], resultType: {tag: 'Tuple', types: []}},
  'registerCredential': {pure: false, provable: true, argumentTypes: [{tag: 'Bytes', length: 32}], resultType: {tag: 'Tuple', types: []}},
  'appendDiagnosisToCredential': {pure: false, provable: true, argumentTypes: [{tag: 'Bytes', length: 32}, {tag: 'Bytes', length: 32}], resultType: {tag: 'Tuple', types: []}},
  'revokeCredential': {pure: false, provable: true, argumentTypes: [{tag: 'Bytes', length: 32}], resultType: {tag: 'Tuple', types: []}},
  'createTrial': {pure: false, provable: true, argumentTypes: [{tag: 'Bytes', length: 32}, {tag: 'Uint', maxval: '18446744073709551615'}, {tag: 'Uint', maxval: '18446744073709551615'}, {tag: 'Bytes', length: 32}, {tag: 'Uint', maxval: '18446744073709551615'}], resultType: {tag: 'Tuple', types: []}},
  'closeTrial': {pure: false, provable: true, argumentTypes: [{tag: 'Bytes', length: 32}], resultType: {tag: 'Tuple', types: []}},
  'patientPublicKey': {pure: true, provable: false, argumentTypes: [{tag: 'Bytes', length: 32}], resultType: {tag: 'Bytes', length: 32}},
  'credentialCommitment': {pure: true, provable: false, argumentTypes: [{tag: 'Bytes', length: 32}, {tag: 'Struct', name: 'HealthAttributes', elements: [{name: 'ageYears', type: {tag: 'Uint', maxval: '255'}}, {name: 'diagnoses', type: {tag: 'Vector', length: 4, type: {tag: 'Bytes', length: 32}}}, {name: 'labs', type: {tag: 'Vector', length: 4, type: {tag: 'Struct', name: 'LabResult', elements: [{name: 'code', type: {tag: 'Bytes', length: 32}}, {name: 'value', type: {tag: 'Uint', maxval: '4294967295'}}]}}}, {name: 'expiresAt', type: {tag: 'Uint', maxval: '18446744073709551615'}}, {name: 'salt', type: {tag: 'Bytes', length: 32}}]}], resultType: {tag: 'Bytes', length: 32}},
  'trialNullifier': {pure: true, provable: false, argumentTypes: [{tag: 'Bytes', length: 32}, {tag: 'Bytes', length: 32}], resultType: {tag: 'Bytes', length: 32}},
  'issueCredentialCommitment': {pure: false, provable: true, argumentTypes: [{tag: 'Bytes', length: 32}], resultType: {tag: 'Tuple', types: []}},
  'publishTrialCriteria': {pure: false, provable: true, argumentTypes: [{tag: 'Bytes', length: 32}, {tag: 'Struct', name: 'EligibilityCriteria', elements: [{name: 'minAge', type: {tag: 'Uint', maxval: '255'}}, {name: 'maxAge', type: {tag: 'Uint', maxval: '255'}}, {name: 'requiredDiagnosis', type: {tag: 'Bytes', length: 32}}, {name: 'excludedDiagnosis', type: {tag: 'Bytes', length: 32}}, {name: 'labCode', type: {tag: 'Bytes', length: 32}}, {name: 'labMin', type: {tag: 'Uint', maxval: '4294967295'}}, {name: 'labMax', type: {tag: 'Uint', maxval: '4294967295'}}]}], resultType: {tag: 'Tuple', types: []}},
  'proveEligibility': {pure: false, provable: true, argumentTypes: [{tag: 'Bytes', length: 32}, {tag: 'Uint', maxval: '18446744073709551615'}], resultType: {tag: 'Bytes', length: 32}},
  'recordEnrollment': {pure: false, provable: true, argumentTypes: [{tag: 'Bytes', length: 32}, {tag: 'Bytes', length: 32}], resultType: {tag: 'Tuple', types: []}},
};

export const declaredInterfaces = {};

//# sourceMappingURL=index.js.map
