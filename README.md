# Code Error Microservice

A real-time error monitoring and reporting service that integrates with Telex channels, providing prioritized error classification and automated notifications.

## 🎯 Overview

This microservice monitors your codebase for errors, processes them through a message queue system, and delivers prioritized notifications to your Telex channels. It supports real-time monitoring and configurable error thresholds.


### Core Components

- **Error Controller**: Entry point for error processing
- **Categorization Service**: Analyzes and classifies errors
- **ZeroMQ Service**: Handles message queuing and distribution
- **Webhook Service**: Manages Telex channel communication


## 🎯 Features

- **Error Detection**
  - Real-time monitoring
  - Static code analysis (ESLint)
  - Stack trace processing

- **Error Processing**
  - Automatic categorization
  - Priority classification
  - Error enrichment

- **Notification System**
  - Real-time Telex updates
  - Configurable webhooks

## 🚀 Getting Started

### Prerequisites

- Node.js 20.x
- npm 9.x
- ZeroMQ library

### Quick Start

```bash
# Clone repository
git clone https://github.com/telexintegrations/code-error-microservice

# Install dependencies
npm install

# Setup environment
cp .env.example .env

# Start development server
npm run dev
```

## 🏷️ Error Classification

| Severity | Description | Example |
|----------|-------------|---------|
| 🚨 High | System critical | Service crash, DB connection failure |
| 🔔 Medium | Functional issues | API timeout, validation errors |
| ℹ️ Low | Minor problems | Deprecation warnings, style issues |

## 🛠️ Project Structure

```
src/
├── controllers/          # Request handlers
├── services/            # Business logic
├── middlewares/         # HTTP middlewares
├── routes/              # API routes
├── utils/              # Helper functions
└── app.ts              # Application entry
```


## 📦 Core Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| express | ^4.21.2 | Web framework |
| zeromq | ^6.3.0 | Message queue |
| axios | ^1.8.3 | HTTP client |
| typescript | ^5.8.2 | Type support |
| pm2 | latest | Process management |
