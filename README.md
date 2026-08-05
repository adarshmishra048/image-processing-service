# Image Processing Service

![Node.js](https://img.shields.io/badge/Node.js-22-green)
![Express](https://img.shields.io/badge/Express-5-black)
![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-green)
![License](https://img.shields.io/badge/license-MIT-blue)
![CI](https://github.com/adarshmishra048/image-processing-service/actions/workflows/ci.yml/badge.svg)

A backend API for uploading, transforming, and managing images using **Node.js, Express, MongoDB, Multer, Sharp, and JWT authentication**.

I built this project to understand how real-world image processing services are designed and implemented. Through this project, I explored JWT authentication, request validation, secure file uploads, image transformation pipelines using Sharp, caching strategies for generated images, database design to manage original and transformed images, and API documentation with Swagger, integration testing, and containerization with Docker.

The goal was not only to build a working application but also to learn how to structure a scalable and maintainable backend service.

---

## Live Demo

- **Production API:** https://image-processing-service-8wui.onrender.com
- **Swagger Docs:** https://image-processing-service-8wui.onrender.com/api-docs
- **Health Check:** https://image-processing-service-8wui.onrender.com/livez
- **Readiness Check:** https://image-processing-service-8wui.onrender.com/readyz

---

## Features

### Authentication

- User registration and login with JWT
- Protected image routes

### Image Uploads

- Secure image uploads with Multer
- File type validation
- File size limits

### Image Transformations

- Resize
- Crop
- Rotate
- Flip and mirror
- Grayscale and sepia
- Blur and sharpen
- Convert to JPEG, PNG, or WebP

### Performance

- Reuse previously generated transformed images
- Hash-based filenames for caching
- Pagination for image listing

### Logging

- Structured logging with Winston
- Console and file logging

### Security

- Helmet
- CORS
- Rate limiting
- Centralised error handling
- Joi request validation

### Documentation

- Interactive Swagger / OpenAPI documentation

### Docker Support

- Dockerized Node.js application
- Dockerized MongoDB service
- Persistent storage with Docker volumes
- One-command local setup with Docker Compose

---

## Tech Stack

| Layer            | Technology                 |
| ---------------- | -------------------------- |
| Runtime          | Node.js                    |
| Framework        | Express.js                 |
| Database         | MongoDB + Mongoose         |
| Authentication   | JWT                        |
| Uploads          | Multer                     |
| Image Processing | Sharp                      |
| Validation       | Joi                        |
| Documentation    | Swagger / OpenAPI          |
| Security         | Helmet, express-rate-limit |
| Testing          | Jest, Supertest            |
| Containerization | Docker, Docker Compose     |
| Logging          | Winston                    |

---

## Project Structure

```text
logs/

src/
├── config/
├── controllers/
├── errors/
├── middleware/
├── models/
├── routes/
├── services/
├── utils/
├── validators/
├── app.js
└── server.js

tests/
├── setup.js
├── auth.test.js
├── image.test.js
└── fixtures/
    └── test.jpg

uploads/
├── originals/
└── transformed/
```

---

## Architecture

```text
Client
   │
   ▼
Routes
   │
   ▼
Controllers
   │
   ▼
Services
   ├── Image Service (database logic)
   └── Image Processing Service (Sharp transformations)
   │
   ▼
MongoDB
```

I kept the controllers simple and moved most of the business logic into services. This makes the code easier to maintain, test, and extend.

---

## Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/adarshmishra048/image-processing-service.git
cd image-processing-service
```

### 2. Install dependencies

```bash
npm install
```

### 3. Create a `.env` file

```env
PORT=3000
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
NODE_ENV=development
```

### 4. Run the server

```bash
npm run dev
```

The server will start on:

```text
http://localhost:3000
```

---

## Running with Docker

This project includes Docker support for both the API and MongoDB.

### Docker files

| File                | Purpose                                                  |
| ------------------- | -------------------------------------------------------- |
| Dockerfile          | Builds the production-ready Node.js API image            |
| docker-compose.yml  | Starts the API and MongoDB containers together           |
| .dockerignore       | Excludes unnecessary files from the Docker build context |
| .example.docker.env | Example environment variables for Docker setup           |

### Create the Docker environment file

```bash
cp .example.docker.env .docker.env
```

Update .docker.env with your own values.

### Start the application

```bash
docker compose up --build
```

### Stop the application

```bash
docker compose down
```

### Services

- **API:** http://localhost:3000
- **Swagger:** http://localhost:3000/api-docs
- **MongoDB:** mongodb://localhost:27017

### Environment file

Docker uses a separate environment file:

```text
.docker.env
```

Example:

```env
PORT=3000
MONGODB_URI=mongodb://mongo:27017/image-processing-service
JWT_SECRET=your_jwt_secret
NODE_ENV=production
CLIENT_URL=http://localhost:5173
```

### Persistent storage

Uploaded images are stored in a mounted Docker volume:

```text
uploads/
├── originals/
└── transformed/
```

MongoDB data is also persisted using a named Docker volume.

---

## API Documentation

Swagger UI is available at (Local):

```text
http://localhost:3000/api-docs
```

Production

```text
https://image-processing-service-8wui.onrender.com/api-docs
```

---

## Authentication

After logging in, include the token in the `Authorization` header.

```http
Authorization: Bearer YOUR_TOKEN
```

---

## Quick API Test

### Register

**POST** `/api/auth/register`

```json
{
  "name": "Name",
  "email": "name@example.com",
  "password": "Password123!"
}
```

### Login

**POST** `/api/auth/login`

```json
{
  "email": "name@example.com",
  "password": "Password123!"
}
```

Use the returned JWT token in subsequent requests.

---

## API Endpoints

### Auth

| Method | Endpoint             | Description             |
| ------ | -------------------- | ----------------------- |
| POST   | `/api/auth/register` | Register a new user     |
| POST   | `/api/auth/login`    | Login and receive a JWT |

### Images

| Method | Endpoint                    | Description               |
| ------ | --------------------------- | ------------------------- |
| POST   | `/api/images`               | Upload an image           |
| GET    | `/api/images`               | Get paginated user images |
| GET    | `/api/images/:id`           | Get image metadata        |
| POST   | `/api/images/:id/transform` | Apply transformations     |
| DELETE | `/api/images/:id`           | Delete an image           |

### Health Endpoints

| Method | Endpoint  | Description                    |
| ------ | --------- | ------------------------------ |
| GET    | `/livez`  | Liveness probe                 |
| GET    | `/readyz` | Readiness probe (checks Mongo) |

---

## Upload Example

**POST** `/api/images`

Form-data:

```text
image: cat.jpg
```

---

## Transformation Example

**POST** `/api/images/:id/transform`

```json
{
  "resize": {
    "width": 300,
    "height": 300
  },
  "grayscale": true,
  "format": "webp"
}
```

---

## Supported Transformations

| Transformation | Example                                                       |
| -------------- | ------------------------------------------------------------- |
| Resize         | `{ "resize": { "width": 300, "height": 300 } }`               |
| Crop           | `{ "crop": { "x": 0, "y": 0, "width": 100, "height": 100 } }` |
| Rotate         | `{ "rotate": 90 }`                                            |
| Flip           | `{ "flip": true }`                                            |
| Mirror         | `{ "mirror": true }`                                          |
| Grayscale      | `{ "grayscale": true }`                                       |
| Sepia          | `{ "sepia": true }`                                           |
| Blur           | `{ "blur": 2 }`                                               |
| Sharpen        | `{ "sharpen": true }`                                         |
| Format         | `{ "format": "webp" }`                                        |

---

## Testing

The project includes integration tests for authentication and image uploads.

### Run the tests

```bash
npm test
```

### Current test coverage

- User registration
- User login
- Authenticated image upload

### End-to-end upload flow

The upload test performs a complete end-to-end flow:

1. Register a user
2. Log in and receive a JWT token
3. Upload a real image using Multer
4. Read image metadata with Sharp
5. Save the image document to MongoDB
6. Verify the API response

---

## Storage

For development, images are stored on the local filesystem:

```text
uploads/
├── originals/
└── transformed/
```

> **Note:** Local filesystem storage is used for development. On Render's free tier, local files are ephemeral and may be lost after redeploys or restarts. Cloud storage such as Cloudflare R2 or AWS S3 is recommended for production deployments.

---

## Database Design

### Image Model

- `owner`
- `filename`
- `path`
- `mimetype`
- `size`
- `width`
- `height`
- `isOriginal`
- `originalImage`
- `transformationParams`

Indexes are added to improve pagination and enable faster lookup of transformed images.

---

## Example Response

```json
{
  "success": true,
  "message": "Image transformed successfully.",
  "image": {
    "_id": "6890...",
    "filename": "cat-a1b2c3d4.webp",
    "width": 300,
    "height": 300,
    "isOriginal": false
  }
}
```

---

## Deployment

The application is deployed on **Render** using a **Docker container** and connected to **MongoDB Atlas**.

### Production stack

- Render (Web Service)
- Docker
- MongoDB Atlas
- GitHub Actions CI

### Required environment variables

```env
PORT=3000
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
NODE_ENV=production
```

---

## What I Learned

While building this project, I learned how to:

- Structure an Express application
- Separate controllers and services
- Validate requests correctly
- Secure file uploads
- Process images with Sharp
- Connect original and transformed images
- Implement caching-friendly logic
- Document APIs with Swagger
- Write integration tests with Jest and Supertest
- Containerize a Node.js application with Docker and Docker Compose
- Implement health checks for container platforms
- Add structured logging with Winston 
- Deploy a Dockerized API to Render 
- Connect a production app to MongoDB Atlas 
- Configure CI with GitHub Actions

---

## Author

**Adarsh Mishra**

- GitHub: https://github.com/adarshmishra048

---

## License

This project is licensed under the **MIT License**.

---

## Thank You

Thank you for taking the time to check out this project. I built it as part of my backend development journey, and I hope it is useful for learning, reviewing, or experimenting with image processing APIs.
