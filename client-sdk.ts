import {
  Connection,
  PublicKey,
  TransactionInstruction,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
  Transaction,
  sendAndConfirmTransaction,
  Keypair,
} from '@solana/web3.js';
import * as borsh from 'borsh';
import { Buffer } from 'buffer';

// Program ID
export const PROGRAM_ID = new PublicKey('ELhZ8euFpQ1pzQUiUofcVjLh2MFKRDHtcMeZDaRLFTLy');

// Instruction discriminators (first 8 bytes of sha256 hash of "global:instruction_name")
const INSTRUCTION_DISCRIMINATORS = {
  initialize: Buffer.from([175, 175, 109, 31, 13, 152, 155, 237]),
  createProfile: Buffer.from([219, 48, 172, 118, 193, 156, 75, 241]),
  createListing: Buffer.from([118, 251, 132, 87, 87, 26, 48, 146]),
  editListing: Buffer.from([162, 248, 144, 186, 206, 112, 70, 59]),
  deleteListing: Buffer.from([105, 163, 130, 187, 155, 65, 227, 13]),
  purchase: Buffer.from([102, 6, 61, 18, 1, 218, 235, 234]),
  cancelPurchase: Buffer.from([175, 187, 187, 146, 102, 52, 194, 73]),
  sellerCancelSale: Buffer.from([167, 219, 227, 67, 136, 117, 18, 99]),
  signShipped: Buffer.from([234, 126, 25, 37, 171, 155, 128, 168]),
  signReceived: Buffer.from([164, 124, 66, 53, 230, 175, 155, 190]),
  requestArbitration: Buffer.from([35, 224, 98, 222, 201, 145, 146, 115]),
  arbitrate: Buffer.from([121, 102, 195, 215, 165, 238, 49, 99]),
  rateUser: Buffer.from([161, 136, 193, 207, 253, 125, 236, 236]),
  cleanupOldRelationships: Buffer.from([204, 170, 172, 52, 223, 11, 146, 230]),
};

// Borsh schema for CreateListing instruction
class CreateListingArgs {
  listing_title: string;
  external_id: string;
  text: string;
  tags: string[];
  contact: string;
  price: bigint;

  constructor(fields: {
    listing_title: string;
    external_id: string;
    text: string;
    tags: string[];
    contact: string;
    price: bigint;
  }) {
    this.listing_title = fields.listing_title;
    this.external_id = fields.external_id;
    this.text = fields.text;
    this.tags = fields.tags;
    this.contact = fields.contact;
    this.price = fields.price;
  }
}

const CreateListingArgsSchema = new Map([
  [
    CreateListingArgs,
    {
      kind: 'struct',
      fields: [
        ['listing_title', 'string'],
        ['external_id', 'string'],
        ['text', 'string'],
        ['tags', ['string']],
        ['contact', 'string'],
        ['price', 'u64'],
      ],
    },
  ],
]);

// Helper to derive PDAs
export function deriveConfigPda(programId: PublicKey = PROGRAM_ID): [PublicKey, number] {
  return PublicKey.findProgramAddressSync([Buffer.from('config')], programId);
}

export function deriveProfilePda(
  userPubkey: PublicKey,
  programId: PublicKey = PROGRAM_ID
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('profile'), userPubkey.toBuffer()],
    programId
  );
}

export function deriveListingPda(
  listingId: number,
  programId: PublicKey = PROGRAM_ID
): [PublicKey, number] {
  const idBuffer = Buffer.alloc(8);
  idBuffer.writeBigUInt64LE(BigInt(listingId));
  return PublicKey.findProgramAddressSync([Buffer.from('listing'), idBuffer], programId);
}

export function deriveEscrowPda(
  listingId: number,
  programId: PublicKey = PROGRAM_ID
): [PublicKey, number] {
  const idBuffer = Buffer.alloc(8);
  idBuffer.writeBigUInt64LE(BigInt(listingId));
  return PublicKey.findProgramAddressSync([Buffer.from('escrow'), idBuffer], programId);
}

