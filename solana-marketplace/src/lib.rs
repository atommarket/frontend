use anchor_lang::prelude::*;
use anchor_lang::system_program::{transfer, Transfer};

declare_id!("Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS");

// Constants
pub const MAX_TEXT_LENGTH: usize = 499;
pub const MAX_TITLE_LENGTH: usize = 100;
pub const MAX_CONTACT_LENGTH: usize = 100;
pub const MAX_TAGS: usize = 10;
pub const MAX_TAG_LENGTH: usize = 50;
pub const MAX_PROFILE_NAME_LENGTH: usize = 50;
pub const IPFS_PREFIX: &str = "https://gateway.pinata.cloud/ipfs/";
pub const FEE_PERCENTAGE: u64 = 5; // 5% fee
pub const THIRTY_DAYS_SECONDS: i64 = 2592000;

#[program]
pub mod solana_marketplace {
    use super::*;

    // Initialize the marketplace
    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        let config = &mut ctx.accounts.config;
        config.admin = ctx.accounts.admin.key();
        config.listing_count = 0;
        config.last_listing_id = 0;
        config.bump = ctx.bumps.config;
        Ok(())
    }

    // Create a user profile
    pub fn create_profile(ctx: Context<CreateProfile>, profile_name: String) -> Result<()> {
        require!(
            profile_name.len() <= MAX_PROFILE_NAME_LENGTH,
            MarketplaceError::ProfileNameTooLong
        );

        let profile = &mut ctx.accounts.profile;
        profile.owner = ctx.accounts.user.key();
        profile.profile_name = profile_name;
        profile.transaction_count = 0;
        profile.ratings = 0;
        profile.rating_count = 0;
        profile.average_rating = 0;
        profile.bump = ctx.bumps.profile;

        Ok(())
    }

    // Create a new listing
    pub fn create_listing(
        ctx: Context<CreateListing>,
        listing_title: String,
        external_id: String,
        text: String,
        tags: Vec<String>,
        contact: String,
        price: u64,
    ) -> Result<()> {
        require!(text.len() <= MAX_TEXT_LENGTH, MarketplaceError::TooMuchText);
        require!(
            external_id.len() <= 128,
            MarketplaceError::OnlyOneLink
        );
        require!(
            external_id.starts_with(IPFS_PREFIX),
            MarketplaceError::MustUseJulianGateway
        );
        require!(
            listing_title.len() <= MAX_TITLE_LENGTH,
            MarketplaceError::TitleTooLong
        );
        require!(tags.len() <= MAX_TAGS, MarketplaceError::TooManyTags);
        for tag in &tags {
            require!(tag.len() <= MAX_TAG_LENGTH, MarketplaceError::TagTooLong);
        }
        require!(
            contact.len() <= MAX_CONTACT_LENGTH,
            MarketplaceError::ContactTooLong
        );

        let config = &mut ctx.accounts.config;
        config.last_listing_id = config.last_listing_id.checked_add(1).unwrap();
        config.listing_count = config.listing_count.checked_add(1).unwrap();

        let listing = &mut ctx.accounts.listing;
        listing.listing_id = config.last_listing_id;
        listing.listing_title = listing_title;
        listing.external_id = external_id;
        listing.text = text;
        listing.tags = tags;
        listing.seller = ctx.accounts.seller.key();
        listing.contact = contact;
        listing.price = price;
        listing.buyer = None;
        listing.bought = false;
        listing.shipped = false;
        listing.received = false;
        listing.arbitration_requested = false;
        listing.creation_date = Clock::get()?.unix_timestamp;
        listing.last_edit_date = None;
        listing.bump = ctx.bumps.listing;

        Ok(())
    }

    // Purchase a listing
    pub fn purchase(ctx: Context<Purchase>) -> Result<()> {
        let listing = &mut ctx.accounts.listing;
        require!(!listing.bought, MarketplaceError::AlreadyPurchased);

        // Transfer funds from buyer to escrow
        let transfer_ctx = CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
            Transfer {
                from: ctx.accounts.buyer.to_account_info(),
                to: ctx.accounts.escrow.to_account_info(),
            },
        );
        transfer(transfer_ctx, listing.price)?;

        listing.buyer = Some(ctx.accounts.buyer.key());
        listing.bought = true;

        Ok(())
    }

    // Seller marks item as shipped
    pub fn sign_shipped(ctx: Context<SignShipped>) -> Result<()> {
        let listing = &mut ctx.accounts.listing;
        require!(
            listing.seller == ctx.accounts.signer.key(),
            MarketplaceError::Unauthorized
        );

        listing.shipped = true;

        // Create relationship record
        let relationship = &mut ctx.accounts.relationship;
        relationship.seller = listing.seller;
        relationship.buyer = listing.buyer.unwrap();
        relationship.sell_date = Clock::get()?.unix_timestamp;
        relationship.bump = ctx.bumps.relationship;

        Ok(())
    }

    // Buyer marks item as received and releases funds
    pub fn sign_received(ctx: Context<SignReceived>) -> Result<()> {
        let listing = &ctx.accounts.listing;
        require!(listing.shipped, MarketplaceError::NotShipped);
        require!(
            listing.buyer == Some(ctx.accounts.buyer.key()),
            MarketplaceError::Unauthorized
        );

        // Calculate amounts
        let fee_amount = listing
            .price
            .checked_mul(FEE_PERCENTAGE)
            .unwrap()
            .checked_div(100)
            .unwrap();
        let seller_amount = listing.price.checked_sub(fee_amount).unwrap();

        // Transfer to seller
        let seeds = &[
            b"escrow",
            listing.listing_id.to_le_bytes().as_ref(),
            &[ctx.accounts.escrow.bump],
        ];
        let signer = &[&seeds[..]];

        let seller_transfer = CpiContext::new_with_signer(
            ctx.accounts.system_program.to_account_info(),
            Transfer {
                from: ctx.accounts.escrow.to_account_info(),
                to: ctx.accounts.seller.to_account_info(),
            },
            signer,
        );
        transfer(seller_transfer, seller_amount)?;

        // Transfer fee to admin
        let admin_transfer = CpiContext::new_with_signer(
            ctx.accounts.system_program.to_account_info(),
            Transfer {
                from: ctx.accounts.escrow.to_account_info(),
                to: ctx.accounts.admin.to_account_info(),
            },
            signer,
        );
        transfer(admin_transfer, fee_amount)?;

        Ok(())
    }
}

