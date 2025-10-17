.PHONY: build test deploy clean lint

# Build the program
build:
	anchor build

# Run tests
test:
	anchor test

# Deploy to devnet
deploy-devnet:
	./scripts/deploy.sh devnet

# Deploy to mainnet
deploy-mainnet:
	./scripts/deploy.sh mainnet

# Clean build artifacts
clean:
	anchor clean
	rm -rf target/

# Lint and format
lint:
	npm run lint:fix

# Initialize the marketplace
initialize:
	./scripts/initialize.sh

# Run security audit
audit:
	cargo audit

# Generate IDL
idl:
	anchor idl init --filepath target/idl/solana_marketplace.json $(shell solana address -k target/deploy/solana_marketplace-keypair.json)

# Verify deployment
verify:
	anchor verify -p solana_marketplace $(shell solana address -k target/deploy/solana_marketplace-keypair.json)

# Setup development environment
setup:
	npm install
	anchor build

# Run all checks before deployment
pre-deploy: build test lint
	@echo "All checks passed! Ready to deploy."

