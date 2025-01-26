use cosmwasm_std::{
    coin, entry_point, to_json_binary, BankMsg, Binary, Deps, DepsMut, Env, MessageInfo, Order,
    Response, StdError, StdResult,
};
use cw2::{get_contract_version, set_contract_version};
use cw_storage_plus::Bound;
use is_false::is_false;
use std::env;

use crate::coin_helpers::assert_sent_exact_coin;
use crate::error::ContractError;
use crate::msg::{
    AllListingsResponse, ArbitrationListingsResponse, ExecuteMsg, InstantiateMsg,
    ListingCountResponse, ListingResponse, MigrateMsg, QueryMsg, SearchListingsResponse,
    ProfileResponse,
};
use crate::state::{
    Config, Listing, CONFIG, LAST_LISTING_ID, LISTING, LISTING_COUNT, LISTING_TITLES,
    Profile, PROFILE_NAME, PROFILES, Relationship, RELATIONSHIPS,
};

const CONTRACT_NAME: &str = env!("CARGO_PKG_NAME");
const CONTRACT_VERSION: &str = env!("CARGO_PKG_VERSION");
//Admin & fee wallet
const ADMIN: &str = "juno107zhxnyyvrskwv8vnqhrmfzkm8xlzphksuvdpz";
//FOR TESTING PURPOSES ONLY
// const ADMIN: &str = "cosmwasm1g7l9mla39rtnlaw6awq6r9w98u8yya35fnhxpsvf3q2qy3ymrwnqpwenn7";
//limit ipfs link size to prevent link duplication
const MAX_ID_LENGTH: usize = 128;
//Block size is limited so make sure text input is less than 500 characters
const MAX_TEXT_LENGTH: usize = 499;
//julian dedicated gateway
const IPFS: &str = "https://gateway.pinata.cloud/ipfs/";
const JUNO: &str = "ujuno";
//Hardcode the arbiters of the contract for dispute resolution
const ARBITERS: [&str; 1] = ["juno107zhxnyyvrskwv8vnqhrmfzkm8xlzphksuvdpz"];
//FOR TESTING PURPOSES ONLY
// const ARBITERS: [&str; 1] = ["cosmwasm1g7l9mla39rtnlaw6awq6r9w98u8yya35fnhxpsvf3q2qy3ymrwnqpwenn7"];

#[entry_point]
pub fn instantiate(
    deps: DepsMut,
    _env: Env,
    info: MessageInfo,
    _msg: InstantiateMsg,
) -> Result<Response, ContractError> {
    set_contract_version(deps.storage, CONTRACT_NAME, CONTRACT_VERSION)?;
    let config = Config {
        admin: info.sender.clone(),
    };
    CONFIG.save(deps.storage, &config)?;
    LAST_LISTING_ID.save(deps.storage, &0)?;
    LISTING_COUNT.save(deps.storage, &0)?;
    Ok(Response::new()
        .add_attribute("action", "instantiate")
        .add_attribute("admin", info.sender.to_string()))
}

