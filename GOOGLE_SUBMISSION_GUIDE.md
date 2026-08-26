# Google Search Console Auto-Submission Guide

This guide helps you automatically submit all your website URLs to Google Search Console.

## Quick Start

### Option 1: Using the Python Script (Recommended)

The `submit_to_google.py` script automatically finds all pages on your website and submits them to Google.

#### Prerequisites Setup (One-time setup)

**Step 1: Create Google Cloud Project**
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Name it something like "arunpanthi-seo-tools"

**Step 2: Enable Indexing API**
1. In Google Cloud Console, go to "APIs & Services" → "Library"
2. Search for "Indexing API"
3. Click on it and press "Enable"

**Step 3: Create Service Account**
1. Go to "APIs & Services" → "Credentials"
2. Click "+ CREATE CREDENTIALS" → "Service account"
3. Fill in:
   - Service account name: `search-console-submitter`
   - Description: `Automated URL submission to Google Search Console`
4. Click "Create and continue"
5. Skip role assignment (click "Continue")
6. Click "Done"

**Step 4: Generate JSON Key**
1. Click on the newly created service account
2. Go to "Keys" tab
3. Click "+ ADD KEY" → "Create new key"
4. Select "JSON" format
5. Click "Create"
6. **Save the downloaded JSON file** as `service_account_key.json` in the same directory as this script

**Step 5: Add Service Account to Search Console**
1. Open the `service_account_key.json` file
2. Copy the `client_email` value (looks like: `search-console-submitter@project-id.iam.gserviceaccount.com`)
3. Go to [Google Search Console](https://search.google.com/search-console)
4. Select your property: `arunpanthi.com.np`
5. Go to "Settings" (gear icon) → "Users and permissions"
6. Click "+ Add user"
7. Paste the service account email
8. Select permission level: **"Owner"** (important!)
9. Click "Add"

**Step 6: Install Python Dependencies**
```bash
pip install google-auth google-auth-httplib2 google-api-python-client
```

#### Running the Script

**Test Run (Recommended First)**
```bash
python submit_to_google.py --dry-run
```
This shows all URLs that would be submitted without actually submitting them.

**Submit All URLs**
```bash
python submit_to_google.py
```

**Submit Limited URLs (for testing)**
```bash
python submit_to_google.py --limit 10
```

---

### Option 2: Manual Submission via Sitemap

If you prefer not to use the API, you can submit your sitemap:

**Step 1: Upload Sitemap**
Upload the `sitemap.xml` file to your website root:
```
https://arunpanthi.com.np/sitemap.xml
```

**Step 2: Submit in Search Console**
1. Go to [Google Search Console](https://search.google.com/search-console)
2. Select your property
3. Go to "Sitemaps" in the left menu
4. Enter `sitemap.xml` in the "Add a new sitemap" field
5. Click "Submit"

---

## Understanding the Results

After running the script, you'll see:
- ✓ SUCCESS - URL accepted by Google
- ✗ ERROR - URL rejected (common reasons below)

### Common Errors

**URL_ALREADY_INDEXED**
- The URL is already in Google's index
- This is fine, no action needed

**URL_NOT_FOUND (404)**
- The page doesn't exist
- Fix: Create the page or remove from sitemap

**PERMISSION_DENIED**
- Service account doesn't have access
- Fix: Add service account email as Owner in Search Console

**QUOTA_EXCEEDED**
- Too many requests
- Fix: Wait and run again later (limit: 200 URLs/day)

---

## Monitoring Progress

1. **Immediate**: Check `submission_results.json` for detailed results
2. **24-48 hours**: Check Search Console → "Pages" report
3. **1-2 weeks**: Most URLs should be indexed if valid

### Search Console Reports to Monitor

- **Pages**: Shows indexed vs non-indexed pages
- **Sitemaps**: Shows sitemap processing status
- **URL Inspection**: Check individual URL status

---

## Best Practices

✅ **Do:**
- Run submission after adding new content
- Fix 404 errors before submitting
- Submit sitemaps regularly (weekly/monthly)
- Monitor Search Console for issues

❌ **Don't:**
- Submit the same URLs repeatedly
- Submit broken or low-quality pages
- Exceed API quotas (200 URLs/day)
- Ignore error messages

---

## Troubleshooting

### Script won't run?
```bash
# Check Python version (need 3.6+)
python --version

# Reinstall dependencies
pip install --upgrade google-auth google-auth-httplib2 google-api-python-client
```

### Authentication errors?
1. Verify `service_account_key.json` exists
2. Check service account has Owner permission in Search Console
3. Ensure Indexing API is enabled in Google Cloud

### URLs not indexing?
1. Check robots.txt doesn't block Googlebot
2. Ensure pages don't have `noindex` meta tags
3. Verify pages have quality content
4. Build internal links to orphaned pages
5. Wait 1-4 weeks for Google to process

---

## Additional Resources

- [Google Indexing API Documentation](https://developers.google.com/search/apis/indexing-api/v3/quickstart)
- [Google Search Console Help](https://support.google.com/webmasters/)
- [SEO Best Practices](https://developers.google.com/search/docs/beginner/seo-starter-guide)

---

## Support

If you encounter issues:
1. Check the error message in the script output
2. Review `submission_results.json` for details
3. Verify all setup steps are complete
4. Check Google Search Console for property-level issues
