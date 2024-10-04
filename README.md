# Talkee Platform

## Overview

Talkee is a dynamic social platform designed for users to create, share, and interact through posts, comments, and reactions. Built with a focus on scalability and user engagement, the platform integrates a robust backend powered by Node.js and MongoDB, alongside real-time communication using WebSockets.

## Technologies Used

- **Node.js**: The server-side JavaScript runtime environment used for building the backend of the application.
- **Express**: A minimal and flexible Node.js web application framework that provides a robust set of features for web and mobile applications.
- **MongoDB**: A NoSQL database that stores data in a flexible, JSON-like format, allowing for easy data retrieval and management.
- **Mongoose**: An ODM (Object Data Modeling) library for MongoDB and Node.js that provides a schema-based solution to model application data.
- **Socket.IO**: A library that enables real-time, bidirectional, and event-based communication between clients and servers.
- **Helmet**: A middleware for securing Express apps by setting various HTTP headers, protecting against common vulnerabilities.
- **Express Validator**: A set of middleware for validating and sanitizing user input, ensuring the integrity and security of the data processed by the API.

## Features

### API Endpoints

The Talkee platform provides a comprehensive set of RESTful API endpoints for managing posts, comments, user interactions, and images. Key endpoints include:

- **Posts**
  - **GET /api/v2/posts**: Retrieve all posts with their authors, reactions, and comments.
  - **GET /api/v2/posts/user**: Get all posts created by the authenticated user.
  - **POST /api/v2/posts**: Create a new post (requires authentication).
  - **PUT /api/v2/posts/:id**: Update an existing post (requires authorization).
  - **DELETE /api/v2/posts/:id**: Delete a post (requires authorization).

- **Comments**
  - **POST /api/v2/posts/:postId/comments**: Add a comment to a specific post.
  - **PUT /api/v2/posts/:postId/comments/:commentId**: Edit an existing comment.
  - **DELETE /api/v2/posts/:postId/comments/:commentId**: Remove a comment from a post.

- **Reactions**
  - **POST /api/v2/posts/:id/react**: React to a post with a specific type (like, funny, sad, angry).
  - **DELETE /api/v2/posts/:id/react**: Remove a reaction from a post.

- **Images**
  - **POST /api/v2/images/upload**: Upload an image (supports types: post, profilePicture, comment).
  - **GET /api/v2/images**: Retrieve images based on type and related ID.

### Real-Time Notifications

Using **Socket.IO**, the platform supports real-time notifications for user interactions, such as:

- New post notifications.
- Comment notifications.
- Reaction notifications.

This ensures that users receive immediate feedback on their interactions, enhancing engagement on the platform.

### Security Enhancements

To bolster security, Talkee implements several best practices:

- **Helmet**: The app uses Helmet to set various HTTP headers, helping to protect against common web vulnerabilities like cross-site scripting (XSS), clickjacking, and content sniffing. This makes it harder for attackers to exploit potential vulnerabilities in the application.

- **Input Validation**: Using **Express Validator**, the API validates incoming requests to ensure that the data conforms to expected formats. This prevents malformed data from being processed and protects against injection attacks.

## Authentication & Authorization

The platform employs a robust authentication system using **JWT (JSON Web Tokens)**. User roles (e.g., admin, user) determine permissions for creating, updating, and deleting posts and comments.

### Example Usage

To interact with the API, users must provide a valid bearer token in the request headers. Here’s an example of how to create a new post using the API:

```bash
POST https://talkee-platform-backend.onrender.com/api/v2/posts \
-H "Authorization: Bearer YOUR_JWT_TOKEN" \
-H "Content-Type: application/json" \
-d '{
    "title": "My First Post",
    "content": "This is the content of my first post.",
    "photos": []
}'