#[cfg_attr(not(feature = "library"), entry_point)]
pub fn execute(
    deps: DepsMut,
    env: Env,
    info: MessageInfo,
    msg: ExecuteMsg,
) -> Result<Response, ContractError> {
    match msg {
        ExecuteMsg::CreateListing {
            listing_title,
            external_id,
            text,
            tags,
            contact,
            price,
        } => execute_create_listing(
            deps,
            env,
            info,
            listing_title,
            external_id,
            text,
            tags,
            contact,
            price,
        ),
        ExecuteMsg::EditListing {
            listing_id,
            external_id,
            text,
            tags,
            price,
        } => execute_edit_listing(deps, env, info, listing_id, external_id, text, tags, price),
        ExecuteMsg::DeleteListing { listing_id } => {
            execute_delete_listing(deps, env, info, listing_id)
        }
        ExecuteMsg::Purchase { listing_id } => execute_purchase(deps, env, info, listing_id),
        ExecuteMsg::CancelPurchase { listing_id } => {
            execute_cancel_purchase(deps, env, info, listing_id)
        }
        ExecuteMsg::SignShipped { listing_id } => execute_sign_shipped(deps, env, info, listing_id),
        ExecuteMsg::SignReceived { listing_id } => {
            execute_sign_received(deps, env, info, listing_id)
        }
        ExecuteMsg::RequestArbitration { listing_id } => {
            execute_request_arbitration(deps, env, info, listing_id)
        }
        ExecuteMsg::Arbitrate {
            listing_id,
            funds_recipient,
        } => execute_arbitrate(deps, env, info, listing_id, funds_recipient),
        ExecuteMsg::CreateProfile { profile_name } => {
            execute_create_profile(deps, env, info, profile_name)
        }
        ExecuteMsg::DeleteProfile {} => execute_delete_profile(deps, env, info),
        ExecuteMsg::SellerCancelSale { listing_id } => {
            execute_seller_cancel_sale(deps, env, info, listing_id)
        }
        ExecuteMsg::RateUser { recipient_address, rating } => {
            execute_rate_user(deps, env, info, recipient_address, rating)
        }
        ExecuteMsg::CleanupOldRelationships {} => execute_cleanup_old_relationships(deps, env),
    }
}
pub fn execute_create_profile(
    deps: DepsMut,
    _env: Env,
    info: MessageInfo,
    profile_name: String,
) -> Result<Response, ContractError> {
    let profile = Profile {
        profile_name: profile_name.clone(),
        transaction_count: 0,
        ratings: 0,
        rating_count: 0,
        average_rating: 0,
    };
    PROFILES.save(deps.storage, info.sender.clone(), &profile)?;
    PROFILE_NAME.save(deps.storage, info.sender.clone(), &profile_name)?;
    Ok(Response::new()
        .add_attribute("action", "create_profile")
        .add_attribute("profile_name", profile_name))
}
//clippy defaults to max value of 7
#[allow(clippy::too_many_arguments)]
fn execute_create_listing(
    deps: DepsMut,
    env: Env,
    info: MessageInfo,
    listing_title: String,
    external_id: String,
    text: String,
    tags: Vec<String>,
    contact: String,
    price: u64,
) -> Result<Response, ContractError> {
    //In future, fees will be turned on for post creation (maybe), reference line below.
    // assert_sent_exact_coin(&info.funds, Some(vec![coin(1_000_000, JUNO)]))?;
    if text.len() > MAX_TEXT_LENGTH {
        return Err(ContractError::TooMuchText {});
    }
    if external_id.len() > MAX_ID_LENGTH {
        return Err(ContractError::OnlyOneLink {});
    }
    if is_false(external_id.starts_with(IPFS)) {
        return Err(ContractError::MustUseJulianGateway {});
    }
    //load article count from state and increment
    let counter = LISTING_COUNT.load(deps.storage)?;
    let updated_counter = counter + 1;
    //load last post id from state and increment
    let last_listing_id = LAST_LISTING_ID.load(deps.storage)?;
    let incremented_id = last_listing_id + 1;
    let post: Listing = Listing {
        listing_id: incremented_id,
        listing_title,
        external_id,
        text,
        tags,
        seller: info.sender.to_string(),
        contact,
        price,
        buyer: None,
        bought: false,
        shipped: false,
        received: false,
        arbitration_requested: false,
        creation_date: env.block.time.to_string(),
        last_edit_date: None,
    };
    //save incremented id, post, incremented article count, and listing title mapping
    LAST_LISTING_ID.save(deps.storage, &incremented_id)?;
    LISTING.save(deps.storage, post.listing_id, &post)?;
    LISTING_COUNT.save(deps.storage, &updated_counter)?;
    LISTING_TITLES.save(deps.storage, post.listing_title.clone(), &post.listing_id)?;
    Ok(Response::new()
        .add_attribute("action", "create_post")
        .add_attribute("post_id", post.listing_id.to_string())
        .add_attribute("seller", info.sender.to_string()))
}
#[allow(clippy::too_many_arguments)]
fn execute_edit_listing(
    deps: DepsMut,
    env: Env,
    info: MessageInfo,
    listing_id: u64,
    external_id: String,
    text: String,
    tags: Vec<String>,
    price: u64,
) -> Result<Response, ContractError> {
    //Potential edit fee in future to pay for IPFS storage
    // assert_sent_exact_coin(&info.funds, Some(vec![Coin::new(200_000u128, JUNO)]))?;
    if text.len() > MAX_TEXT_LENGTH {
        return Err(ContractError::TooMuchText {});
    }
    if external_id.len() > MAX_ID_LENGTH {
        return Err(ContractError::OnlyOneLink {});
    }
    if is_false(external_id.starts_with(IPFS)) {
        return Err(ContractError::MustUseJulianGateway {});
    }
    //load post by ID passed
    let listing = LISTING.load(deps.storage, listing_id)?;
    //make sure editor is seller
    if info.sender.to_string() != listing.seller {
        return Err(ContractError::Unauthorized {});
    }
    //Prevent editing a listing that has been purchased (fraud protection)
    if listing.bought {
        return Err(ContractError::AlreadyPurchased {});
    }
    //update post content
    let new_post: Listing = Listing {
        listing_id: listing.listing_id,
        listing_title: listing.listing_title,
        external_id,
        price,
        text,
        tags,
        seller: listing.seller,
        contact: listing.contact,
        bought: listing.bought,
        buyer: listing.buyer,
        shipped: listing.shipped,
        received: listing.received,
        arbitration_requested: listing.arbitration_requested,
        creation_date: listing.creation_date,
        last_edit_date: Some(env.block.time.to_string()),
    };
    //save post
    LISTING.save(deps.storage, listing_id, &new_post)?;
    Ok(Response::new()
        .add_attribute("action", "edit_post")
        .add_attribute("post_id", new_post.listing_id.to_string()))
}
fn execute_delete_listing(
    deps: DepsMut,
    _env: Env,
    info: MessageInfo,
    listing_id: u64,
) -> Result<Response, ContractError> {
    //Ensure the sender is the seller
    if info.sender.to_string() != LISTING.load(deps.storage, listing_id)?.seller {
        return Err(ContractError::Unauthorized {});
    }
    //remove listing title mapping from state
    let listing = LISTING.load(deps.storage, listing_id)?;
    LISTING_TITLES.remove(deps.storage, listing.listing_title);
    //remove post from state via post id
    LISTING.remove(deps.storage, listing_id);
    //load counter and decrement
    let counter = LISTING_COUNT.load(deps.storage)?;
    let updated_counter = counter - 1;
    //save decremented counter
    LISTING_COUNT.save(deps.storage, &updated_counter)?;
    Ok(Response::new()
        .add_attribute("action", "delete_post")
        .add_attribute("post_id", listing_id.to_string()))
}

