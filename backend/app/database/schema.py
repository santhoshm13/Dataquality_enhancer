"""
PostgreSQL Schema Definitions for Supabase PostgreSQL
"""

CREATE_TABLES_SQL = """
CREATE TABLE IF NOT EXISTS products (
    id SERIAL PRIMARY KEY,
    mfg_part_num VARCHAR(255) NOT NULL,
    raw_description TEXT,
    raw_brand_e1 VARCHAR(255),
    raw_brand_unilog VARCHAR(255),
    raw_brand_dib VARCHAR(255),
    raw_manufacturer VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS product_enrichment (
    id SERIAL PRIMARY KEY,
    product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
    manufacturer VARCHAR(255),
    brand VARCHAR(255),
    department VARCHAR(255),
    class VARCHAR(255),
    category VARCHAR(255),
    confidence_score DOUBLE PRECISION DEFAULT 0.0,
    status VARCHAR(50) DEFAULT 'RAW',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS product_attributes (
    id SERIAL PRIMARY KEY,
    product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
    attribute_name VARCHAR(255) NOT NULL,
    attribute_value TEXT,
    uom VARCHAR(50),
    confidence DOUBLE PRECISION DEFAULT 1.0,
    source VARCHAR(50) DEFAULT 'ai',
    validation_status VARCHAR(50) DEFAULT 'PASS',
    validation_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS product_descriptions (
    id SERIAL PRIMARY KEY,
    product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
    description_type VARCHAR(50) NOT NULL,
    description_value TEXT,
    validation_status VARCHAR(50) DEFAULT 'PASS',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS validation_results (
    id SERIAL PRIMARY KEY,
    product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
    field_name VARCHAR(255) NOT NULL,
    value TEXT,
    validation_type VARCHAR(50),
    status VARCHAR(50) DEFAULT 'PASS',
    confidence DOUBLE PRECISION DEFAULT 1.0,
    reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS lov_values (
    id SERIAL PRIMARY KEY,
    category VARCHAR(255),
    attribute_name VARCHAR(255) NOT NULL,
    allowed_value TEXT NOT NULL,
    uom VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS manufacturers (
    id SERIAL PRIMARY KEY,
    manufacturer_name VARCHAR(255) NOT NULL UNIQUE,
    normalized_name VARCHAR(255) NOT NULL
);

CREATE TABLE IF NOT EXISTS brands (
    id SERIAL PRIMARY KEY,
    brand_name VARCHAR(255) NOT NULL UNIQUE,
    normalized_name VARCHAR(255) NOT NULL
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_products_mfg_part_num ON products(mfg_part_num);
CREATE INDEX IF NOT EXISTS idx_enrichment_product_id ON product_enrichment(product_id);
CREATE INDEX IF NOT EXISTS idx_enrichment_status ON product_enrichment(status);
CREATE INDEX IF NOT EXISTS idx_attributes_product_id ON product_attributes(product_id);
CREATE INDEX IF NOT EXISTS idx_descriptions_product_id ON product_descriptions(product_id);
"""

# Default Master LOV Seed Data for industrial/appliance products
SEED_LOV_DATA = [
    {"category": "Dishwashers", "attribute_name": "Finish", "allowed_value": "Stainless Steel", "uom": None},
    {"category": "Dishwashers", "attribute_name": "Finish", "allowed_value": "Matte Black", "uom": None},
    {"category": "Dishwashers", "attribute_name": "Finish", "allowed_value": "White", "uom": None},
    {"category": "Dishwashers", "attribute_name": "Finish", "allowed_value": "Chrome", "uom": None},
    {"category": "Dishwashers", "attribute_name": "Voltage Rating", "allowed_value": "120", "uom": "V"},
    {"category": "Dishwashers", "attribute_name": "Amperage Rating", "allowed_value": "15", "uom": "A"},
    {"category": "Dishwashers", "attribute_name": "Amperage Rating", "allowed_value": "10", "uom": "A"},
    {"category": "Dishwashers", "attribute_name": "Mounting Type", "allowed_value": "Leg", "uom": None},
    {"category": "Dishwashers", "attribute_name": "Mounting Type", "allowed_value": "Built-in", "uom": None},
    {"category": "Abrasives", "attribute_name": "Grit", "allowed_value": "P80", "uom": None},
    {"category": "Abrasives", "attribute_name": "Grit", "allowed_value": "P120", "uom": None},
    {"category": "Abrasives", "attribute_name": "Grit", "allowed_value": "P150", "uom": None},
    {"category": "Abrasives", "attribute_name": "Grit", "allowed_value": "P180", "uom": None},
    {"category": "Abrasives", "attribute_name": "Grit", "allowed_value": "P220", "uom": None},
    {"category": "Abrasives", "attribute_name": "Grit", "allowed_value": "P320", "uom": None},
]

SEED_MANUFACTURERS = [
    {"manufacturer_name": "Rheem Manufacturing", "normalized_name": "rheem manufacturing"},
    {"manufacturer_name": "Whirlpool Corporation", "normalized_name": "whirlpool corporation"},
    {"manufacturer_name": "Freud Inc", "normalized_name": "freud inc"},
    {"manufacturer_name": "Mirka Abrasives Inc", "normalized_name": "mirka abrasives inc"},
    {"manufacturer_name": "Jam Industrial Supply LLC", "normalized_name": "jam industrial supply llc"},
    {"manufacturer_name": "Appliance Dealers Cooperative", "normalized_name": "appliance dealers cooperative"},
]

SEED_BRANDS = [
    {"brand_name": "FRIGIDAIRE®", "normalized_name": "frigidaire"},
    {"brand_name": "Whirlpool®", "normalized_name": "whirlpool"},
    {"brand_name": "Diablo", "normalized_name": "diablo"},
    {"brand_name": "3M", "normalized_name": "3m"},
    {"brand_name": "Mirka", "normalized_name": "mirka"},
]
