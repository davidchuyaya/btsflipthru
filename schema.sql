-- Better Auth Core Schema for D1 (SQLite)

-- User table
CREATE TABLE IF NOT EXISTS user (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'USER',
    email TEXT NOT NULL,
    emailVerified INTEGER NOT NULL DEFAULT 0,
    image TEXT,
    createdAt INTEGER NOT NULL,
    updatedAt INTEGER NOT NULL
);

-- Session table
CREATE TABLE IF NOT EXISTS session (
    id TEXT PRIMARY KEY,
    userId TEXT NOT NULL,
    token TEXT NOT NULL,
    expiresAt INTEGER NOT NULL,
    ipAddress TEXT,
    userAgent TEXT,
    createdAt INTEGER NOT NULL,
    updatedAt INTEGER NOT NULL,
    FOREIGN KEY (userId) REFERENCES user(id) ON DELETE CASCADE
);

-- Account table
CREATE TABLE IF NOT EXISTS account (
    id TEXT PRIMARY KEY,
    userId TEXT NOT NULL,
    accountId TEXT NOT NULL,
    providerId TEXT NOT NULL,
    accessToken TEXT,
    refreshToken TEXT,
    accessTokenExpiresAt INTEGER,
    refreshTokenExpiresAt INTEGER,
    scope TEXT,
    idToken TEXT,
    password TEXT,
    createdAt INTEGER NOT NULL,
    updatedAt INTEGER NOT NULL,
    FOREIGN KEY (userId) REFERENCES user(id) ON DELETE CASCADE
);

-- Verification table
CREATE TABLE IF NOT EXISTS verification (
    id TEXT PRIMARY KEY,
    identifier TEXT NOT NULL,
    value TEXT NOT NULL,
    expiresAt INTEGER NOT NULL,
    createdAt INTEGER NOT NULL,
    updatedAt INTEGER NOT NULL
);

-- Set table
CREATE TABLE IF NOT EXISTS sets (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    releaseDate INTEGER NOT NULL,
    coverImageId TEXT NOT NULL
);

-- Photocard table
CREATE TABLE IF NOT EXISTS photocards (
    id TEXT PRIMARY KEY,
    setId TEXT NOT NULL,
    imageId TEXT,
    backImageId TEXT,
    width INTEGER NOT NULL,
    height INTEGER NOT NULL,
    effects TEXT,
    rm INTEGER NOT NULL DEFAULT 0,
    jimin INTEGER NOT NULL DEFAULT 0,
    jungkook INTEGER NOT NULL DEFAULT 0,
    v INTEGER NOT NULL DEFAULT 0,
    jin INTEGER NOT NULL DEFAULT 0,
    suga INTEGER NOT NULL DEFAULT 0,
    jhope INTEGER NOT NULL DEFAULT 0,
    imageContributorId TEXT NOT NULL,
    updatedAt INTEGER NOT NULL,
    FOREIGN KEY (setId) REFERENCES sets(id) ON DELETE CASCADE
);

-- SetType table
CREATE TABLE IF NOT EXISTS setTypes (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL
);

-- SetToSetType junction table
CREATE TABLE IF NOT EXISTS setToSetTypes (
    setId TEXT NOT NULL,
    setTypeId TEXT NOT NULL,
    PRIMARY KEY (setId, setTypeId),
    FOREIGN KEY (setId) REFERENCES sets(id) ON DELETE CASCADE,
    FOREIGN KEY (setTypeId) REFERENCES setTypes(id) ON DELETE CASCADE
);

-- CardType table
CREATE TABLE IF NOT EXISTS cardTypes (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL
);

-- CardToCardType junction table
CREATE TABLE IF NOT EXISTS cardToCardTypes (
    cardId TEXT NOT NULL,
    cardTypeId TEXT NOT NULL,
    PRIMARY KEY (cardId, cardTypeId),
    FOREIGN KEY (cardId) REFERENCES photocards(id) ON DELETE CASCADE,
    FOREIGN KEY (cardTypeId) REFERENCES cardTypes(id) ON DELETE CASCADE
);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_session_userId ON session(userId);
CREATE INDEX IF NOT EXISTS idx_session_token ON session(token);
CREATE INDEX IF NOT EXISTS idx_account_userId ON account(userId);
CREATE INDEX IF NOT EXISTS idx_user_email ON user(email);
CREATE INDEX IF NOT EXISTS idx_sets_name ON sets(name);
CREATE INDEX IF NOT EXISTS idx_photocards_setId ON photocards(setId);
CREATE INDEX IF NOT EXISTS idx_photocards_rm ON photocards(rm);
CREATE INDEX IF NOT EXISTS idx_photocards_jimin ON photocards(jimin);
CREATE INDEX IF NOT EXISTS idx_photocards_jungkook ON photocards(jungkook);
CREATE INDEX IF NOT EXISTS idx_photocards_v ON photocards(v);
CREATE INDEX IF NOT EXISTS idx_photocards_jin ON photocards(jin);
CREATE INDEX IF NOT EXISTS idx_photocards_suga ON photocards(suga);
CREATE INDEX IF NOT EXISTS idx_photocards_jhope ON photocards(jhope);
CREATE INDEX IF NOT EXISTS idx_setToSetTypes_setId ON setToSetTypes(setId);
CREATE INDEX IF NOT EXISTS idx_setToSetTypes_setTypeId ON setToSetTypes(setTypeId);
CREATE INDEX IF NOT EXISTS idx_cardToCardTypes_cardId ON cardToCardTypes(cardId);
CREATE INDEX IF NOT EXISTS idx_cardToCardTypes_cardTypeId ON cardToCardTypes(cardTypeId);
