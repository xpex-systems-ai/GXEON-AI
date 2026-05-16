#!/usr/bin/env python3
"""
═══════════════════════════════════════════════════════════════════════════════
🐍 GXEON Python Bot Example - Free Crypto Signals API
Author: Comandante Sena
Treasury: 0x3955d559055DadB7067054cB6E6f974710345224
═══════════════════════════════════════════════════════════════════════════════

This bot demonstrates how to consume GXEON signals API.
FREE TIER: Limited signals (delayed data, 30/day)
PAID TIER: Real-time signals with full details

Usage:
    python python_bot.py              # Run free tier
    python python_bot.py --upgrade    # Show upgrade info
═══════════════════════════════════════════════════════════════════════════════
"""

import requests
import sys
import json
from datetime import datetime

# Configuration
API_BASE = "https://gxeon-core.up.railway.app"
FREE_ENDPOINT = f"{API_BASE}/v1/signals/free"
PAID_ENDPOINT = f"{API_BASE}/v1/signals"

def get_free_signals():
    """Get free signals (limited, delayed)"""
    try:
        print("🔍 Fetching free signals...")
        response = requests.get(FREE_ENDPOINT, timeout=30)
        data = response.json()
        
        if response.status_code == 200:
            print(f"✅ Received {data['count']} signals\n")
            return data
        elif response.status_code == 429:
            print(f"⚠️ Rate limit reached: {data.get('message')}")
            print(f"💡 Upgrade at: {data.get('upgrade_url')}")
            return None
        else:
            print(f"❌ Error: {data.get('error')}")
            return None
            
    except Exception as e:
        print(f"❌ Request failed: {e}")
        return None

def display_signals(data):
    """Display signals in readable format"""
    if not data or 'signals' not in data:
        print("No signals to display")
        return
    
    print("═══════════════════════════════════════════════════════════")
    print("📊 CRYPTO SIGNALS")
    print("═══════════════════════════════════════════════════════════\n")
    
    for i, signal in enumerate(data['signals'], 1):
        print(f"Signal #{i}")
        print(f"  Pair:      {signal.get('pair', 'N/A')}")
        print(f"  Type:      {signal.get('type', 'N/A')}")
        print(f"  Entry:     {signal.get('entry', 'LOCKED')}")
        print(f"  Confidence: {signal.get('confidence', 'N/A')}")
        
        if signal.get('locked'):
            print(f"  ⚠️  Targets: LOCKED (upgrade to view)")
            print(f"  ⚠️  Stop Loss: LOCKED (upgrade to view)")
        else:
            print(f"  Targets:   {signal.get('targets', 'N/A')}")
            print(f"  Stop Loss: {signal.get('stop_loss', 'N/A')}")
        
        print(f"  Message:   {signal.get('message', '')}")
        print()
    
    # Show upgrade info
    if data.get('rate_limit'):
        remaining = data['rate_limit'].get('remaining', 0)
        total = data['rate_limit'].get('total', 0)
        print(f"📈 Rate Limit: {remaining} remaining (used {total}/30 today)")
    
    if data.get('upgrade'):
        print(f"\n💎 UPGRADE TO REAL-TIME:")
        print(f"   URL: {data['upgrade']['url']}")
        print(f"   Tiers: BASIC (R$ 29.90), PRO (R$ 99.90), ENTERPRISE (R$ 299.90)")

def show_upgrade_info():
    """Show upgrade/payment information"""
    print("""
═══════════════════════════════════════════════════════════════════════════════
💎 UPGRADE TO REAL-TIME SIGNALS
═══════════════════════════════════════════════════════════════════════════════

PAID TIERS:
  • BASIC     - R$ 29.90  - 10 signals/day, full details
  • PRO       - R$ 99.90  - 100 signals/day, real-time, API access
  • ENTERPRISE - R$ 299.90 - 1000 signals/day, dedicated support

HOW TO UPGRADE:
  1. Register: POST https://gxeon-core.up.railway.app/v1/register-agent
     Body: {"email": "your@email.com", "name": "Your Bot", "tier": "BASIC"}
  
  2. Pay via PIX (you'll receive qr_code in response)
  
  3. Get activated automatically after payment confirmation

EXAMPLE UPGRADE REQUEST:
""")
    print(f"curl -X POST {API_BASE}/v1/register-agent \\")
    print("  -H \"Content-Type: application/json\" \\")
    print('  -d \'{"email": "bot@example.com", "name": "MyBot", "tier": "BASIC"}\'')
    print()

def main():
    """Main bot execution"""
    print("╔═══════════════════════════════════════════════════════════════╗")
    print("║     🐍 GXEON Python Bot                                       ║")
    print("║     Free Crypto Signals API                                   ║")
    print("╚═══════════════════════════════════════════════════════════════╝\n")
    
    # Check for upgrade flag
    if "--upgrade" in sys.argv or "-u" in sys.argv:
        show_upgrade_info()
        return
    
    # Get free signals
    data = get_free_signals()
    if data:
        display_signals(data)
    
    print("\n═══════════════════════════════════════════════════════════════")
    print("💡 Run with --upgrade to see upgrade information")
    print("═══════════════════════════════════════════════════════════════\n")

if __name__ == "__main__":
    main()
