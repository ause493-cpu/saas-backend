ALTER TABLE users
ADD COLUMN subscription_tier VARCHAR(50) NOT NULL DEFAULT 'free';
