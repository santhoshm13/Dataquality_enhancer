from sqlalchemy import Column, Integer, String, Text, Float, DateTime, func
from sqlalchemy.orm import declarative_base

Base = declarative_base()

class MasterManufacturerBrand(Base):
    __tablename__ = "master_manufacturers_brands"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    manufacturer_name = Column(String(255), index=True, nullable=False)
    manufacturer_code = Column(String(100), nullable=True)
    brand_name = Column(String(255), index=True, nullable=True)
    brand_code = Column(String(100), nullable=True)
    status = Column(String(50), default="ACTIVE")
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class MasterUnicatLOV(Base):
    __tablename__ = "master_unicat_lov"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    classpath = Column(String(500), index=True, nullable=True)
    department = Column(String(255), index=True, nullable=True)
    class_name = Column(String(255), index=True, nullable=True)
    fine_category = Column(String(255), index=True, nullable=True)
    leaf_node = Column(String(255), nullable=True)
    filtering = Column(String(50), nullable=True)
    attribute_label = Column(String(255), index=True, nullable=True)
    attribute_values = Column(Text, nullable=True)
    normalized_label = Column(String(255), nullable=True)
    normalized_values = Column(Text, nullable=True)
    guidelines = Column(Text, nullable=True)
    remarks = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class MasterUOMStandard(Base):
    __tablename__ = "master_uom_standards"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    uom_code = Column(String(100), index=True, nullable=False)
    uom_name = Column(String(255), nullable=True)
    standard_abbreviation = Column(String(100), index=True, nullable=True)
    category = Column(String(255), index=True, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class MasterHouseStyleRule(Base):
    __tablename__ = "master_house_style_rules"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    rule_name = Column(String(255), nullable=False)
    category = Column(String(255), nullable=True)
    guideline = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class MasterDecimalFraction(Base):
    __tablename__ = "master_decimal_fractions"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    decimal_value = Column(Float, index=True, nullable=False)
    fraction_string = Column(String(100), index=True, nullable=False)
    alternative_fraction = Column(String(100), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class MasterFaucetsLOV(Base):
    __tablename__ = "master_faucets_lov"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    category_key = Column(String(100), index=True, nullable=True)
    sheet_name = Column(String(255), index=True, nullable=False)
    attribute_name = Column(String(255), index=True, nullable=True)
    allowed_value = Column(Text, nullable=True)
    uom_standard = Column(String(100), nullable=True)
    description = Column(Text, nullable=True)
    build_order = Column(Integer, nullable=True)
    remarks = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

MasterCategoryLOV = MasterFaucetsLOV
