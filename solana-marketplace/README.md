# Solana Marketplace

A decentralized marketplace smart contract built on Solana using the Anchor framework. This program is a production-ready port of the Julian CosmWasm marketplace contract.

## Features

### Core Functionality
- **Listings Management**: Create, edit, and delete product listings
- **Purchase Flow**: Buy items with SOL held in escrow
- **Shipping & Delivery**: Seller marks shipped, buyer confirms receipt
- **Dispute Resolution**: Request arbitration and resolve disputes
- **Profile System**: Create profiles with transaction history and ratings
- **Rating System**: Rate counterparties after completed transactions
- **Relationship Tracking**: Track buyer-seller relationships

### Security Features
- **Escrow System**: Funds held in program-derived addresses (PDAs)
- **5% Platform Fee**: Automatically distributed on successful transactions
- **Fraud Protection**: Listings cannot be edited after purchase
- **Arbitration**: Hardcoded arbiter can resolve disputes
- **Time-based Cleanup**: Automatic cleanup of old relationships after 30 days

## Architecture

### Program Accounts

1. **Config**: Global marketplace configuration
   - Tracks total listing count and last listing ID
   - Stores admin address

2. **Profile**: User profiles
   - Profile name, transaction count, ratings
   - PDA: `[b"profile", user_pubkey]`

3. **Listing**: Product listings
   - All listing details, purchase state, shipping state
   - PDA: `[b"listing", listing_id]`

4. **Escrow**: Holds funds during transaction
   - Automatically created on purchase
   - PDA: `[b"escrow", listing_id]`

5. **Relationship**: Tracks buyer-seller transactions
   - Created when item is marked as shipped
   - Used for rating validation
   - PDA: `[b"relationship", seller_pubkey, buyer_pubkey]`

### Instructions

1. `initialize`: Initialize the marketplace
2. `create_profile`: Create a user profile
3. `delete_profile`: Delete a user profile
4. `create_listing`: Create a new product listing
5. `edit_listing`: Edit an existing listing (before purchase only)
6. `delete_listing`: Delete a listing
7. `purchase`: Buy a listing (creates escrow)
8. `cancel_purchase`: Buyer cancels before shipping (refunds from escrow)
9. `seller_cancel_sale`: Seller cancels and refunds buyer
10. `sign_shipped`: Seller marks item as shipped (creates relationship)
11. `sign_received`: Buyer confirms receipt (releases funds with 5% fee)
12. `request_arbitration`: Request dispute resolution
13. `arbitrate`: Arbiter resolves dispute and releases funds
14. `rate_user`: Rate a transaction counterparty
15. `cleanup_old_relationships`: Clean up relationships older than 30 days

## Building

```bash
# Install dependencies
npm install -g @coral-xyz/anchor-cli

# Build the program
anchor build

# Test the program
anchor test

# Deploy to devnet
anchor deploy --provider.cluster devnet
```

## Deployment

### Prerequisites
- Solana CLI installed and configured
- Anchor CLI installed
- Wallet with sufficient SOL for deployment

### Steps

1. Build the optimized program:
```bash
anchor build --verifiable
```

2. Get the program ID:
```bash
solana address -k target/deploy/solana_marketplace-keypair.json
```

3. Update the program ID in:
   - `lib.rs` (declare_id!)
   - `Anchor.toml`

4. Rebuild:
```bash
anchor build
```

5. Deploy:
```bash
# Devnet
anchor deploy --provider.cluster devnet

# Mainnet-beta
anchor deploy --provider.cluster mainnet
```

6. Initialize the marketplace:
```bash
anchor run initialize --provider.cluster devnet
```

## Usage Examples

### Create a Profile
```typescript
await program.methods
  .createProfile("MyUsername")
  .accounts({
    profile: profilePda,
    user: wallet.publicKey,
    systemProgram: SystemProgram.programId,
  })
  .rpc();
```

### Create a Listing
```typescript
await program.methods
  .createListing(
    "iPhone 15 Pro",
    "https://gateway.pinata.cloud/ipfs/QmXxx...",
    "Brand new, sealed",
    ["electronics", "phone"],
    "signal:username",
    new anchor.BN(5_000_000_000) // 5 SOL in lamports
  )
  .accounts({
    config: configPda,
    listing: listingPda,
    seller: wallet.publicKey,
    systemProgram: SystemProgram.programId,
  })
  .rpc();
```

### Purchase a Listing
```typescript
await program.methods
  .purchase()
  .accounts({
    listing: listingPda,
    escrow: escrowPda,
    buyer: wallet.publicKey,
    systemProgram: SystemProgram.programId,
  })
  .rpc();
```

### Complete Transaction
```typescript
// Seller marks as shipped
await program.methods
  .signShipped()
  .accounts({
    listing: listingPda,
    relationship: relationshipPda,
    signer: sellerWallet.publicKey,
    systemProgram: SystemProgram.programId,
  })
  .rpc();

// Buyer confirms receipt (releases funds)
await program.methods
  .signReceived()
  .accounts({
    listing: listingPda,
    escrow: escrowPda,
    buyer: buyerWallet.publicKey,
    seller: sellerWallet.publicKey,
    admin: adminPubkey,
    sellerProfile: sellerProfilePda,
    buyerProfile: buyerProfilePda,
    systemProgram: SystemProgram.programId,
  })
  .rpc();
```

## Constants

- `MAX_TEXT_LENGTH`: 499 characters
- `MAX_TITLE_LENGTH`: 100 characters
- `MAX_ID_LENGTH`: 128 characters (IPFS hash)
- `MAX_TAGS`: 10 tags per listing
- `MAX_TAG_LENGTH`: 50 characters per tag
- `MAX_CONTACT_LENGTH`: 100 characters
- `MAX_PROFILE_NAME_LENGTH`: 50 characters
- `FEE_PERCENTAGE`: 5%
- `THIRTY_DAYS_SECONDS`: 2,592,000 seconds

## Security Considerations

1. **Escrow Safety**: Funds are held in PDAs controlled by the program
2. **Authorization**: All sensitive operations check for proper authority
3. **Immutability**: Purchased listings cannot be edited
4. **Arbitration**: Only designated arbiter can resolve disputes
5. **Rating Validation**: Can only rate users with proven transaction history

## Differences from CosmWasm Version

1. **Account Model**: Uses Solana's account-based model vs CosmWasm's storage
2. **Escrow**: Each purchase creates a separate escrow account (PDA)
3. **Queries**: Query operations are handled client-side by fetching accounts
4. **Relationships**: Stored as separate accounts instead of maps
5. **Native Token**: Uses SOL instead of JUNO token

## License

Licensed under the same terms as the original Julian marketplace contract.

## Support

For issues and questions, please open an issue on GitHub.

