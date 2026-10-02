-- ====================================================================
-- THE SOUL VASTRA - Supabase PostgreSQL Schema & Row Level Security (RLS)
-- ====================================================================
-- This script provides production-grade schema and strict database-level
-- RLS policies enforcing that ONLY authenticated users with role='owner'
-- can insert, update, or delete catalog records, while the public has
-- SELECT-only permissions on published data.
-- ====================================================================

-- 1. Custom User Profiles & Roles Table
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'customer' CHECK (role IN ('owner', 'admin', 'customer')),
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    last_login TIMESTAMPTZ
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public profiles are readable by authenticated users"
ON public.profiles FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Users can update their own profile name"
ON public.profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id AND role = (SELECT role FROM public.profiles WHERE id = auth.uid())); -- Prevent self-elevation of role

-- Helper Function to check if the current requester is the Owner
CREATE OR REPLACE FUNCTION public.is_owner()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'owner'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Categories Table
CREATE TABLE IF NOT EXISTS public.categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    description TEXT,
    display_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE NOT NULL
);

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- Categories RLS:
-- Public can read active categories
CREATE POLICY "Public read active categories"
ON public.categories FOR SELECT
USING (is_active = true OR public.is_owner());

-- Only owner can modify categories
CREATE POLICY "Owner insert categories"
ON public.categories FOR INSERT
TO authenticated
WITH CHECK (public.is_owner());

CREATE POLICY "Owner update categories"
ON public.categories FOR UPDATE
TO authenticated
USING (public.is_owner())
WITH CHECK (public.is_owner());

CREATE POLICY "Owner delete categories"
ON public.categories FOR DELETE
TO authenticated
USING (public.is_owner());

-- 3. Collections Table
CREATE TABLE IF NOT EXISTS public.collections (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    subtitle TEXT,
    description TEXT,
    image TEXT NOT NULL,
    badge TEXT,
    display_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE NOT NULL
);

ALTER TABLE public.collections ENABLE ROW LEVEL SECURITY;

-- Collections RLS:
-- Public can read active collections
CREATE POLICY "Public read active collections"
ON public.collections FOR SELECT
USING (is_active = true OR public.is_owner());

-- Only owner can modify collections
CREATE POLICY "Owner insert collections"
ON public.collections FOR INSERT
TO authenticated
WITH CHECK (public.is_owner());

CREATE POLICY "Owner update collections"
ON public.collections FOR UPDATE
TO authenticated
USING (public.is_owner())
WITH CHECK (public.is_owner());

CREATE POLICY "Owner delete collections"
ON public.collections FOR DELETE
TO authenticated
USING (public.is_owner());

-- 4. Products Table
CREATE TABLE IF NOT EXISTS public.products (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    subtitle TEXT,
    category TEXT NOT NULL REFERENCES public.categories(id) ON UPDATE CASCADE,
    category_label TEXT,
    collection TEXT REFERENCES public.collections(id) ON UPDATE CASCADE,
    price NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
    original_price NUMERIC(10, 2) CHECK (original_price >= 0),
    currency TEXT DEFAULT 'INR' NOT NULL,
    rating NUMERIC(2, 1) DEFAULT 5.0,
    reviews_count INT DEFAULT 0,
    badge TEXT,
    is_featured BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    stock_quantity INT DEFAULT 0 NOT NULL,
    image TEXT NOT NULL,
    gallery JSONB DEFAULT '[]'::jsonb,
    description TEXT,
    story TEXT,
    fabric TEXT,
    fit TEXT,
    sizes JSONB DEFAULT '["S", "M", "L", "XL", "XXL"]'::jsonb,
    colors JSONB DEFAULT '[]'::jsonb,
    tags JSONB DEFAULT '[]'::jsonb,
    display_order INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- Products RLS:
-- Public can read ONLY active/published products
CREATE POLICY "Public read published products"
ON public.products FOR SELECT
USING (is_active = true OR public.is_owner());

-- Owner has full control (INSERT, UPDATE, DELETE)
CREATE POLICY "Owner insert products"
ON public.products FOR INSERT
TO authenticated
WITH CHECK (public.is_owner());

CREATE POLICY "Owner update products"
ON public.products FOR UPDATE
TO authenticated
USING (public.is_owner())
WITH CHECK (public.is_owner());

CREATE POLICY "Owner delete products"
ON public.products FOR DELETE
TO authenticated
USING (public.is_owner());

-- 5. Homepage Content Configuration
CREATE TABLE IF NOT EXISTS public.homepage_config (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_by UUID REFERENCES auth.users(id)
);

ALTER TABLE public.homepage_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read homepage config"
ON public.homepage_config FOR SELECT
USING (true);

CREATE POLICY "Owner insert/update homepage config"
ON public.homepage_config FOR ALL
TO authenticated
USING (public.is_owner())
WITH CHECK (public.is_owner());

-- 6. Audit Logs Table (Immutable)
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id BIGSERIAL PRIMARY KEY,
    timestamp TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    user_id UUID REFERENCES auth.users(id),
    user_email TEXT,
    action TEXT NOT NULL,
    object_type TEXT NOT NULL,
    object_id TEXT,
    old_value JSONB,
    new_value JSONB,
    ip_address INET
);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Only owner can read audit logs
CREATE POLICY "Owner read audit logs"
ON public.audit_logs FOR SELECT
TO authenticated
USING (public.is_owner());

-- Owner / server triggers can insert audit logs
CREATE POLICY "Owner insert audit logs"
ON public.audit_logs FOR INSERT
TO authenticated
WITH CHECK (public.is_owner());

-- NO ONE CAN UPDATE OR DELETE AUDIT LOGS (Immutable History)
-- (No UPDATE or DELETE policy defined)

-- 7. Media Uploads Table
CREATE TABLE IF NOT EXISTS public.media_uploads (
    id TEXT PRIMARY KEY,
    filename TEXT NOT NULL,
    original_name TEXT NOT NULL,
    url TEXT NOT NULL,
    size_bytes BIGINT,
    mime_type TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    uploaded_by UUID REFERENCES auth.users(id)
);

ALTER TABLE public.media_uploads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read media records"
ON public.media_uploads FOR SELECT
USING (true);

CREATE POLICY "Owner manage media"
ON public.media_uploads FOR ALL
TO authenticated
USING (public.is_owner())
WITH CHECK (public.is_owner());

-- 8. Price Audit Trigger (Automated price change logging in PostgreSQL)
CREATE OR REPLACE FUNCTION log_price_change()
RETURNS TRIGGER AS $$
BEGIN
    IF (OLD.price IS DISTINCT FROM NEW.price) THEN
        INSERT INTO public.audit_logs (
            timestamp, user_id, user_email, action,
            object_type, object_id, old_value, new_value
        ) VALUES (
            now(),
            auth.uid(),
            (SELECT email FROM auth.users WHERE id = auth.uid()),
            'PRICE_CHANGED',
            'product',
            NEW.id,
            jsonb_build_object('price', OLD.price, 'original_price', OLD.original_price),
            jsonb_build_object('price', NEW.price, 'original_price', NEW.original_price)
        );
    END IF;
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_log_price_change
BEFORE UPDATE ON public.products
FOR EACH ROW
EXECUTE FUNCTION log_price_change();
