import { SimpleGrid, Box, Button, HStack, Text, Select, Center } from '@chakra-ui/react';
import { SigningCosmWasmClient } from '@cosmjs/cosmwasm-stargate';
import ListingCard from './ListingCard';
import { Listing } from '../hooks/useListing';
import { useState } from 'react';

interface ListingGridProps {
  listings: Listing[];
  client: SigningCosmWasmClient | null;
  contractAddress: string;
  walletAddress: string;
  onRefresh: () => void;
}

export default function ListingGrid({
  listings,
  client,
  contractAddress,
  walletAddress,
  onRefresh,
}: ListingGridProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(9);
  const [sortBy, setSortBy] = useState<'newest' | 'price-asc' | 'price-desc'>('newest');

  // Calculate pagination
  const totalPages = Math.ceil(listings.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;

  // Sort listings
  const sortedListings = [...listings].sort((a, b) => {
    switch (sortBy) {
      case 'price-asc':
        return a.price - b.price;
      case 'price-desc':
        return b.price - a.price;
      case 'newest':
      default:
        return b.listing_id - a.listing_id;
    }
  });

  const displayedListings = sortedListings.slice(startIndex, endIndex);

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <Box>
      <HStack mb={4} spacing={4} justify="space-between">
        <HStack>
          <Text>Show:</Text>
          <Select
            value={itemsPerPage}
            onChange={(e) => {
              setItemsPerPage(Number(e.target.value));
              setCurrentPage(1);
            }}
            w="100px"
          >
            <option value={9}>9</option>
            <option value={18}>18</option>
            <option value={27}>27</option>
          </Select>
          <Text>per page</Text>
        </HStack>
        
        <HStack>
          <Text>Sort by:</Text>
          <Select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            w="150px"
          >
            <option value="newest">Newest First</option>
            <option value="price-asc">Price: Low to High</option>
            <option value="price-desc">Price: High to Low</option>
          </Select>
        </HStack>
      </HStack>

      <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={6} mb={6}>
        {displayedListings.map((listing) => (
          <ListingCard
            key={listing.listing_id}
            listing={listing}
            client={client}
            contractAddress={contractAddress}
            walletAddress={walletAddress}
            onSuccess={onRefresh}
          />
        ))}
      </SimpleGrid>

      {totalPages > 1 && (
        <Center>
          <HStack spacing={2}>
            <Button
              onClick={() => handlePageChange(currentPage - 1)}
              isDisabled={currentPage === 1}
            >
              Previous
            </Button>
            
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <Button
                key={page}
                onClick={() => handlePageChange(page)}
                colorScheme={currentPage === page ? "blue" : "gray"}
              >
                {page}
              </Button>
            ))}
            
            <Button
              onClick={() => handlePageChange(currentPage + 1)}
              isDisabled={currentPage === totalPages}
            >
              Next
            </Button>
          </HStack>
        </Center>
      )}
    </Box>
  );
} 