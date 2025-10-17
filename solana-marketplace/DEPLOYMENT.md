# Deployment Guide for Solana Marketplace

This guide walks you through deploying the Solana Marketplace program to devnet and mainnet.

## Prerequisites

1. **Solana CLI** installed and configured
   ```bash
   sh -c "$(curl -sSfL https://release.solana.com/stable/install)"
   ```

2. **Anchor CLI** installed
   ```bash
   cargo install --git https://github.com/coral-xyz/anchor anchor-cli --locked
   ```

3. **Node.js and npm** installed (v16 or higher)

4. **Wallet** with sufficient SOL
   - Devnet: ~5 SOL (can be airdropped)
   - Mainnet: ~10-15 SOL for deployment

## Step-by-Step Deployment

### 1. Setup Environment

```bash
# Clone and navigate to the project
cd solana-marketplace

# Install dependencies
npm install

# Build the program
anchor build
```

### 2. Configure Program ID

```bash
# Get the program ID
solana address -k target/deploy/solana_marketplace-keypair.json
```

Copy this program ID and update it in:
- `src/lib.rs` in the `declare_id!()` macro
- `Anchor.toml` in the `[programs.devnet]` and `[programs.mainnet]` sections

### 3. Rebuild with Correct Program ID

```bash
# Rebuild with the correct program ID
anchor build
```

### 4. Deploy to Devnet

```bash
# Set Solana to devnet
solana config set --url devnet

# Airdrop SOL if needed (devnet only)
solana airdrop 5

# Deploy the program
anchor deploy --provider.cluster devnet

# Or use the script
./scripts/deploy.sh devnet
```

### 5. Initialize the Marketplace

After deployment, you need to initialize the marketplace:

```bash
# Using TypeScript (create a script in scripts/initialize-marketplace.ts)
anchor run initialize --provider.cluster devnet
```

Or manually with the CLI:

```typescript
import * as anchor from "@coral-xyz/anchor";
import { PublicKey, SystemProgram } from "@solana/web3.js";

// ... setup provider and program

const [configPda] = PublicKey.findProgramAddressSync(
  [Buffer.from("config")],
  program.programId
);

await program.methods
  .initialize()
  .accounts({
    config: configPda,
    admin: wallet.publicKey,
    systemProgram: SystemProgram.programId,
  })
  .rpc();
```

### 6. Verify Deployment

```bash
# Check program info
solana program show <PROGRAM_ID> --url devnet

# Run tests against devnet
anchor test --skip-local-validator
```

### 7. Deploy to Mainnet (Production)

⚠️ **IMPORTANT**: Only deploy to mainnet after thorough testing on devnet!

```bash
# Set Solana to mainnet
solana config set --url mainnet-beta

# Check your balance
solana balance

# Deploy
anchor deploy --provider.cluster mainnet-beta

# Or use the script
./scripts/deploy.sh mainnet
```

### 8. Update Admin Address

Before mainnet deployment, update the `ADMIN` constant in `src/lib.rs` to your actual Solana admin address:

```rust
pub const ADMIN: &str = "YourSolanaPublicKeyHere...";
```

Then rebuild and redeploy.

## Post-Deployment Checklist

- [ ] Program deployed successfully
- [ ] Program ID updated in all files
- [ ] Marketplace initialized
- [ ] Admin address set correctly
- [ ] Basic functionality tested (create profile, create listing, purchase)
- [ ] Escrow system tested
- [ ] Arbitration functionality verified
- [ ] Fee distribution tested
- [ ] Documentation updated with contract address

## Troubleshooting

### Insufficient Funds Error

```bash
# Check your balance
solana balance

# Request airdrop on devnet
solana airdrop 5

# On mainnet, you need to transfer SOL to your wallet
```

### Account Already Exists

If redeploying with the same keypair:

```bash
# Close the existing program account (devnet only)
solana program close <PROGRAM_ID>

# Or generate a new keypair
solana-keygen new -o target/deploy/solana_marketplace-keypair.json
```

### Program ID Mismatch

Make sure the program ID in `declare_id!()` matches:

```bash
# Get the keypair address
solana address -k target/deploy/solana_marketplace-keypair.json

# Update lib.rs and Anchor.toml
# Rebuild: anchor build
```

## Upgrading the Program

To upgrade an existing deployment:

```bash
# Build the new version
anchor build

# Upgrade (requires upgrade authority)
anchor upgrade target/deploy/solana_marketplace.so --program-id <PROGRAM_ID>
```

## Security Considerations

1. **Upgrade Authority**: Store the upgrade authority keypair securely
2. **Admin Key**: Use a hardware wallet or multisig for the admin account
3. **Audit**: Have the code audited before mainnet deployment
4. **Testing**: Thoroughly test all functionality on devnet
5. **Monitoring**: Monitor the program for unusual activity after deployment

## Costs

Approximate costs (as of 2024):

- **Devnet**: Free (airdrop)
- **Mainnet Deployment**: ~5-10 SOL
- **Account Rent**: Accounts need minimum SOL for rent exemption
  - Config: ~0.003 SOL
  - Profile: ~0.005 SOL
  - Listing: ~0.01 SOL
  - Escrow: ~0.002 SOL

## Support

For issues or questions:
- Check the logs: `solana logs <PROGRAM_ID>`
- Review transaction details on Solana Explorer
- Open an issue on GitHub

## Resources

- [Solana Documentation](https://docs.solana.com/)
- [Anchor Documentation](https://www.anchor-lang.com/)
- [Solana Cookbook](https://solanacookbook.com/)
- [Solana Explorer](https://explorer.solana.com/)

