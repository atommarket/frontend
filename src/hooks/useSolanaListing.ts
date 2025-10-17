import { useState, useCallback } from 'react';
import { PublicKey, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { BN } from '@coral-xyz/anchor';
import { useWallet } from '@solana/wallet-adapter-react';
import { useSolanaProgram } from './useSolanaProgram';
import { 
  deriveConfigPda, 
  deriveListingPda, 
  deriveEscrowPda,
  deriveRelationshipPda,
  PROGRAM_ID,
  ADMIN_PUBKEY 
} from '../config/solana';

export interface SolanaListing {
  listingId: number;
  listingTitle: string;
  externalId: string;
  price: number;
  text: string;
  tags: string[];
  seller: string;
  contact: string;
  bought: boolean;
  buyer: string | null;
  shipped: boolean;
  received: boolean;
  arbitrationRequested: boolean;
  creationDate: number;
  lastEditDate: number | null;
}

export function useSolanaListing() {
  const { program } = useSolanaProgram();
  const { publicKey } = useWallet();
  const [listings, setListings] = useState<SolanaListing[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchListings = useCallback(async () => {
    if (!program) return;
    
    setLoading(true);
    try {
      const listingAccounts = await (program.account as any).listing.all();
      
      const processedListings: SolanaListing[] = listingAccounts.map((account: any) => ({
        listingId: account.account.listingId.toNumber(),
        listingTitle: account.account.listingTitle,
        externalId: account.account.externalId,
        price: account.account.price.toNumber(),
        text: account.account.text,
        tags: account.account.tags || [],
        seller: account.account.seller.toString(),
        contact: account.account.contact,
        bought: account.account.bought,
        buyer: account.account.buyer?.toString() || null,
        shipped: account.account.shipped,
        received: account.account.received,
        arbitrationRequested: account.account.arbitrationRequested,
        creationDate: account.account.creationDate.toNumber(),
        lastEditDate: account.account.lastEditDate?.toNumber() || null,
      }));
      
      setListings(processedListings);
    } catch (error) {
      console.error('Error fetching listings:', error);
    } finally {
      setLoading(false);
    }
  }, [program]);

  const searchListingsByTitle = useCallback(async (title: string) => {
    if (!program || !title.trim()) {
      await fetchListings();
      return;
    }
    
    setLoading(true);
    try {
      const listingAccounts = await (program.account as any).listing.all();
      
      const filtered = listingAccounts.filter((account: any) =>
        account.account.listingTitle.toLowerCase().includes(title.toLowerCase())
      );
      
      const processedListings: SolanaListing[] = filtered.map((account: any) => ({
        listingId: account.account.listingId.toNumber(),
        listingTitle: account.account.listingTitle,
        externalId: account.account.externalId,
        price: account.account.price.toNumber(),
        text: account.account.text,
        tags: account.account.tags || [],
        seller: account.account.seller.toString(),
        contact: account.account.contact,
        bought: account.account.bought,
        buyer: account.account.buyer?.toString() || null,
        shipped: account.account.shipped,
        received: account.account.received,
        arbitrationRequested: account.account.arbitrationRequested,
        creationDate: account.account.creationDate.toNumber(),
        lastEditDate: account.account.lastEditDate?.toNumber() || null,
      }));
      
      setListings(processedListings);
    } catch (error) {
      console.error('Error searching listings:', error);
      await fetchListings();
    } finally {
      setLoading(false);
    }
  }, [program, fetchListings]);

  const createListing = useCallback(async (
    listingTitle: string,
    externalId: string,
    text: string,
    tags: string[],
    contact: string,
    priceInSol: number
  ) => {
    if (!program || !publicKey) {
      throw new Error('Wallet not connected');
    }

    const [configPda] = deriveConfigPda(PROGRAM_ID);
    
    // Fetch config to get next listing ID
    const config = await (program.account as any).config.fetch(configPda);
    const nextListingId = config.lastListingId.toNumber() + 1;
    
    const [listingPda] = deriveListingPda(nextListingId, PROGRAM_ID);
    const priceInLamports = new BN(priceInSol * LAMPORTS_PER_SOL);

    const tx = await program.methods
      .createListing(listingTitle, externalId, text, tags, contact, priceInLamports)
      .accounts({
        config: configPda,
        listing: listingPda,
        seller: publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    return { tx, listingId: nextListingId };
  }, [program, publicKey]);

  const purchaseListing = useCallback(async (listingId: number) => {
    if (!program || !publicKey) {
      throw new Error('Wallet not connected');
    }

    const [listingPda] = deriveListingPda(listingId, PROGRAM_ID);
    const [escrowPda] = deriveEscrowPda(listingId, PROGRAM_ID);

    const tx = await program.methods
      .purchase()
      .accounts({
        listing: listingPda,
        escrow: escrowPda,
        buyer: publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    return tx;
  }, [program, publicKey]);

  const markAsShipped = useCallback(async (listingId: number) => {
    if (!program || !publicKey) {
      throw new Error('Wallet not connected');
    }

    const [listingPda] = deriveListingPda(listingId, PROGRAM_ID);
    
    // Fetch listing to get buyer
    const listing = await (program.account as any).listing.fetch(listingPda);
    const [relationshipPda] = deriveRelationshipPda(listing.seller, listing.buyer!, PROGRAM_ID);

    const tx = await program.methods
      .signShipped()
      .accounts({
        listing: listingPda,
        relationship: relationshipPda,
        signer: publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    return tx;
  }, [program, publicKey]);

  const markAsReceived = useCallback(async (listingId: number, sellerPubkey: PublicKey) => {
    if (!program || !publicKey) {
      throw new Error('Wallet not connected');
    }

    const [listingPda] = deriveListingPda(listingId, PROGRAM_ID);
    const [escrowPda] = deriveEscrowPda(listingId, PROGRAM_ID);

    const tx = await program.methods
      .signReceived()
      .accounts({
        listing: listingPda,
        escrow: escrowPda,
        buyer: publicKey,
        seller: sellerPubkey,
        admin: ADMIN_PUBKEY,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    return tx;
  }, [program, publicKey]);

  const fetchListingById = useCallback(async (listingId: number) => {
    if (!program) return null;

    try {
      const [listingPda] = deriveListingPda(listingId, PROGRAM_ID);
      const account = await (program.account as any).listing.fetch(listingPda);

      const listing: SolanaListing = {
        listingId: account.listingId.toNumber(),
        listingTitle: account.listingTitle,
        externalId: account.externalId,
        price: account.price.toNumber(),
        text: account.text,
        tags: account.tags || [],
        seller: account.seller.toString(),
        contact: account.contact,
        bought: account.bought,
        buyer: account.buyer?.toString() || null,
        shipped: account.shipped,
        received: account.received,
        arbitrationRequested: account.arbitrationRequested,
        creationDate: account.creationDate.toNumber(),
        lastEditDate: account.lastEditDate?.toNumber() || null,
      };

      return listing;
    } catch (error) {
      console.error('Error fetching listing:', error);
      return null;
    }
  }, [program]);

  return {
    listings,
    loading,
    fetchListings,
    searchListingsByTitle,
    createListing,
    purchaseListing,
    markAsShipped,
    markAsReceived,
    fetchListingById,
  };
}

