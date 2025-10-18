import { useState, useCallback } from 'react';
import { Connection, Transaction } from '@solana/web3.js';
import { useWallet } from '@solana/wallet-adapter-react';
import {
  createListingInstruction,
  createPurchaseInstruction,
  createSignShippedInstruction,
  createSignReceivedInstruction,
  createDeleteListingInstruction,
} from '../lib/client-sdk';

export interface SolanaListing {
  listingId: number;
  listingTitle: string;
  externalId: string;
  text: string;
  tags?: string[];
  seller: string;
  contact: string;
  price: number;
  buyer: string | null;
  bought: boolean;
  shipped: boolean;
  received: boolean;
  arbitrationRequested: boolean;
  creationDate: number;
  lastEditDate: number | null;
}

const RPC_ENDPOINT = 'https://api.devnet.solana.com';

export function useSolanaListing() {
  const { publicKey, sendTransaction } = useWallet();
  const [listings, setListings] = useState<SolanaListing[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchListings = useCallback(async () => {
    setLoading(true);
    try {
      // TODO: Implement actual listing fetching from blockchain
      setListings([]);
    } catch (error) {
      console.error('Error fetching listings:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const searchListingsByTitle = useCallback(async (title: string) => {
    if (!title.trim()) {
      await fetchListings();
      return;
    }
    setLoading(true);
    try {
      // TODO: Implement actual listing search
      setListings([]);
    } catch (error) {
      console.error('Error searching listings:', error);
    } finally {
      setLoading(false);
    }
  }, [fetchListings]);

  const createListing = useCallback(
    async (
      listingTitle: string,
      externalId: string,
      text: string,
      tags: string[],
      contact: string,
      priceInSol: number
    ) => {
      if (!publicKey || !sendTransaction) {
        throw new Error('Wallet not connected');
      }

      try {
        console.log('🔨 Creating listing instruction...');
        const connection = new Connection(RPC_ENDPOINT, 'confirmed');
        
        // Convert SOL to lamports (bigint)
        const lamports = BigInt(Math.floor(priceInSol * 1_000_000_000));
        console.log(`💰 Price: ${priceInSol} SOL = ${lamports} lamports`);
        
        // Build the instruction using proper Borsh serialization
        const { instruction, listingId, listingPda } = await createListingInstruction(
          publicKey,
          listingTitle,
          externalId,
          text,
          tags,
          contact,
          lamports,
          connection
        );
        
        console.log(`✅ Instruction built for listing ID: ${listingId}`);
        console.log(`📍 Listing PDA: ${listingPda.toString()}`);

        // Create and sign transaction
        const transaction = new Transaction().add(instruction);
        transaction.feePayer = publicKey;
        
        console.log('⏱️  Getting latest blockhash...');
        const { blockhash } = await connection.getLatestBlockhash();
        transaction.recentBlockhash = blockhash;

        console.log('📤 Sending transaction to wallet for signing...');
        let signature: string;
        try {
          signature = await sendTransaction(transaction, connection);
          console.log('✅ Got signature from wallet:', signature);
        } catch (walletError: any) {
          console.error('❌ WALLET ERROR:', walletError);
          throw walletError;
        }
        
        console.log('⏳ Waiting for confirmation...');
        try {
          const confirmation = await connection.confirmTransaction(signature, 'confirmed');
          console.log('✅ Transaction confirmed:', confirmation);
        } catch (confirmError: any) {
          console.error('❌ CONFIRMATION ERROR:', confirmError);
          throw new Error(`Confirmation failed: ${confirmError?.message || 'Unknown error'}`);
        }

        console.log('🎉 Listing created successfully!');
        console.log(`View transaction: https://explorer.solana.com/tx/${signature}?cluster=devnet`);

        return { tx: signature, listingId };
      } catch (error: any) {
        console.error('Error creating listing:', error);
        throw error;
      }
    },
    [publicKey, sendTransaction]
  );

  const purchaseListing = useCallback(
    async (listingId: number) => {
      if (!publicKey || !sendTransaction) {
        throw new Error('Wallet not connected');
      }

      try {
        console.log(`🛒 Purchasing listing ${listingId}...`);
        const connection = new Connection(RPC_ENDPOINT, 'confirmed');
        
        const instruction = await createPurchaseInstruction(publicKey, listingId);
        
        const transaction = new Transaction().add(instruction);
        transaction.feePayer = publicKey;
        
        const { blockhash } = await connection.getLatestBlockhash();
        transaction.recentBlockhash = blockhash;

        const signature = await sendTransaction(transaction, connection);
        await connection.confirmTransaction(signature, 'confirmed');
        
        console.log(`✅ Purchase successful: ${signature}`);
        return signature;
      } catch (error: any) {
        console.error('Error purchasing listing:', error);
        throw error;
      }
    },
    [publicKey, sendTransaction]
  );

  const markAsShipped = useCallback(
    async (listingId: number) => {
      if (!publicKey || !sendTransaction) {
        throw new Error('Wallet not connected');
      }

      try {
        console.log(`📦 Marking listing ${listingId} as shipped...`);
        const connection = new Connection(RPC_ENDPOINT, 'confirmed');
        
        const instruction = await createSignShippedInstruction(publicKey, listingId);
        
        const transaction = new Transaction().add(instruction);
        transaction.feePayer = publicKey;
        
        const { blockhash } = await connection.getLatestBlockhash();
        transaction.recentBlockhash = blockhash;

        const signature = await sendTransaction(transaction, connection);
        await connection.confirmTransaction(signature, 'confirmed');
        
        console.log(`✅ Marked as shipped: ${signature}`);
        return signature;
      } catch (error: any) {
        console.error('Error marking as shipped:', error);
        throw error;
      }
    },
    [publicKey, sendTransaction]
  );

  const markAsReceived = useCallback(
    async (listingId: number) => {
      if (!publicKey || !sendTransaction) {
        throw new Error('Wallet not connected');
      }

      try {
        console.log(`✔️ Marking listing ${listingId} as received...`);
        const connection = new Connection(RPC_ENDPOINT, 'confirmed');
        
        const instruction = await createSignReceivedInstruction(publicKey, listingId);
        
        const transaction = new Transaction().add(instruction);
        transaction.feePayer = publicKey;
        
        const { blockhash } = await connection.getLatestBlockhash();
        transaction.recentBlockhash = blockhash;

        const signature = await sendTransaction(transaction, connection);
        await connection.confirmTransaction(signature, 'confirmed');
        
        console.log(`✅ Marked as received: ${signature}`);
        return signature;
      } catch (error: any) {
        console.error('Error marking as received:', error);
        throw error;
      }
    },
    [publicKey, sendTransaction]
  );

  const deleteListing = useCallback(
    async (listingId: number) => {
      if (!publicKey || !sendTransaction) {
        throw new Error('Wallet not connected');
      }

      try {
        console.log(`🗑️  Deleting listing ${listingId}...`);
        const connection = new Connection(RPC_ENDPOINT, 'confirmed');
        
        const instruction = await createDeleteListingInstruction(publicKey, listingId);
        
        const transaction = new Transaction().add(instruction);
        transaction.feePayer = publicKey;
        
        const { blockhash } = await connection.getLatestBlockhash();
        transaction.recentBlockhash = blockhash;

        const signature = await sendTransaction(transaction, connection);
        await connection.confirmTransaction(signature, 'confirmed');
        
        console.log(`✅ Listing deleted: ${signature}`);
        return signature;
      } catch (error: any) {
        console.error('Error deleting listing:', error);
        throw error;
      }
    },
    [publicKey, sendTransaction]
  );

  const fetchListingById = useCallback(async (_listingId: number) => {
    // TODO: Implement actual listing fetching by ID
    return null;
  }, []);

  return {
    listings,
    loading,
    fetchListings,
    searchListingsByTitle,
    createListing,
    purchaseListing,
    markAsShipped,
    markAsReceived,
    deleteListing,
    fetchListingById,
  };
}

