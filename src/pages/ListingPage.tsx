import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  VStack,
  HStack,
  Text,
  Button,
  Image,
  Spinner,
  useToast,
  IconButton,
  Badge,
  Heading,
  useColorModeValue,
} from '@chakra-ui/react';
import { ArrowBackIcon, ChevronLeftIcon, ChevronRightIcon } from '@chakra-ui/icons';
import { PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { SolanaListing, useSolanaListing } from '../hooks/useSolanaListing';
import { useIPFS } from '../hooks/useIPFS';

interface ImageMetadata {
  images: {
    cid: string;
    url: string;
  }[];
}

interface ListingPageProps {
  walletAddress: string;
}

export default function ListingPage({ walletAddress }: ListingPageProps) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = useToast();
  const [listing, setListing] = useState<SolanaListing | null>(null);
  const [images, setImages] = useState<string[]>([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const { fetchListingById, purchaseListing, markAsShipped, markAsReceived } = useSolanaListing();
  const { unpinFile } = useIPFS();
  const bgColor = useColorModeValue('white', 'gray.700');
  const borderColor = useColorModeValue('gray.200', 'gray.600');

  useEffect(() => {
    const fetchListing = async () => {
      if (!id) return;
      try {
        const listingData = await fetchListingById(parseInt(id));
        console.log('Listing response:', listingData);
        console.log('Wallet address:', walletAddress);
        
        if (listingData) {
          setListing(listingData);
          console.log('Processed listing:', listingData);

          if (listingData.externalId) {
            const imageResponse = await fetch(listingData.externalId);
            const metadata: ImageMetadata = await imageResponse.json();
            setImages(metadata.images.map(img => img.url));
          }
        } else {
          throw new Error('Listing not found');
        }
      } catch (error) {
        console.error('Error fetching listing:', error);
        toast({
          title: 'Error loading listing',
          description: error instanceof Error ? error.message : 'Failed to load listing',
          status: 'error',
          duration: 5000,
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchListing();
  }, [id, toast, walletAddress, fetchListingById]);

  const handlePurchase = async () => {
    if (!walletAddress || !listing) return;
    try {
      console.log('Attempting purchase with price:', listing.price, 'lamports');
      await purchaseListing(listing.listingId, listing.price);
      toast({ title: 'Purchase successful', status: 'success' });
      // Refresh listing data
      navigate(0);
    } catch (error) {
      console.error('Purchase error:', error);
      toast({ 
        title: 'Purchase failed', 
        description: error instanceof Error ? error.message : 'Unknown error',
        status: 'error',
        duration: 5000,
      });
    }
  };

  const handleMarkShipped = async () => {
    if (!walletAddress || !listing) return;
    try {
      await markAsShipped(listing.listingId);
      toast({ title: 'Marked as shipped', status: 'success' });
      navigate(0);
    } catch (error) {
      toast({ title: 'Failed to mark as shipped', status: 'error' });
    }
  };

  const handleMarkReceived = async () => {
    if (!walletAddress || !listing) return;
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

      toast({ title: 'Marked as received', status: 'success' });
      navigate(0);
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

  if (isLoading) {
    return (
      <Container maxW="container.xl" py={8}>
        <Box display="flex" justifyContent="center" alignItems="center" minH="60vh">
          <Spinner size="xl" />
        </Box>
      </Container>
    );
  }

  if (!listing) {
    return (
      <Container maxW="container.xl" py={8}>
        <Button leftIcon={<ArrowBackIcon />} onClick={() => navigate('/')} mb={8}>
          Back to Listings
        </Button>
        <Text>Listing not found</Text>
      </Container>
    );
  }

  // Add debug log when rendering
  console.log('Rendering with:', {
    listing,
    walletAddress,
    isSeller: listing?.seller === walletAddress,
    isBought: listing?.bought,
    isShipped: listing?.shipped,
    isReceived: listing?.received,
    hasArbitration: listing?.arbitrationRequested
  });

  return (
    <Container maxW="container.xl" py={8}>
      <Button leftIcon={<ArrowBackIcon />} onClick={() => navigate('/')} mb={8}>
        Back to Listings
      </Button>

      <Box display={{ md: 'flex' }} gap={8}>
        {/* Image Gallery */}
        <Box flex="1">
          <Box position="relative">
            {images.length > 0 ? (
              <>
                <Image
                  src={images[currentImageIndex]}
                  alt={`${listing.listingTitle} - Image ${currentImageIndex + 1}`}
                  borderRadius="lg"
                  w="full"
                  maxH="600px"
                  objectFit="cover"
                />
                {images.length > 1 && (
                  <HStack 
                    position="absolute" 
                    bottom="4" 
                    left="50%" 
                    transform="translateX(-50%)"
                    spacing={4}
                  >
                    <IconButton
                      aria-label="Previous image"
                      icon={<ChevronLeftIcon />}
                      onClick={previousImage}
                      isRound
                      bg="whiteAlpha.800"
                    />
                    <Text bg="blackAlpha.700" color="white" px={3} py={1} borderRadius="md">
                      {currentImageIndex + 1} / {images.length}
                    </Text>
                    <IconButton
                      aria-label="Next image"
                      icon={<ChevronRightIcon />}
                      onClick={nextImage}
                      isRound
                      bg="whiteAlpha.800"
                    />
                  </HStack>
                )}
              </>
            ) : (
              <Box
                borderRadius="lg"
                bg={bgColor}
                borderWidth={1}
                borderColor={borderColor}
                h="400px"
                display="flex"
                alignItems="center"
                justifyContent="center"
              >
                <Text color="gray.500">No images available</Text>
              </Box>
            )}
          </Box>

          {/* Thumbnail Strip */}
          {images.length > 1 && (
            <HStack mt={4} spacing={2} overflowX="auto" py={2}>
              {images.map((url, index) => (
                <Image
                  key={index}
                  src={url}
                  alt={`Thumbnail ${index + 1}`}
                  boxSize="60px"
                  objectFit="cover"
                  cursor="pointer"
                  borderRadius="md"
                  opacity={currentImageIndex === index ? 1 : 0.6}
                  onClick={() => setCurrentImageIndex(index)}
                  _hover={{ opacity: 1 }}
                />
              ))}
            </HStack>
          )}
        </Box>

        {/* Listing Details */}
        <Box 
          flex="1" 
          bg={bgColor} 
          p={6} 
          borderRadius="lg"
          borderWidth={1}
          borderColor={borderColor}
        >
          <VStack align="stretch" spacing={4}>
            <Heading as="h1" size="xl">{listing.listingTitle}</Heading>
            
            <HStack>
              <Badge colorScheme="blue">Price: {(listing.price / LAMPORTS_PER_SOL).toFixed(4)} SOL</Badge>
              {listing.bought && <Badge colorScheme="green">Sold</Badge>}
              {listing.shipped && <Badge colorScheme="orange">Shipped</Badge>}
              {listing.received && <Badge colorScheme="green">Received</Badge>}
              {listing.arbitrationRequested && <Badge colorScheme="red">Arbitration Requested</Badge>}
            </HStack>

            <Text fontSize="lg">{listing.text}</Text>
            
            <Box>
              <Text fontWeight="bold">Seller:</Text>
              <Text fontSize="sm">{listing.seller}</Text>
            </Box>

            {listing.buyer && (
              <Box>
                <Text fontWeight="bold">Buyer:</Text>
                <Text fontSize="sm">{listing.buyer}</Text>
              </Box>
            )}

            <Box>
              <Text fontWeight="bold">Contact:</Text>
              <Text>{listing.contact}</Text>
            </Box>

            <Box>
              <Text fontWeight="bold">Tags:</Text>
              <HStack mt={2} wrap="wrap">
                {(listing.tags || []).map((tag, index) => (
                  <Badge key={index} colorScheme="purple">{tag}</Badge>
                ))}
              </HStack>
            </Box>

            {/* Action Buttons */}
            <Box mt={6}>
              {!listing.bought && walletAddress !== listing.seller && (
                <Button 
                  colorScheme="blue" 
                  size="lg" 
                  w="full" 
                  onClick={handlePurchase}
                  mb={4}
                >
                  Purchase for {(listing.price / LAMPORTS_PER_SOL).toFixed(4)} SOL
                </Button>
              )}
              
              {listing.bought && listing.seller === walletAddress && !listing.received && (
                <>
                  {!listing.shipped && (
                    <Button 
                      colorScheme="green" 
                      size="lg" 
                      w="full" 
                      onClick={handleMarkShipped}
                      mb={4}
                    >
                      Mark as Shipped
                    </Button>
                  )}
                </>
              )}
              
              {listing.bought && listing.shipped && listing.buyer === walletAddress && !listing.received && (
                <Button 
                  colorScheme="green" 
                  size="lg" 
                  w="full" 
                  onClick={handleMarkReceived}
                  mb={4}
                >
                  Mark as Received
                </Button>
              )}
            </Box>
          </VStack>
        </Box>
      </Box>
    </Container>
  );
}