//reusable function to check if an address is a harcoded arbiter (for state effective multisig thingy)
fn is_arbiter(deps: &DepsMut, sender: &str) -> bool {
    ARBITERS.iter().any(|&arbiter| {
        let validated_arbiter = deps.api.addr_validate(arbiter).unwrap();
        deps.api.addr_validate(sender).unwrap() == validated_arbiter
    })
}

fn execute_sign_shipped(
    deps: DepsMut,
    env: Env,
    info: MessageInfo,
    listing_id: u64,
) -> Result<Response, ContractError> {
    let mut listing = LISTING.load(deps.storage, listing_id)?;
    
    if info.sender.to_string() != listing.seller && !is_arbiter(&deps, info.sender.as_ref()) {
        return Err(ContractError::Unauthorized {});
    }
    
    listing.shipped = true;
    
    // Create relationship record with timestamp in seconds
    let relationship = Relationship {
        seller: listing.seller.clone(),
        buyer: listing.buyer.clone().unwrap(),
        sell_date: env.block.time.seconds().to_string(),
    };
    
    // Create a unique key for the relationship
    let relationship_key = format!("{}:{}", listing.seller, listing.buyer.clone().unwrap());
    RELATIONSHIPS.save(deps.storage, relationship_key.clone(), &relationship)?;
    
    LISTING.save(deps.storage, listing_id, &listing)?;
    
    Ok(Response::new()
        .add_attribute("action", "sign_shipped")
        .add_attribute("listing_id", listing_id.to_string())
        .add_attribute("relationship_created", relationship_key))
}
//When the buyer receives the item, the seller is paid 95%, the ADMIN is paid 5%, and the listing is deleted.
fn execute_sign_received(
    deps: DepsMut,
    _env: Env,
    info: MessageInfo,
    listing_id: u64,
) -> Result<Response, ContractError> {
    let listing = LISTING.load(deps.storage, listing_id)?;
    //check if post shipped value is false
    if !listing.shipped {
        return Err(ContractError::NotShipped {});
    }
    // Verify the executor is the buyer
    if Some(info.sender.to_string()) != listing.buyer {
        return Err(ContractError::Unauthorized {});
    }

    // Calculate 5% fee
    let fee_amount = listing.price as u128 * 5 / 100;
    let seller_amount = listing.price as u128 - fee_amount;

    // Create bank messages for both seller and admin
    let seller_msg = BankMsg::Send {
        to_address: listing.seller.to_string(),
        amount: vec![coin(seller_amount, JUNO)],
    };

    let admin_msg = BankMsg::Send {
        to_address: ADMIN.to_string(),
        amount: vec![coin(fee_amount, JUNO)],
    };

    // Update transaction counts for both buyer and seller
    let seller_addr = deps.api.addr_validate(&listing.seller)?;
    let buyer_addr = deps.api.addr_validate(&listing.buyer.clone().unwrap())?;
    
    // Only update profiles if they exist
    if let Ok(mut seller_profile) = PROFILES.load(deps.storage, seller_addr.clone()) {
        seller_profile.transaction_count += 1;
        PROFILES.save(deps.storage, seller_addr, &seller_profile)?;
    }
    
    if let Ok(mut buyer_profile) = PROFILES.load(deps.storage, buyer_addr.clone()) {
        buyer_profile.transaction_count += 1;
        PROFILES.save(deps.storage, buyer_addr, &buyer_profile)?;
    }

    LISTING.remove(deps.storage, listing_id);
    let resp = Response::new()
        .add_attribute("action", "sign_received")
        .add_message(seller_msg)
        .add_message(admin_msg)
        .add_attribute("action", "release funds to seller")
        .add_attribute("amount to seller", seller_amount.to_string())
        .add_attribute("fee to admin", fee_amount.to_string());
    Ok(resp)
}

