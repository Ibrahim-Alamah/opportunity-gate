# Project Rules – Opportunity Gate (بوّابة الفرص)

> **Authoritative Reference:** `proposal.md` is the approved reference document for this project. All implementation decisions must remain strictly aligned with it.

## 1. Project Identity
- **Project Name:** Opportunity Gate – بوّابة الفرص.
- **Purpose:** A bilingual (Arabic and English) web platform designed for Yemeni students (university students, high school graduates, and recent graduates) to search and access verified scholarships, free courses, and internships.

## 2. Technology
- **Frontend & Build Tooling:** React + TypeScript + Vite.
- **Markup & Styling:** HTML5 and CSS3.
- **Data Storage:** Static JSON files for opportunity data.
- **Client-Side Persistence:** `LocalStorage` for saving favorites and language preferences.
- **Offline Capability:** Service Worker for offline access to cached opportunity data and saved favorites.
- **Version Control & Deployment:** Git, GitHub, and GitHub Pages (configured with the appropriate Vite `base` path).
- **Dependency Policy:** Loading libraries or assets from external CDNs is strictly prohibited. All dependencies must be installed locally.

## 3. Language and Interface
- **Default Language:** Arabic (`ar`) is the default language of the application.
- **Bilingual Support:** Full localization support for both Arabic and English (`en`).
- **Text Direction:** Full layout support for Right-to-Left (`RTL`) in Arabic and Left-to-Right (`LTR`) in English.
- **Responsive Design:** The user interface must work seamlessly and remain fully usable on screens starting from `360px` width and up.
- **Usability & Typography:** Prioritize ease of use, clean navigation, and high legibility/clarity for Arabic typography.

## 4. Data Integrity
- **No Fabrication:** Inventing opportunities, details, requirements, or URLs (including relying on unverified AI model memory) is strictly prohibited.
- **Mandatory Verification Metadata:** Every opportunity entry must include a valid **official source URL** and a **verification date**.
- **Unverified Information:** Any unverified information must never be treated or presented as reliable data.
- **No Mock Data as Real:** Mock, placeholder, or trial data must never be presented or used as real opportunities.

## 5. Security
- **File Deletion Protection:** Deleting any files or directories without the user's explicit prior approval is strictly prohibited.
- **Git Safety:** Running destructive Git deletion or reset commands (e.g., `git reset --hard`, `git clean -fd`, force pushes, or branch deletions) is strictly prohibited.
- **Secrets Protection:** Reading secret files (such as `.env`), API keys, tokens, or passwords is strictly prohibited.
- **No Hardcoded Credentials:** Never place secrets, API keys, or credentials inside source code or commit them to Git.
- **User Data & XSS Prevention:** Handle all user input and stored data safely and ensure strict protection against Cross-Site Scripting (XSS).
- **External Links:** Do not use or link to untrusted external URLs; only official and verified source links are permitted.

## 6. Development Workflow
- **Plan First:** Do not execute major changes before presenting an implementation plan and receiving user approval.
- **Strict Task Boundaries:** Implement only the explicitly requested tasks; do not add unrequested features or scope creep.
- **Verification & Testing:** Test and verify all changes before considering any task complete.
- **Protected Approved Files:** Do not modify previously approved files without clear necessity and explicit user approval.
- **Stage Commits:** Create a Git commit after each phase is completed and reviewed.

## 7. Project Scope
- **No Accounts or In-App Submissions:** Do not add user registration, login/accounts, or in-app application submission forms.
- **No External Notifications:** Do not implement email notifications or push notifications.
- **Deadline Indicators:** Deadline tracking is strictly limited to in-app deadline indicators showing approaching deadlines and remaining days.
- **Core Requirements First:** Do not implement any optional or extra features before all core project requirements are fully completed.

