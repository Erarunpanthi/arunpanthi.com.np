#!/usr/bin/env python3
"""
Google Search Console URL Submission Tool

This script automatically extracts all URLs from your website and submits them
to Google Search Console using the Indexing API.

IMPORTANT: Before running this script, you must:
1. Create a project in Google Cloud Console (https://console.cloud.google.com/)
2. Enable the "Indexing API" for your project
3. Create service account credentials (JSON key file)
4. Share your Search Console property with the service account email

Setup Instructions:
===================

Step 1: Enable Indexing API
- Go to https://console.cloud.google.com/
- Create a new project or select existing one
- Navigate to "APIs & Services" > "Library"
- Search for "Indexing API" and enable it

Step 2: Create Service Account
- Go to "APIs & Services" > "Credentials"
- Click "Create Credentials" > "Service Account"
- Fill in details and click "Create"
- Grant role: "Service Account User"
- Click "Done"

Step 3: Generate JSON Key
- Click on the created service account
- Go to "Keys" tab
- Click "Add Key" > "Create new key"
- Select JSON format and download
- Save as 'service_account_key.json' in same directory as this script

Step 4: Share with Search Console
- Go to Google Search Console (https://search.google.com/search-console)
- Select your property (arunpanthi.com.np)
- Go to "Settings" > "Users and permissions"
- Click "Add user"
- Enter the service account email (from JSON key file)
- Grant "Owner" or "Full" permission

Step 5: Install Required Package
pip install google-auth google-auth-httplib2 google-api-python-client

Step 6: Run the Script
python submit_to_google.py

Usage:
======
python submit_to_google.py [--dry-run] [--limit N]

Options:
  --dry-run    Show URLs that would be submitted without actually submitting
  --limit N    Limit the number of URLs to submit (for testing)
"""

import os
import sys
import json
import argparse
from pathlib import Path
from datetime import datetime

# Try to import Google libraries
try:
    from google.oauth2 import service_account
    from googleapiclient.discovery import build
    from googleapiclient.errors import HttpError
except ImportError:
    print("ERROR: Required Google libraries not installed.")
    print("Please install them using:")
    print("  pip install google-auth google-auth-httplib2 google-api-python-client")
    sys.exit(1)


# Configuration
SITE_URL = "https://arunpanthi.com.np"
SERVICE_ACCOUNT_FILE = "service_account_key.json"
WEBSITE_ROOT = Path(__file__).parent.absolute()


def extract_urls_from_html_files():
    """Extract all valid URLs from HTML files in the website."""
    urls = set()
    
    # Add homepage
    urls.add(f"{SITE_URL}/")
    
    # Find all HTML files
    html_files = list(WEBSITE_ROOT.rglob("*.html"))
    
    print(f"Found {len(html_files)} HTML files")
    
    for html_file in html_files:
        try:
            # Get relative path from website root
            rel_path = html_file.relative_to(WEBSITE_ROOT)
            
            # Convert to URL path
            url_path = "/" + str(rel_path).replace("\\", "/")
            
            # Handle index.html files
            if url_path.endswith("/index.html"):
                url_path = url_path[:-10]  # Remove 'index.html'
                if not url_path.endswith("/"):
                    url_path += "/"
            
            # Construct full URL
            full_url = f"{SITE_URL}{url_path}"
            
            # Clean up double slashes (except in https://)
            while "//" in full_url[8:]:  # Skip https:// part
                full_url = full_url.replace("//", "/", 8)
            
            urls.add(full_url)
            
        except Exception as e:
            print(f"Warning: Could not process {html_file}: {e}")
    
    # Also check for directories that might serve as pages
    for dir_path in WEBSITE_ROOT.rglob("*"):
        if dir_path.is_dir():
            rel_path = dir_path.relative_to(WEBSITE_ROOT)
            url_path = "/" + str(rel_path).replace("\\", "/")
            
            # Skip hidden directories and common non-content directories
            if any(part.startswith('.') for part in rel_path.parts):
                continue
            if any(part in ['__pycache__', 'node_modules', '.git'] for part in rel_path.parts):
                continue
            
            full_url = f"{SITE_URL}{url_path}/"
            
            # Clean up double slashes
            while "//" in full_url[8:]:
                full_url = full_url.replace("//", "/", 8)
            
            urls.add(full_url)
    
    return sorted(urls)


