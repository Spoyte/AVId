pragma circom 2.0.0;

include "circomlib/circuits/comparators.circom";
include "circomlib/circuits/poseidon.circom";

/**
 * Education Credential Verification Circuit
 * Proves that a person has a certain level of education without revealing specific details
 * 
 * Public inputs:
 * - requiredLevel: minimum education level required (1=Bachelor, 2=Master, 3=PhD)
 * - institutionHash: hash of approved institutions
 * 
 * Private inputs:
 * - actualLevel: person's actual education level
 * - institution: institution identifier
 * - graduationYear: year of graduation
 * - salt: random salt for privacy
 * 
 * Output:
 * - hasCredential: 1 if person has required education level, 0 otherwise
 */
template EducationCredential() {
    // Public inputs
    signal input requiredLevel;
    signal input institutionHash;
    
    // Private inputs
    signal private input actualLevel;
    signal private input institution;
    signal private input graduationYear;
    signal private input salt;
    
    // Output
    signal output hasCredential;
    
    // Check if actual level >= required level
    component levelCheck = GreaterEqualThan(8);
    levelCheck.in[0] <== actualLevel;
    levelCheck.in[1] <== requiredLevel;
    
    // Verify institution is approved
    component institutionHasher = Poseidon(2);
    institutionHasher.inputs[0] <== institution;
    institutionHasher.inputs[1] <== salt;
    
    component institutionCheck = IsEqual();
    institutionCheck.in[0] <== institutionHasher.out;
    institutionCheck.in[1] <== institutionHash;
    
    // Check graduation year is reasonable (between 1950 and 2030)
    component yearMinCheck = GreaterEqualThan(16);
    yearMinCheck.in[0] <== graduationYear;
    yearMinCheck.in[1] <== 1950;
    
    component yearMaxCheck = LessEqualThan(16);
    yearMaxCheck.in[0] <== graduationYear;
    yearMaxCheck.in[1] <== 2030;
    
    // Combine year checks
    component yearCheck = AND();
    yearCheck.a <== yearMinCheck.out;
    yearCheck.b <== yearMaxCheck.out;
    
    // Final credential check: level AND institution AND year
    component levelAndInstitution = AND();
    levelAndInstitution.a <== levelCheck.out;
    levelAndInstitution.b <== institutionCheck.out;
    
    component finalCheck = AND();
    finalCheck.a <== levelAndInstitution.out;
    finalCheck.b <== yearCheck.out;
    
    hasCredential <== finalCheck.out;
}

/**
 * Simplified Education Credential for MVP
 * Uses basic level comparison without complex verification
 */
template SimpleEducationCredential() {
    // Public inputs
    signal input requiredLevel; // 1=Bachelor, 2=Master, 3=PhD
    signal input hasLevel; // 1 if has required level, 0 otherwise (from oracle)
    
    // Private inputs
    signal private input actualLevel;
    signal private input nonce;
    
    // Output
    signal output valid;
    
    // Verify that the claimed "hasLevel" status is correct
    component levelCheck = GreaterEqualThan(8);
    levelCheck.in[0] <== actualLevel;
    levelCheck.in[1] <== requiredLevel;
    
    // Check that hasLevel matches our calculation
    component statusCheck = IsEqual();
    statusCheck.in[0] <== hasLevel;
    statusCheck.in[1] <== levelCheck.out;
    
    // Add privacy by including nonce in calculation
    component privacyHash = Poseidon(2);
    privacyHash.inputs[0] <== actualLevel;
    privacyHash.inputs[1] <== nonce;
    
    // Output is valid if status check passes
    valid <== statusCheck.out;
    
    // Constraint to ensure actualLevel is reasonable (1-3)
    component minLevelCheck = GreaterEqualThan(8);
    minLevelCheck.in[0] <== actualLevel;
    minLevelCheck.in[1] <== 1;
    minLevelCheck.out === 1;
    
    component maxLevelCheck = LessEqualThan(8);
    maxLevelCheck.in[0] <== actualLevel;
    maxLevelCheck.in[1] <== 3;
    maxLevelCheck.out === 1;
}

// Main component for the circuit
component main = SimpleEducationCredential(); 