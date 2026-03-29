
CREATE TABLE t_p9816260_child_parent_messagi.families (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE t_p9816260_child_parent_messagi.users (
  id SERIAL PRIMARY KEY,
  family_id INTEGER REFERENCES t_p9816260_child_parent_messagi.families(id),
  phone VARCHAR(20) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  role VARCHAR(10) NOT NULL CHECK (role IN ('parent', 'child')),
  avatar VARCHAR(10) DEFAULT '👤',
  age INTEGER,
  is_restricted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE t_p9816260_child_parent_messagi.otp_codes (
  id SERIAL PRIMARY KEY,
  phone VARCHAR(20) NOT NULL,
  code VARCHAR(6) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE t_p9816260_child_parent_messagi.sessions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES t_p9816260_child_parent_messagi.users(id),
  token VARCHAR(64) UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP DEFAULT NOW() + INTERVAL '30 days'
);

CREATE TABLE t_p9816260_child_parent_messagi.messages (
  id SERIAL PRIMARY KEY,
  sender_id INTEGER REFERENCES t_p9816260_child_parent_messagi.users(id),
  receiver_id INTEGER REFERENCES t_p9816260_child_parent_messagi.users(id),
  text TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_messages_sender ON t_p9816260_child_parent_messagi.messages(sender_id);
CREATE INDEX idx_messages_receiver ON t_p9816260_child_parent_messagi.messages(receiver_id);
CREATE INDEX idx_sessions_token ON t_p9816260_child_parent_messagi.sessions(token);
CREATE INDEX idx_otp_phone ON t_p9816260_child_parent_messagi.otp_codes(phone);