def authenticate_service_account(key_file):
    """Authenticate using service account credentials."""
    if not os.path.exists(key_file):
        print(f"ERROR: Service account key file '{key_file}' not found!")
        print("\nPlease follow the setup instructions in the script header.")
        return None
    
    try:
        credentials = service_account.Credentials.from_service_account_file(
            key_file,
            scopes=["https://www.googleapis.com/auth/indexing"]
        )
        return credentials
    except Exception as e:
        print(f"ERROR: Failed to authenticate: {e}")
        return None


def submit_url_to_google(service, url):
    """Submit a single URL to Google Indexing API."""
    try:
        response = service.urlNotifications().publish(
            body={"type": "URL_UPDATED", "url": url}
        ).execute()
        return True, response
    except HttpError as e:
        error_detail = e.error_details[0] if e.error_details else str(e)
        return False, error_detail
    except Exception as e:
        return False, str(e)


def main():
    parser = argparse.ArgumentParser(
        description="Submit website URLs to Google Search Console",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Show URLs that would be submitted without actually submitting"
    )
    parser.add_argument(
        "--limit",
        type=int,
        default=None,
        help="Limit the number of URLs to submit (for testing)"
    )
    parser.add_argument(
        "--key-file",
        type=str,
        default=SERVICE_ACCOUNT_FILE,
        help="Path to service account key file"
    )
    
    args = parser.parse_args()
    
    print("=" * 70)
    print("Google Search Console URL Submission Tool")
    print("=" * 70)
    print(f"Website: {SITE_URL}")
    print(f"Date: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print()
    
    # Extract URLs
    print("Step 1: Extracting URLs from website...")
    urls = extract_urls_from_html_files()
    print(f"Found {len(urls)} unique URLs")
    
    if args.limit:
        urls = urls[:args.limit]
        print(f"Limited to {len(urls)} URLs for testing")
    
    if args.dry_run:
        print("\n" + "=" * 70)
        print("DRY RUN MODE - No URLs will be submitted")
        print("=" * 70)
        print("\nURLs that would be submitted:")
        for i, url in enumerate(urls, 1):
            print(f"  {i}. {url}")
        return
    
    # Authenticate
    print("\nStep 2: Authenticating with Google...")
    credentials = authenticate_service_account(args.key_file)
    if not credentials:
        print("\nSetup Instructions:")
        print("-" * 70)
        print("1. Create a Google Cloud project at https://console.cloud.google.com/")
        print("2. Enable the 'Indexing API'")
        print("3. Create a service account and download JSON key")
        print("4. Save the JSON key as 'service_account_key.json'")
        print("5. Add the service account email to Search Console as Owner")
        print("-" * 70)
        sys.exit(1)
    
    # Build service
    service = build("indexing", "v3", credentials=credentials)
    print("Authentication successful!")
    
    # Submit URLs
    print(f"\nStep 3: Submitting {len(urls)} URLs to Google...")
    print("-" * 70)
    
    success_count = 0
    error_count = 0
    results = []
    
    for i, url in enumerate(urls, 1):
        print(f"[{i}/{len(urls)}] Submitting: {url}")
        
        success, response = submit_url_to_google(service, url)
        
        if success:
            success_count += 1
            status = "✓ SUCCESS"
            print(f"         {status}")
        else:
            error_count += 1
            status = "✗ ERROR"
            print(f"         {status}: {response}")
        
        results.append({
            "url": url,
            "success": success,
            "response": str(response)
        })
        
        # Small delay to avoid rate limiting
        if i % 10 == 0:
            print("  (Pausing briefly to avoid rate limits...)")
            import time
            time.sleep(1)
    
    # Summary
    print("\n" + "=" * 70)
    print("SUBMISSION SUMMARY")
    print("=" * 70)
    print(f"Total URLs processed: {len(urls)}")
    print(f"Successful submissions: {success_count}")
    print(f"Failed submissions: {error_count}")
    print(f"Success rate: {(success_count/len(urls)*100):.1f}%")
    
    # Save results
    results_file = "submission_results.json"
    with open(results_file, "w") as f:
        json.dump({
            "timestamp": datetime.now().isoformat(),
            "site": SITE_URL,
            "total": len(urls),
            "success": success_count,
            "errors": error_count,
            "results": results
        }, f, indent=2)
    
    print(f"\nDetailed results saved to: {results_file}")
    print("\nNote: Google may take a few minutes to several days to process")
    print("submitted URLs. Check Google Search Console for status updates.")
    print("=" * 70)


if __name__ == "__main__":
    main()
