-- migrate:up
ALTER TABLE public.tools DROP COLUMN logo_url;
ALTER TABLE public.tools DROP COLUMN banner_urls;
ALTER TABLE public.tools ADD COLUMN logo_file_id uuid REFERENCES public.files(id);
ALTER TABLE public.tools ADD COLUMN banner_file_ids uuid[] DEFAULT '{}'::uuid[] NOT NULL;

CREATE INDEX idx_tools_logo_file_id ON public.tools USING btree (logo_file_id);

-- migrate:down
ALTER TABLE public.tools DROP COLUMN logo_file_id;
ALTER TABLE public.tools DROP COLUMN banner_file_ids;
ALTER TABLE public.tools ADD COLUMN logo_url text;
ALTER TABLE public.tools ADD COLUMN banner_urls text[] DEFAULT '{}'::text[] NOT NULL;
