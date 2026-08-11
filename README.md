# FuSang Vision Portal

A minimal frontend for generating personalized Zi Wei Dou Shu charts.
Submits user data to a Cloud Run API which writes results to Supabase.

## Architecture

```
[User] → [GitHub Pages (this app)] → POST → [Cloud Run API] → [Supabase]
```

## Tech Stack

- Pure HTML / CSS / vanilla JavaScript
- No build process, no framework dependencies
- Hosted on GitHub Pages

## File Structure

```
fusang-portal/
├── index.html        Main page (4 views: input / loading / success / error)
├── styles.css        Tiffany teal theme
├── script.js         API client + form logic
├── README.md         This file
└── .nojekyll         Disables Jekyll on GitHub Pages
```

## Configuration

Edit `script.js` line 11:

```javascript
const API_URL = 'https://ziwei-api-dev-354233566852.asia-east1.run.app/calculate';
```

Change this when:
- Switching from dev (`ziwei-api-dev`) to production (`ziwei-api`)
- Using a different region

## Local Testing

Open `index.html` directly in a browser, or use a simple local server:

```bash
# Python 3
python3 -m http.server 8080
# Then open http://localhost:8080
```

Note: `fetch()` to Cloud Run works from `file://` and `localhost` because
Cloud Run is configured with `allow_origins=["*"]`.

## Deploy to GitHub Pages

### Step 1: Create a new GitHub repository

1. Go to https://github.com/new
2. Repository name: `fusang-portal`
3. Visibility: **Public** (required for free GitHub Pages)
4. Do NOT initialize with README (you have one)
5. Click **Create repository**

### Step 2: Push code

```bash
cd fusang-portal
git init
git add .
git commit -m "Initial commit: FuSang Vision Portal v1"
git branch -M main
git remote add origin https://github.com/15789102/fusang-portal.git
git push -u origin main
```

### Step 3: Enable GitHub Pages

1. Go to your repo on GitHub
2. Click **Settings** (top right of repo)
3. Click **Pages** (left sidebar)
4. Under **Source**:
   - Branch: `main`
   - Folder: `/ (root)`
5. Click **Save**
6. Wait 1–2 minutes
7. Your site will be available at:
   ```
   https://portal.fusang-vision.com/
   ```

### Step 4: Verify

Open `https://portal.fusang-vision.com/` and test the form.

## Updating

Make changes locally, then:

```bash
git add .
git commit -m "Description of change"
git push
```

GitHub Pages auto-rebuilds in ~1 minute.

## API Contract

### POST /calculate

**Form fields (multipart/form-data):**
- `user_name` (string)
- `user_email` (string)
- `s_year` (int, 1920–current year)
- `s_month` (int, 1–12)
- `s_day` (int, 1–31)
- `hour_num` (int, 1–13; 13 = late Zi hour)
- `gender` (int, 0=female / 1=male)
- `report_lang` (string, e.g. `en` or `zh-TW`)

**Success response (200):**

```json
{
  "status": "success",
  "chart_session_id": "uuid-...",
  "records_inserted": 1573,
  "lunar_date": "1988年1月10日",
  "hour_branch": "未",
  "duration_seconds": 42.63,
  "message": "排盤完成，資料已寫入 Supabase"
}
```

**Error response (500):**

```json
{
  "status": "error",
  "message": "Error description"
}
```

## Browser Support

- Chrome / Edge / Firefox / Safari (modern versions)
- Mobile Safari / Chrome on Android
- Uses `fetch`, `AbortController`, `clipboard.writeText`, CSS Grid

## Future Roadmap

- [ ] Add Eastern visual accents (Ensō, vermilion seal)
- [ ] Member login (Supabase Auth)
- [ ] Chart history page (view past sessions)
- [ ] Payment integration
- [ ] Multi-language UI

## License

© 2026 FuSang Vision. All rights reserved.
