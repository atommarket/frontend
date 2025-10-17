#!/bin/bash

# Test setup script to verify all dependencies are installed
# Usage: ./scripts/test-setup.sh

set -e

echo "========================================"
echo "Verifying Solana Marketplace Setup"
echo "========================================"
echo ""

# Check Rust
if command -v rustc &> /dev/null; then
    echo "✓ Rust: $(rustc --version)"
else
    echo "✗ Rust not found. Install from: https://rustup.rs/"
    exit 1
fi

# Check Cargo
if command -v cargo &> /dev/null; then
    echo "✓ Cargo: $(cargo --version)"
else
    echo "✗ Cargo not found"
    exit 1
fi

# Check Solana CLI
if command -v solana &> /dev/null; then
    echo "✓ Solana CLI: $(solana --version)"
else
    echo "✗ Solana CLI not found. Install from: https://docs.solana.com/cli/install-solana-cli-tools"
    exit 1
fi

# Check Anchor
if command -v anchor &> /dev/null; then
    echo "✓ Anchor: $(anchor --version)"
else
    echo "✗ Anchor CLI not found. Install with: cargo install --git https://github.com/coral-xyz/anchor anchor-cli --locked"
    exit 1
fi

# Check Node
if command -v node &> /dev/null; then
    echo "✓ Node.js: $(node --version)"
else
    echo "✗ Node.js not found. Install from: https://nodejs.org/"
    exit 1
fi

# Check npm
if command -v npm &> /dev/null; then
    echo "✓ npm: $(npm --version)"
else
    echo "✗ npm not found"
    exit 1
fi

echo ""
echo "========================================"
echo "All dependencies are installed!"
echo "========================================"
echo ""
echo "Next steps:"
echo "1. npm install"
echo "2. anchor build"
echo "3. anchor test"
echo ""

