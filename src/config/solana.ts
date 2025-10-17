import { PublicKey } from '@solana/web3.js';

// Program ID from deployment
export const PROGRAM_ID = new PublicKey('ELhZ8euFpQ1pzQUiUofcVjLh2MFKRDHtcMeZDaRLFTLy');

// Network configuration
export const NETWORK = 'devnet';
export const RPC_ENDPOINT = 'https://api.devnet.solana.com';

// Admin wallet from deployment
export const ADMIN_PUBKEY = new PublicKey('G9MLBNSHjvjmZbnEeC3737KhSMddXdBFztn8GNV5uUeR');

// PDA derivation helpers
export function deriveConfigPda(programId: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('config')],
    programId
  );
}

export function deriveProfilePda(userPubkey: PublicKey, programId: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('profile'), userPubkey.toBuffer()],
    programId
  );
}

export function deriveListingPda(listingId: number, programId: PublicKey): [PublicKey, number] {
  const listingIdBuffer = Buffer.alloc(8);
  listingIdBuffer.writeBigUInt64LE(BigInt(listingId));
  
  return PublicKey.findProgramAddressSync(
    [Buffer.from('listing'), listingIdBuffer],
    programId
  );
}

export function deriveEscrowPda(listingId: number, programId: PublicKey): [PublicKey, number] {
  const listingIdBuffer = Buffer.alloc(8);
  listingIdBuffer.writeBigUInt64LE(BigInt(listingId));
  
  return PublicKey.findProgramAddressSync(
    [Buffer.from('escrow'), listingIdBuffer],
    programId
  );
}

export function deriveRelationshipPda(
  sellerPubkey: PublicKey,
  buyerPubkey: PublicKey,
  programId: PublicKey
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('relationship'), sellerPubkey.toBuffer(), buyerPubkey.toBuffer()],
    programId
  );
}

