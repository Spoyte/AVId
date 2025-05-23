pragma circom 2.0.0;

include "circomlib/circuits/comparators.circom";
include "circomlib/circuits/poseidon.circom";

/**
 * Age Verification Circuit
 * Proves that a person is over a minimum age without revealing their exact age
 * 
 * Public inputs:
 * - minAge: minimum age to prove (e.g., 18)
 * - currentDate: current date as timestamp
 * - credentialHash: hash of the credential being verified
 * 
 * Private inputs:
 * - birthDate: person's birth date as timestamp
 * - salt: random salt for privacy
 * 
 * Output:
 * - isValid: 1 if age >= minAge, 0 otherwise
 */
template AgeVerification() {
    // Public inputs
    signal input minAge;
    signal input currentDate;
    signal input credentialHash;
    
    // Private inputs
    signal private input birthDate;
    signal private input salt;
    
    // Output
    signal output isValid;
    
    // Calculate age in years (simplified)
    // In practice, this would need more sophisticated date arithmetic
    component ageDiff = Num2Bits(32);
    ageDiff.in <== currentDate - birthDate;
    
    // Convert to approximate years (assuming 365.25 days per year)
    // This is simplified for the MVP
    signal ageInSeconds <== currentDate - birthDate;
    signal ageInYears <== ageInSeconds \ 31557600; // seconds per year
    
    // Check if age >= minAge
    component ageCheck = GreaterEqualThan(8);
    ageCheck.in[0] <== ageInYears;
    ageCheck.in[1] <== minAge;
    
    // Verify credential integrity using Poseidon hash
    component hasher = Poseidon(3);
    hasher.inputs[0] <== birthDate;
    hasher.inputs[1] <== salt;
    hasher.inputs[2] <== minAge;
    
    // The credential hash should match our computed hash
    // This ensures the birth date hasn't been tampered with
    component hashCheck = IsEqual();
    hashCheck.in[0] <== hasher.out;
    hashCheck.in[1] <== credentialHash;
    
    // Final validity check: age is sufficient AND credential is valid
    component finalCheck = AND();
    finalCheck.a <== ageCheck.out;
    finalCheck.b <== hashCheck.out;
    
    isValid <== finalCheck.out;
}

/**
 * Simplified Age Verification for MVP
 * Uses basic comparison without complex date arithmetic
 */
template SimpleAgeVerification() {
    // Public inputs
    signal input minAge;
    signal input isOver; // 1 if over minAge, 0 otherwise (from oracle)
    
    // Private inputs
    signal private input actualAge;
    signal private input nonce;
    
    // Output
    signal output valid;
    
    // Verify that the claimed "isOver" status is correct
    component ageCheck = GreaterEqualThan(8);
    ageCheck.in[0] <== actualAge;
    ageCheck.in[1] <== minAge;
    
    // Check that isOver matches our calculation
    component statusCheck = IsEqual();
    statusCheck.in[0] <== isOver;
    statusCheck.in[1] <== ageCheck.out;
    
    // Add privacy by including nonce in calculation
    component privacyHash = Poseidon(2);
    privacyHash.inputs[0] <== actualAge;
    privacyHash.inputs[1] <== nonce;
    
    // Output is valid if status check passes
    valid <== statusCheck.out;
    
    // Constraint to ensure actualAge is reasonable (0-150 years)
    component rangeCheck = LessEqualThan(8);
    rangeCheck.in[0] <== actualAge;
    rangeCheck.in[1] <== 150;
    rangeCheck.out === 1;
}

// Main component for the circuit
component main = SimpleAgeVerification(); 