fn execute_request_arbitration(
    deps: DepsMut,
    _env: Env,
    info: MessageInfo,
    listing_id: u64,
) -> Result<Response, ContractError> {
    let mut listing = LISTING.load(deps.storage, listing_id)?;
    if !listing.shipped || !listing.bought {
        return Err(ContractError::NotEligibleForArbitration {});
    }
    // Only allow buyer or post creator to request arbitration
    if info.sender.to_string() != listing.seller && Some(info.sender.to_string()) != listing.buyer {
        return Err(ContractError::Unauthorized {});
    }
    listing.arbitration_requested = true;
    LISTING.save(deps.storage, listing_id, &listing)?;
    Ok(Response::new()
        .add_attribute("action", "request_arbitration")
        .add_attribute("post_id", listing_id.to_string()))
}

fn execute_purchase(
    deps: DepsMut,
    _env: Env,
    info: MessageInfo,
    listing_id: u64,
) -> Result<Response, ContractError> {
    let mut listing = LISTING.load(deps.storage, listing_id)?;
    if listing.bought {
        return Err(ContractError::AlreadyPurchased {});
    }
    assert_sent_exact_coin(&info.funds, Some(vec![coin(listing.price as u128, JUNO)]))?;
    listing.buyer = Some(info.sender.to_string());
    listing.bought = true;
    LISTING.save(deps.storage, listing_id, &listing)?;
    Ok(Response::new()
        .add_attribute("action", "purchase")
        .add_attribute("post_id", listing_id.to_string())
        .add_attribute("buyer", info.sender.to_string()))
}
//function allows the buyer to cancel a purchase if the purchase has not been shipped. It returns the funds to the buyer.
fn execute_cancel_purchase(
    deps: DepsMut,
    _env: Env,
    info: MessageInfo,
    listing_id: u64,
) -> Result<Response, ContractError> {
    let mut listing = LISTING.load(deps.storage, listing_id)?;
    if !listing.bought || listing.shipped {
        return Err(ContractError::NotEligibleForCancellation {});
    }
    if Some(info.sender.to_string()) != listing.buyer {
        return Err(ContractError::Unauthorized {});
    }
    let bank_msg = BankMsg::Send {
        to_address: listing.buyer.unwrap(),
        amount: vec![coin(listing.price as u128, JUNO)],
    };
    listing.bought = false;
    listing.buyer = None;
    LISTING.save(deps.storage, listing_id, &listing)?;
    Ok(Response::new()
        .add_message(bank_msg)
        .add_attribute("action", "cancel_purchase")
        .add_attribute("listing_id", listing_id.to_string()))
}

