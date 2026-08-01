# 📦 Inventory & Order Management API

A full-stack Inventory and Order Management system built with Node.js, Express, PostgreSQL, and React.
Project is live in:[Order-Management-Api](https://order-management-api-wsir.vercel.app/)

## Tech Stack
- **Backend** — Node.js, Express.js, PostgreSQL, JWT, Helmet, PDFKit
- **Frontend** — React 18, Vite, Axios

## Features
- JWT authentication + role-based access (user/admin)
- DB-persisted JWT blacklist (logout survives server restarts)
- Product & category management with soft deletes
- Order placement with database transactions and optional `shipping_address`
- Stock audit logging & low-stock alerts
- Comprehensive Analytics & Reports Dashboard
- PDF invoice generation (`GET /orders/:id/invoice`)
- Helmet security headers + auth rate limiting (5 req / 15 min per IP)

---

## Getting Started

### Prerequisites
- Node.js ≥ 18
- PostgreSQL ≥ 14

### 1. Clone the repository
```bash
git clone https://github.com/abhii-navv/Order-Management-API.git
cd Order-Management-API
```

### 2. Configure environment variables
```bash
cp backend/.env.example backend/.env
# Edit backend/.env — generate a strong JWT_SECRET with:
#   openssl rand -hex 64
# Fill in DATABASE_URL with your PostgreSQL connection string.
```

### 3. Install dependencies
```bash
# Backend
cd backend && npm install

# Frontend
cd ../frontend && npm install
```

### 4. Start the development servers
```bash
# Backend (from /backend)
npm run dev        # starts on http://localhost:5000

# Frontend (from /frontend)
npm run dev        # starts on http://localhost:5173
```

---

## API Endpoints

All routes are prefixed with `/api/v1`.

### Auth — `/auth`
| Method | Path                    | Auth  | Description                                  |
|--------|-------------------------|-------|----------------------------------------------|
| POST   | `/auth/register`        | ✗     | Register a new account (role always = user)  |
| POST   | `/auth/login`           | ✗     | Obtain a JWT token                           |
| POST   | `/auth/logout`          | ✓     | Revoke the current token (DB blacklist)      |
| GET    | `/auth/me`              | ✓     | Get current user profile                     |
| POST   | `/auth/change-password` | ✓     | Change account password                      |
| POST   | `/auth/create-admin`    | Admin | Create a new admin user (admin only)         |

> **Rate limiting**: `/auth/register` and `/auth/login` are limited to **5 requests per 15 minutes per IP**.

### Products — `/products`
| Method | Path                      | Auth  | Description                     |
|--------|---------------------------|-------|---------------------------------|
| GET    | `/products`               | ✓     | List products (filterable)      |
| GET    | `/products/:id`           | ✓     | Get a single product            |
| POST   | `/products`               | Admin | Create a product                |
| PUT    | `/products/:id`           | Admin | Update a product                |
| DELETE | `/products/:id`           | Admin | Soft-delete a product           |
| POST   | `/products/:id/restock`   | Admin | Add stock & write audit log     |

### Categories — `/categories`
| Method | Path                | Auth  | Description          |
|--------|---------------------|-------|----------------------|
| GET    | `/categories`       | ✓     | List all categories  |
| POST   | `/categories`       | Admin | Create a category    |
| PUT    | `/categories/:id`   | Admin | Update a category    |
| DELETE | `/categories/:id`   | Admin | Delete a category    |

### Orders — `/orders`
| Method | Path                     | Auth  | Description                                          |
|--------|--------------------------|-------|------------------------------------------------------|
| GET    | `/orders`                | Admin | List all orders                                      |
| GET    | `/orders/my`             | ✓     | List current user's orders                           |
| GET    | `/orders/:id`            | ✓     | Get order details (admin sees any; user sees own)    |
| POST   | `/orders`                | ✓     | Place a new order (optional: `shipping_address`)     |
| PATCH  | `/orders/:id/status`     | Admin | Update order status                                  |
| GET    | `/orders/:id/invoice`    | ✓     | Download PDF invoice (admin sees any; user sees own) |

#### Order request body
```json
{
  "items": [{ "product_id": 1, "quantity": 2 }],
  "notes": "Leave at door",
  "shipping_address": "123 Main St, Mumbai 400001"
}
```
`shipping_address` is **optional**. When provided it is printed on the PDF invoice.

### Reports — `/reports` *(Admin only)*
| Method | Path                        | Description                        |
|--------|-----------------------------|-------------------------------------|
| GET    | `/reports/dashboard-kpis`   | High-level KPI summary             |
| GET    | `/reports/low-stock`        | Products below their threshold     |
| GET    | `/reports/sales`            | Revenue & orders over time         |
| GET    | `/reports/top-products`     | Best-selling products              |

---

## Author
Abhi — [@abhii-navv](https://github.com/abhii-navv)
