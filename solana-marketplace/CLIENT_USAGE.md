# Client Usage Guide

This guide shows how to interact with the Solana Marketplace program from a client application (web, mobile, or backend).

## Installation

```bash
npm install @coral-xyz/anchor @solana/web3.js
```

## Setup

```typescript
import * as anchor from "@coral-xyz/anchor";
import { Program, AnchorProvider, web3 } from "@coral-xyz/anchor";
import { Connection, PublicKey, SystemProgram } from "@solana/web3.js";
import { SolanaMarketplace } from "./types/solana_marketplace";

// Import IDL
import idl from "./target/idl/solana_marketplace.json";

// Program ID (update with your deployed program ID)
const PROGRAM_ID = new PublicKey("Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS");

// Setup connection
const connection = new Connection("https://api.devnet.solana.com", "confirmed");

// Setup provider (using wallet adapter in browser, or Keypair in backend)
const wallet = // ... your wallet implementation
const provider = new AnchorProvider(connection, wallet, {
  commitment: "confirmed",
});

// Create program instance
const program = new Program<SolanaMarketplace>(idl as any, PROGRAM_ID, provider);
```

## Common Operations

### 1. Derive PDAs (Program Derived Addresses)

```typescript
// Helper function to derive PDAs
function deriveConfigPda() {
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from("config")],
    program.programId
  );
  return pda;
}

function deriveProfilePda(userPubkey: PublicKey) {
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from("profile"), userPubkey.toBuffer()],
    program.programId
  );
  return pda;
}

function deriveListingPda(listingId: number) {
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from("listing"), Buffer.from(new Uint8Array(new BigUint64Array([BigInt(listingId)]).buffer))],
    program.programId
  );
  return pda;
}

function deriveEscrowPda(listingId: number) {
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from("escrow"), Buffer.from(new Uint8Array(new BigUint64Array([BigInt(listingId)]).buffer))],
    program.programId
  );
  return pda;
}

function deriveRelationshipPda(sellerPubkey: PublicKey, buyerPubkey: PublicKey) {
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from("relationship"), sellerPubkey.toBuffer(), buyerPubkey.toBuffer()],
    program.programId
  );
  return pda;
}
```

### 2. Create a Profile

```typescript
async function createProfile(profileName: string) {
  const userPubkey = provider.wallet.publicKey;
  const profilePda = deriveProfilePda(userPubkey);

  try {
    const tx = await program.methods
      .createProfile(profileName)
      .accounts({
        profile: profilePda,
        user: userPubkey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    console.log("Profile created:", tx);
    return tx;
  } catch (error) {
    console.error("Error creating profile:", error);
    throw error;
  }
}
```

### 3. Fetch a Profile

```typescript
async function fetchProfile(userPubkey: PublicKey) {
  const profilePda = deriveProfilePda(userPubkey);

  try {
    const profile = await program.account.profile.fetch(profilePda);
    return {
      owner: profile.owner.toString(),
      profileName: profile.profileName,
      transactionCount: profile.transactionCount.toNumber(),
      ratings: profile.ratings.toNumber(),
      ratingCount: profile.ratingCount.toNumber(),
      averageRating: profile.averageRating.toNumber(),
    };
  } catch (error) {
    console.error("Profile not found:", error);
    return null;
  }
}
```

### 4. Create a Listing