fn execute_arbitrate(
    deps: DepsMut,
    _env: Env,
    info: MessageInfo,
    listing_id: u64,
    funds_recipient: String,
) -> Result<Response, ContractError> {
    let listing = LISTING.load(deps.storage, listing_id)?;
    //ensure someone has requested arbitration
    if !listing.arbitration_requested {
        return Err(ContractError::ArbitrationNotRequested {});
    }
    //ensure executor is an arbiter
    if !is_arbiter(&deps, info.sender.as_ref()) {
        return Err(ContractError::Unauthorized {});
    }
    //ensure funds recipient is either the seller or the buyer to prevent fraud
    if funds_recipient != listing.seller && funds_recipient != listing.buyer.unwrap() {
        return Err(ContractError::InvalidFundsRecipient {});
    }
    //send funds to slated recipient
    let bank_msg = BankMsg::Send {
        to_address: funds_recipient,
        amount: vec![coin(listing.price as u128, JUNO)],
    };
    //remove listing from state
    LISTING.remove(deps.storage, listing_id);
    //save decremented counter
    let counter = LISTING_COUNT.load(deps.storage)?;
    let updated_counter = counter - 1;
    LISTING_COUNT.save(deps.storage, &updated_counter)?;
    Ok(Response::new()
        .add_message(bank_msg)
        .add_attribute("action", "arbitrate")
        .add_attribute("post_id", listing_id.to_string()))
}

pub fn execute_delete_profile(
    deps: DepsMut,
    _env: Env,
    info: MessageInfo,
) -> Result<Response, ContractError> {
    // Check if profile exists
    let profile_name = PROFILE_NAME.may_load(deps.storage, info.sender.clone())?;
    
    if let Some(_) = profile_name {
        // Remove profile name mapping
        PROFILE_NAME.remove(deps.storage, info.sender.clone());
        
        // Remove profile data
        PROFILES.remove(deps.storage, info.sender.clone());

        Ok(Response::new()
            .add_attribute("action", "delete_profile")
            .add_attribute("address", info.sender)
            .add_attribute("profile_name", profile_name.unwrap()))
    } else {
        Err(ContractError::ProfileNotFound {})
    }
}

fn execute_seller_cancel_sale(
    deps: DepsMut,
    _env: Env,
    info: MessageInfo,
    listing_id: u64,
) -> Result<Response, ContractError> {
    let mut listing = LISTING.load(deps.storage, listing_id)?;
    
    // Verify the executor is the seller
    if info.sender.to_string() != listing.seller {
        return Err(ContractError::Unauthorized {});
    }

    // Check if the listing is actually purchased
    if !listing.bought {
        return Err(ContractError::NotPurchased {});
    }

    // Create bank message to return funds to buyer
    let bank_msg = BankMsg::Send {
        to_address: listing.buyer.clone().unwrap(),
        amount: vec![coin(listing.price as u128, JUNO)],
    };

    // Reset purchase-related fields
    listing.bought = false;
    listing.buyer = None;
    listing.shipped = false;
    listing.received = false;
    listing.arbitration_requested = false;

    // Save updated listing
    LISTING.save(deps.storage, listing_id, &listing)?;

    Ok(Response::new()
        .add_message(bank_msg)
        .add_attribute("action", "seller_cancel_sale")
        .add_attribute("listing_id", listing_id.to_string())
        .add_attribute("refunded_buyer", listing.buyer.unwrap())
        .add_attribute("refund_amount", listing.price.to_string()))
}

