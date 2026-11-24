# CSV Import Review

A React and TypeScript interface backed by a Python FastAPI endpoint. Review a product catalogue, filter validation issues by field, download a CSV error report, and recheck the corrected file.

## Demo walkthrough

1. Select **Try sample CSV**. Expect four rows, one valid row, and three issues.
2. Filter by **price** to isolate the negative price on CSV line 3. **Download error report** exports all issues, including issues outside the current filter.
3. Upload `samples/catalog-fixed.csv` and select **Validate CSV**. All four rows should pass.

## Run on Windows

Install Python 3.12+, Node.js 22.12+ (22 LTS recommended), and Git. Open the extracted project folder in VS Code. Run these commands in PowerShell from the folder that contains this README.

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r backend/requirements-dev.txt
Set-Location frontend
npm.cmd install
npm.cmd run build
Set-Location ..
.\.venv\Scripts\python.exe -m uvicorn backend.main:app --host 127.0.0.1 --port 8000
```

Open http://127.0.0.1:8000. API documentation is at http://127.0.0.1:8000/docs. For frontend development with live reload, keep the API running and use `npm.cmd run dev` from `frontend` in another terminal. Open http://127.0.0.1:5173.

## Verify

Keep the built app running for the browser test. Run these commands in another PowerShell terminal from the project root.

```powershell
.\.venv\Scripts\python.exe -m pytest -q
Set-Location frontend
npx.cmd playwright install chromium
npm.cmd test
```

## Design decisions

- React sends the raw CSV as `text/csv` to `POST /api/validate`. FastAPI returns row counts and issues with a source line, field, and message.
- Validation rules live in Python. The UI uses the response for both the review table and the CSV error report. Error messages use fixed app-defined text and exclude uploaded values.
- The endpoint accepts UTF-8, including a byte order mark, up to 1 MiB. It processes data in memory. Duplicate SKU checks are case-sensitive after trimming and flag later occurrences. Line numbers refer to the first physical line of a record.
- The Playwright workflow covers loading the sample, filtering issues, downloading a report, and rechecking the corrected sample.

## Publish to GitHub

1. Sign in to [GitHub](https://github.com/new). Create a new repository named `catalog-import-review`. Choose **Public** to make it visible to recruiters. Leave **Add a README**, **.gitignore**, and **Choose a license** unselected when creating the repo.
2. Run the commands below from the project root. Replace `YOUR_USERNAME` with your GitHub username. If Git asks for a commit identity, configure your name and email for this repository before rerunning the commit.

```powershell
git init -b main
git add .
git diff --cached --stat
git commit -m "Build CSV import review tool"
git remote add origin https://github.com/YOUR_USERNAME/catalog-import-review.git
git push -u origin main
```

3. Check the repository's **Actions** tab for the build and test results. Review the files on GitHub and pin the repository to your profile. Use only the included synthetic files when capturing a demo.
4. For your LinkedIn Featured section, lead with a screenshot of the error results and link to the repository. Explain the workflow and one decision you can defend in an interview, such as keeping validation rules on the API.

The GitHub repository hosts the source code. The run instructions serve both the frontend and Python backend locally. A public live demo requires hosting that runs Python.

