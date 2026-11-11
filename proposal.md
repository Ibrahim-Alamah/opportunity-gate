# Graduation Project Proposal: Opportunity Gate – بوّابة الفرص

## 1. Project Overview
**Opportunity Gate (بوّابة الفرص)** is a bilingual (Arabic and English) web application designed for Yemeni students to access verified scholarships, free courses, and internships from official sources. It provides a lightweight, offline-capable platform tailored to local connectivity constraints.

## 2. Problem Statement
Yemeni students struggle to find reliable educational and training opportunities. Official announcements are scattered across websites and social media, often mixed with unverified or expired links. Furthermore, English-only portals create language barriers, while frequent internet outages in Yemen hinder browsing heavy websites, causing students to miss critical deadlines.

## 3. Target Users
- **Yemeni University Students:** Undergraduate and graduate students seeking scholarships, exchange programs, and specialized training.
- **Yemeni High School Graduates:** Applicants looking for undergraduate scholarships and foundational courses.
- **Recent Yemeni Graduates:** Job seekers pursuing internships and free certification courses.

## 4. Project Objectives
1. Centralize verified scholarships, free courses, and internships in one accessible web platform.
2. Provide a bilingual interface supporting Arabic (RTL) and English (LTR).
3. Enable fast search and filtering by field of study, country, and deadline.
4. Highlight approaching deadlines by displaying remaining days directly inside the application.
5. Ensure offline access to previously cached opportunities and saved favorites.

## 5. User Stories
1. **As a** Yemeni university student, **I want** to filter opportunities by field of study, country, and deadline, **so that** I can quickly find relevant programs.
2. **As a** student preferring Arabic, **I want** to switch between Arabic and English, **so that** I can clearly understand eligibility requirements.
3. **As a** student with unstable internet, **I want** to view cached opportunities and my saved favorites offline, **so that** I can review details during outages.
4. **As a** busy applicant, **I want** to see opportunities with approaching deadlines and the remaining days inside the app, **so that** I can prioritize urgent applications.
5. **As a** cautious applicant, **I want** to check each opportunity's official source link and verification date, **so that** I can verify its authenticity before applying.

## 6. Core Features
- **Opportunity Listing:** Structured display of scholarships, free courses, and internships.
- **Search and Filtering:** Keyword search and filtering by field of study, country, and deadline.
- **Opportunity Details Page:** Comprehensive view of requirements, deadline, verification date, and official source link.
- **Favorites Management:** Local bookmarking of preferred opportunities accessible offline.
- **In-App Deadline Indicators:** Display of approaching deadlines with calculated remaining days inside the app.
- **Bilingual Support:** Full Arabic and English interface localization.
- **Offline Support:** Viewing previously cached opportunity data and saved favorites without internet connectivity.

## 7. Project Scope and Limitations
- **In Scope:** Displaying verified opportunities, search and filtering, detail pages, local favorites, in-app approaching deadline countdowns, Arabic/English localization, and offline access to cached data and favorites.
- **Out of Scope:** User accounts, direct in-app application submission, email or push notifications, and automated web scraping.

## 8. Data Integrity
All opportunities must rely exclusively on official sources and include a valid **official source URL** and **verification date**. Inventing information, relying on AI model memory, or presenting mock/trial data as real opportunities is strictly prohibited.

## 9. Technology and Development Approach
The project uses a clean, lightweight stack without unnecessary frameworks or libraries:
- **Frontend:** **React** and **TypeScript** for type-safe components and pages, structured and styled with **HTML5** and **CSS3**.
- **Build Tooling:** **Vite** for development and bundling, configured with the proper deployment `base` path for **GitHub Pages** compatibility. All dependencies are installed locally; loading libraries from CDNs is prohibited.
- **Data & Offline Storage:** Static **JSON** for opportunity data, **LocalStorage** for favorites and language settings, and a **Service Worker** for caching data and assets offline.
- **Version Control & Hosting:** **Git** and **GitHub** for source control, deployed via **GitHub Pages**.