fn execute_rate_user(
    deps: DepsMut,
    _env: Env,
    info: MessageInfo,
    recipient_address: String,
    rating: u64,
) -> Result<Response, ContractError> {
    // Validate rating is between 1 and 5
    if rating < 1 || rating > 5 {
        return Err(ContractError::InvalidRating {});
    }

    // Check if relationship exists (either as buyer or seller)
    let buyer_key = format!("{}:{}", recipient_address, info.sender);
    let seller_key = format!("{}:{}", info.sender, recipient_address);
    
    let relationship = RELATIONSHIPS.may_load(deps.storage, buyer_key)?
        .or_else(|| RELATIONSHIPS.may_load(deps.storage, seller_key).unwrap());

    if relationship.is_none() {
        return Err(ContractError::NoRelationshipFound {});
    }

    // Load recipient's profile
    let recipient_addr = deps.api.addr_validate(&recipient_address)?;
    let profile = PROFILES.may_load(deps.storage, recipient_addr.clone())?;
    
    if let Some(mut profile) = profile {
        // Update profile statistics
        profile.ratings += 1;
        profile.rating_count += rating;
        profile.average_rating = profile.rating_count / profile.ratings;
        
        // Save updated profile
        PROFILES.save(deps.storage, recipient_addr, &profile)?;
        
        Ok(Response::new()
            .add_attribute("action", "rate_user")
            .add_attribute("rater", info.sender)
            .add_attribute("recipient", recipient_address)
            .add_attribute("rating", rating.to_string()))
    } else {
        Err(ContractError::ProfileNotFound {})
    }
}

fn execute_cleanup_old_relationships(
    deps: DepsMut,
    env: Env,
) -> Result<Response, ContractError> {
    let current_time = env.block.time.seconds();
    let thirty_days = 2592000u64; // 30 days in seconds
    let mut deleted_count = 0;

    // Get all relationships
    let relationships: Vec<_> = RELATIONSHIPS
        .range(deps.storage, None, None, Order::Ascending)
        .collect::<StdResult<Vec<_>>>()?;

    // Process each relationship
    for (key, relationship) in relationships {
        // Parse the stored timestamp from string to u64
        let sell_date = relationship.sell_date.parse::<u64>().unwrap();

        // Check if relationship is older than 30 days
        if current_time - sell_date > thirty_days {
            RELATIONSHIPS.remove(deps.storage, key);
            deleted_count += 1;
        }
    }

    Ok(Response::new()
        .add_attribute("action", "cleanup_old_relationships")
        .add_attribute("relationships_deleted", deleted_count.to_string()))
}

#[entry_point]
pub fn query(deps: Deps, env: Env, msg: QueryMsg) -> StdResult<Binary> {
    match msg {
        QueryMsg::AllListings { limit, start_after } => {
            query_all_listings(deps, env, limit, start_after)
        }
        QueryMsg::Listing { listing_id } => query_listing(deps, env, listing_id),
        QueryMsg::ListingCount {} => query_listing_count(deps, env),
        QueryMsg::ArbitrationListings { limit, start_after } => {
            query_arbitration_listings(deps, env, limit, start_after)
        }
        QueryMsg::SearchListingsByTitle { title, limit } => {
            query_listings_by_title(deps, title, limit)
        }
        QueryMsg::Profile { address } => query_profile(deps, address),
    }
}

//pagination fields
const MAX_LIMIT: u32 = 30;
const DEFAULT_LIMIT: u32 = 10;

