#!/bin/bash

# Deployment script for Solana Marketplace
# Usage: ./scripts/deploy.sh [devnet|mainnet]

set -e

CLUSTER=${1:-devnet}

echo "========================================"
echo "Deploying Solana Marketplace to $CLUSTER"
echo "========================================"

# Check if Anchor is installed
if ! command -v anchor &> /dev/null; then
    echo "Error: Anchor CLI is not installed"
    echo "Install with: cargo install --git https://github.com/coral-xyz/anchor anchor-cli --locked"
    exit 1
fi

# Check if Solana is installed
if ! command -v solana &> /dev/null; then
    echo "Error: Solana CLI is not installed"
    echo "Install from: https://docs.solana.com/cli/install-solana-cli-tools"
    exit 1
fi

# Build the program
echo ""
echo "Building program..."
anchor build

# Get program ID
PROGRAM_ID=$(solana address -k target/deploy/solana_marketplace-keypair.json)
echo ""
echo "Program ID: $PROGRAM_ID"
echo ""

# Check wallet balance
BALANCE=$(solana balance --url $CLUSTER)
echo "Wallet balance on $CLUSTER: $BALANCE"
echo ""

# Confirm deployment
read -p "Continue with deployment to $CLUSTER? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Deployment cancelled"
    exit 0
fi

# Deploy
echo ""
echo "Deploying to $CLUSTER..."
if [ "$CLUSTER" = "mainnet" ]; then
    anchor deploy --provider.cluster mainnet-beta
else
    anchor deploy --provider.cluster $CLUSTER
fi

echo ""
echo "========================================"
echo "Deployment complete!"
echo "Program ID: $PROGRAM_ID"
echo "Cluster: $CLUSTER"
echo "========================================"
echo ""
echo "Next steps:"
echo "1. Verify the program ID matches in lib.rs and Anchor.toml"
echo "2. Initialize the marketplace with: anchor run initialize"
echo "3. Test the deployment with: anchor test"