// Account structures
#[account]
pub struct Config {
    pub admin: Pubkey,
    pub listing_count: u64,
    pub last_listing_id: u64,
    pub bump: u8,
}

#[account]
pub struct Profile {
    pub owner: Pubkey,
    pub profile_name: String,
    pub transaction_count: u64,
    pub ratings: u64,
    pub rating_count: u64,
    pub average_rating: u64,
    pub bump: u8,
}

#[account]
pub struct Listing {
    pub listing_id: u64,
    pub listing_title: String,
    pub external_id: String,
    pub price: u64,
    pub text: String,
    pub tags: Vec<String>,
    pub seller: Pubkey,
    pub contact: String,
    pub bought: bool,
    pub buyer: Option<Pubkey>,
    pub shipped: bool,
    pub received: bool,
    pub arbitration_requested: bool,
    pub creation_date: i64,
    pub last_edit_date: Option<i64>,
    pub bump: u8,
}

#[account]
pub struct Escrow {
    pub listing_id: u64,
    pub bump: u8,
}

#[account]
pub struct Relationship {
    pub seller: Pubkey,
    pub buyer: Pubkey,
    pub sell_date: i64,
    pub bump: u8,
}

// Context structures
#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(
        init,
        payer = admin,
        space = 8 + 32 + 8 + 8 + 1,
        seeds = [b"config"],
        bump
    )]
    pub config: Account<'info, Config>,
    #[account(mut)]
    pub admin: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct CreateProfile<'info> {
    #[account(
        init,
        payer = user,
        space = 8 + 32 + (4 + MAX_PROFILE_NAME_LENGTH) + 8 + 8 + 8 + 8 + 1,
        seeds = [b"profile", user.key().as_ref()],
        bump
    )]
    pub profile: Account<'info, Profile>,
    #[account(mut)]
    pub user: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct CreateListing<'info> {
    #[account(
        mut,
        seeds = [b"config"],
        bump = config.bump
    )]
    pub config: Account<'info, Config>,
    #[account(
        init,
        payer = seller,
        space = 8 + 8 + (4 + MAX_TITLE_LENGTH) + (4 + 128) + 8 + (4 + MAX_TEXT_LENGTH) 
              + (4 + MAX_TAGS * (4 + MAX_TAG_LENGTH)) + 32 + (4 + MAX_CONTACT_LENGTH) 
              + 1 + (1 + 32) + 1 + 1 + 1 + 8 + (1 + 8) + 1,
        seeds = [b"listing", (config.last_listing_id + 1).to_le_bytes().as_ref()],
        bump
    )]
    pub listing: Account<'info, Listing>,
    #[account(mut)]
    pub seller: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Purchase<'info> {
    #[account(
        mut,
        seeds = [b"listing", listing.listing_id.to_le_bytes().as_ref()],
        bump = listing.bump
    )]
    pub listing: Account<'info, Listing>,
    #[account(
        init,
        payer = buyer,
        space = 8 + 8 + 1,
        seeds = [b"escrow", listing.listing_id.to_le_bytes().as_ref()],
        bump
    )]
    pub escrow: Account<'info, Escrow>,
    #[account(mut)]
    pub buyer: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct SignShipped<'info> {
    #[account(
        mut,
        seeds = [b"listing", listing.listing_id.to_le_bytes().as_ref()],
        bump = listing.bump
    )]
    pub listing: Account<'info, Listing>,
    #[account(
        init,
        payer = signer,
        space = 8 + 32 + 32 + 8 + 1,
        seeds = [b"relationship", listing.seller.as_ref(), listing.buyer.unwrap().as_ref()],
        bump
    )]
    pub relationship: Account<'info, Relationship>,
    #[account(mut)]
    pub signer: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct SignReceived<'info> {
    #[account(
        mut,
        close = buyer,
        seeds = [b"listing", listing.listing_id.to_le_bytes().as_ref()],
        bump = listing.bump
    )]
    pub listing: Account<'info, Listing>,
    #[account(
        mut,
        close = buyer,
        seeds = [b"escrow", listing.listing_id.to_le_bytes().as_ref()],
        bump = escrow.bump
    )]
    pub escrow: Account<'info, Escrow>,
    #[account(mut)]
    pub buyer: Signer<'info>,
    /// CHECK: Seller receiving payment
    #[account(mut)]
    pub seller: UncheckedAccount<'info>,
    /// CHECK: Admin receiving fee
    #[account(mut)]
    pub admin: UncheckedAccount<'info>,
    pub system_program: Program<'info, System>,
}

// Errors
#[error_code]
pub enum MarketplaceError {
    #[msg("Unauthorized")]
    Unauthorized,
    #[msg("Text exceeds maximum length")]
    TooMuchText,
    #[msg("Only one IPFS link allowed")]
    OnlyOneLink,
    #[msg("Item must be marked as shipped before receiving")]
    NotShipped,
    #[msg("This listing is already purchased")]
    AlreadyPurchased,
    #[msg("Must use Julian's IPFS gateway")]
    MustUseJulianGateway,
    #[msg("Title exceeds maximum length")]
    TitleTooLong,
    #[msg("Too many tags")]
    TooManyTags,
    #[msg("Tag exceeds maximum length")]
    TagTooLong,
    #[msg("Contact info exceeds maximum length")]
    ContactTooLong,
    #[msg("Profile name exceeds maximum length")]
    ProfileNameTooLong,
}