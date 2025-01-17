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
  const [filteredListings, setFilteredListings] = useState<Listing[]>([]);

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
      setFilteredListings(processedListings);
    } catch (error) {
      console.error('Error fetching listings:', error);
    }
  }, [client, contractAddress]);

  const searchListings = useCallback((term: string) => {
    if (!term.trim()) {
      setFilteredListings(listings);
      return;
    }
    
    const searchTerm = term.toLowerCase();
    const filtered = listings.filter(listing => 
      listing.listing_title.toLowerCase().includes(searchTerm) ||
      listing.text.toLowerCase().includes(searchTerm) ||
      (listing.tags && listing.tags.some(tag => tag.toLowerCase().includes(searchTerm)))
    );
    setFilteredListings(filtered);
  }, [listings]);

  return { listings: filteredListings, fetchListings, searchListings };
} 