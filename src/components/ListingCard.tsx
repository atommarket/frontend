import { Box, Button, Text, VStack, HStack, useToast, Image, Spinner, Badge, useColorModeValue } from '@chakra-ui/react';
import { SigningCosmWasmClient } from '@cosmjs/cosmwasm-stargate';
import { Listing } from '../hooks/useListing';
import { coin } from '@cosmjs/stargate';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useIPFS } from '../hooks/useIPFS';

interface ImageMetadata {
  images: {
    cid: string;
    url: string;
  }[];
}

interface ListingCardProps {
  listing: Listing;
  walletAddress: string;
  client: SigningCosmWasmClient | null;
  contractAddress: string;
  onSuccess: () => void;
}

export default function ListingCard({
  listing,
  walletAddress,
  client,
  contractAddress,
  onSuccess,
}: ListingCardProps) {
  const navigate = useNavigate();
  const toast = useToast();
  const [images, setImages] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const { unpinFile } = useIPFS();
  const bgColor = useColorModeValue('white', 'gray.700');
  const borderColor = useColorModeValue('gray.200', 'gray.600');

  useEffect(() => {
    const fetchImages = async () => {
      if (!listing.external_id) {
        setIsLoading(false);
        return;
      }

      try {
        const response = await fetch(listing.external_id);
        const metadata: ImageMetadata = await response.json();
        console.log('ListingCard - Fetched metadata:', metadata);
        console.log('ListingCard - Number of images:', metadata.images?.length);
        const imageUrls = metadata.images.map(img => img.url);
        console.log('ListingCard - Image URLs:', imageUrls);
        setImages(imageUrls);
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
  }, [listing.external_id, toast]);

  const handlePurchase = async () => {
    if (!client || !walletAddress) return;
    try {
      await client.execute(
        walletAddress,
        contractAddress,
        { purchase: { listing_id: listing.listing_id } },
        {
          amount: [coin(listing.price, 'uatom')],
          gas: "500000",
        }
      );
      onSuccess();
      toast({ title: 'Purchase successful', status: 'success' });
    } catch (error) {
      toast({ title: 'Purchase failed', status: 'error' });
    }
  };

  const handleMarkShipped = async () => {
    if (!client || !walletAddress) return;
    try {
      await client.execute(
        walletAddress,
        contractAddress,
        { sign_shipped: { listing_id: listing.listing_id } },
        {
          amount: [],
          gas: "500000",
        }
      );
      onSuccess();
      toast({ title: 'Marked as shipped', status: 'success' });
    } catch (error) {
      toast({ title: 'Failed to mark as shipped', status: 'error' });
    }
  };

  const handleMarkReceived = async () => {
    if (!client || !walletAddress) return;
    try {
      await client.execute(
        walletAddress,
        contractAddress,
        { sign_received: { listing_id: listing.listing_id } },
        {
          amount: [],
          gas: "500000",
        }
      );

      // After marking as received, unpin the IPFS files
      if (listing.external_id) {
        try {
          const ipfsUrl = new URL(listing.external_id);
          const cid = ipfsUrl.pathname.split('/').pop();
          if (cid) {
            await unpinFile(cid);
          }
        } catch (error) {
          console.error('Error unpinning file:', error);
          // Don't throw here as the main operation succeeded
        }
      }

      onSuccess();
      toast({ title: 'Marked as received', status: 'success' });
    } catch (error) {
      toast({ title: 'Failed to mark as received', status: 'error' });
    }
  };

  const handleRequestArbitration = async () => {
    if (!client || !walletAddress) return;
    try {
      await client.execute(
        walletAddress,
        contractAddress,
        { request_arbitration: { listing_id: listing.listing_id } },
        {
          amount: [],
          gas: "500000",
        }
      );
      onSuccess();
      toast({ title: 'Arbitration requested', status: 'success' });
    } catch (error) {
      toast({ title: 'Failed to request arbitration', status: 'error' });
    }
  };

  const handleCancelSale = async () => {
    if (!client || !walletAddress) return;
    try {
      await client.execute(
        walletAddress,
        contractAddress,
        { seller_cancel_sale: { listing_id: listing.listing_id } },
        {
          amount: [],
          gas: "500000",
        }
      );
      onSuccess();
      toast({ title: 'Sale cancelled successfully', status: 'success' });
    } catch (error) {
      toast({ title: 'Failed to cancel sale', status: 'error' });
    }
  };

  const handleCancelPurchase = async () => {
    if (!client || !walletAddress) return;
    try {
      await client.execute(
        walletAddress,
        contractAddress,
        { cancel_purchase: { listing_id: listing.listing_id } },
        {
          amount: [],
          gas: "500000",
        }
      );
      onSuccess();
      toast({ title: 'Purchase cancelled successfully', status: 'success' });
    } catch (error) {
      toast({ title: 'Failed to cancel purchase', status: 'error' });
    }
  };

  const nextImage = () => {
    setCurrentImageIndex((prev) => (prev + 1) % images.length);
  };

  const previousImage = () => {
    setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  const handleClick = () => {
    navigate(`/listing/${listing.listing_id}`);
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
        <Text fontSize="xl" fontWeight="bold">{listing.listing_title}</Text>
        
        {isLoading ? (
          <Box w="full" h="200px" display="flex" alignItems="center" justifyContent="center">
            <Spinner />
          </Box>
        ) : images.length > 0 && (
          <Box position="relative" w="full">
            <Image
              key={currentImageIndex}
              src={images[currentImageIndex]}
              alt={`${listing.listing_title} - Image ${currentImageIndex + 1}`}
              borderRadius="md"
              maxH="200px"
              objectFit="cover"
              w="full"
              transition="max-height 0.2s"
              fallback={<Spinner />}
              ignoreFallback={false}
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
          <Text>Price: {listing.price / 1_000_000} ATOM</Text>
          {listing.bought && <Badge colorScheme="green">SOLD</Badge>}
        </HStack>
        <Text>Seller: {listing.seller}</Text>
        <Text>Tags: {(listing.tags || []).join(', ')}</Text>

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
              <Button colorScheme="red" onClick={handleCancelSale}>
                Cancel Sale
              </Button>
            </>
          )}
          
          {listing.bought && listing.buyer === walletAddress && !listing.shipped && (
            <Button colorScheme="red" onClick={handleCancelPurchase}>
              Cancel Purchase
            </Button>
          )}
          
          {listing.bought && listing.shipped && listing.buyer === walletAddress && (
            <Button colorScheme="green" onClick={handleMarkReceived}>
              Mark Received
            </Button>
          )}
          
          {listing.bought && listing.shipped && 
           (listing.buyer === walletAddress || listing.seller === walletAddress) && (
            <Button colorScheme="red" onClick={handleRequestArbitration}>
              Request Arbitration
            </Button>
          )}
        </HStack>
      </VStack>
    </Box>
  );
} 