```typescript
async function createListing(
  title: string,
  ipfsHash: string,
  description: string,
  tags: string[],
  contact: string,
  priceInSol: number
) {
  const userPubkey = provider.wallet.publicKey;
  const configPda = deriveConfigPda();

  // Fetch current listing count to determine next listing ID
  const config = await program.account.config.fetch(configPda);
  const nextListingId = config.lastListingId.toNumber() + 1;
  const listingPda = deriveListingPda(nextListingId);

  const externalId = `https://gateway.pinata.cloud/ipfs/${ipfsHash}`;
  const priceInLamports = new anchor.BN(priceInSol * web3.LAMPORTS_PER_SOL);

  try {
    const tx = await program.methods
      .createListing(title, externalId, description, tags, contact, priceInLamports)
      .accounts({
        config: configPda,
        listing: listingPda,
        seller: userPubkey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    console.log("Listing created:", tx);
    return { tx, listingId: nextListingId };
  } catch (error) {
    console.error("Error creating listing:", error);
    throw error;
  }
}
```

### 5. Fetch a Listing

```typescript
async function fetchListing(listingId: number) {
  const listingPda = deriveListingPda(listingId);

  try {
    const listing = await program.account.listing.fetch(listingPda);
    return {
      listingId: listing.listingId.toNumber(),
      listingTitle: listing.listingTitle,
      externalId: listing.externalId,
      price: listing.price.toNumber() / web3.LAMPORTS_PER_SOL,
      text: listing.text,
      tags: listing.tags,
      seller: listing.seller.toString(),
      contact: listing.contact,
      bought: listing.bought,
      buyer: listing.buyer?.toString() || null,
      shipped: listing.shipped,
      received: listing.received,
      arbitrationRequested: listing.arbitrationRequested,
      creationDate: listing.creationDate.toNumber(),
      lastEditDate: listing.lastEditDate?.toNumber() || null,
    };
  } catch (error) {
    console.error("Listing not found:", error);
    return null;
  }
}
```

### 6. Fetch All Listings

```typescript
async function fetchAllListings() {
  try {
    const listings = await program.account.listing.all();
    return listings.map(({ publicKey, account }) => ({
      publicKey: publicKey.toString(),
      listingId: account.listingId.toNumber(),
      listingTitle: account.listingTitle,
      price: account.price.toNumber() / web3.LAMPORTS_PER_SOL,
      seller: account.seller.toString(),
      bought: account.bought,
      // ... other fields
    }));
  } catch (error) {
    console.error("Error fetching listings:", error);
    return [];
  }
}
```

### 7. Purchase a Listing

```typescript
async function purchaseListing(listingId: number) {
  const userPubkey = provider.wallet.publicKey;
  const listingPda = deriveListingPda(listingId);
  const escrowPda = deriveEscrowPda(listingId);

  try {
    const tx = await program.methods
      .purchase()
      .accounts({
        listing: listingPda,
        escrow: escrowPda,
        buyer: userPubkey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    console.log("Purchase successful:", tx);
    return tx;
  } catch (error) {
    console.error("Error purchasing:", error);
    throw error;
  }
}
```

### 8. Mark as Shipped (Seller)

```typescript
async function markAsShipped(listingId: number) {
  const userPubkey = provider.wallet.publicKey;
  const listingPda = deriveListingPda(listingId);
  
  // Fetch listing to get buyer address
  const listing = await program.account.listing.fetch(listingPda);
  const relationshipPda = deriveRelationshipPda(listing.seller, listing.buyer!);

  try {
    const tx = await program.methods
      .signShipped()
      .accounts({
        listing: listingPda,
        relationship: relationshipPda,
        signer: userPubkey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    console.log("Marked as shipped:", tx);
    return tx;
  } catch (error) {
    console.error("Error marking as shipped:", error);
    throw error;
  }
}
```

### 9. Confirm Receipt (Buyer)

```typescript
async function confirmReceipt(listingId: number, adminPubkey: PublicKey) {
  const userPubkey = provider.wallet.publicKey;
  const listingPda = deriveListingPda(listingId);
  const escrowPda = deriveEscrowPda(listingId);
  
  // Fetch listing to get seller address
  const listing = await program.account.listing.fetch(listingPda);
  
  const sellerProfilePda = deriveProfilePda(listing.seller);
  const buyerProfilePda = deriveProfilePda(userPubkey);

  try {
    const tx = await program.methods
      .signReceived()
      .accounts({
        listing: listingPda,
        escrow: escrowPda,
        buyer: userPubkey,
        seller: listing.seller,
        admin: adminPubkey,
        sellerProfile: sellerProfilePda,
        buyerProfile: buyerProfilePda,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    console.log("Receipt confirmed, funds released:", tx);
    return tx;
  } catch (error) {
    console.error("Error confirming receipt:", error);
    throw error;
  }
}
```

### 10. Rate a User

```typescript
async function rateUser(sellerPubkey: PublicKey, buyerPubkey: PublicKey, rating: number) {
  const userPubkey = provider.wallet.publicKey;
  const relationshipPda = deriveRelationshipPda(sellerPubkey, buyerPubkey);
  
  // Determine who to rate (the other party in the relationship)
  const recipientPubkey = userPubkey.equals(sellerPubkey) ? buyerPubkey : sellerPubkey;
  const recipientProfilePda = deriveProfilePda(recipientPubkey);

  try {
    const tx = await program.methods
      .rateUser(new anchor.BN(rating))
      .accounts({
        relationship: relationshipPda,
        recipientProfile: recipientProfilePda,
        rater: userPubkey,
        recipient: recipientPubkey,
      })
      .rpc();

    console.log("User rated:", tx);
    return tx;
  } catch (error) {
    console.error("Error rating user:", error);
    throw error;
  }
}
```

## React Hook Example

```typescript
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { useState, useEffect } from "react";

export function useMarketplaceListing(listingId: number) {
  const { connection } = useConnection();
  const { publicKey } = useWallet();
  const [listing, setListing] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadListing() {
      try {
        const data = await fetchListing(listingId);
        setListing(data);
      } catch (error) {
        console.error("Error loading listing:", error);
      } finally {
        setLoading(false);
      }
    }

    loadListing();
  }, [listingId]);

  return { listing, loading };
}
```

## Subscription to Account Changes

```typescript
// Subscribe to listing updates
function subscribeListing(listingId: number, callback: (listing: any) => void) {
  const listingPda = deriveListingPda(listingId);

  const subscriptionId = connection.onAccountChange(
    listingPda,
    (accountInfo) => {
      const listing = program.coder.accounts.decode("listing", accountInfo.data);
      callback(listing);
    },
    "confirmed"
  );

  // Return unsubscribe function
  return () => {
    connection.removeAccountChangeListener(subscriptionId);
  };
}
```

## Error Handling

```typescript
import { AnchorError } from "@coral-xyz/anchor";

async function handleTransaction() {
  try {
    await purchaseListing(1);
  } catch (error) {
    if (error instanceof AnchorError) {
      console.error("Error code:", error.error.errorCode.code);
      console.error("Error message:", error.error.errorMessage);
      
      // Handle specific errors
      switch (error.error.errorCode.code) {
        case "AlreadyPurchased":
          alert("This item has already been purchased");
          break;
        case "Unauthorized":
          alert("You are not authorized to perform this action");
          break;
        default:
          alert("Transaction failed: " + error.error.errorMessage);
      }
    } else {
      console.error("Unknown error:", error);
    }
  }
}
```

## Best Practices

1. **Always derive PDAs correctly** - Use the exact same seeds as defined in the program
2. **Handle errors gracefully** - Provide user-friendly error messages
3. **Confirm transactions** - Wait for transaction confirmation before updating UI
4. **Use subscriptions** - Subscribe to account changes for real-time updates
5. **Batch read operations** - Use `program.account.X.all()` or `getMultipleAccounts` when fetching multiple accounts
6. **Cache data** - Cache account data to reduce RPC calls
7. **Validate inputs** - Validate user inputs on the client before sending transactions

## Resources

- [Anchor Client Documentation](https://www.anchor-lang.com/docs/client)
- [Solana Web3.js](https://solana-labs.github.io/solana-web3.js/)
- [Wallet Adapter](https://github.com/solana-labs/wallet-adapter)

