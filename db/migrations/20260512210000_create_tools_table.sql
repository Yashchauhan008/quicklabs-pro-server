-- migrate:up
CREATE TABLE public.tools (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL PRIMARY KEY,
    title character varying(255) NOT NULL,
    description text,
    logo_url text,
    banner_urls text[] DEFAULT '{}'::text[] NOT NULL,
    link text NOT NULL,
    category character varying(100),
    status character varying(50) DEFAULT 'online',
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    deleted_at timestamp with time zone
);

CREATE INDEX idx_tools_category ON public.tools USING btree (category);
CREATE INDEX idx_tools_status ON public.tools USING btree (status);
CREATE INDEX idx_tools_created_at ON public.tools USING btree (created_at DESC);

-- migrate:down
DROP TABLE public.tools;
