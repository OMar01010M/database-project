CREATE DATABASE restaurant_system;
USE restaurant_system;

CREATE TABLE AREA (
    area_id INT,
    area_name VARCHAR(50),
    PRIMARY KEY (area_id)
);

CREATE TABLE CUSTOMER (
    cust_id INT,
    name VARCHAR(100),
    phone VARCHAR(15),
    email VARCHAR(100),
    address VARCHAR(255),
    area_id INT,
    is_premium BOOLEAN,
    PRIMARY KEY (cust_id)
);

CREATE TABLE RESTAURANT (
    rest_id INT,
    rest_name VARCHAR(100),
    area_id INT,
    PRIMARY KEY (rest_id)
);

CREATE TABLE MENU (
    item_id INT,
    rest_id INT,
    item_name VARCHAR(100),
    price DECIMAL(8,2),
    category VARCHAR(30),
    PRIMARY KEY (item_id)
);

CREATE TABLE DELIVERY (
    D_id INT,
    name VARCHAR(100),
    phone VARCHAR(15),
    area_id INT,
    available BOOLEAN,
    PRIMARY KEY (D_id)
);

CREATE TABLE ORDERS (
    order_id INT,
    cust_id INT,
    rest_id INT,
    order_date DATE,
    status VARCHAR(20),
    total DECIMAL(10,2),
    PRIMARY KEY (order_id)
);

CREATE TABLE ORDER_ITEM (
    order_id INT,
    item_id INT,
    quantity INT,
    PRIMARY KEY (order_id, item_id)
);

CREATE TABLE PAYMENT (
    pay_id INT,
    order_id INT,
    amount DECIMAL(10,2),
    status VARCHAR(20),
    pay_date DATE,
    PRIMARY KEY (pay_id)
);

# FOREIGN KEYS

ALTER TABLE CUSTOMER ADD FOREIGN KEY (area_id) REFERENCES AREA(area_id);
ALTER TABLE RESTAURANT ADD FOREIGN KEY (area_id) REFERENCES AREA(area_id);
ALTER TABLE DELIVERY ADD FOREIGN KEY (area_id) REFERENCES AREA(area_id);
ALTER TABLE MENU ADD FOREIGN KEY (rest_id) REFERENCES RESTAURANT(rest_id);
ALTER TABLE ORDERS ADD FOREIGN KEY (cust_id) REFERENCES CUSTOMER(cust_id);
ALTER TABLE ORDERS ADD FOREIGN KEY (rest_id) REFERENCES RESTAURANT(rest_id);
ALTER TABLE ORDER_ITEM ADD FOREIGN KEY (order_id) REFERENCES ORDERS(order_id);
ALTER TABLE ORDER_ITEM ADD FOREIGN KEY (item_id) REFERENCES MENU(item_id);
ALTER TABLE PAYMENT ADD FOREIGN KEY (order_id) REFERENCES ORDERS(order_id);

# SEED DATA

INSERT INTO AREA VALUES (1, 'Nasr City');
INSERT INTO AREA VALUES (2, 'Heliopolis');
INSERT INTO AREA VALUES (3, 'Maadi');
INSERT INTO AREA VALUES (4, 'Zamalek');

INSERT INTO CUSTOMER VALUES (1, 'Ahmed Ali', '010111222', 'ahmed@mail.com', 'Street 10', 1, TRUE);
INSERT INTO CUSTOMER VALUES (2, 'Sara Mohamed', '012333444', 'sara@mail.com', 'Street 5', 2, FALSE);
INSERT INTO CUSTOMER VALUES (3, 'Omar Khaled', '011555666', 'omar@mail.com', 'Street 9', 3, TRUE);
INSERT INTO CUSTOMER VALUES (4, 'Laila Youssef', '015777888', 'laila@mail.com', 'Corniche', 3, TRUE);

INSERT INTO RESTAURANT VALUES (1, 'Pizza House', 1);
INSERT INTO RESTAURANT VALUES (2, 'Burger King', 2);
INSERT INTO RESTAURANT VALUES (3, 'Sushi World', 3);
INSERT INTO RESTAURANT VALUES (4, 'Nile Grill', 4);

INSERT INTO MENU VALUES (1, 1, 'Pepperoni Pizza', 150.00, 'Pizza');
INSERT INTO MENU VALUES (2, 1, 'Cheese Pizza', 120.00, 'Pizza');
INSERT INTO MENU VALUES (3, 1, 'BBQ Chicken', 180.00, 'Pizza');
INSERT INTO MENU VALUES (4, 2, 'Whopper', 90.00, 'Burger');
INSERT INTO MENU VALUES (5, 2, 'Cheeseburger', 50.00, 'Burger');
INSERT INTO MENU VALUES (6, 2, 'Fries', 30.00, 'Sides');
INSERT INTO MENU VALUES (7, 3, 'California Roll', 200.00, 'Sushi');
INSERT INTO MENU VALUES (8, 3, 'Spicy Tuna', 220.00, 'Sushi');
INSERT INTO MENU VALUES (9, 3, 'Sashimi Platter', 350.00, 'Sushi');
INSERT INTO MENU VALUES (10, 4, 'Mixed Grill', 250.00, 'Grill');

# VIEWS

CREATE VIEW CUSTOMER_ORDERS AS
SELECT CUSTOMER.name, ORDERS.order_id, ORDERS.status, ORDERS.total
FROM CUSTOMER
JOIN ORDERS
ON CUSTOMER.cust_id = ORDERS.cust_id;

CREATE VIEW AVAILABLE_DELIVERY AS
SELECT DELIVERY.name, AREA.area_name
FROM DELIVERY
JOIN AREA
ON DELIVERY.area_id = AREA.area_id
WHERE DELIVERY.available = TRUE;

# INDEXES

CREATE INDEX idx_customer_name ON CUSTOMER(name);
CREATE INDEX idx_order_date ON ORDERS(order_date);
CREATE UNIQUE INDEX idx_unique_email ON CUSTOMER(email);

# USER TABLE (For future auth, no grant needed for now)

CREATE TABLE USERS (
    user_id INT PRIMARY KEY,
    username VARCHAR(100),
    password_hash VARCHAR(256)
);

INSERT INTO USERS (user_id, username, password_hash)
VALUES (1, 'omar', SHA2('MyPassword123', 256));


#UPDATE
UPDATE CUSTOMER
SET phone = '010999'
WHERE cust_id = 1;

#DELETE
DELETE FROM MENU
WHERE item_id = 1;

#SELECT
SELECT name, phone, address
FROM CUSTOMER;


#JOINS


#INNER JOIN
SELECT CUSTOMER.name, ORDERS.order_id, ORDERS.total
FROM CUSTOMER
INNER JOIN ORDERS
ON CUSTOMER.cust_id = ORDERS.cust_id;

#LEFT JOIN
SELECT CUSTOMER.name, ORDERS.order_id
FROM CUSTOMER
LEFT JOIN ORDERS
ON CUSTOMER.cust_id = ORDERS.cust_id;

#RIGHT JOIN
SELECT RESTAURANT.rest_name, ORDERS.order_id
FROM ORDERS
RIGHT JOIN RESTAURANT
ON ORDERS.rest_id = RESTAURANT.rest_id;

#FULL JOIN 
SELECT CUSTOMER.name, ORDERS.order_id
FROM CUSTOMER
LEFT JOIN ORDERS
ON CUSTOMER.cust_id = ORDERS.cust_id
UNION
SELECT CUSTOMER.name, ORDERS.order_id
FROM CUSTOMER
RIGHT JOIN ORDERS
ON CUSTOMER.cust_id = ORDERS.cust_id;