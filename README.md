# Restaurant Database System GUI

A modern, web-based interface for managing a restaurant database. This project uses **Node.js**, **Express**, and **MySQL**.

## Features
- **Dashboard**: Visual statistics for customers, restaurants, and orders.
- **Order Management**: Place orders and mark them as "Completed".
- **Data Export**: Download your data as JSON or CSV files.
- **Customer Management**: Add and view customers with automatic validation.
- **Premium UI**: Dark mode design with responsive layout.

## Prerequisites
- **Node.js** (v14 or higher)
- **MySQL Server** (XAMPP **OR** Standard MySQL Community Server)

## Installation

1.  **Clone/Download** this project folder.
2.  Open a terminal in the project directory.
3.  Install the required dependencies:
    ```bash
    npm install
    ```

## Database Setup

### Option A: Using Standard MySQL (No XAMPP)
If you have installed MySQL manually (e.g., MySQL Community Server):

1.  **Open your MySQL Client** (Command Line or Workbench).
2.  **Create the Database**:
    ```sql
    CREATE DATABASE restaurant_system;
    ```
3.  **Import the Schema**:
    - **Command Line**:
      ```bash
      mysql -u root -p restaurant_system < database.sql
      ```
      (Enter your password when prompted).
    - **Workbench**: Open `database.sql` and click the "Execute" (Lightning bolt) button.

4.  **Configure Credentials**:
    - Open the `.env` file in the project folder.
    - Update the settings to match your local MySQL configuration:
      ```ini
      DB_HOST=localhost
      DB_USER=root
      DB_PASSWORD=your_actual_password  <-- CHANGE THIS
      DB_NAME=restaurant_system
      ```

### Option B: Using XAMPP
1.  Start **Apache** and **MySQL** in XAMPP Control Panel.
2.  Go to `http://localhost/phpmyadmin`.
3.  Create a new database named `restaurant_system`.
4.  Import `database.sql` into that database.
5.  Ensure `.env` uses default settings (User: `root`, Password: empty).

## Running the Application

1.  Start the backend server:
    ```bash
    npm start
    ```
2.  You should see: `Server running on http://localhost:3000`.
3.  Open your browser and visit:
    [http://localhost:3000](http://localhost:3000)

## API Endpoints
- `GET /api/customers` - List all customers
- `GET /api/orders` - List all orders
- `POST /api/orders` - Create a new order
- `PUT /api/orders/:id/status` - Update an order status
- `GET /api/export/json` - Export data to JSON
- `GET /api/export/csv` - Export orders to CSV
