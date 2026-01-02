-- Better Auth Core Schema for D1 (SQLite)

-- User table
CREATE TABLE IF NOT EXISTS user (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    role INTEGER NOT NULL DEFAULT 0,
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

-- Collection table
CREATE TABLE IF NOT EXISTS collections (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    releaseDate INTEGER NOT NULL,
    collectionTypes TEXT NOT NULL,
    version TEXT,
    versionOrder INTEGER
);

-- CardSize table
CREATE TABLE IF NOT EXISTS cardSizes (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    width INTEGER NOT NULL,
    height INTEGER NOT NULL
);

-- Photocard table
CREATE TABLE IF NOT EXISTS photocards (
    id INTEGER PRIMARY KEY,
    collectionId INTEGER NOT NULL,
    imageId TEXT,
    backImageId TEXT,
    backImageType INTEGER NOT NULL DEFAULT 0,
    cardType INTEGER,
    sizeId INTEGER NOT NULL,
    modTemporary INTEGER NOT NULL DEFAULT 0,
    adminTemporary INTEGER NOT NULL DEFAULT 0,
    exclusiveCountry INTEGER NOT NULL,
    effects INTEGER NOT NULL DEFAULT 0,
    rm INTEGER NOT NULL DEFAULT 0,
    jimin INTEGER NOT NULL DEFAULT 0,
    jungkook INTEGER NOT NULL DEFAULT 0,
    v INTEGER NOT NULL DEFAULT 0,
    jin INTEGER NOT NULL DEFAULT 0,
    suga INTEGER NOT NULL DEFAULT 0,
    jhope INTEGER NOT NULL DEFAULT 0,
    imageContributorId TEXT NOT NULL,
    updatedAt INTEGER NOT NULL
);

-- CollectionType table
CREATE TABLE IF NOT EXISTS collectionTypes (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL
);

-- CardType table
CREATE TABLE IF NOT EXISTS cardTypes (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL
);

-- Report table
CREATE TABLE IF NOT EXISTS reports (
    id INTEGER PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    imageId TEXT,
    userId TEXT,
    userEmail TEXT,
    url TEXT NOT NULL,
    userAgent TEXT,
    createdAt INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS creations (
    id INTEGER PRIMARY KEY,
    contributorId TEXT NOT NULL,
    imageId INTEGER NOT NULL,
    name TEXT NOT NULL,
    type INTEGER NOT NULL,
    width INTEGER NOT NULL,
    height INTEGER NOT NULL,
    collectionId INTEGER,
    createdAt INTEGER NOT NULL,
    FOREIGN KEY (contributorId) REFERENCES user(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS user_data (
    userId TEXT PRIMARY KEY,
    username TEXT NOT NULL,
    description TEXT,
    armySince INTEGER,
    bcdId TEXT,
    blueskyId TEXT,
    twitterId TEXT,
    intagramId TEXT,
    discordId TEXT,
    imageId TEXT,
    profilePhotocardId INTEGER,
    bias INTEGER,
    disableCursor INTEGER NOT NULL DEFAULT 0,
    disableEffects INTEGER NOT NULL DEFAULT 0,
    spotifyPlaylist TEXT,
    contributions INTEGER NOT NULL DEFAULT 0,
    uploadedCreations INTEGER NOT NULL DEFAULT 0,
    friends TEXT,
    binders TEXT,
    FOREIGN KEY (userId) REFERENCES user(id) ON DELETE CASCADE
);

-- Separate tables since rows might exceed 2MB limit
CREATE TABLE IF NOT EXISTS user_photocards (
    userId TEXT PRIMARY KEY,
    photocards TEXT NOT NULL,
    FOREIGN KEY (userId) REFERENCES user(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS user_wishlist (
    userId TEXT PRIMARY KEY,
    wishlist TEXT NOT NULL,
    FOREIGN KEY (userId) REFERENCES user(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS user_saved_creations (
    userId TEXT PRIMARY KEY,
    creations TEXT NOT NULL,
    FOREIGN KEY (userId) REFERENCES user(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS user_binders (
    id INTEGER PRIMARY KEY,
    userId TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    coverId TEXT,
    createdAt INTEGER NOT NULL,
    lastUpdatedAt INTEGER NOT NULL,
    binder TEXT,
    FOREIGN KEY (userId) REFERENCES user(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS photocard_data (
    photocardId INTEGER PRIMARY KEY,
    numOwners INTEGER NOT NULL DEFAULT 0,
    numWishlists INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY (photocardId) REFERENCES photocards(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS creation_data (
    creationId INTEGER PRIMARY KEY,
    numSaves INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY (creationId) REFERENCES creations(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS db_data (
    numUsers INTEGER NOT NULL DEFAULT 0,
    numPhotocards INTEGER NOT NULL DEFAULT 0,
    numPhotocardsWithoutImages INTEGER NOT NULL DEFAULT 0,
    numBinders INTEGER NOT NULL DEFAULT 0,
    numCreations INTEGER NOT NULL DEFAULT 0
);

-- Initialize db_data with a single row if it doesn't exist
INSERT INTO db_data (numUsers, numPhotocards, numPhotocardsWithoutImages, numBinders, numCreations)
SELECT 0, 0, 0, 0, 0
WHERE NOT EXISTS (SELECT 1 FROM db_data);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_session_userId ON session(userId);
CREATE INDEX IF NOT EXISTS idx_session_token ON session(token);
CREATE INDEX IF NOT EXISTS idx_account_userId ON account(userId);
CREATE INDEX IF NOT EXISTS idx_user_email ON user(email);

CREATE INDEX IF NOT EXISTS idx_photocards_collectionId ON photocards(collectionId);
CREATE INDEX IF NOT EXISTS idx_photocards_cardType ON photocards(cardType);
CREATE INDEX IF NOT EXISTS idx_photocards_sizeId ON photocards(sizeId);
CREATE INDEX IF NOT EXISTS idx_photocards_modTemporary ON photocards(modTemporary);
CREATE INDEX IF NOT EXISTS idx_photocards_adminTemporary ON photocards(adminTemporary);
CREATE INDEX IF NOT EXISTS idx_photocards_exclusiveCountry ON photocards(exclusiveCountry);
CREATE INDEX IF NOT EXISTS idx_photocards_rm ON photocards(rm);
CREATE INDEX IF NOT EXISTS idx_photocards_jimin ON photocards(jimin);
CREATE INDEX IF NOT EXISTS idx_photocards_jungkook ON photocards(jungkook);
CREATE INDEX IF NOT EXISTS idx_photocards_v ON photocards(v);
CREATE INDEX IF NOT EXISTS idx_photocards_jin ON photocards(jin);
CREATE INDEX IF NOT EXISTS idx_photocards_suga ON photocards(suga);
CREATE INDEX IF NOT EXISTS idx_photocards_jhope ON photocards(jhope);
CREATE INDEX IF NOT EXISTS idx_photocards_contributorId ON photocards(imageContributorId);
CREATE INDEX IF NOT EXISTS idx_photocards_updatedAt ON photocards(updatedAt);
CREATE INDEX IF NOT EXISTS idx_reports_userId ON reports(userId);
CREATE INDEX IF NOT EXISTS idx_reports_createdAt ON reports(createdAt);
CREATE INDEX IF NOT EXISTS idx_creations_contributorId ON creations(contributorId);
CREATE INDEX IF NOT EXISTS idx_creations_name ON creations(name);
CREATE INDEX IF NOT EXISTS idx_creations_type ON creations(type);
CREATE INDEX IF NOT EXISTS idx_creations_width ON creations(width);
CREATE INDEX IF NOT EXISTS idx_creations_height ON creations(height);
CREATE INDEX IF NOT EXISTS idx_creations_collectionId ON creations(collectionId);
CREATE INDEX IF NOT EXISTS idx_creations_createdAt ON creations(createdAt);
CREATE INDEX IF NOT EXISTS idx_user_data_username ON user_data(username);
CREATE INDEX IF NOT EXISTS idx_user_data_contributions ON user_data(contributions);
CREATE INDEX IF NOT EXISTS idx_user_data_uploadedCreations ON user_data(uploadedCreations);
CREATE INDEX IF NOT EXISTS idx_user_binders_createdAt ON user_binders(createdAt);
CREATE INDEX IF NOT EXISTS idx_photocard_data_numOwners ON photocard_data(numOwners);
CREATE INDEX IF NOT EXISTS idx_photocard_data_numWishlists ON photocard_data(numWishlists);
CREATE INDEX IF NOT EXISTS idx_creation_data_numSaves ON creation_data(numSaves);

-- Triggers for maintaining counters and data integrity

-- Trigger 1: Update numPhotocards when photocard is created
CREATE TRIGGER IF NOT EXISTS trg_photocard_insert
AFTER INSERT ON photocards
BEGIN
    UPDATE db_data SET numPhotocards = numPhotocards + 1;
END;

-- Trigger 2: Update numPhotocards when photocard is deleted
CREATE TRIGGER IF NOT EXISTS trg_photocard_delete
AFTER DELETE ON photocards
BEGIN
    UPDATE db_data SET numPhotocards = numPhotocards - 1;
END;

-- Trigger 3: Update contributions when photocard is created
CREATE TRIGGER IF NOT EXISTS trg_photocard_insert_contributions
AFTER INSERT ON photocards
BEGIN
    UPDATE user_data 
    SET contributions = contributions + 1 
    WHERE userId = NEW.imageContributorId;
END;

-- Trigger 4: Update contributions when photocard is deleted
CREATE TRIGGER IF NOT EXISTS trg_photocard_delete_contributions
AFTER DELETE ON photocards
BEGIN
    UPDATE user_data 
    SET contributions = contributions - 1 
    WHERE userId = OLD.imageContributorId;
END;

-- Trigger 5: Update contributions when imageContributorId changes
CREATE TRIGGER IF NOT EXISTS trg_photocard_update_contributions
AFTER UPDATE OF imageContributorId ON photocards
WHEN OLD.imageContributorId != NEW.imageContributorId
BEGIN
    UPDATE user_data 
    SET contributions = contributions - 1 
    WHERE userId = OLD.imageContributorId;
    
    UPDATE user_data 
    SET contributions = contributions + 1 
    WHERE userId = NEW.imageContributorId;
END;

-- Trigger 6: Update numUsers when user is created
CREATE TRIGGER IF NOT EXISTS trg_user_insert
AFTER INSERT ON user
BEGIN
    UPDATE db_data SET numUsers = numUsers + 1;
    
    -- Create user_data with email as default username
    INSERT INTO user_data (
        userId, 
        username, 
        contributions, 
        uploadedCreations, 
        disableCursor, 
        disableEffects
    )
    VALUES (
        NEW.id, 
        NEW.email, 
        0, 
        0, 
        0, 
        0
    );
    
    -- Create user_photocards
    INSERT INTO user_photocards (userId, photocards)
    VALUES (NEW.id, '');
    
    -- Create user_wishlist
    INSERT INTO user_wishlist (userId, wishlist)
    VALUES (NEW.id, '');
    
    -- Create user_saved_creations
    INSERT INTO user_saved_creations (userId, creations)
    VALUES (NEW.id, '');
END;

-- Trigger 7: Update numUsers when user is deleted
CREATE TRIGGER IF NOT EXISTS trg_user_delete
AFTER DELETE ON user
BEGIN
    UPDATE db_data SET numUsers = numUsers - 1;
END;

-- Trigger 8: Update numBinders when binder is created
CREATE TRIGGER IF NOT EXISTS trg_binder_insert
AFTER INSERT ON user_binders
BEGIN
    UPDATE db_data SET numBinders = numBinders + 1;
END;

-- Trigger 9: Update numBinders when binder is deleted
CREATE TRIGGER IF NOT EXISTS trg_binder_delete
AFTER DELETE ON user_binders
BEGIN
    UPDATE db_data SET numBinders = numBinders - 1;
END;

-- Trigger 10: Update numCreations when creation is created
CREATE TRIGGER IF NOT EXISTS trg_creation_insert
AFTER INSERT ON creations
BEGIN
    UPDATE db_data SET numCreations = numCreations + 1;
    
    -- Create creation_data entry
    INSERT INTO creation_data (creationId, numSaves)
    VALUES (NEW.id, 0);
END;

-- Trigger 11: Update numCreations when creation is deleted
CREATE TRIGGER IF NOT EXISTS trg_creation_delete
AFTER DELETE ON creations
BEGIN
    UPDATE db_data SET numCreations = numCreations - 1;
END;

-- Trigger 12: Create photocard_data entry when photocard is created
CREATE TRIGGER IF NOT EXISTS trg_photocard_data_insert
AFTER INSERT ON photocards
BEGIN
    INSERT INTO photocard_data (photocardId, numOwners, numWishlists)
    VALUES (NEW.id, 0, 0);
END;

-- Trigger 13: Update numPhotocardsWithoutImages when photocard is inserted without imageId
CREATE TRIGGER IF NOT EXISTS trg_photocard_insert_no_image
AFTER INSERT ON photocards
WHEN NEW.imageId IS NULL
BEGIN
    UPDATE db_data SET numPhotocardsWithoutImages = numPhotocardsWithoutImages + 1;
END;

-- Trigger 14: Update numPhotocardsWithoutImages when photocard is deleted
CREATE TRIGGER IF NOT EXISTS trg_photocard_delete_no_image
AFTER DELETE ON photocards
WHEN OLD.imageId IS NULL
BEGIN
    UPDATE db_data SET numPhotocardsWithoutImages = numPhotocardsWithoutImages - 1;
END;

-- Trigger 15: Update numPhotocardsWithoutImages when imageId is added to photocard
CREATE TRIGGER IF NOT EXISTS trg_photocard_update_image
AFTER UPDATE OF imageId ON photocards
WHEN OLD.imageId IS NULL AND NEW.imageId IS NOT NULL
BEGIN
    UPDATE db_data SET numPhotocardsWithoutImages = numPhotocardsWithoutImages - 1;
END;