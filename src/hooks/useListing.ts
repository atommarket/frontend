import { useState, useCallback } from 'react';
import { SigningCosmWasmClient } from '@cosmjs/cosmwasm-stargate';

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
    
    const msg = {
      delete_listing: {
        listing_id: listingId
      }
    };

    return await client.execute(
      walletAddress,
      contractAddress,
      msg,
      {
        amount: [],
        gas: "500000",
      }
    );
  }, [client, contractAddress]);

  return { listings, fetchListings, searchListingsByTitle, deleteListing };
} 