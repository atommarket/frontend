import { Box, Button, Text, VStack, HStack, useToast, Image, Spinner, Badge, useColorModeValue } from '@chakra-ui/react';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { SolanaListing, useSolanaListing } from '../hooks/useSolanaListing';
import { useIPFS } from '../hooks/useIPFS';

interface ImageMetadata {
  images: {
    cid: string;
    url: string;
  }[];
}

interface ListingCardProps {
  listing: SolanaListing;
  walletAddress: string;
  onSuccess: () => void;
}

export default function ListingCard({
  listing,
  walletAddress,
  onSuccess,
}: ListingCardProps) {
  const navigate = useNavigate();
  const toast = useToast();
  const [images, setImages] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const { purchaseListing, markAsShipped, markAsReceived } = useSolanaListing();
  const { unpinFile } = useIPFS();
  const bgColor = useColorModeValue('white', 'gray.700');
  const borderColor = useColorModeValue('gray.200', 'gray.600');

  useEffect(() => {
    const fetchImages = async () => {
      if (!listing.externalId) {
        setIsLoading(false);
        return;
      }

      try {
        const response = await fetch(listing.externalId);
        const metadata: ImageMetadata = await response.json();
        setImages(metadata.images.map(img => img.url));
      } catch (error) {
        console.error('Error fetching images:', error);
        toast({
          title: 'Error loading images',
          status: 'error',
          duration: 3000,
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchImages();
  }, [listing.externalId, toast]);

  const handlePurchase = async () => {
    if (!walletAddress) return;
    try {
      await purchaseListing(listing.listingId, listing.price);
      onSuccess();
      toast({ title: 'Purchase successful', status: 'success' });
    } catch (error) {
      console.error('Purchase error:', error);
      toast({ 
        title: 'Purchase failed', 
        description: error instanceof Error ? error.message : 'Unknown error',
        status: 'error' 
      });
    }
  };

  const handleMarkShipped = async () => {
    if (!walletAddress) return;
    try {
      await markAsShipped(listing.listingId);
      onSuccess();
      toast({ title: 'Marked as shipped', status: 'success' });
    } catch (error) {
      toast({ title: 'Failed to mark as shipped', status: 'error' });
    }
  };

  const handleMarkReceived = async () => {
    if (!walletAddress) return;
    try {
      await markAsReceived(listing.listingId, new PublicKey(listing.seller));

      // After marking as received, unpin the IPFS files
      if (listing.externalId) {
        try {
          const ipfsUrl = new URL(listing.externalId);
          const cid = ipfsUrl.pathname.split('/').pop();
          if (cid) {
            await unpinFile(cid);
          }
        } catch (error) {
          console.error('Error unpinning file:', error);
        }
      }

      onSuccess();
      toast({ title: 'Marked as received', status: 'success' });
    } catch (error) {
      toast({ title: 'Failed to mark as received', status: 'error' });
    }
  };

  const nextImage = () => {
    setCurrentImageIndex((prev) => (prev + 1) % images.length);
  };

  const previousImage = () => {
    setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  const handleClick = () => {
    navigate(`/listing/${listing.listingId}`);
  };

  return (
    <Box
      borderWidth={1}
      borderRadius="lg"
      p={4}
      w="full"
      cursor="pointer"
      onClick={handleClick}
      _hover={{ shadow: 'md' }}
      transition="all 0.2s"
      bg={bgColor}
      borderColor={borderColor}
    >
      <VStack align="start" spacing={2}>
        <Text fontSize="xl" fontWeight="bold">{listing.listingTitle}</Text>
        
        {isLoading ? (
          <Box w="full" h="200px" display="flex" alignItems="center" justifyContent="center">
            <Spinner />
          </Box>
        ) : images.length > 0 && (
          <Box position="relative" w="full">
            <Image
              src={images[currentImageIndex]}
              alt={`${listing.listingTitle} - Image ${currentImageIndex + 1}`}
              borderRadius="md"
              maxH="200px"
              objectFit="cover"
              w="full"
              transition="max-height 0.2s"
            />
            {images.length > 1 && (
              <HStack 
                position="absolute" 
                bottom="2" 
                right="2" 
                spacing={2}
                onClick={(e) => e.stopPropagation()}
              >
                <Button size="sm" onClick={previousImage}>Previous</Button>
                <Text bg="blackAlpha.700" color="white" px={2} borderRadius="md">
                  {currentImageIndex + 1} / {images.length}
                </Text>
                <Button size="sm" onClick={nextImage}>Next</Button>
              </HStack>
            )}
          </Box>
        )}

        <Text>{listing.text}</Text>
        <HStack>
          <Text>Price: {(listing.price / LAMPORTS_PER_SOL).toFixed(4)} SOL</Text>
          {listing.bought && <Badge colorScheme="green">SOLD</Badge>}
        </HStack>
        <Text fontSize="sm">Seller: {listing.seller.slice(0, 8)}...{listing.seller.slice(-4)}</Text>
        <Text fontSize="sm">Tags: {(listing.tags || []).join(', ')}</Text>

        <HStack spacing={4} onClick={(e) => e.stopPropagation()}>
          {!listing.bought && walletAddress !== listing.seller && (
            <Button colorScheme="blue" onClick={handlePurchase}>
              Purchase
            </Button>
          )}
          
          {listing.bought && listing.seller === walletAddress && !listing.received && (
            <>
              {!listing.shipped && (
                <Button colorScheme="green" onClick={handleMarkShipped}>
                  Mark Shipped
                </Button>
              )}
            </>
          )}
          
          {listing.bought && listing.shipped && listing.buyer === walletAddress && !listing.received && (
            <Button colorScheme="green" onClick={handleMarkReceived}>
              Mark Received
            </Button>
          )}
        </HStack>
      </VStack>
    </Box>
  );
}
