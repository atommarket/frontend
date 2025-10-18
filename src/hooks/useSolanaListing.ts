import { useState, useCallback } from 'react';
import { PublicKey, Connection, SystemProgram, Transaction, TransactionInstruction } from '@solana/web3.js';
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
      listingTitle: string,
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
        
        // For now, create a simple transaction that just sends a memo
        // In a real implementation, this would interact with your Solana program
        const memoData = new TextEncoder().encode('Create listing: ' + listingTitle);
        const instruction = new TransactionInstruction({
          keys: [
            { pubkey: publicKey, isSigner: true, isWritable: true }
          ],
          programId: SystemProgram.programId,
          data: memoData as any,
        });

        const transaction = new Transaction().add(instruction);
        transaction.feePayer = publicKey;
        
        console.log('Getting latest blockhash...');
        const { blockhash } = await connection.getLatestBlockhash();
        transaction.recentBlockhash = blockhash;

        console.log('Sending transaction to wallet...');
        // Send transaction - this will prompt wallet to sign
        const signature = await sendTransaction(transaction, connection);
        
        console.log('Transaction signed, signature:', signature);
        console.log('Waiting for confirmation...');
        
        // Wait for confirmation
        await connection.confirmTransaction(signature, 'confirmed');

        console.log('Listing transaction confirmed:', signature);

        return { tx: signature, listingId: 1 };
      } catch (error: any) {
        console.error('Error creating listing:', error);
        console.error('Error message:', error?.message);
        console.error('Error stack:', error?.stack);
        throw error;
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

