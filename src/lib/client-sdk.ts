import {
  Connection,
  PublicKey,
  TransactionInstruction,
  SystemProgram,
} from '@solana/web3.js';
import * as borsh from 'borsh';

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

// Create Listing instruction
export async function createListingInstruction(
  seller: PublicKey,
  listingTitle: string,
  externalId: string,
  text: string,
  tags: string[],
  contact: string,
  price: bigint,
  connection: Connection,
  programId: PublicKey = PROGRAM_ID
): Promise<{ instruction: TransactionInstruction; listingId: number; listingPda: PublicKey }> {
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

  const serializedArgs = borsh.serialize(CreateListingArgsSchema, args) as any;
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
  const [listingPda] = deriveListingPda(listingId, programId);
  
  return new TransactionInstruction({
    programId,
    keys: [
      { pubkey: listingPda, isSigner: false, isWritable: true },
      { pubkey: signer, isSigner: true, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data: INSTRUCTION_DISCRIMINATORS.signShipped,
  });
}

// Sign Received instruction
export async function createSignReceivedInstruction(
  signer: PublicKey,
  listingId: number,
  programId: PublicKey = PROGRAM_ID
): Promise<TransactionInstruction> {
  const [listingPda] = deriveListingPda(listingId, programId);
  
  return new TransactionInstruction({
    programId,
    keys: [
      { pubkey: listingPda, isSigner: false, isWritable: true },
      { pubkey: signer, isSigner: true, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data: INSTRUCTION_DISCRIMINATORS.signReceived,
  });
}

// Delete Listing instruction
export async function createDeleteListingInstruction(
  seller: PublicKey,
  listingId: number,
  programId: PublicKey = PROGRAM_ID
): Promise<TransactionInstruction> {
  const [listingPda] = deriveListingPda(listingId, programId);
  const [configPda] = deriveConfigPda(programId);

  return new TransactionInstruction({
    programId,
    keys: [
      { pubkey: configPda, isSigner: false, isWritable: true },
      { pubkey: listingPda, isSigner: false, isWritable: true },
      { pubkey: seller, isSigner: true, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data: INSTRUCTION_DISCRIMINATORS.deleteListing,
  });
}

export default {
  PROGRAM_ID,
  deriveConfigPda,
  deriveProfilePda,
  deriveListingPda,
  deriveEscrowPda,
  deriveRelationshipPda,
  createListingInstruction,
  createPurchaseInstruction,
  createSignShippedInstruction,
  createSignReceivedInstruction,
  createDeleteListingInstruction,
};
