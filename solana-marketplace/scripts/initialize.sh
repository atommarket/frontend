#!/bin/bash

# Initialize the Solana Marketplace
# Usage: ./scripts/initialize.sh [devnet|mainnet]

set -e

CLUSTER=${1:-devnet}

echo "========================================"
echo "Initializing Solana Marketplace on $CLUSTER"
echo "========================================"

# Check if the program is deployed
PROGRAM_ID=$(solana address -k target/deploy/solana_marketplace-keypair.json)
echo "Program ID: $PROGRAM_ID"

# Get config PDA
echo ""
echo "Deriving config PDA..."

# You can use anchor's TypeScript client or write a simple script
# For now, we'll provide instructions
echo ""
echo "To initialize the marketplace, run the following:"
echo ""
echo "anchor run initialize --provider.cluster $CLUSTER"
echo ""
echo "Or use the TypeScript client:"
echo ""
echo "  import * as anchor from '@coral-xyz/anchor';"
echo "  const program = anchor.workspace.SolanaMarketplace;"
echo "  const [configPda] = PublicKey.findProgramAddressSync("
echo "    [Buffer.from('config')],"
echo "    program.programId"
echo "  );"
echo "  await program.methods.initialize()"
echo "    .accounts({"
echo "      config: configPda,"
echo "      admin: wallet.publicKey,"
echo "      systemProgram: SystemProgram.programId,"
echo "    })"
echo "    .rpc();"
echo ""
echo "========================================"