export function deriveRelationshipPda(
  seller: PublicKey,
  buyer: PublicKey,
  programId: PublicKey = PROGRAM_ID
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('relationship'), seller.toBuffer(), buyer.toBuffer()],
    programId
  );
}

// Initialize instruction
export async function createInitializeInstruction(
  admin: PublicKey,
  programId: PublicKey = PROGRAM_ID
): Promise<TransactionInstruction> {
  const [configPda] = deriveConfigPda(programId);

  return new TransactionInstruction({
    programId,
    keys: [
      { pubkey: configPda, isSigner: false, isWritable: true },
      { pubkey: admin, isSigner: true, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data: INSTRUCTION_DISCRIMINATORS.initialize,
  });
}

// Create Profile instruction
export async function createProfileInstruction(
  user: PublicKey,
  profileName: string,
  programId: PublicKey = PROGRAM_ID
): Promise<TransactionInstruction> {
  const [profilePda] = deriveProfilePda(user, programId);

  // Serialize profile name
  const profileNameBuffer = Buffer.from(profileName, 'utf8');
  const profileNameLength = Buffer.alloc(4);
  profileNameLength.writeUInt32LE(profileNameBuffer.length);

  const data = Buffer.concat([
    INSTRUCTION_DISCRIMINATORS.createProfile,
    profileNameLength,
    profileNameBuffer,
  ]);

  return new TransactionInstruction({
    programId,
    keys: [
      { pubkey: profilePda, isSigner: false, isWritable: true },
      { pubkey: user, isSigner: true, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data,
  });
}

// Create Listing instruction
export async function createListingInstruction(
  seller: PublicKey,
  listingTitle: string,
  externalId: string,
  text: string,
  tags: string[],
  contact: string,
  price: bigint,
  programId: PublicKey = PROGRAM_ID
): Promise<{ instruction: TransactionInstruction; listingId: number; listingPda: PublicKey }> {
  const connection = new Connection('https://api.devnet.solana.com');
  const [configPda] = deriveConfigPda(programId);

  // Fetch config to get next listing ID
  const configAccount = await connection.getAccountInfo(configPda);
  let listingId = 1;
  
  if (configAccount) {
    // Parse last_listing_id from account data
    // Config structure: admin(32) + listing_count(8) + last_listing_id(8) + bump(1)
    const data = configAccount.data;
    listingId = Number(data.readBigUInt64LE(40)) + 1; // offset 32 + 8 = 40
  }

  const [listingPda] = deriveListingPda(listingId, programId);

  // Serialize instruction arguments using Borsh
  const args = new CreateListingArgs({
    listing_title: listingTitle,
    external_id: externalId,
    text,
    tags,
    contact,
    price,
  });

  const serializedArgs = borsh.serialize(CreateListingArgsSchema, args);
  const data = Buffer.concat([INSTRUCTION_DISCRIMINATORS.createListing, Buffer.from(serializedArgs)]);

  const instruction = new TransactionInstruction({
    programId,
    keys: [
      { pubkey: configPda, isSigner: false, isWritable: true },
      { pubkey: listingPda, isSigner: false, isWritable: true },
      { pubkey: seller, isSigner: true, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data,
  });

  return { instruction, listingId, listingPda };
}

// Purchase instruction
export async function createPurchaseInstruction(
  buyer: PublicKey,
  listingId: number,
  programId: PublicKey = PROGRAM_ID
): Promise<TransactionInstruction> {
  const [listingPda] = deriveListingPda(listingId, programId);
  const [escrowPda] = deriveEscrowPda(listingId, programId);

  return new TransactionInstruction({
    programId,
    keys: [
      { pubkey: listingPda, isSigner: false, isWritable: true },
      { pubkey: escrowPda, isSigner: false, isWritable: true },
      { pubkey: buyer, isSigner: true, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data: INSTRUCTION_DISCRIMINATORS.purchase,
  });
}

// Sign Shipped instruction
export async function createSignShippedInstruction(
  signer: PublicKey,
  listingId: number,
  programId: PublicKey = PROGRAM_ID
): Promise<TransactionInstruction> {
  const connection = new Connection('https://api.devnet.solana.com');
  const [listingPda] = deriveListingPda(listingId, programId);
  
  // Fetch listing to get seller and buyer
  const listingAccount = await connection.getAccountInfo(listingPda);
  if (!listingAccount) throw new Error('Listing not found');
  
  // Parse seller (offset 8 + 8 + 4+title + 4+ext_id + 8 + 4+text + 4+tags... this gets complex)
  // For now, we'll need the buyer address passed in
  // Simplified - you'll need to parse the account data properly
  
  return new TransactionInstruction({
    programId,
    keys: [
      { pubkey: listingPda, isSigner: false, isWritable: true },
      // { pubkey: relationshipPda, isSigner: false, isWritable: true },
      { pubkey: signer, isSigner: true, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data: INSTRUCTION_DISCRIMINATORS.signShipped,
  });
}

// Fetch listing data
export async function fetchListing(
  listingId: number,
  connection: Connection,
  programId: PublicKey = PROGRAM_ID
): Promise<any | null> {
  const [listingPda] = deriveListingPda(listingId, programId);
  const accountInfo = await connection.getAccountInfo(listingPda);
  
  if (!accountInfo) return null;
  
  // Parse the account data
  // This is complex due to variable-length strings and arrays
  // You'll need to implement proper deserialization
  const data = accountInfo.data;
  
  // Basic structure (simplified - you need proper Borsh deserialization):
  // listing_id: u64 (8 bytes)
  // listing_title: String (4 bytes length + data)
  // external_id: String (4 bytes length + data)
  // price: u64 (8 bytes)
  // ... etc
  
  let offset = 8; // Skip discriminator
  const listingIdValue = data.readBigUInt64LE(offset);
  offset += 8;
  
  const titleLen = data.readUInt32LE(offset);
  offset += 4;
  const listing_title = data.slice(offset, offset + titleLen).toString('utf8');
  offset += titleLen;
  
  const extIdLen = data.readUInt32LE(offset);
  offset += 4;
  const external_id = data.slice(offset, offset + extIdLen).toString('utf8');
  offset += extIdLen;
  
  const price = data.readBigUInt64LE(offset);
  offset += 8;
  
  // Continue parsing... (this is tedious, better to use Anchor TypeScript client)
  
  return {
    listingId: Number(listingIdValue),
    listing_title,
    external_id,
    price: Number(price),
    // ... rest of fields
  };
}

// Fetch all listings
export async function fetchAllListings(
  connection: Connection,
  programId: PublicKey = PROGRAM_ID
): Promise<any[]> {
  const [configPda] = deriveConfigPda(programId);
  const configAccount = await connection.getAccountInfo(configPda);
  
  if (!configAccount) return [];
  
  const lastListingId = Number(configAccount.data.readBigUInt64LE(40));
  const listings = [];
  
  for (let i = 1; i <= lastListingId; i++) {
    const listing = await fetchListing(i, connection, programId);
    if (listing) listings.push(listing);
  }
  
  return listings;
}

// Example usage function
export async function exampleCreateListing() {
  const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
  const payer = Keypair.generate(); // Replace with your wallet
  
  const { instruction, listingId, listingPda } = await createListingInstruction(
    payer.publicKey,
    'iPhone 15 Pro',
    'https://gateway.pinata.cloud/ipfs/QmExample123',
    'Brand new, sealed iPhone 15 Pro',
    ['electronics', 'phone', 'apple'],
    'signal:seller123',
    BigInt(5_000_000_000) // 5 SOL in lamports
  );
  
  const transaction = new Transaction().add(instruction);
  const signature = await sendAndConfirmTransaction(connection, transaction, [payer]);
  
  console.log('Listing created!');
  console.log('Listing ID:', listingId);
  console.log('Listing PDA:', listingPda.toString());
  console.log('Transaction:', signature);
  
  return { listingId, listingPda, signature };
}

export default {
  PROGRAM_ID,
  deriveConfigPda,
  deriveProfilePda,
  deriveListingPda,
  deriveEscrowPda,
  deriveRelationshipPda,
  createInitializeInstruction,
  createProfileInstruction,
  createListingInstruction,
  createPurchaseInstruction,
  fetchListing,
  fetchAllListings,
};

