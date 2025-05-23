#!/bin/bash

# Circuit compilation script for Avalanche ID
echo "🔧 Compiling Zero-Knowledge Circuits..."

# Create output directories
mkdir -p build/age-verification
mkdir -p build/education-credential

# Compile age verification circuit
echo "📝 Compiling age verification circuit..."
circom age-verification.circom --r1cs --wasm --sym -o build/age-verification/

# Compile education credential circuit
echo "📝 Compiling education credential circuit..."
circom education-credential.circom --r1cs --wasm --sym -o build/education-credential/

# Generate trusted setup (for demo purposes - in production use ceremony)
echo "🔐 Generating trusted setup..."

# Age verification setup
cd build/age-verification
if [ ! -f "age-verification.ptau" ]; then
    echo "Generating powers of tau for age verification..."
    snarkjs powersoftau new bn128 12 pot12_0000.ptau -v
    snarkjs powersoftau contribute pot12_0000.ptau pot12_0001.ptau --name="First contribution" -v
    snarkjs powersoftau prepare phase2 pot12_0001.ptau pot12_final.ptau -v
    mv pot12_final.ptau age-verification.ptau
    rm pot12_0000.ptau pot12_0001.ptau
fi

echo "Generating zkey for age verification..."
snarkjs groth16 setup age-verification.r1cs age-verification.ptau age-verification_0000.zkey
snarkjs zkey contribute age-verification_0000.zkey age-verification_0001.zkey --name="First contribution" -v
snarkjs zkey export verificationkey age-verification_0001.zkey verification_key.json

cd ../..

# Education credential setup
cd build/education-credential
if [ ! -f "education-credential.ptau" ]; then
    echo "Generating powers of tau for education credential..."
    snarkjs powersoftau new bn128 12 pot12_0000.ptau -v
    snarkjs powersoftau contribute pot12_0000.ptau pot12_0001.ptau --name="First contribution" -v
    snarkjs powersoftau prepare phase2 pot12_0001.ptau pot12_final.ptau -v
    mv pot12_final.ptau education-credential.ptau
    rm pot12_0000.ptau pot12_0001.ptau
fi

echo "Generating zkey for education credential..."
snarkjs groth16 setup education-credential.r1cs education-credential.ptau education-credential_0000.zkey
snarkjs zkey contribute education-credential_0000.zkey education-credential_0001.zkey --name="First contribution" -v
snarkjs zkey export verificationkey education-credential_0001.zkey verification_key.json

cd ../..

echo "✅ Circuit compilation completed!"
echo "📁 Compiled circuits available in circuits/build/"
echo ""
echo "Next steps:"
echo "1. Use the generated .wasm files for proof generation"
echo "2. Use the verification keys in smart contracts"
echo "3. Test proof generation with sample inputs" 