fn query_all_listings(
    deps: Deps,
    _env: Env,
    limit: Option<u32>,
    start_after: Option<u64>,
) -> StdResult<Binary> {
    let limit = limit.unwrap_or(DEFAULT_LIMIT).min(MAX_LIMIT) as usize;
    let start = start_after.map(Bound::exclusive);
    let listings = LISTING
        .range(deps.storage, None, start, Order::Descending)
        .take(limit)
        .map(|p| Ok(p?.1))
        .collect::<StdResult<Vec<_>>>()?;

    to_json_binary(&AllListingsResponse { listings })
}
fn query_listing(deps: Deps, _env: Env, listing_id: u64) -> StdResult<Binary> {
    let listing = LISTING.may_load(deps.storage, listing_id)?;
    to_json_binary(&ListingResponse { listing })
}
fn query_listing_count(deps: Deps, _env: Env) -> StdResult<Binary> {
    let listing_count = LISTING_COUNT.load(deps.storage)?;
    to_json_binary(&ListingCountResponse { listing_count })
}

fn query_arbitration_listings(
    deps: Deps,
    _env: Env,
    limit: Option<u32>,
    start_after: Option<u64>,
) -> StdResult<Binary> {
    let limit = limit.unwrap_or(DEFAULT_LIMIT).min(MAX_LIMIT) as usize;
    let start = start_after.map(Bound::exclusive);

    let listings: Vec<Listing> = LISTING
        .range(deps.storage, None, start, Order::Descending)
        .filter(|item| match item {
            Ok((_, listing)) => listing.arbitration_requested,
            Err(_) => false,
        })
        .take(limit)
        .map(|item| item.map(|(_, listing)| listing))
        .collect::<StdResult<Vec<_>>>()?;

    to_json_binary(&ArbitrationListingsResponse { listings })
}

fn query_listings_by_title(deps: Deps, title: String, limit: Option<u32>) -> StdResult<Binary> {
    let limit = limit.unwrap_or(DEFAULT_LIMIT).min(MAX_LIMIT) as usize;

    let listings: Vec<Listing> = LISTING_TITLES
        .range(deps.storage, None, None, Order::Ascending)
        .filter(|item| {
            if let Ok((stored_title, _)) = item {
                stored_title.to_lowercase().contains(&title.to_lowercase())
            } else {
                false
            }
        })
        .take(limit)
        .filter_map(|item| {
            if let Ok((_, listing_id)) = item {
                LISTING.load(deps.storage, listing_id).ok()
            } else {
                None
            }
        })
        .collect();

    to_json_binary(&SearchListingsResponse { listings })
}

fn query_profile(deps: Deps, address: String) -> StdResult<Binary> {
    let addr = deps.api.addr_validate(&address)?;
    let profile_name = PROFILE_NAME.may_load(deps.storage, addr.clone())?;
    
    if let Some(_) = profile_name {
        let profile = PROFILES.load(deps.storage, addr)?;
        to_json_binary(&ProfileResponse { profile: Some(profile) })
    } else {
        to_json_binary(&ProfileResponse { profile: None })
    }
}

#[entry_point]
pub fn migrate(deps: DepsMut, _env: Env, _msg: MigrateMsg) -> Result<Response, ContractError> {
    let ver = get_contract_version(deps.storage)?;
    if ver.contract != CONTRACT_NAME {
        return Err(StdError::generic_err("Can only upgrade from same type").into());
    }
    //canonical way from official docs https://docs.cosmwasm.com/docs/1.0/smart-contracts/migration/#migrate-which-updates-the-version-only-if-newer
    #[allow(clippy::cmp_owned)]
    if ver.version > (*CONTRACT_VERSION).to_string() {
        return Err(StdError::generic_err("Must upgrade from a lower version").into());
    }
    set_contract_version(deps.storage, CONTRACT_NAME, CONTRACT_VERSION)?;
    Ok(Response::default()
        .add_attribute("action", "migration")
        .add_attribute("version", CONTRACT_VERSION)
        .add_attribute("contract", CONTRACT_NAME))
}
