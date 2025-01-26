import { useState, useCallback } from 'react';
import { SigningCosmWasmClient } from '@cosmjs/cosmwasm-stargate';
import { useIPFS } from './useIPFS';

export interface Listing {
  listing_id: number;
  listing_title: string;
  external_id: string;
  text: string;
  tags?: string[];
  seller: string;
  contact: string;
  price: number;
  buyer: string | null;
  bought: boolean;
  shipped: boolean;
  received: boolean;
  arbitration_requested: boolean;
}

export function useListing(client: SigningCosmWasmClient | null, contractAddress: string) {
  const [listings, setListings] = useState<Listing[]>([]);
  const { unpinFile } = useIPFS();

  const fetchListings = useCallback(async () => {
    if (!client) return;
    try {
      const response = await client.queryContractSmart(contractAddress, {
        all_listings: { limit: 50, start_after: null }
      });
      const processedListings = response.listings.map((listing: Listing) => ({
        ...listing,
        tags: listing.tags || [],
      }));
      setListings(processedListings);
    } catch (error) {
      console.error('Error fetching listings:', error);
    }
  }, [client, contractAddress]);

  const searchListingsByTitle = useCallback(async (title: string) => {
    if (!client || !title.trim()) {
      await fetchListings();
      return;
    }
    
    try {
      const response = await client.queryContractSmart(contractAddress, {
        search_listings_by_title: { 
          title: title.trim(),
          limit: 50
        }
      });
      
      const processedListings = response.listings.map((listing: Listing) => ({
        ...listing,
        tags: listing.tags || [],
      }));
      setListings(processedListings);
    } catch (error) {
      console.error('Error searching listings:', error);
      // If search fails, fall back to all listings
      await fetchListings();
    }
  }, [client, contractAddress, fetchListings]);

  const deleteListing = useCallback(async (listingId: number, walletAddress: string) => {
    if (!client) throw new Error('Client not connected');
    
    // First, get the listing to get its external_id (IPFS CID)
    const response = await client.queryContractSmart(contractAddress, {
      listing: { listing_id: listingId }
    });
    
    const listing = response.listing;
    if (!listing) {
      throw new Error('Listing not found');
    }

    // Delete the listing from the contract
    const msg = {
      delete_listing: {
        listing_id: listingId
      }
    };

    await client.execute(
      walletAddress,
      contractAddress,
      msg,
      {
        amount: [],
        gas: "500000",
      }
    );

    // If the listing had an external_id (IPFS CID), unpin it
    if (listing.external_id) {
      try {
        // Extract CID from the IPFS URL
        const ipfsUrl = new URL(listing.external_id);
        const cid = ipfsUrl.pathname.split('/').pop();
        if (cid) {
          await unpinFile(cid);
        }
      } catch (error) {
        console.error('Error unpinning file:', error);
        // We don't throw here as the listing is already deleted
      }
    }
  }, [client, contractAddress, unpinFile]);

  return { listings, fetchListings, searchListingsByTitle, deleteListing };
} 