# ⚙️ ArtHub - Server Side (Backend)

This is the backend server for **ArtHub**, a digital marketplace connecting art lovers, collectors, and buyers with artists. The server handles authentication, data management, role-based operations (Admin, Artist, User), and interactive features securely using Node.js, Express, and MongoDB.

---

## 🚀 Purpose and Importance

Traditional art buying is often limited to physical exhibitions. ArtHub's server bridges this gap by enabling:
* **Ecosystem Reliability:** Managing a secure backend that powers emerging and established artists globally.
* **Role-Based Access Control (RBAC):** Providing separate, secure data logic for Users, Artists, and Admins.
* **Optimized Data Pipeline:** Utilizing advanced MongoDB features like Aggregations to safely fetch relational data (e.g., matching artworks with artist information seamlessly).

---

## ✨ Key API Responsibilities

* **Dynamic Artwork Feed:** Serves custom routes with query filters (pagination, artist-specific feeds).
* **Portfolio Control:** Handles secure CRUD operations for uploading, updating, and deleting artworks.
* **Relational Fetching:** Integrates MongoDB `$lookup` and `$aggregate` pipelines to combine art data with profile information from user collections.
* **Cache Management:** Set up proper HTTP headers (`Cache-Control: no-store`) to prevent stale data responses on immediate dashboard updates.

---

## 🛠️ Tech Stack Used

* **Runtime Environment:** Node.js
* **Backend Framework:** Express.js
* **Database:** MongoDB (using native MongoDB driver)
* **Architecture:** RESTful API Design

---

## 📥 Getting Started

Follow these steps to run the server side locally:

### ART-HUB LIVE LINK
# output: https://art-hub-chi.vercel.app
# output: https://art-hub-server-xi.vercel.app