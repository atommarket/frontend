import { useState, useCallback } from 'react';
import { PublicKey, Connection, SystemProgram, Transaction } from '@solana/web3.js';
import { useWallet } from '@solana/wallet-adapter-react';

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
      // Placeholder - will fetch from blockchain
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
      // Placeholder - will search listings
      setListings([]);
    } catch (error) {
      console.error('Error searching listings:', error);
    } finally {
      setLoading(false);
    }
  }, [fetchListings]);

  const createListing = useCallback(
    async (
      _listingTitle: string,
      _externalId: string,
      _text: string,
      _tags: string[],
      _contact: string,
      _priceInSol: number
    ) => {
      if (!publicKey || !sendTransaction) {
        throw new Error('Wallet not connected');
      }

      try {
        console.log('Creating transaction...');
        const connection = new Connection(RPC_ENDPOINT, 'confirmed');
        
        console.log('Public key:', publicKey.toString());
        console.log('SendTransaction available:', !!sendTransaction);
        
        // Just do a simple SOL transfer to yourself to prove it works
        const instruction = SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey: publicKey, // Send to yourself
          lamports: 1000, // 0.000001 SOL
        });

        const transaction = new Transaction().add(instruction);
        transaction.feePayer = publicKey;
        
        console.log('Getting latest blockhash...');
        const { blockhash } = await connection.getLatestBlockhash();
        transaction.recentBlockhash = blockhash;

        console.log('Sending transaction to wallet for signing...');
        // Send transaction - this will prompt wallet to sign
        let signature: string;
        try {
          signature = await sendTransaction(transaction, connection);
          console.log('✅ Got signature from wallet:', signature);
        } catch (walletError: any) {
          console.error('❌ WALLET/SEND ERROR:', walletError);
          console.error('Wallet error message:', walletError?.message);
          console.error('Wallet error code:', walletError?.code);
          throw walletError;
        }
        
        console.log('Transaction signed, signature:', signature);
        console.log('Waiting for confirmation...');
        
        // Wait for confirmation
        try {
          console.log('Calling confirmTransaction with signature:', signature);
          const confirmation = await connection.confirmTransaction(signature, 'confirmed');
          console.log('✅ Transaction confirmed:', confirmation);
        } catch (confirmError: any) {
          console.error('❌ CONFIRM ERROR:', confirmError);
          console.error('Confirm error message:', confirmError?.message);
          throw new Error(`Confirmation failed: ${confirmError?.message || 'Unknown error'}`);
        }

        console.log('Listing transaction confirmed:', signature);

        return { tx: signature, listingId: 1 };
      } catch (error: any) {
        console.error('Error creating listing:', error);
        console.error('Error message:', error?.message);
        console.error('Error stack:', error?.stack);
        console.error('Full error object:', JSON.stringify(error, null, 2));
        
        let errorMessage = 'An unexpected error occurred';
        
        if (error?.message) {
          errorMessage = error.message;
        } else if (typeof error === 'string') {
          errorMessage = error;
        }
        
        const customError = new Error(errorMessage);
        throw customError;
      }
    },
    [publicKey, sendTransaction]
  );

  const purchaseListing = useCallback(async (_listingId: number) => {
    if (!publicKey || !sendTransaction) {
      throw new Error('Wallet not connected');
    }
    // Placeholder
    return 'mock';
  }, [publicKey, sendTransaction]);

  const markAsShipped = useCallback(async (_listingId: number) => {
    if (!publicKey || !sendTransaction) {
      throw new Error('Wallet not connected');
    }
    // Placeholder
    return 'mock';
  }, [publicKey, sendTransaction]);

  const markAsReceived = useCallback(async (_listingId: number, _sellerPubkey: PublicKey) => {
    if (!publicKey || !sendTransaction) {
      throw new Error('Wallet not connected');
    }
    // Placeholder
    return 'mock';
  }, [publicKey, sendTransaction]);

  const deleteListing = useCallback(async (_listingId: number) => {
    if (!publicKey || !sendTransaction) {
      throw new Error('Wallet not connected');
    }
    // Placeholder
    return 'mock';
  }, [publicKey, sendTransaction]);

  const fetchListingById = useCallback(async (_listingId: number) => {
    // Placeholder
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

