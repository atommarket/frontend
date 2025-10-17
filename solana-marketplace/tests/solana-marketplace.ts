import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { SolanaMarketplace } from "../target/types/solana_marketplace";
import { PublicKey, SystemProgram, Keypair, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { assert, expect } from "chai";

describe("solana-marketplace", () => {
  // Configure the client to use the local cluster
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.SolanaMarketplace as Program<SolanaMarketplace>;
  
  // Test accounts
  const admin = provider.wallet as anchor.Wallet;
  const seller = Keypair.generate();
  const buyer = Keypair.generate();
  const arbiter = admin; // For testing, admin is arbiter

  // PDAs
  let configPda: PublicKey;
  let sellerProfilePda: PublicKey;
  let buyerProfilePda: PublicKey;
  let listingPda: PublicKey;
  let escrowPda: PublicKey;
  let relationshipPda: PublicKey;

  const LISTING_ID = 1;

  before(async () => {
    // Airdrop SOL to test accounts
    await provider.connection.confirmTransaction(
      await provider.connection.requestAirdrop(seller.publicKey, 10 * LAMPORTS_PER_SOL)
    );
    await provider.connection.confirmTransaction(
      await provider.connection.requestAirdrop(buyer.publicKey, 10 * LAMPORTS_PER_SOL)
    );

    // Derive PDAs
    [configPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("config")],
      program.programId
    );

    [sellerProfilePda] = PublicKey.findProgramAddressSync(
      [Buffer.from("profile"), seller.publicKey.toBuffer()],
      program.programId
    );

    [buyerProfilePda] = PublicKey.findProgramAddressSync(
      [Buffer.from("profile"), buyer.publicKey.toBuffer()],
      program.programId
    );
  });

  it("Initializes the marketplace", async () => {
    const tx = await program.methods
      .initialize()
      .accounts({
        config: configPda,
        admin: admin.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    console.log("Initialize transaction:", tx);

    const config = await program.account.config.fetch(configPda);
    assert.equal(config.admin.toString(), admin.publicKey.toString());
    assert.equal(config.listingCount.toNumber(), 0);
    assert.equal(config.lastListingId.toNumber(), 0);
  });

  it("Creates a seller profile", async () => {
    const tx = await program.methods
      .createProfile("TestSeller")
      .accounts({
        profile: sellerProfilePda,
        user: seller.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([seller])
      .rpc();

    console.log("Create seller profile transaction:", tx);

    const profile = await program.account.profile.fetch(sellerProfilePda);
    assert.equal(profile.owner.toString(), seller.publicKey.toString());
    assert.equal(profile.profileName, "TestSeller");
    assert.equal(profile.transactionCount.toNumber(), 0);
    assert.equal(profile.ratings.toNumber(), 0);
  });

  it("Creates a buyer profile", async () => {
    const tx = await program.methods
      .createProfile("TestBuyer")
      .accounts({
        profile: buyerProfilePda,
        user: buyer.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([buyer])
      .rpc();

    console.log("Create buyer profile transaction:", tx);

    const profile = await program.account.profile.fetch(buyerProfilePda);
    assert.equal(profile.owner.toString(), buyer.publicKey.toString());
    assert.equal(profile.profileName, "TestBuyer");
  });

  it("Creates a listing", async () => {
    [listingPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("listing"), Buffer.from(new Uint8Array(new BigUint64Array([BigInt(LISTING_ID)]).buffer))],
      program.programId
    );

    const listingTitle = "Test iPhone";
    const externalId = "https://gateway.pinata.cloud/ipfs/QmTest123";
    const text = "Brand new iPhone 15";
    const tags = ["electronics", "phone"];
    const contact = "signal:testseller";
    const price = new anchor.BN(5 * LAMPORTS_PER_SOL);

    const tx = await program.methods
      .createListing(listingTitle, externalId, text, tags, contact, price)
      .accounts({
        config: configPda,
        listing: listingPda,
        seller: seller.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([seller])
      .rpc();

    console.log("Create listing transaction:", tx);

    const listing = await program.account.listing.fetch(listingPda);
    assert.equal(listing.listingId.toNumber(), LISTING_ID);
    assert.equal(listing.listingTitle, listingTitle);
    assert.equal(listing.seller.toString(), seller.publicKey.toString());
    assert.equal(listing.price.toString(), price.toString());
    assert.equal(listing.bought, false);

    const config = await program.account.config.fetch(configPda);
    assert.equal(config.listingCount.toNumber(), 1);
    assert.equal(config.lastListingId.toNumber(), LISTING_ID);
  });

  it("Edits a listing", async () => {
    const newExternalId = "https://gateway.pinata.cloud/ipfs/QmUpdated456";
    const newText = "Updated description";
    const newTags = ["electronics", "smartphone", "apple"];
    const newPrice = new anchor.BN(4.5 * LAMPORTS_PER_SOL);

    const tx = await program.methods
      .editListing(newExternalId, newText, newTags, newPrice)
      .accounts({
        listing: listingPda,
        seller: seller.publicKey,
      })
      .signers([seller])
      .rpc();

    console.log("Edit listing transaction:", tx);

    const listing = await program.account.listing.fetch(listingPda);
    assert.equal(listing.externalId, newExternalId);
    assert.equal(listing.text, newText);
    assert.equal(listing.price.toString(), newPrice.toString());
    assert.equal(listing.tags.length, 3);
  });

  it("Purchases a listing", async () => {
    [escrowPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("escrow"), Buffer.from(new Uint8Array(new BigUint64Array([BigInt(LISTING_ID)]).buffer))],
      program.programId
    );

    const listing = await program.account.listing.fetch(listingPda);
    const buyerBalanceBefore = await provider.connection.getBalance(buyer.publicKey);

    const tx = await program.methods
      .purchase()
      .accounts({
        listing: listingPda,
        escrow: escrowPda,
        buyer: buyer.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([buyer])
      .rpc();

    console.log("Purchase transaction:", tx);

    const updatedListing = await program.account.listing.fetch(listingPda);
    assert.equal(updatedListing.bought, true);
    assert.equal(updatedListing.buyer.toString(), buyer.publicKey.toString());

    const buyerBalanceAfter = await provider.connection.getBalance(buyer.publicKey);
    const escrowBalance = await provider.connection.getBalance(escrowPda);
    
    // Check that funds were transferred to escrow
    assert.equal(escrowBalance >= listing.price.toNumber(), true);
  });

  it("Fails to edit a purchased listing", async () => {
    try {
      await program.methods
        .editListing(
          "https://gateway.pinata.cloud/ipfs/QmFail",
          "Should fail",
          ["fail"],
          new anchor.BN(1 * LAMPORTS_PER_SOL)
        )
        .accounts({
          listing: listingPda,
          seller: seller.publicKey,
        })
        .signers([seller])
        .rpc();
      
      assert.fail("Should have thrown an error");
    } catch (error) {
      assert.include(error.message, "AlreadyPurchased");
    }
  });

  it("Seller marks item as shipped", async () => {
    const listing = await program.account.listing.fetch(listingPda);
    
    [relationshipPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("relationship"), listing.seller.toBuffer(), listing.buyer.toBuffer()],
      program.programId
    );

    const tx = await program.methods
      .signShipped()
      .accounts({
        listing: listingPda,
        relationship: relationshipPda,
        signer: seller.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([seller])
      .rpc();

    console.log("Sign shipped transaction:", tx);

    const updatedListing = await program.account.listing.fetch(listingPda);
    assert.equal(updatedListing.shipped, true);

    const relationship = await program.account.relationship.fetch(relationshipPda);
    assert.equal(relationship.seller.toString(), seller.publicKey.toString());
    assert.equal(relationship.buyer.toString(), buyer.publicKey.toString());
  });

  it("Buyer confirms receipt and funds are released", async () => {
    const listing = await program.account.listing.fetch(listingPda);
    const sellerBalanceBefore = await provider.connection.getBalance(seller.publicKey);
    const adminBalanceBefore = await provider.connection.getBalance(admin.publicKey);

    const tx = await program.methods
      .signReceived()
      .accounts({
        listing: listingPda,
        escrow: escrowPda,
        buyer: buyer.publicKey,
        seller: seller.publicKey,
        admin: admin.publicKey,
        sellerProfile: sellerProfilePda,
        buyerProfile: buyerProfilePda,
        systemProgram: SystemProgram.programId,
      })
      .signers([buyer])
      .rpc();

    console.log("Sign received transaction:", tx);

    const sellerBalanceAfter = await provider.connection.getBalance(seller.publicKey);
    const adminBalanceAfter = await provider.connection.getBalance(admin.publicKey);

    // Check that seller received 95% of the price
    const expectedSellerAmount = listing.price.toNumber() * 0.95;
    const sellerReceived = sellerBalanceAfter - sellerBalanceBefore;
    assert.approximately(sellerReceived, expectedSellerAmount, LAMPORTS_PER_SOL * 0.01);

    // Check that admin received 5% fee
    const expectedFeeAmount = listing.price.toNumber() * 0.05;
    const adminReceived = adminBalanceAfter - adminBalanceBefore;
    assert.approximately(adminReceived, expectedFeeAmount, LAMPORTS_PER_SOL * 0.01);

    // Check that profiles were updated
    const sellerProfile = await program.account.profile.fetch(sellerProfilePda);
    const buyerProfile = await program.account.profile.fetch(buyerProfilePda);
    assert.equal(sellerProfile.transactionCount.toNumber(), 1);
    assert.equal(buyerProfile.transactionCount.toNumber(), 1);

    // Listing should be closed
    try {
      await program.account.listing.fetch(listingPda);
      assert.fail("Listing should have been closed");
    } catch (error) {
      assert.include(error.message, "Account does not exist");
    }
  });

  it("Rates a user", async () => {
    const rating = new anchor.BN(5);

    const tx = await program.methods
      .rateUser(rating)
      .accounts({
        relationship: relationshipPda,
        recipientProfile: sellerProfilePda,
        rater: buyer.publicKey,
        recipient: seller.publicKey,
      })
      .signers([buyer])
      .rpc();

    console.log("Rate user transaction:", tx);

    const profile = await program.account.profile.fetch(sellerProfilePda);
    assert.equal(profile.ratings.toNumber(), 1);
    assert.equal(profile.ratingCount.toNumber(), 5);
    assert.equal(profile.averageRating.toNumber(), 5);
  });

  describe("Full Purchase Flow with Cancellation", () => {
    let newListingPda: PublicKey;
    let newEscrowPda: PublicKey;
    const LISTING_ID_2 = 2;

    it("Creates another listing", async () => {
      [newListingPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("listing"), Buffer.from(new Uint8Array(new BigUint64Array([BigInt(LISTING_ID_2)]).buffer))],
        program.programId
      );

      await program.methods
        .createListing(
          "Test Laptop",
          "https://gateway.pinata.cloud/ipfs/QmLaptop",
          "Gaming laptop",
          ["electronics", "computer"],
          "signal:seller2",
          new anchor.BN(10 * LAMPORTS_PER_SOL)
        )
        .accounts({
          config: configPda,
          listing: newListingPda,
          seller: seller.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([seller])
        .rpc();
    });

    it("Buyer purchases the listing", async () => {
      [newEscrowPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("escrow"), Buffer.from(new Uint8Array(new BigUint64Array([BigInt(LISTING_ID_2)]).buffer))],
        program.programId
      );

      await program.methods
        .purchase()
        .accounts({
          listing: newListingPda,
          escrow: newEscrowPda,
          buyer: buyer.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([buyer])
        .rpc();
    });

    it("Buyer cancels purchase before shipping", async () => {
      const buyerBalanceBefore = await provider.connection.getBalance(buyer.publicKey);

      await program.methods
        .cancelPurchase()
        .accounts({
          listing: newListingPda,
          escrow: newEscrowPda,
          buyer: buyer.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([buyer])
        .rpc();

      const listing = await program.account.listing.fetch(newListingPda);
      assert.equal(listing.bought, false);
      assert.equal(listing.buyer, null);

      // Check refund (approximately, accounting for transaction fees)
      const buyerBalanceAfter = await provider.connection.getBalance(buyer.publicKey);
      assert.isAbove(buyerBalanceAfter, buyerBalanceBefore);
    });
  });

  describe("Arbitration Flow", () => {
    let arbitrationListingPda: PublicKey;
    let arbitrationEscrowPda: PublicKey;
    const LISTING_ID_3 = 3;

    it("Creates listing for arbitration test", async () => {
      [arbitrationListingPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("listing"), Buffer.from(new Uint8Array(new BigUint64Array([BigInt(LISTING_ID_3)]).buffer))],
        program.programId
      );

      await program.methods
        .createListing(
          "Arbitration Test",
          "https://gateway.pinata.cloud/ipfs/QmArbitration",
          "For testing arbitration",
          ["test"],
          "signal:test",
          new anchor.BN(2 * LAMPORTS_PER_SOL)
        )
        .accounts({
          config: configPda,
          listing: arbitrationListingPda,
          seller: seller.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([seller])
        .rpc();
    });

    it("Buyer purchases", async () => {
      [arbitrationEscrowPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("escrow"), Buffer.from(new Uint8Array(new BigUint64Array([BigInt(LISTING_ID_3)]).buffer))],
        program.programId
      );

      await program.methods
        .purchase()
        .accounts({
          listing: arbitrationListingPda,
          escrow: arbitrationEscrowPda,
          buyer: buyer.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([buyer])
        .rpc();
    });

    it("Seller marks as shipped", async () => {
      const listing = await program.account.listing.fetch(arbitrationListingPda);
      const [relationshipPda2] = PublicKey.findProgramAddressSync(
        [Buffer.from("relationship"), listing.seller.toBuffer(), listing.buyer.toBuffer()],
        program.programId
      );

      await program.methods
        .signShipped()
        .accounts({
          listing: arbitrationListingPda,
          relationship: relationshipPda2,
          signer: seller.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([seller])
        .rpc();
    });

    it("Buyer requests arbitration", async () => {
      await program.methods
        .requestArbitration()
        .accounts({
          listing: arbitrationListingPda,
          requester: buyer.publicKey,
        })
        .signers([buyer])
        .rpc();

      const listing = await program.account.listing.fetch(arbitrationListingPda);
      assert.equal(listing.arbitrationRequested, true);
    });

    it("Arbiter resolves dispute in favor of buyer", async () => {
      const buyerBalanceBefore = await provider.connection.getBalance(buyer.publicKey);

      await program.methods
        .arbitrate()
        .accounts({
          config: configPda,
          listing: arbitrationListingPda,
          escrow: arbitrationEscrowPda,
          arbiter: arbiter.publicKey,
          fundsRecipient: buyer.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      const buyerBalanceAfter = await provider.connection.getBalance(buyer.publicKey);
      
      // Buyer should receive the funds
      assert.isAbove(buyerBalanceAfter, buyerBalanceBefore);

      // Listing should be closed
      try {
        await program.account.listing.fetch(arbitrationListingPda);
        assert.fail("Listing should have been closed");
      } catch (error) {
        assert.include(error.message, "Account does not exist");
      }
    });
  });

  describe("Profile Management", () => {
    const testUser = Keypair.generate();
    let testProfilePda: PublicKey;

    before(async () => {
      await provider.connection.confirmTransaction(
        await provider.connection.requestAirdrop(testUser.publicKey, 2 * LAMPORTS_PER_SOL)
      );

      [testProfilePda] = PublicKey.findProgramAddressSync(
        [Buffer.from("profile"), testUser.publicKey.toBuffer()],
        program.programId
      );
    });

    it("Creates a profile", async () => {
      await program.methods
        .createProfile("DeleteTest")
        .accounts({
          profile: testProfilePda,
          user: testUser.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([testUser])
        .rpc();

      const profile = await program.account.profile.fetch(testProfilePda);
      assert.equal(profile.profileName, "DeleteTest");
    });

    it("Deletes a profile", async () => {
      await program.methods
        .deleteProfile()
        .accounts({
          profile: testProfilePda,
          user: testUser.publicKey,
          owner: testUser.publicKey,
        })
        .signers([testUser])
        .rpc();

      try {
        await program.account.profile.fetch(testProfilePda);
        assert.fail("Profile should have been deleted");
      } catch (error) {
        assert.include(error.message, "Account does not exist");
      }
    });
  });
});

