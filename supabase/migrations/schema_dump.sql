-- BuildWise Database Schema Dump
-- Generated as part of the integral file check

-- Custom Types
CREATE TYPE public.user_role AS ENUM ('admin', 'worker', 'client');
CREATE TYPE public.task_status AS ENUM ('todo', 'in_progress', 'done', 'blocked');
CREATE TYPE public.project_status AS ENUM ('planning', 'active', 'on_hold', 'completed');

-- Organizations
CREATE TABLE public.organizations (
    id uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    name text NOT NULL,
    slug text UNIQUE NOT NULL,
    description text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Profiles
CREATE TABLE public.profiles (
    id uuid PRIMARY KEY REFERENCES auth.users(id),
    organization_id uuid REFERENCES public.organizations(id),
    full_name text,
    role public.user_role DEFAULT 'worker'::public.user_role,
    avatar_url text,
    phone text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Projects
CREATE TABLE public.projects (
    id uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    organization_id uuid REFERENCES public.organizations(id),
    name text NOT NULL,
    description text,
    location text,
    status public.project_status DEFAULT 'planning'::public.project_status,
    budget numeric,
    start_date date,
    end_date date,
    created_by uuid REFERENCES public.profiles(id),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Phases
CREATE TABLE public.phases (
    id uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE,
    name text NOT NULL,
    description text,
    order_index integer DEFAULT 0,
    start_date date,
    end_date date,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Tasks
CREATE TABLE public.tasks (
    id uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    phase_id uuid REFERENCES public.phases(id) ON DELETE CASCADE,
    project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE,
    name text NOT NULL,
    description text,
    status public.task_status DEFAULT 'todo'::public.task_status,
    priority integer DEFAULT 0,
    progress integer DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
    start_date date,
    end_date date,
    duration_days integer,
    dependencies uuid[] DEFAULT '{}'::uuid[],
    assigned_to uuid REFERENCES public.profiles(id),
    estimated_cost numeric,
    cost_breakdown jsonb,
    ai_insight text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Materials (DSR Library)
CREATE TABLE public.materials (
    id uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    item_code text UNIQUE NOT NULL,
    description text NOT NULL,
    unit text NOT NULL,
    base_rate numeric NOT NULL,
    category text NOT NULL,
    sub_category text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Site Logs
CREATE TABLE public.site_logs (
    id uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE,
    submitted_by uuid REFERENCES public.profiles(id),
    raw_text text NOT NULL,
    ai_summary jsonb,
    phase_name text,
    log_date date DEFAULT CURRENT_DATE,
    flagged boolean DEFAULT false,
    created_at timestamptz DEFAULT now()
);

-- Client Projects
CREATE TABLE public.client_projects (
    id uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    client_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
    project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE,
    created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.phases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_projects ENABLE ROW LEVEL SECURITY;
