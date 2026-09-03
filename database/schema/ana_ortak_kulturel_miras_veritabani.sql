-- Ana Ortak Kulturel Miras Veritabani
-- PostgreSQL 15+ / PostGIS 3+
-- Domain/uygulama tablosu sayisi: 32. Ek olarak 1 operasyonel audit_log tablosu vardir.
-- Tasarim ilkesi: ortak hedef kimligi + kontrollu kavram + tarihli iliski/olay/gozlem
-- + kaynak/atif/iddia/kanit. Konuya ozel seyrek ayrintilar entity_profile.jsonb icindedir.

BEGIN;

CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE SCHEMA IF NOT EXISTS km;
SET search_path TO km, public;

-- 1. Uygulama kullanicisi. Parola tutulmaz; kimlik saglayicinin subject degeri saklanir.
CREATE TABLE IF NOT EXISTS application_user (
    user_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    identity_provider text NOT NULL,
    external_subject text NOT NULL,
    display_name text NOT NULL,
    email text,
    user_role text NOT NULL DEFAULT 'contributor'
        CHECK (user_role IN ('contributor', 'editor', 'administrator')),
    account_status text NOT NULL DEFAULT 'active'
        CHECK (account_status IN ('active', 'suspended', 'disabled')),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (identity_provider, external_subject)
);

-- 2. Butun iliski kurulabilir kayitlarin gercek FK ile hedeflenebilen ortak kimligi.
CREATE TABLE IF NOT EXISTS record_anchor (
    anchor_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    record_kind_code text NOT NULL CHECK (record_kind_code IN (
        'heritage_asset', 'person', 'organization', 'place', 'event',
        'cultural_document', 'media_asset', 'inscription'
    )),
    display_label text NOT NULL CHECK (btrim(display_label) <> ''),
    record_status text NOT NULL DEFAULT 'draft'
        CHECK (record_status IN ('draft', 'in_review', 'published', 'rejected', 'withdrawn')),
    access_level text NOT NULL DEFAULT 'public'
        CHECK (access_level IN ('public', 'internal', 'restricted', 'embargoed')),
    revision_no integer NOT NULL DEFAULT 1 CHECK (revision_no > 0),
    created_by_user_id uuid REFERENCES application_user(user_id) ON DELETE RESTRICT,
    updated_by_user_id uuid REFERENCES application_user(user_id) ON DELETE RESTRICT,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (anchor_id, record_kind_code)
);

-- 3-4. Ortak ve surumlu kontrollu sozluk altyapisi.
CREATE TABLE IF NOT EXISTS concept_scheme (
    scheme_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    scheme_code text NOT NULL,
    title text NOT NULL,
    version text NOT NULL,
    description text,
    authority_source_uri text,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (scheme_code, version)
);

CREATE TABLE IF NOT EXISTS concept (
    concept_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    scheme_id uuid NOT NULL REFERENCES concept_scheme(scheme_id) ON DELETE RESTRICT,
    parent_concept_id uuid,
    concept_code text NOT NULL,
    preferred_label text NOT NULL,
    alternative_labels jsonb NOT NULL DEFAULT '[]'::jsonb
        CHECK (jsonb_typeof(alternative_labels) = 'array'),
    language_code text NOT NULL DEFAULT 'tr',
    definition text,
    metadata jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(metadata) = 'object'),
    is_deprecated boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (scheme_id, concept_code),
    UNIQUE (concept_id, scheme_id),
    FOREIGN KEY (parent_concept_id, scheme_id)
        REFERENCES concept(concept_id, scheme_id) ON DELETE RESTRICT,
    CHECK (parent_concept_id IS NULL OR parent_concept_id <> concept_id)
);

-- 5-11. Ortak kimligin kanonik alt turleri.
CREATE TABLE IF NOT EXISTS heritage_asset (
    anchor_id uuid PRIMARY KEY,
    record_kind_code text NOT NULL DEFAULT 'heritage_asset'
        CHECK (record_kind_code = 'heritage_asset'),
    asset_type_concept_id uuid REFERENCES concept(concept_id) ON DELETE RESTRICT,
    short_description text,
    physical_status_concept_id uuid REFERENCES concept(concept_id) ON DELETE RESTRICT,
    is_movable boolean,
    FOREIGN KEY (anchor_id, record_kind_code)
        REFERENCES record_anchor(anchor_id, record_kind_code) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS person (
    anchor_id uuid PRIMARY KEY,
    record_kind_code text NOT NULL DEFAULT 'person' CHECK (record_kind_code = 'person'),
    given_name text,
    family_name text,
    birth_date_start date,
    birth_date_end date,
    death_date_start date,
    death_date_end date,
    FOREIGN KEY (anchor_id, record_kind_code)
        REFERENCES record_anchor(anchor_id, record_kind_code) ON DELETE RESTRICT,
    CHECK (birth_date_start IS NULL OR birth_date_end IS NULL OR birth_date_start <= birth_date_end),
    CHECK (death_date_start IS NULL OR death_date_end IS NULL OR death_date_start <= death_date_end)
);

CREATE TABLE IF NOT EXISTS organization (
    anchor_id uuid PRIMARY KEY,
    record_kind_code text NOT NULL DEFAULT 'organization'
        CHECK (record_kind_code = 'organization'),
    organization_type_concept_id uuid REFERENCES concept(concept_id) ON DELETE RESTRICT,
    short_description text,
    FOREIGN KEY (anchor_id, record_kind_code)
        REFERENCES record_anchor(anchor_id, record_kind_code) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS place (
    anchor_id uuid PRIMARY KEY,
    record_kind_code text NOT NULL DEFAULT 'place' CHECK (record_kind_code = 'place'),
    place_type_concept_id uuid REFERENCES concept(concept_id) ON DELETE RESTRICT,
    temporal_character text NOT NULL DEFAULT 'unspecified'
        CHECK (temporal_character IN ('modern', 'historic', 'both', 'unspecified')),
    valid_from date,
    valid_to date,
    original_date_text text,
    FOREIGN KEY (anchor_id, record_kind_code)
        REFERENCES record_anchor(anchor_id, record_kind_code) ON DELETE RESTRICT,
    CHECK (valid_from IS NULL OR valid_to IS NULL OR valid_from <= valid_to)
);

CREATE TABLE IF NOT EXISTS event (
    anchor_id uuid PRIMARY KEY,
    record_kind_code text NOT NULL DEFAULT 'event' CHECK (record_kind_code = 'event'),
    event_type_concept_id uuid NOT NULL REFERENCES concept(concept_id) ON DELETE RESTRICT,
    date_start date,
    date_end date,
    original_date_text text,
    date_precision_code text NOT NULL DEFAULT 'unknown'
        CHECK (date_precision_code IN ('day', 'month', 'year', 'decade', 'century', 'range', 'unknown')),
    description text,
    FOREIGN KEY (anchor_id, record_kind_code)
        REFERENCES record_anchor(anchor_id, record_kind_code) ON DELETE RESTRICT,
    CHECK (date_start IS NULL OR date_end IS NULL OR date_start <= date_end)
);

CREATE TABLE IF NOT EXISTS cultural_document (
    anchor_id uuid PRIMARY KEY,
    record_kind_code text NOT NULL DEFAULT 'cultural_document'
        CHECK (record_kind_code = 'cultural_document'),
    document_type_concept_id uuid REFERENCES concept(concept_id) ON DELETE RESTRICT,
    title text,
    language_code text,
    document_date_start date,
    document_date_end date,
    original_date_text text,
    FOREIGN KEY (anchor_id, record_kind_code)
        REFERENCES record_anchor(anchor_id, record_kind_code) ON DELETE RESTRICT,
    CHECK (document_date_start IS NULL OR document_date_end IS NULL
        OR document_date_start <= document_date_end)
);

CREATE TABLE IF NOT EXISTS media_asset (
    anchor_id uuid PRIMARY KEY,
    record_kind_code text NOT NULL DEFAULT 'media_asset'
        CHECK (record_kind_code = 'media_asset'),
    media_type_concept_id uuid NOT NULL REFERENCES concept(concept_id) ON DELETE RESTRICT,
    storage_uri text NOT NULL,
    mime_type text NOT NULL,
    byte_size bigint CHECK (byte_size IS NULL OR byte_size >= 0),
    sha256_hex text CHECK (sha256_hex IS NULL OR sha256_hex ~ '^[0-9a-f]{64}$'),
    rights_statement text,
    license_concept_id uuid REFERENCES concept(concept_id) ON DELETE RESTRICT,
    captured_at timestamptz,
    technical_metadata jsonb NOT NULL DEFAULT '{}'::jsonb
        CHECK (jsonb_typeof(technical_metadata) = 'object'),
    FOREIGN KEY (anchor_id, record_kind_code)
        REFERENCES record_anchor(anchor_id, record_kind_code) ON DELETE RESTRICT,
    UNIQUE (storage_uri)
);

-- 12-13. Arastirma kaynagi ve kaynak icindeki kesin konum.
CREATE TABLE IF NOT EXISTS source (
    source_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    source_type_concept_id uuid REFERENCES concept(concept_id) ON DELETE RESTRICT,
    linked_document_anchor_id uuid UNIQUE
        REFERENCES cultural_document(anchor_id) ON DELETE RESTRICT,
    title text NOT NULL,
    creators_text text,
    publication_year integer CHECK (publication_year IS NULL OR publication_year BETWEEN -5000 AND 3000),
    publisher_or_archive text,
    external_identifier text,
    bibliographic_metadata jsonb NOT NULL DEFAULT '{}'::jsonb
        CHECK (jsonb_typeof(bibliographic_metadata) = 'object'),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS source_citation (
    citation_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    source_id uuid NOT NULL REFERENCES source(source_id) ON DELETE RESTRICT,
    locator_type_concept_id uuid REFERENCES concept(concept_id) ON DELETE RESTRICT,
    locator_text text NOT NULL,
    printed_page text,
    pdf_page integer CHECK (pdf_page IS NULL OR pdf_page > 0),
    folio text,
    figure_or_table text,
    quoted_fragment text,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- 14. Fiziksel kitabe/yazit; okumalar text_expression tablosundadir.
CREATE TABLE IF NOT EXISTS inscription (
    anchor_id uuid PRIMARY KEY,
    record_kind_code text NOT NULL DEFAULT 'inscription'
        CHECK (record_kind_code = 'inscription'),
    host_anchor_id uuid NOT NULL REFERENCES record_anchor(anchor_id) ON DELETE RESTRICT,
    inscription_type_concept_id uuid REFERENCES concept(concept_id) ON DELETE RESTRICT,
    language_concept_id uuid REFERENCES concept(concept_id) ON DELETE RESTRICT,
    script_concept_id uuid REFERENCES concept(concept_id) ON DELETE RESTRICT,
    application_technique_concept_id uuid REFERENCES concept(concept_id) ON DELETE RESTRICT,
    location_description text,
    line_count integer CHECK (line_count IS NULL OR line_count >= 0),
    legibility_concept_id uuid REFERENCES concept(concept_id) ON DELETE RESTRICT,
    FOREIGN KEY (anchor_id, record_kind_code)
        REFERENCES record_anchor(anchor_id, record_kind_code) ON DELETE RESTRICT,
    CHECK (anchor_id <> host_anchor_id)
);

-- 15-17. Ad, identifier ve ortak siniflandirma atamalari.
CREATE TABLE IF NOT EXISTS entity_name (
    entity_name_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    target_anchor_id uuid NOT NULL REFERENCES record_anchor(anchor_id) ON DELETE RESTRICT,
    name_text text NOT NULL CHECK (btrim(name_text) <> ''),
    name_type_concept_id uuid REFERENCES concept(concept_id) ON DELETE RESTRICT,
    language_code text,
    script_code text,
    valid_from date,
    valid_to date,
    original_date_text text,
    is_preferred boolean NOT NULL DEFAULT false,
    source_citation_id uuid REFERENCES source_citation(citation_id) ON DELETE RESTRICT,
    certainty_code text NOT NULL DEFAULT 'unspecified'
        CHECK (certainty_code IN ('exact', 'high', 'medium', 'low', 'uncertain', 'disputed', 'unspecified')),
    created_at timestamptz NOT NULL DEFAULT now(),
    CHECK (valid_from IS NULL OR valid_to IS NULL OR valid_from <= valid_to)
);

CREATE TABLE IF NOT EXISTS entity_identifier (
    identifier_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    target_anchor_id uuid NOT NULL REFERENCES record_anchor(anchor_id) ON DELETE RESTRICT,
    identifier_type_concept_id uuid NOT NULL REFERENCES concept(concept_id) ON DELETE RESTRICT,
    identifier_value text NOT NULL CHECK (btrim(identifier_value) <> ''),
    issuing_organization_id uuid REFERENCES organization(anchor_id) ON DELETE RESTRICT,
    valid_from date,
    valid_to date,
    source_citation_id uuid REFERENCES source_citation(citation_id) ON DELETE RESTRICT,
    created_at timestamptz NOT NULL DEFAULT now(),
    CHECK (valid_from IS NULL OR valid_to IS NULL OR valid_from <= valid_to)
);

CREATE TABLE IF NOT EXISTS classification_assignment (
    classification_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    target_anchor_id uuid NOT NULL REFERENCES record_anchor(anchor_id) ON DELETE RESTRICT,
    classification_axis_concept_id uuid NOT NULL REFERENCES concept(concept_id) ON DELETE RESTRICT,
    value_concept_id uuid NOT NULL REFERENCES concept(concept_id) ON DELETE RESTRICT,
    valid_from date,
    valid_to date,
    original_date_text text,
    source_citation_id uuid REFERENCES source_citation(citation_id) ON DELETE RESTRICT,
    certainty_code text NOT NULL DEFAULT 'unspecified'
        CHECK (certainty_code IN ('exact', 'high', 'medium', 'low', 'uncertain', 'disputed', 'unspecified')),
    status text NOT NULL DEFAULT 'asserted'
        CHECK (status IN ('asserted', 'preferred', 'superseded', 'rejected')),
    created_at timestamptz NOT NULL DEFAULT now(),
    CHECK (classification_axis_concept_id <> value_concept_id),
    CHECK (valid_from IS NULL OR valid_to IS NULL OR valid_from <= valid_to)
);

-- 18. Butun anchor turleri arasindaki tarihli, rollu ve kaynakli genel iliski.
CREATE TABLE IF NOT EXISTS entity_relation (
    relation_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    subject_anchor_id uuid NOT NULL REFERENCES record_anchor(anchor_id) ON DELETE RESTRICT,
    object_anchor_id uuid NOT NULL REFERENCES record_anchor(anchor_id) ON DELETE RESTRICT,
    relation_type_concept_id uuid NOT NULL REFERENCES concept(concept_id) ON DELETE RESTRICT,
    subject_role_concept_id uuid REFERENCES concept(concept_id) ON DELETE RESTRICT,
    object_role_concept_id uuid REFERENCES concept(concept_id) ON DELETE RESTRICT,
    valid_from date,
    valid_to date,
    original_date_text text,
    date_precision_code text NOT NULL DEFAULT 'unknown'
        CHECK (date_precision_code IN ('day', 'month', 'year', 'decade', 'century', 'range', 'unknown')),
    certainty_code text NOT NULL DEFAULT 'unspecified'
        CHECK (certainty_code IN ('exact', 'high', 'medium', 'low', 'uncertain', 'disputed', 'unspecified')),
    relation_status text NOT NULL DEFAULT 'asserted'
        CHECK (relation_status IN ('asserted', 'preferred', 'superseded', 'rejected')),
    source_citation_id uuid REFERENCES source_citation(citation_id) ON DELETE RESTRICT,
    note text,
    created_at timestamptz NOT NULL DEFAULT now(),
    CHECK (subject_anchor_id <> object_anchor_id),
    CHECK (valid_from IS NULL OR valid_to IS NULL OR valid_from <= valid_to)
);

-- 19. Olay katilimi, olay ucu icin daha dar FK ve rol semantigi gerektirdigi icin ayridir.
CREATE TABLE IF NOT EXISTS event_participation (
    participation_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    event_anchor_id uuid NOT NULL REFERENCES event(anchor_id) ON DELETE RESTRICT,
    participant_anchor_id uuid NOT NULL REFERENCES record_anchor(anchor_id) ON DELETE RESTRICT,
    role_concept_id uuid NOT NULL REFERENCES concept(concept_id) ON DELETE RESTRICT,
    source_citation_id uuid REFERENCES source_citation(citation_id) ON DELETE RESTRICT,
    certainty_code text NOT NULL DEFAULT 'unspecified'
        CHECK (certainty_code IN ('exact', 'high', 'medium', 'low', 'uncertain', 'disputed', 'unspecified')),
    note text,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (event_anchor_id, participant_anchor_id, role_concept_id)
);

-- 20. Islev, kullanim, statu, mulkiyet, custody ve benzeri zamanli evreler.
CREATE TABLE IF NOT EXISTS temporal_phase (
    phase_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    subject_anchor_id uuid NOT NULL REFERENCES record_anchor(anchor_id) ON DELETE RESTRICT,
    phase_type_concept_id uuid NOT NULL REFERENCES concept(concept_id) ON DELETE RESTRICT,
    phase_value_concept_id uuid REFERENCES concept(concept_id) ON DELETE RESTRICT,
    related_anchor_id uuid REFERENCES record_anchor(anchor_id) ON DELETE RESTRICT,
    valid_from date,
    valid_to date,
    original_date_text text,
    date_precision_code text NOT NULL DEFAULT 'unknown'
        CHECK (date_precision_code IN ('day', 'month', 'year', 'decade', 'century', 'range', 'unknown')),
    source_citation_id uuid REFERENCES source_citation(citation_id) ON DELETE RESTRICT,
    certainty_code text NOT NULL DEFAULT 'unspecified'
        CHECK (certainty_code IN ('exact', 'high', 'medium', 'low', 'uncertain', 'disputed', 'unspecified')),
    note text,
    created_at timestamptz NOT NULL DEFAULT now(),
    CHECK (phase_value_concept_id IS NOT NULL OR related_anchor_id IS NOT NULL),
    CHECK (valid_from IS NULL OR valid_to IS NULL OR valid_from <= valid_to)
);

-- 21-22. Guncel/tarihi/tahmini geometri ve adres gecmisi.
CREATE TABLE IF NOT EXISTS geometry_assertion (
    geometry_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    target_anchor_id uuid NOT NULL REFERENCES record_anchor(anchor_id) ON DELETE RESTRICT,
    geometry_role_concept_id uuid NOT NULL REFERENCES concept(concept_id) ON DELETE RESTRICT,
    geometry_method_concept_id uuid REFERENCES concept(concept_id) ON DELETE RESTRICT,
    geometry geometry(Geometry, 4326) NOT NULL,
    temporal_character text NOT NULL DEFAULT 'current'
        CHECK (temporal_character IN ('current', 'historic', 'reconstructed', 'estimated', 'proposed')),
    horizontal_accuracy_m numeric CHECK (horizontal_accuracy_m IS NULL OR horizontal_accuracy_m >= 0),
    source_srid integer CHECK (source_srid IS NULL OR source_srid > 0),
    valid_from date,
    valid_to date,
    original_date_text text,
    source_citation_id uuid REFERENCES source_citation(citation_id) ON DELETE RESTRICT,
    certainty_code text NOT NULL DEFAULT 'unspecified'
        CHECK (certainty_code IN ('exact', 'high', 'medium', 'low', 'uncertain', 'disputed', 'unspecified')),
    created_at timestamptz NOT NULL DEFAULT now(),
    CHECK (valid_from IS NULL OR valid_to IS NULL OR valid_from <= valid_to),
    CHECK (NOT ST_IsEmpty(geometry))
);

CREATE TABLE IF NOT EXISTS address_assignment (
    address_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    target_anchor_id uuid NOT NULL REFERENCES record_anchor(anchor_id) ON DELETE RESTRICT,
    place_anchor_id uuid REFERENCES place(anchor_id) ON DELETE RESTRICT,
    address_role_concept_id uuid REFERENCES concept(concept_id) ON DELETE RESTRICT,
    address_text text NOT NULL CHECK (btrim(address_text) <> ''),
    valid_from date,
    valid_to date,
    original_date_text text,
    source_citation_id uuid REFERENCES source_citation(citation_id) ON DELETE RESTRICT,
    certainty_code text NOT NULL DEFAULT 'unspecified'
        CHECK (certainty_code IN ('exact', 'high', 'medium', 'low', 'uncertain', 'disputed', 'unspecified')),
    created_at timestamptz NOT NULL DEFAULT now(),
    CHECK (valid_from IS NULL OR valid_to IS NULL OR valid_from <= valid_to)
);

-- 23. Tarihli ve kaynakli olcum; ozgun ifade korunur.
CREATE TABLE IF NOT EXISTS measurement (
    measurement_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    target_anchor_id uuid NOT NULL REFERENCES record_anchor(anchor_id) ON DELETE RESTRICT,
    measurement_type_concept_id uuid NOT NULL REFERENCES concept(concept_id) ON DELETE RESTRICT,
    numeric_value numeric,
    text_value text,
    unit_concept_id uuid REFERENCES concept(concept_id) ON DELETE RESTRICT,
    original_value_text text,
    measurement_method_concept_id uuid REFERENCES concept(concept_id) ON DELETE RESTRICT,
    measured_at date,
    measured_by_anchor_id uuid REFERENCES record_anchor(anchor_id) ON DELETE RESTRICT,
    source_citation_id uuid REFERENCES source_citation(citation_id) ON DELETE RESTRICT,
    certainty_code text NOT NULL DEFAULT 'unspecified'
        CHECK (certainty_code IN ('exact', 'high', 'medium', 'low', 'uncertain', 'disputed', 'unspecified')),
    created_at timestamptz NOT NULL DEFAULT now(),
    CHECK (num_nonnulls(numeric_value, text_value) = 1),
    CHECK (numeric_value IS NULL OR unit_concept_id IS NOT NULL)
);

-- 24. Durum, hasar, risk, teknik inceleme ve bilimsel analiz icin ortak gozlem.
CREATE TABLE IF NOT EXISTS observation (
    observation_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    target_anchor_id uuid NOT NULL REFERENCES record_anchor(anchor_id) ON DELETE RESTRICT,
    parent_observation_id uuid REFERENCES observation(observation_id) ON DELETE RESTRICT,
    event_anchor_id uuid REFERENCES event(anchor_id) ON DELETE RESTRICT,
    observation_type_concept_id uuid NOT NULL REFERENCES concept(concept_id) ON DELETE RESTRICT,
    method_concept_id uuid REFERENCES concept(concept_id) ON DELETE RESTRICT,
    observer_anchor_id uuid REFERENCES record_anchor(anchor_id) ON DELETE RESTRICT,
    observed_at timestamptz,
    result_concept_id uuid REFERENCES concept(concept_id) ON DELETE RESTRICT,
    result_text text,
    result_number numeric,
    result_boolean boolean,
    unit_concept_id uuid REFERENCES concept(concept_id) ON DELETE RESTRICT,
    source_citation_id uuid REFERENCES source_citation(citation_id) ON DELETE RESTRICT,
    certainty_code text NOT NULL DEFAULT 'unspecified'
        CHECK (certainty_code IN ('exact', 'high', 'medium', 'low', 'uncertain', 'disputed', 'unspecified')),
    note text,
    created_at timestamptz NOT NULL DEFAULT now(),
    CHECK (parent_observation_id IS NULL OR parent_observation_id <> observation_id),
    CHECK (num_nonnulls(result_concept_id, result_text, result_number, result_boolean) = 1),
    CHECK (result_number IS NULL OR unit_concept_id IS NOT NULL)
);

-- 25-26. Siklikla sorgulanacak malzeme ve teknik bilgisi JSONB disinda tutulur.
CREATE TABLE IF NOT EXISTS material_usage (
    material_usage_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    target_anchor_id uuid NOT NULL REFERENCES record_anchor(anchor_id) ON DELETE RESTRICT,
    material_concept_id uuid NOT NULL REFERENCES concept(concept_id) ON DELETE RESTRICT,
    physical_material_anchor_id uuid REFERENCES heritage_asset(anchor_id) ON DELETE RESTRICT,
    role_concept_id uuid REFERENCES concept(concept_id) ON DELETE RESTRICT,
    event_anchor_id uuid REFERENCES event(anchor_id) ON DELETE RESTRICT,
    quantity numeric CHECK (quantity IS NULL OR quantity >= 0),
    unit_concept_id uuid REFERENCES concept(concept_id) ON DELETE RESTRICT,
    valid_from date,
    valid_to date,
    source_citation_id uuid REFERENCES source_citation(citation_id) ON DELETE RESTRICT,
    certainty_code text NOT NULL DEFAULT 'unspecified'
        CHECK (certainty_code IN ('exact', 'high', 'medium', 'low', 'uncertain', 'disputed', 'unspecified')),
    note text,
    created_at timestamptz NOT NULL DEFAULT now(),
    CHECK (quantity IS NULL OR unit_concept_id IS NOT NULL),
    CHECK (valid_from IS NULL OR valid_to IS NULL OR valid_from <= valid_to)
);

CREATE TABLE IF NOT EXISTS technique_assignment (
    technique_assignment_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    target_anchor_id uuid NOT NULL REFERENCES record_anchor(anchor_id) ON DELETE RESTRICT,
    technique_concept_id uuid NOT NULL REFERENCES concept(concept_id) ON DELETE RESTRICT,
    role_concept_id uuid REFERENCES concept(concept_id) ON DELETE RESTRICT,
    event_anchor_id uuid REFERENCES event(anchor_id) ON DELETE RESTRICT,
    sequence_no integer CHECK (sequence_no IS NULL OR sequence_no > 0),
    valid_from date,
    valid_to date,
    source_citation_id uuid REFERENCES source_citation(citation_id) ON DELETE RESTRICT,
    certainty_code text NOT NULL DEFAULT 'unspecified'
        CHECK (certainty_code IN ('exact', 'high', 'medium', 'low', 'uncertain', 'disputed', 'unspecified')),
    note text,
    created_at timestamptz NOT NULL DEFAULT now(),
    CHECK (valid_from IS NULL OR valid_to IS NULL OR valid_from <= valid_to)
);

-- 27. Kitabe/yazit icin coklu okuma, transkripsiyon, transliterasyon ve ceviri.
CREATE TABLE IF NOT EXISTS text_expression (
    expression_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    inscription_anchor_id uuid NOT NULL REFERENCES inscription(anchor_id) ON DELETE RESTRICT,
    expression_type_concept_id uuid NOT NULL REFERENCES concept(concept_id) ON DELETE RESTRICT,
    language_concept_id uuid REFERENCES concept(concept_id) ON DELETE RESTRICT,
    script_concept_id uuid REFERENCES concept(concept_id) ON DELETE RESTRICT,
    content text NOT NULL,
    version_label text,
    prepared_by_person_id uuid REFERENCES person(anchor_id) ON DELETE RESTRICT,
    source_citation_id uuid NOT NULL REFERENCES source_citation(citation_id) ON DELETE RESTRICT,
    certainty_code text NOT NULL DEFAULT 'unspecified'
        CHECK (certainty_code IN ('exact', 'high', 'medium', 'low', 'uncertain', 'disputed', 'unspecified')),
    created_at timestamptz NOT NULL DEFAULT now()
);

-- 28. Cakisan iddialar ayni subject/predicate icin yan yana saklanabilir.
CREATE TABLE IF NOT EXISTS assertion (
    assertion_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    subject_anchor_id uuid NOT NULL REFERENCES record_anchor(anchor_id) ON DELETE RESTRICT,
    predicate_concept_id uuid NOT NULL REFERENCES concept(concept_id) ON DELETE RESTRICT,
    value_kind text NOT NULL
        CHECK (value_kind IN ('anchor', 'concept', 'text', 'number', 'boolean', 'date_range')),
    object_anchor_id uuid REFERENCES record_anchor(anchor_id) ON DELETE RESTRICT,
    object_concept_id uuid REFERENCES concept(concept_id) ON DELETE RESTRICT,
    value_text text,
    value_number numeric,
    value_boolean boolean,
    value_date_start date,
    value_date_end date,
    value_date_text text,
    unit_concept_id uuid REFERENCES concept(concept_id) ON DELETE RESTRICT,
    source_citation_id uuid NOT NULL REFERENCES source_citation(citation_id) ON DELETE RESTRICT,
    certainty_code text NOT NULL DEFAULT 'unspecified'
        CHECK (certainty_code IN ('exact', 'high', 'medium', 'low', 'uncertain', 'disputed', 'unspecified')),
    certainty_score numeric CHECK (certainty_score IS NULL OR certainty_score BETWEEN 0 AND 1),
    assertion_status text NOT NULL DEFAULT 'asserted'
        CHECK (assertion_status IN ('asserted', 'preferred', 'superseded', 'rejected')),
    note text,
    created_at timestamptz NOT NULL DEFAULT now(),
    CHECK (value_date_start IS NULL OR value_date_end IS NULL OR value_date_start <= value_date_end),
    CHECK (
        (value_kind = 'anchor' AND object_anchor_id IS NOT NULL
            AND num_nonnulls(object_concept_id, value_text, value_number, value_boolean,
                              value_date_start, value_date_end) = 0)
        OR (value_kind = 'concept' AND object_concept_id IS NOT NULL
            AND num_nonnulls(object_anchor_id, value_text, value_number, value_boolean,
                              value_date_start, value_date_end) = 0)
        OR (value_kind = 'text' AND value_text IS NOT NULL
            AND num_nonnulls(object_anchor_id, object_concept_id, value_number, value_boolean,
                              value_date_start, value_date_end) = 0)
        OR (value_kind = 'number' AND value_number IS NOT NULL
            AND num_nonnulls(object_anchor_id, object_concept_id, value_text, value_boolean,
                              value_date_start, value_date_end) = 0)
        OR (value_kind = 'boolean' AND value_boolean IS NOT NULL
            AND num_nonnulls(object_anchor_id, object_concept_id, value_text, value_number,
                              value_date_start, value_date_end) = 0)
        OR (value_kind = 'date_range' AND num_nonnulls(value_date_start, value_date_end) >= 1
            AND num_nonnulls(object_anchor_id, object_concept_id, value_text, value_number,
                              value_boolean) = 0)
    ),
    CHECK (value_kind = 'date_range' OR value_date_text IS NULL),
    CHECK (value_kind = 'number' OR unit_concept_id IS NULL)
);

-- 29. Assertion ile destekleyen, curuten veya sinirlayan kanit arasindaki bag.
CREATE TABLE IF NOT EXISTS evidence (
    evidence_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    assertion_id uuid NOT NULL REFERENCES assertion(assertion_id) ON DELETE RESTRICT,
    stance text NOT NULL CHECK (stance IN ('supports', 'refutes', 'limits')),
    evidence_type_concept_id uuid REFERENCES concept(concept_id) ON DELETE RESTRICT,
    source_citation_id uuid REFERENCES source_citation(citation_id) ON DELETE RESTRICT,
    evidence_anchor_id uuid REFERENCES record_anchor(anchor_id) ON DELETE RESTRICT,
    observation_id uuid REFERENCES observation(observation_id) ON DELETE RESTRICT,
    note text,
    created_at timestamptz NOT NULL DEFAULT now(),
    CHECK (num_nonnulls(source_citation_id, evidence_anchor_id, observation_id) = 1)
);

-- 30. Oneri, resmi karar ve gerceklesmis mudahale asamalari tek semantikte ayrilir.
CREATE TABLE IF NOT EXISTS intervention (
    intervention_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    target_anchor_id uuid NOT NULL REFERENCES record_anchor(anchor_id) ON DELETE RESTRICT,
    intervention_type_concept_id uuid NOT NULL REFERENCES concept(concept_id) ON DELETE RESTRICT,
    intervention_stage text NOT NULL
        CHECK (intervention_stage IN ('proposal', 'official_decision', 'completed_action')),
    related_event_anchor_id uuid REFERENCES event(anchor_id) ON DELETE RESTRICT,
    related_document_anchor_id uuid REFERENCES cultural_document(anchor_id) ON DELETE RESTRICT,
    date_start date,
    date_end date,
    original_date_text text,
    responsible_anchor_id uuid REFERENCES record_anchor(anchor_id) ON DELETE RESTRICT,
    source_citation_id uuid NOT NULL REFERENCES source_citation(citation_id) ON DELETE RESTRICT,
    status_concept_id uuid REFERENCES concept(concept_id) ON DELETE RESTRICT,
    description text,
    created_at timestamptz NOT NULL DEFAULT now(),
    CHECK (date_start IS NULL OR date_end IS NULL OR date_start <= date_end),
    CHECK (intervention_stage <> 'completed_action' OR related_event_anchor_id IS NOT NULL)
);

-- 31. Yalniz seyrek, konuya ozgu ve JSON Schema ile uygulama katmaninda dogrulanan ayrintilar.
CREATE TABLE IF NOT EXISTS entity_profile (
    profile_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    target_anchor_id uuid NOT NULL REFERENCES record_anchor(anchor_id) ON DELETE RESTRICT,
    profile_type_concept_id uuid NOT NULL REFERENCES concept(concept_id) ON DELETE RESTRICT,
    schema_version text NOT NULL,
    schema_uri text NOT NULL,
    profile_data jsonb NOT NULL CHECK (jsonb_typeof(profile_data) = 'object'),
    validation_status text NOT NULL DEFAULT 'pending'
        CHECK (validation_status IN ('pending', 'valid', 'invalid')),
    source_citation_id uuid REFERENCES source_citation(citation_id) ON DELETE RESTRICT,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (target_anchor_id, profile_type_concept_id, schema_version)
);

-- 32. Web JSON yuklemeleri ve duzeltme onerileri icin editor onay kuyrugu.
CREATE TABLE IF NOT EXISTS edit_submission (
    submission_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    submitted_by_user_id uuid NOT NULL REFERENCES application_user(user_id) ON DELETE RESTRICT,
    target_anchor_id uuid REFERENCES record_anchor(anchor_id) ON DELETE RESTRICT,
    submission_kind text NOT NULL CHECK (submission_kind IN ('create', 'update', 'correct', 'import')),
    base_revision_no integer CHECK (base_revision_no IS NULL OR base_revision_no > 0),
    payload jsonb NOT NULL CHECK (jsonb_typeof(payload) IN ('object', 'array')),
    review_status text NOT NULL DEFAULT 'pending'
        CHECK (review_status IN ('pending', 'approved', 'rejected', 'needs_changes')),
    submitted_at timestamptz NOT NULL DEFAULT now(),
    reviewed_by_user_id uuid REFERENCES application_user(user_id) ON DELETE RESTRICT,
    reviewed_at timestamptz,
    review_note text,
    CHECK ((reviewed_at IS NULL) = (reviewed_by_user_id IS NULL)),
    CHECK ((review_status = 'pending' AND reviewed_at IS NULL)
        OR (review_status <> 'pending' AND reviewed_at IS NOT NULL)),
    CHECK (submission_kind = 'create' OR target_anchor_id IS NOT NULL)
);

-- Operasyonel tablo. Domain modelini degistirmeden satir bazli degisiklik gecmisi tutar.
CREATE TABLE IF NOT EXISTS audit_log (
    audit_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    table_schema text NOT NULL,
    table_name text NOT NULL,
    record_id text,
    operation text NOT NULL CHECK (operation IN ('INSERT', 'UPDATE', 'DELETE')),
    changed_by_user_id uuid REFERENCES application_user(user_id) ON DELETE SET NULL,
    database_user text NOT NULL DEFAULT current_user,
    request_id uuid,
    changed_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    transaction_id bigint NOT NULL DEFAULT txid_current(),
    old_data jsonb,
    new_data jsonb,
    CHECK (
        (operation = 'INSERT' AND old_data IS NULL AND new_data IS NOT NULL)
        OR (operation = 'UPDATE' AND old_data IS NOT NULL AND new_data IS NOT NULL)
        OR (operation = 'DELETE' AND old_data IS NOT NULL AND new_data IS NULL)
    )
);

-- Ortak updated_at davranisi.
CREATE OR REPLACE FUNCTION km.touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at := now();
    RETURN NEW;
END;
$$;

-- Her record_anchor degisikliginde web duzeltmelerinin dayandigi revizyonu ilerletir.
CREATE OR REPLACE FUNCTION km.bump_record_anchor_revision()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.revision_no := OLD.revision_no + 1;
    RETURN NEW;
END;
$$;

-- Concept agacinda bir kavramin kendi altina baglanmasini engeller.
CREATE OR REPLACE FUNCTION km.prevent_concept_parent_cycle()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    IF NEW.parent_concept_id IS NULL THEN
        RETURN NEW;
    END IF;

    IF EXISTS (
        WITH RECURSIVE ancestors AS (
            SELECT c.concept_id, c.parent_concept_id
            FROM km.concept AS c
            WHERE c.concept_id = NEW.parent_concept_id
              AND c.scheme_id = NEW.scheme_id
            UNION
            SELECT c.concept_id, c.parent_concept_id
            FROM km.concept AS c
            JOIN ancestors AS a ON c.concept_id = a.parent_concept_id
            WHERE c.scheme_id = NEW.scheme_id
        )
        SELECT 1 FROM ancestors WHERE concept_id = NEW.concept_id
    ) THEN
        RAISE EXCEPTION 'Concept hiyerarsisinde dongu olusturulamaz (concept_id=%).', NEW.concept_id;
    END IF;

    RETURN NEW;
END;
$$;

-- relation_type sozlugundeki izin verilen kaynak/hedef turlerini uygular.
CREATE OR REPLACE FUNCTION km.validate_entity_relation_scope()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
    relation_scheme_code text;
    allowed_subject_kind text;
    allowed_object_kind text;
    actual_subject_kind text;
    actual_object_kind text;
BEGIN
    SELECT cs.scheme_code,
           NULLIF(c.metadata ->> 'subject_kind', ''),
           NULLIF(c.metadata ->> 'object_kind', '')
      INTO relation_scheme_code, allowed_subject_kind, allowed_object_kind
      FROM km.concept AS c
      JOIN km.concept_scheme AS cs ON cs.scheme_id = c.scheme_id
     WHERE c.concept_id = NEW.relation_type_concept_id;

    IF relation_scheme_code IS DISTINCT FROM 'relation_type' THEN
        RAISE EXCEPTION 'entity_relation.relation_type_concept_id relation_type semasindan gelmelidir.';
    END IF;

    SELECT record_kind_code INTO actual_subject_kind
      FROM km.record_anchor WHERE anchor_id = NEW.subject_anchor_id;
    SELECT record_kind_code INTO actual_object_kind
      FROM km.record_anchor WHERE anchor_id = NEW.object_anchor_id;

    IF allowed_subject_kind IS NOT NULL AND allowed_subject_kind <> actual_subject_kind THEN
        RAISE EXCEPTION 'Iliski turu kaynakta % bekliyor; gelen %.',
            allowed_subject_kind, actual_subject_kind;
    END IF;
    IF allowed_object_kind IS NOT NULL AND allowed_object_kind <> actual_object_kind THEN
        RAISE EXCEPTION 'Iliski turu hedefte % bekliyor; gelen %.',
            allowed_object_kind, actual_object_kind;
    END IF;

    RETURN NEW;
END;
$$;

-- Backend, transaction basinda SET LOCAL km.application_user_id = '<uuid>' ve
-- istege bagli SET LOCAL km.request_id = '<uuid>' verirse audit kaydi web kullanicisini tanir.
CREATE OR REPLACE FUNCTION km.write_audit_log()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
    old_row jsonb;
    new_row jsonb;
    user_setting text;
    request_setting text;
    audit_user_id uuid;
    audit_request_id uuid;
    key_text text;
BEGIN
    old_row := CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN to_jsonb(OLD) ELSE NULL END;
    new_row := CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN to_jsonb(NEW) ELSE NULL END;

    user_setting := current_setting('km.application_user_id', true);
    IF user_setting ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' THEN
        SELECT user_id INTO audit_user_id
        FROM km.application_user
        WHERE user_id = user_setting::uuid;
    END IF;

    request_setting := current_setting('km.request_id', true);
    IF request_setting ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' THEN
        audit_request_id := request_setting::uuid;
    END IF;

    key_text := COALESCE(
        new_row ->> 'anchor_id', old_row ->> 'anchor_id',
        new_row ->> 'user_id', old_row ->> 'user_id',
        new_row ->> 'scheme_id', old_row ->> 'scheme_id',
        new_row ->> 'concept_id', old_row ->> 'concept_id',
        new_row ->> 'source_id', old_row ->> 'source_id',
        new_row ->> 'citation_id', old_row ->> 'citation_id',
        new_row ->> 'entity_name_id', old_row ->> 'entity_name_id',
        new_row ->> 'identifier_id', old_row ->> 'identifier_id',
        new_row ->> 'classification_id', old_row ->> 'classification_id',
        new_row ->> 'relation_id', old_row ->> 'relation_id',
        new_row ->> 'participation_id', old_row ->> 'participation_id',
        new_row ->> 'phase_id', old_row ->> 'phase_id',
        new_row ->> 'geometry_id', old_row ->> 'geometry_id',
        new_row ->> 'address_id', old_row ->> 'address_id',
        new_row ->> 'measurement_id', old_row ->> 'measurement_id',
        new_row ->> 'observation_id', old_row ->> 'observation_id',
        new_row ->> 'material_usage_id', old_row ->> 'material_usage_id',
        new_row ->> 'technique_assignment_id', old_row ->> 'technique_assignment_id',
        new_row ->> 'text_expression_id', old_row ->> 'text_expression_id',
        new_row ->> 'assertion_id', old_row ->> 'assertion_id',
        new_row ->> 'evidence_id', old_row ->> 'evidence_id',
        new_row ->> 'intervention_id', old_row ->> 'intervention_id',
        new_row ->> 'profile_id', old_row ->> 'profile_id',
        new_row ->> 'submission_id', old_row ->> 'submission_id'
    );

    INSERT INTO km.audit_log (
        table_schema, table_name, record_id, operation,
        changed_by_user_id, database_user, request_id, old_data, new_data
    ) VALUES (
        TG_TABLE_SCHEMA, TG_TABLE_NAME, key_text, TG_OP,
        audit_user_id, current_user, audit_request_id, old_row, new_row
    );

    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_record_anchor_touch_updated_at ON record_anchor;
CREATE TRIGGER trg_record_anchor_touch_updated_at
BEFORE UPDATE ON record_anchor
FOR EACH ROW EXECUTE FUNCTION km.touch_updated_at();

DROP TRIGGER IF EXISTS trg_record_anchor_bump_revision ON record_anchor;
CREATE TRIGGER trg_record_anchor_bump_revision
BEFORE UPDATE ON record_anchor
FOR EACH ROW EXECUTE FUNCTION km.bump_record_anchor_revision();

DROP TRIGGER IF EXISTS trg_concept_parent_cycle ON concept;
CREATE TRIGGER trg_concept_parent_cycle
BEFORE INSERT OR UPDATE OF parent_concept_id, scheme_id ON concept
FOR EACH ROW EXECUTE FUNCTION km.prevent_concept_parent_cycle();

DROP TRIGGER IF EXISTS trg_entity_relation_scope ON entity_relation;
CREATE TRIGGER trg_entity_relation_scope
BEFORE INSERT OR UPDATE OF subject_anchor_id, object_anchor_id, relation_type_concept_id ON entity_relation
FOR EACH ROW EXECUTE FUNCTION km.validate_entity_relation_scope();

DROP TRIGGER IF EXISTS trg_application_user_touch_updated_at ON application_user;
CREATE TRIGGER trg_application_user_touch_updated_at
BEFORE UPDATE ON application_user
FOR EACH ROW EXECUTE FUNCTION km.touch_updated_at();

DROP TRIGGER IF EXISTS trg_source_touch_updated_at ON source;
CREATE TRIGGER trg_source_touch_updated_at
BEFORE UPDATE ON source
FOR EACH ROW EXECUTE FUNCTION km.touch_updated_at();

DROP TRIGGER IF EXISTS trg_entity_profile_touch_updated_at ON entity_profile;
CREATE TRIGGER trg_entity_profile_touch_updated_at
BEFORE UPDATE ON entity_profile
FOR EACH ROW EXECUTE FUNCTION km.touch_updated_at();

-- FK, tarih, siniflandirma ve mekansal sorgu indeksleri.
CREATE INDEX IF NOT EXISTS idx_anchor_kind_status ON record_anchor(record_kind_code, record_status);
CREATE INDEX IF NOT EXISTS idx_anchor_display_label ON record_anchor(lower(display_label));
CREATE INDEX IF NOT EXISTS idx_concept_parent ON concept(parent_concept_id);
CREATE INDEX IF NOT EXISTS idx_concept_label ON concept(lower(preferred_label));
CREATE INDEX IF NOT EXISTS idx_asset_type ON heritage_asset(asset_type_concept_id);
CREATE INDEX IF NOT EXISTS idx_event_type_date ON event(event_type_concept_id, date_start, date_end);
CREATE INDEX IF NOT EXISTS idx_source_title ON source(lower(title));
CREATE INDEX IF NOT EXISTS idx_citation_source ON source_citation(source_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_citation_locator
    ON source_citation(source_id, locator_text, COALESCE(pdf_page, 0), COALESCE(figure_or_table, ''));
CREATE INDEX IF NOT EXISTS idx_inscription_host ON inscription(host_anchor_id);
CREATE INDEX IF NOT EXISTS idx_entity_name_target ON entity_name(target_anchor_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_preferred_name_per_language
    ON entity_name(target_anchor_id, COALESCE(language_code, '')) WHERE is_preferred;
CREATE INDEX IF NOT EXISTS idx_identifier_target ON entity_identifier(target_anchor_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_identifier_scope
    ON entity_identifier(target_anchor_id, identifier_type_concept_id,
                         identifier_value, COALESCE(issuing_organization_id, '00000000-0000-0000-0000-000000000000'::uuid));
CREATE INDEX IF NOT EXISTS idx_classification_target_axis
    ON classification_assignment(target_anchor_id, classification_axis_concept_id, value_concept_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_classification_occurrence
    ON classification_assignment(
        target_anchor_id, classification_axis_concept_id, value_concept_id,
        COALESCE(valid_from, '-infinity'::date), COALESCE(valid_to, 'infinity'::date),
        COALESCE(source_citation_id, '00000000-0000-0000-0000-000000000000'::uuid)
    );
CREATE INDEX IF NOT EXISTS idx_relation_subject_type
    ON entity_relation(subject_anchor_id, relation_type_concept_id);
CREATE INDEX IF NOT EXISTS idx_relation_object_type
    ON entity_relation(object_anchor_id, relation_type_concept_id);
CREATE INDEX IF NOT EXISTS idx_relation_dates ON entity_relation(valid_from, valid_to);
CREATE UNIQUE INDEX IF NOT EXISTS uq_relation_occurrence
    ON entity_relation(
        subject_anchor_id, object_anchor_id, relation_type_concept_id,
        COALESCE(subject_role_concept_id, '00000000-0000-0000-0000-000000000000'::uuid),
        COALESCE(object_role_concept_id, '00000000-0000-0000-0000-000000000000'::uuid),
        COALESCE(valid_from, '-infinity'::date), COALESCE(valid_to, 'infinity'::date),
        COALESCE(source_citation_id, '00000000-0000-0000-0000-000000000000'::uuid)
    );
CREATE INDEX IF NOT EXISTS idx_event_participant ON event_participation(participant_anchor_id);
CREATE INDEX IF NOT EXISTS idx_phase_subject_type ON temporal_phase(subject_anchor_id, phase_type_concept_id);
CREATE INDEX IF NOT EXISTS idx_phase_related ON temporal_phase(related_anchor_id);
CREATE INDEX IF NOT EXISTS idx_phase_dates ON temporal_phase(valid_from, valid_to);
CREATE UNIQUE INDEX IF NOT EXISTS uq_phase_occurrence
    ON temporal_phase(
        subject_anchor_id, phase_type_concept_id,
        COALESCE(phase_value_concept_id, '00000000-0000-0000-0000-000000000000'::uuid),
        COALESCE(related_anchor_id, '00000000-0000-0000-0000-000000000000'::uuid),
        COALESCE(valid_from, '-infinity'::date), COALESCE(valid_to, 'infinity'::date),
        COALESCE(source_citation_id, '00000000-0000-0000-0000-000000000000'::uuid)
    );
CREATE INDEX IF NOT EXISTS idx_geometry_target_role ON geometry_assertion(target_anchor_id, geometry_role_concept_id);
CREATE INDEX IF NOT EXISTS idx_geometry_gist ON geometry_assertion USING gist(geometry);
CREATE INDEX IF NOT EXISTS idx_address_target ON address_assignment(target_anchor_id);
CREATE INDEX IF NOT EXISTS idx_address_place ON address_assignment(place_anchor_id);
CREATE INDEX IF NOT EXISTS idx_measurement_target_type ON measurement(target_anchor_id, measurement_type_concept_id);
CREATE INDEX IF NOT EXISTS idx_observation_target_type ON observation(target_anchor_id, observation_type_concept_id);
CREATE INDEX IF NOT EXISTS idx_observation_event ON observation(event_anchor_id);
CREATE INDEX IF NOT EXISTS idx_material_target ON material_usage(target_anchor_id, material_concept_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_material_usage_occurrence
    ON material_usage(
        target_anchor_id, material_concept_id,
        COALESCE(role_concept_id, '00000000-0000-0000-0000-000000000000'::uuid),
        COALESCE(physical_material_anchor_id, '00000000-0000-0000-0000-000000000000'::uuid),
        COALESCE(event_anchor_id, '00000000-0000-0000-0000-000000000000'::uuid),
        COALESCE(source_citation_id, '00000000-0000-0000-0000-000000000000'::uuid)
    );
CREATE INDEX IF NOT EXISTS idx_technique_target ON technique_assignment(target_anchor_id, technique_concept_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_technique_assignment_occurrence
    ON technique_assignment(
        target_anchor_id, technique_concept_id,
        COALESCE(role_concept_id, '00000000-0000-0000-0000-000000000000'::uuid),
        COALESCE(event_anchor_id, '00000000-0000-0000-0000-000000000000'::uuid),
        COALESCE(sequence_no, 0),
        COALESCE(source_citation_id, '00000000-0000-0000-0000-000000000000'::uuid)
    );
CREATE INDEX IF NOT EXISTS idx_text_expression_inscription ON text_expression(inscription_anchor_id);
CREATE INDEX IF NOT EXISTS idx_assertion_subject_predicate ON assertion(subject_anchor_id, predicate_concept_id);
CREATE INDEX IF NOT EXISTS idx_assertion_object_anchor ON assertion(object_anchor_id);
CREATE INDEX IF NOT EXISTS idx_assertion_object_concept ON assertion(object_concept_id);
CREATE INDEX IF NOT EXISTS idx_evidence_assertion_stance ON evidence(assertion_id, stance);
CREATE INDEX IF NOT EXISTS idx_intervention_target_stage ON intervention(target_anchor_id, intervention_stage);
CREATE INDEX IF NOT EXISTS idx_profile_target_type ON entity_profile(target_anchor_id, profile_type_concept_id);
CREATE INDEX IF NOT EXISTS idx_profile_data_gin ON entity_profile USING gin(profile_data);
CREATE INDEX IF NOT EXISTS idx_submission_review ON edit_submission(review_status, submitted_at);
CREATE INDEX IF NOT EXISTS idx_submission_target ON edit_submission(target_anchor_id);
CREATE INDEX IF NOT EXISTS idx_audit_record_history
    ON audit_log(table_schema, table_name, record_id, changed_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_user_time
    ON audit_log(changed_by_user_id, changed_at DESC)
    WHERE changed_by_user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_audit_request
    ON audit_log(request_id)
    WHERE request_id IS NOT NULL;

-- Temel okunabilirlik view'i; uygulama tablosu sayisina dahil degildir.
CREATE OR REPLACE VIEW v_anchor_summary AS
SELECT
    a.anchor_id,
    a.record_kind_code,
    a.display_label,
    a.record_status,
    a.access_level,
    a.revision_no,
    a.updated_at
FROM record_anchor AS a
WHERE a.record_status <> 'withdrawn';

-- Baslangic sozlukleri. Yeni alanlar icin yeni tablo acmak yerine uygun semaya concept eklenir.
INSERT INTO concept_scheme (scheme_code, title, version, description) VALUES
    ('asset_type', 'Kulturel miras varligi turleri', '1.0', 'Tasinir ve tasinmaz miras siniflari.'),
    ('relation_type', 'Varliklar arasi iliski turleri', '1.0', 'Kaynak/hedef kapsami metadata ile tanimli iliskiler.'),
    ('role', 'Kisi, kurum ve olay rolleri', '1.0', 'Mimar, bani, usta, arastirmaci ve katilim rolleri.'),
    ('event_type', 'Olay turleri', '1.0', 'Uretim, insa, onarim, tasima, hasar ve belgeleme olaylari.'),
    ('document_type', 'Dokuman turleri', '1.0', 'Arsiv belgesi, yazma, yayin, harita, plan ve cizim.'),
    ('media_type', 'Medya turleri', '1.0', 'Fotograf, gravur, tarama, ses, video ve 3B model.'),
    ('profile_type', 'Uzmanlik profili turleri', '1.0', 'Surumlu JSON Schema ile dogrulanacak seyrek alan profilleri.'),
    ('observation_type', 'Gozlem turleri', '1.0', 'Durum, hasar, risk, mimari gozlem ve bilimsel analiz.'),
    ('unit', 'Olcu birimleri', '1.0', 'Olcum ve miktarlarda kullanilan kontrollu birimler.'),
    ('place_type', 'Yer turleri', '1.0', 'Modern ve tarihi idari/cografi yer seviyeleri.'),
    ('organization_type', 'Kurum turleri', '1.0', 'Vakif, lonca, atolye, muze, arsiv ve kamu kurumu.'),
    ('source_type', 'Kaynak turleri', '1.0', 'Yayin, arsiv, katalog, saha ve sayisal kaynak turleri.'),
    ('name_type', 'Ad turleri', '1.0', 'Resmi, tarihi, yerel ve alternatif adlar.'),
    ('identifier_type', 'Tanimlayici turleri', '1.0', 'Envanter, katalog, raf ve harici sistem numaralari.'),
    ('measurement_type', 'Olcum turleri', '1.0', 'Uzunluk, genislik, yukseklik, cap, agirlik ve kapasite.'),
    ('material', 'Malzeme sozlugu', '1.0', 'Mimari ve zanaat malzemeleri.'),
    ('technique', 'Teknik sozlugu', '1.0', 'Yapim, uretim, bezeme ve onarim teknikleri.'),
    ('intervention_type', 'Mudahale turleri', '1.0', 'Koruma, onarim, restorasyon ve tasima mudahaleleri.'),
    ('license', 'Lisans ve kullanim haklari', '1.0', 'Medya ve dokuman yeniden kullanim kosullari.'),
    ('inscription_type', 'Kitabe ve yazit turleri', '1.0', 'Yapi kitabesi, mezar yaziti, imza, muhurlu ve benzeri yazitlar.')
ON CONFLICT (scheme_code, version) DO NOTHING;

-- Diger tasarimdaki yararli mimari ve zanaat kategorileri mevcut concept agacina uyarlanir.
DO $seed_asset_types$
DECLARE
    target_scheme_id uuid;
    parent_id uuid;
    item record;
BEGIN
    SELECT scheme_id INTO target_scheme_id
    FROM concept_scheme
    WHERE scheme_code = 'asset_type' AND version = '1.0';

    FOR item IN
        SELECT * FROM (VALUES
            (10, 'cultural_heritage_asset', 'Kulturel Miras Varligi', NULL::text),
            (20, 'movable_heritage', 'Tasinabilir Kultur Mirasi', 'cultural_heritage_asset'),
            (30, 'immovable_heritage', 'Tasinmaz Kultur Mirasi', 'cultural_heritage_asset'),
            (40, 'stone_earth_glass_crafts', 'Tas, Toprak ve Cam Odakli Zanaatlar', 'movable_heritage'),
            (50, 'metal_mining_crafts', 'Metal ve Maden Odakli Zanaatlar', 'movable_heritage'),
            (60, 'wood_plant_fiber_crafts', 'Ahsap, Agac ve Bitkisel Lif Odakli Zanaatlar', 'movable_heritage'),
            (70, 'textile_leather_fiber_crafts', 'Tekstil, Deri ve Lif Odakli Zanaatlar', 'movable_heritage'),
            (80, 'paper_book_writing_crafts', 'Kagit, Kitap ve Yazi Odakli Zanaatlar', 'movable_heritage'),
            (90, 'daily_life_tools', 'Gunluk Yasam Araclari', 'movable_heritage'),
            (100, 'religious_sacred_structures', 'Dini ve Kutsal Yapilar', 'immovable_heritage'),
            (110, 'military_defense_structures', 'Askeri ve Savunma Yapilari', 'immovable_heritage'),
            (120, 'civil_public_structures', 'Sivil ve Kamusal Yapilar', 'immovable_heritage'),
            (130, 'commercial_economic_structures', 'Ticari ve Ekonomik Yapilar', 'immovable_heritage'),
            (140, 'infrastructure_engineering', 'Altyapi ve Muhendislik Yapilari', 'immovable_heritage'),
            (150, 'residential_architecture', 'Konut Mimarisi ve Meskenler', 'immovable_heritage'),
            (160, 'monumental_structures_sculptures', 'Anitsal Yapilar ve Heykeller', 'immovable_heritage'),
            (210, 'tile_ceramic_craft', 'Cinicilik ve Seramik Zanaati', 'stone_earth_glass_crafts'),
            (211, 'pottery', 'Comlekcilik', 'stone_earth_glass_crafts'),
            (212, 'stone_carving', 'Tas Isciligi ve Oymaciligi', 'stone_earth_glass_crafts'),
            (213, 'meerschaum_oltu_craft', 'Luletasi ve Oltu Tasi Zanaati', 'stone_earth_glass_crafts'),
            (214, 'blown_glass', 'Ufleme Cam', 'stone_earth_glass_crafts'),
            (215, 'glass_beadwork', 'Cam Boncukculuk', 'stone_earth_glass_crafts'),
            (216, 'stained_glass', 'Vitray', 'stone_earth_glass_crafts'),
            (220, 'jewelry', 'Kuyumculuk, Mucevher ve Taki Zanaati', 'metal_mining_crafts'),
            (221, 'blacksmith_farriery', 'Demircilik ve Nalbantlik', 'metal_mining_crafts'),
            (222, 'coins', 'Sikkeler', 'metal_mining_crafts'),
            (223, 'copperware_cauldron', 'Bakircilik ve Kazancilik', 'metal_mining_crafts'),
            (224, 'filigree', 'Telkari', 'metal_mining_crafts'),
            (225, 'niello_inlay', 'Savat Kakma', 'metal_mining_crafts'),
            (226, 'weapons_blades', 'Silahlar ve Bicak/Kilic Yapimi', 'metal_mining_crafts'),
            (230, 'wood_carving_inlay', 'Ahsap Oymacilik ve Kakmacilik', 'wood_plant_fiber_crafts'),
            (231, 'kundekari', 'Kundekari', 'wood_plant_fiber_crafts'),
            (232, 'basketry_mat_weaving', 'Sepetcilik ve Hasir Oruculugu', 'wood_plant_fiber_crafts'),
            (233, 'walking_stick_spoon', 'Bastonculuk ve Kasikcilik', 'wood_plant_fiber_crafts'),
            (240, 'clothing', 'Kiyafetler', 'textile_leather_fiber_crafts'),
            (241, 'traditional_weaving', 'Geleneksel Dokumacilik', 'textile_leather_fiber_crafts'),
            (242, 'traditional_leatherwork', 'Geleneksel Dericilik', 'textile_leather_fiber_crafts'),
            (243, 'feltmaking', 'Kececilik', 'textile_leather_fiber_crafts'),
            (244, 'needle_lace_embroidery', 'Igne Oyasi ve Nakis Zanaati', 'textile_leather_fiber_crafts'),
            (250, 'marbling', 'Ebru Sanati', 'paper_book_writing_crafts'),
            (251, 'calligraphy', 'Hat Sanati', 'paper_book_writing_crafts'),
            (252, 'illumination', 'Tezhip', 'paper_book_writing_crafts'),
            (253, 'miniature', 'Minyatur', 'paper_book_writing_crafts'),
            (254, 'bookbinding', 'Ciltcilik', 'paper_book_writing_crafts'),
            (300, 'temples_sacred_areas', 'Tapinaklar ve Kutsal Alanlar', 'religious_sacred_structures'),
            (301, 'mosques_complexes', 'Camiler ve Kulliyeler', 'religious_sacred_structures'),
            (302, 'churches_cathedrals_chapels', 'Kiliseler, Katedraller ve Sapeller', 'religious_sacred_structures'),
            (303, 'monasteries_lodges', 'Manastirlar ve Tekkeler', 'religious_sacred_structures'),
            (304, 'synagogues', 'Havralar ve Sinagoglar', 'religious_sacred_structures'),
            (305, 'cemeteries_tombs_mausoleums', 'Mezarlik, Turbe, Kumbet ve Anit Mezarlar', 'religious_sacred_structures'),
            (306, 'cemeteries', 'Mezarliklar ve Hazireler', 'cemeteries_tombs_mausoleums'),
            (307, 'graves', 'Mezarlar', 'cemeteries_tombs_mausoleums'),
            (308, 'tombs', 'Turbeler', 'cemeteries_tombs_mausoleums'),
            (309, 'kumbets', 'Kumbetler', 'cemeteries_tombs_mausoleums'),
            (310, 'monumental_tombs', 'Anit Mezarlar', 'cemeteries_tombs_mausoleums'),
            (320, 'fortresses_walls', 'Kaleler ve Surlar', 'military_defense_structures'),
            (321, 'citadels_towers', 'Hisarlar ve Kuleler', 'military_defense_structures'),
            (322, 'barracks_bastions', 'Kislalar ve Tabyalar', 'military_defense_structures'),
            (323, 'arsenals_shelters', 'Cephanelikler ve Siginaklar', 'military_defense_structures'),
            (330, 'palaces_pavilions_kiosks', 'Saraylar, Kasirlar ve Koskler', 'civil_public_structures'),
            (331, 'government_courthouses', 'Hukumet Konaklari ve Adliyeler', 'civil_public_structures'),
            (332, 'clock_towers', 'Saat Kuleleri', 'civil_public_structures'),
            (333, 'educational_structures', 'Egitim Yapilari ve Medreseler', 'civil_public_structures'),
            (334, 'health_structures', 'Saglik Yapilari ve Darussifalar', 'civil_public_structures'),
            (340, 'caravanserais_inns', 'Kervansaraylar ve Hanlar', 'commercial_economic_structures'),
            (341, 'bedestens_bazaars', 'Bedestenler ve Kapali Carsilar', 'commercial_economic_structures'),
            (342, 'kapans_cellars', 'Kapanlar ve Mahzenler', 'commercial_economic_structures'),
            (350, 'aqueducts_cisterns', 'Su Kemerleri ve Sarniclar', 'infrastructure_engineering'),
            (351, 'historic_bridges', 'Tarihi Kopruler', 'infrastructure_engineering'),
            (352, 'fountains_sebils_shadirvans', 'Cesmeler, Sebiller ve Sadirvanlar', 'infrastructure_engineering'),
            (353, 'lighthouses_ports', 'Deniz Fenerleri ve Liman Yapilari', 'infrastructure_engineering'),
            (354, 'water_towers_baths', 'Su Terazileri ve Hamamlar', 'infrastructure_engineering'),
            (355, 'waterways_networks', 'Su Yollari ve Isale Sistemleri', 'infrastructure_engineering'),
            (360, 'historic_houses_mansions', 'Tarihi Evler ve Konaklar', 'residential_architecture'),
            (361, 'waterside_mansions', 'Yalilar', 'residential_architecture'),
            (370, 'obelisks', 'Obeliskler ve Dikilitaslar', 'monumental_structures_sculptures'),
            (371, 'triumphal_arches', 'Zafer Taklari', 'monumental_structures_sculptures'),
            (372, 'historic_sculptures_reliefs', 'Tarihi Heykeller ve Kabartmalar', 'monumental_structures_sculptures')
        ) AS seed(sort_order, code, label, parent_code)
        ORDER BY sort_order
    LOOP
        parent_id := NULL;
        IF item.parent_code IS NOT NULL THEN
            SELECT concept_id INTO parent_id
            FROM concept
            WHERE scheme_id = target_scheme_id AND concept_code = item.parent_code;
        END IF;

        INSERT INTO concept (
            scheme_id, parent_concept_id, concept_code, preferred_label,
            language_code, metadata
        ) VALUES (
            target_scheme_id, parent_id, item.code, item.label, 'tr',
            jsonb_build_object('sort_order', item.sort_order, 'seed_source', 'osmanli_mirasi_ortak_veritabani_pg_v2')
        )
        ON CONFLICT (scheme_id, concept_code) DO UPDATE
        SET parent_concept_id = EXCLUDED.parent_concept_id,
            preferred_label = EXCLUDED.preferred_label,
            metadata = concept.metadata || EXCLUDED.metadata
        WHERE concept.parent_concept_id IS DISTINCT FROM EXCLUDED.parent_concept_id
           OR concept.preferred_label IS DISTINCT FROM EXCLUDED.preferred_label
           OR concept.metadata IS DISTINCT FROM concept.metadata || EXCLUDED.metadata;
    END LOOP;
END;
$seed_asset_types$;

-- Iliski turleri ters etiket, simetri ve izin verilen anchor turleriyle birlikte gelir.
WITH relation_scheme AS (
    SELECT scheme_id FROM concept_scheme
    WHERE scheme_code = 'relation_type' AND version = '1.0'
), seed(code, label, inverse_label, relation_group, subject_kind, object_kind, is_symmetric, is_transitive) AS (
    VALUES
        ('part_of', 'parcasidir', 'parcasi vardir', 'structural', 'heritage_asset', 'heritage_asset', false, true),
        ('adjacent_to', 'bitisiktir', 'bitisiktir', 'spatial', 'heritage_asset', 'heritage_asset', true, false),
        ('successor_of', 'ardilidir', 'onculudur', 'historical', 'heritage_asset', 'heritage_asset', false, true),
        ('architect_of', 'mimaridir', 'mimari vardir', 'creation', 'person', 'heritage_asset', false, false),
        ('patron_of', 'banisidir', 'banisi vardir', 'creation', 'person', 'heritage_asset', false, false),
        ('maker_of', 'ustasi veya ureticisidir', 'ustasi veya ureticisi vardir', 'creation', 'person', 'heritage_asset', false, false),
        ('artist_of', 'sanatcisidir', 'sanatcisi vardir', 'creation', 'person', 'heritage_asset', false, false),
        ('restorer_of', 'restoratorudur', 'restoratoru vardir', 'conservation', 'person', 'heritage_asset', false, false),
        ('member_of', 'uyesidir', 'uyesi vardir', 'organization', 'person', 'organization', false, false),
        ('employed_by', 'calisir veya gorevlidir', 'calisani veya gorevlisi vardir', 'organization', 'person', 'organization', false, false),
        ('master_of', 'ustasidir', 'talebesidir', 'person', 'person', 'person', false, false),
        ('kin_of', 'akrabasidir', 'akrabasidir', 'person', 'person', 'person', true, false),
        ('located_in', 'konumlanir', 'barindirir', 'spatial', NULL, 'place', false, false),
        ('born_in', 'dogmustur', 'dogum yeridir', 'person_place', 'person', 'place', false, false),
        ('died_in', 'olmustur', 'olum yeridir', 'person_place', 'person', 'place', false, false),
        ('occurred_at', 'gerceklesmistir', 'olaya ev sahipligi yapar', 'event_place', 'event', 'place', false, false),
        ('documents', 'belgeler', 'belgelenir', 'documentation', 'media_asset', NULL, false, false),
        ('depicts', 'tasvir eder', 'tasvir edilir', 'representation', NULL, NULL, false, false),
        ('derived_from', 'turemistir veya kopyasidir', 'kaynagidir', 'derivation', NULL, NULL, false, false),
        ('held_by', 'koleksiyonunda veya muhafazasindadir', 'muhafazasinda eser vardir', 'collection', NULL, 'organization', false, false),
        ('associated_with', 'iliskilidir', 'iliskilidir', 'general', NULL, NULL, true, false)
)
INSERT INTO concept (scheme_id, concept_code, preferred_label, language_code, metadata)
SELECT rs.scheme_id, seed.code, seed.label, 'tr',
       jsonb_strip_nulls(jsonb_build_object(
           'inverse_label', seed.inverse_label,
           'relation_group', seed.relation_group,
           'subject_kind', seed.subject_kind,
           'object_kind', seed.object_kind,
           'symmetric', seed.is_symmetric,
           'transitive', seed.is_transitive,
           'seed_source', 'osmanli_mirasi_ortak_veritabani_pg_v2'
       ))
FROM relation_scheme AS rs CROSS JOIN seed
ON CONFLICT (scheme_id, concept_code) DO NOTHING;

-- Formlarda hemen kullanilabilecek ortak olay, medya, dokuman, rol, gozlem, birim ve profil degerleri.
WITH seed(scheme_code, code, label) AS (
    VALUES
        ('role', 'architect', 'Mimar'),
        ('role', 'patron', 'Bani / Yaptiran'),
        ('role', 'artist_craftsperson', 'Sanatci / Zanaatkar'),
        ('role', 'restorer', 'Restorator'),
        ('role', 'researcher', 'Arastirmaci'),
        ('role', 'represented_person', 'Temsil Edilen Kisi'),
        ('event_type', 'construction_production', 'Insa / Uretim'),
        ('event_type', 'repair_restoration', 'Onarim / Restorasyon'),
        ('event_type', 'relocation_reerection', 'Tasima / Yeniden Dikme'),
        ('event_type', 'destruction_damage', 'Yikim / Hasar'),
        ('event_type', 'war_siege', 'Savas / Kusatma'),
        ('event_type', 'function_change', 'Islev Degisikligi'),
        ('event_type', 'discovery_excavation', 'Kesif / Kazi'),
        ('event_type', 'documentation_exhibition', 'Belgeleme / Sergileme'),
        ('document_type', 'archive_document', 'Arsiv Belgesi'),
        ('document_type', 'manuscript_book', 'Yazma / Kitap'),
        ('document_type', 'research_publication', 'Arastirma Yayini'),
        ('document_type', 'map_plan_drawing', 'Harita / Plan / Cizim'),
        ('media_type', 'photograph', 'Fotograf'),
        ('media_type', 'engraving_illustration', 'Gravur / Resim'),
        ('media_type', 'scan_drawing', 'Tarama / Cizim'),
        ('media_type', 'audio_video', 'Ses / Video'),
        ('media_type', 'model_3d', '3B Model'),
        ('organization_type', 'foundation', 'Vakif'),
        ('organization_type', 'guild_workshop', 'Lonca / Atolye'),
        ('organization_type', 'museum_collection', 'Muze / Koleksiyon'),
        ('organization_type', 'religious_community', 'Dini Kurum / Topluluk'),
        ('organization_type', 'public_authority', 'Kamu Kurumu'),
        ('organization_type', 'military_unit', 'Askeri Birlik'),
        ('place_type', 'modern_country', 'Modern Ulke'),
        ('place_type', 'modern_province', 'Modern Il / Eyalet'),
        ('place_type', 'modern_district', 'Modern Ilce'),
        ('place_type', 'modern_city', 'Modern Sehir'),
        ('place_type', 'modern_neighborhood_village', 'Modern Mahalle / Koy'),
        ('place_type', 'historic_country', 'Tarihi Devlet / Ulke'),
        ('place_type', 'historic_province', 'Tarihi Eyalet / Vilayet'),
        ('place_type', 'historic_district', 'Tarihi Kaza / Nahiye'),
        ('place_type', 'historic_city', 'Tarihi Sehir'),
        ('place_type', 'historic_neighborhood_village', 'Tarihi Mahalle / Koy / Mevki'),
        ('source_type', 'book', 'Kitap'),
        ('source_type', 'article', 'Makale'),
        ('source_type', 'thesis', 'Tez'),
        ('source_type', 'archive_document', 'Arsiv Belgesi'),
        ('source_type', 'manuscript', 'Yazma Eser'),
        ('source_type', 'catalog', 'Katalog / Envanter'),
        ('source_type', 'map_plan', 'Harita / Plan'),
        ('source_type', 'inscription', 'Kitabe / Yazit'),
        ('source_type', 'photograph', 'Fotograf'),
        ('source_type', 'interview', 'Gorusme'),
        ('source_type', 'website', 'Web Sitesi'),
        ('source_type', 'dataset', 'Veri Seti'),
        ('source_type', 'report', 'Rapor'),
        ('name_type', 'official_name', 'Resmi Ad'),
        ('name_type', 'historical_name', 'Tarihi Ad'),
        ('name_type', 'local_name', 'Yerel Ad'),
        ('name_type', 'alternative_name', 'Alternatif Ad'),
        ('name_type', 'foreign_name', 'Yabanci Dilde Ad'),
        ('measurement_type', 'length', 'Uzunluk'),
        ('measurement_type', 'width', 'Genislik'),
        ('measurement_type', 'height', 'Yukseklik'),
        ('measurement_type', 'depth', 'Derinlik'),
        ('measurement_type', 'diameter', 'Cap'),
        ('measurement_type', 'area', 'Alan'),
        ('measurement_type', 'weight', 'Agirlik'),
        ('measurement_type', 'capacity', 'Kapasite'),
        ('intervention_type', 'conservation', 'Konservasyon'),
        ('intervention_type', 'repair', 'Onarim'),
        ('intervention_type', 'restoration', 'Restorasyon'),
        ('intervention_type', 'reconstruction', 'Rekonstruksiyon'),
        ('intervention_type', 'relocation', 'Tasima'),
        ('intervention_type', 'preventive_conservation', 'Onleyici Koruma'),
        ('inscription_type', 'building_inscription', 'Yapi Kitabesi'),
        ('inscription_type', 'grave_inscription', 'Mezar Yaziti'),
        ('inscription_type', 'signature', 'Imza'),
        ('inscription_type', 'seal_stamp', 'Muhur / Damga'),
        ('observation_type', 'condition', 'Fiziksel Durum'),
        ('observation_type', 'damage', 'Bozulma / Hasar'),
        ('observation_type', 'risk', 'Risk Degerlendirmesi'),
        ('observation_type', 'architectural_observation', 'Mimari Gozlem'),
        ('observation_type', 'scientific_analysis', 'Bilimsel Analiz'),
        ('unit', 'millimetre', 'Milimetre'),
        ('unit', 'centimetre', 'Santimetre'),
        ('unit', 'metre', 'Metre'),
        ('unit', 'square_metre', 'Metrekare'),
        ('unit', 'kilogram', 'Kilogram'),
        ('unit', 'litre', 'Litre'),
        ('unit', 'piece', 'Adet'),
        ('profile_type', 'architectural_profile', 'Mimari Profil'),
        ('profile_type', 'religious_profile', 'Dini ve Kutsal Yapi Profili'),
        ('profile_type', 'military_profile', 'Askeri ve Savunma Profili'),
        ('profile_type', 'monument_profile', 'Anit / Heykel Profili'),
        ('profile_type', 'water_structure_profile', 'Su Yapisi Profili'),
        ('profile_type', 'bridge_profile', 'Kopru Profili'),
        ('profile_type', 'port_lighthouse_profile', 'Liman / Deniz Feneri Profili'),
        ('profile_type', 'residential_profile', 'Konut / Konak / Yali Profili'),
        ('profile_type', 'ceramic_profile', 'Seramik / Cini Profili'),
        ('profile_type', 'stonework_profile', 'Tas Isciligi Profili'),
        ('profile_type', 'metalwork_profile', 'Metal / Maden Profili'),
        ('profile_type', 'woodwork_profile', 'Ahsap / Bitkisel Lif Profili'),
        ('profile_type', 'textile_profile', 'Tekstil / Deri / Lif Profili'),
        ('profile_type', 'book_art_profile', 'Kitap ve Geleneksel Sanat Profili'),
        ('profile_type', 'marbling_profile', 'Ebru Profili'),
        ('profile_type', 'calligraphy_profile', 'Hat Profili'),
        ('profile_type', 'illumination_profile', 'Tezhip Profili'),
        ('profile_type', 'miniature_profile', 'Minyatur Profili'),
        ('profile_type', 'binding_profile', 'Ciltcilik Profili'),
        ('profile_type', 'glass_profile', 'Cam Profili'),
        ('profile_type', 'grave_profile', 'Mezar Profili')
)
INSERT INTO concept (scheme_id, concept_code, preferred_label, language_code, metadata)
SELECT cs.scheme_id, seed.code, seed.label, 'tr',
       jsonb_build_object('seed_source', 'osmanli_mirasi_ortak_veritabani_pg_v2')
FROM seed
JOIN concept_scheme AS cs
  ON cs.scheme_code = seed.scheme_code AND cs.version = '1.0'
ON CONFLICT (scheme_id, concept_code) DO NOTHING;

-- Uygulama ve raporlama icin okunabilir gorunumler.
CREATE OR REPLACE VIEW v_heritage_asset_overview AS
SELECT a.anchor_id,
       a.display_label,
       t.concept_code AS asset_type_code,
       t.preferred_label AS asset_type_label,
       h.is_movable,
       h.short_description,
       a.record_status,
       a.access_level,
       a.revision_no,
       a.updated_at
FROM heritage_asset AS h
JOIN record_anchor AS a ON a.anchor_id = h.anchor_id
LEFT JOIN concept AS t ON t.concept_id = h.asset_type_concept_id
WHERE a.record_status <> 'withdrawn';

CREATE OR REPLACE VIEW v_entity_relation_readable AS
SELECT r.relation_id,
       r.subject_anchor_id,
       s.display_label AS subject_label,
       s.record_kind_code AS subject_kind,
       rt.concept_code AS relation_type_code,
       rt.preferred_label AS relation_type_label,
       rt.metadata ->> 'inverse_label' AS inverse_label,
       r.object_anchor_id,
       o.display_label AS object_label,
       o.record_kind_code AS object_kind,
       r.valid_from,
       r.valid_to,
       r.certainty_code,
       r.relation_status,
       r.source_citation_id
FROM entity_relation AS r
JOIN record_anchor AS s ON s.anchor_id = r.subject_anchor_id
JOIN record_anchor AS o ON o.anchor_id = r.object_anchor_id
JOIN concept AS rt ON rt.concept_id = r.relation_type_concept_id;

CREATE OR REPLACE VIEW v_pending_edit_submission AS
SELECT es.submission_id,
       es.submission_kind,
       es.target_anchor_id,
       a.display_label AS target_label,
       es.base_revision_no,
       es.submitted_at,
       u.display_name AS submitted_by,
       u.email AS submitted_by_email,
       es.payload
FROM edit_submission AS es
JOIN application_user AS u ON u.user_id = es.submitted_by_user_id
LEFT JOIN record_anchor AS a ON a.anchor_id = es.target_anchor_id
WHERE es.review_status = 'pending';

CREATE OR REPLACE VIEW v_media_catalog AS
SELECT m.anchor_id,
       a.display_label,
       mt.concept_code AS media_type_code,
       mt.preferred_label AS media_type_label,
       m.storage_uri,
       m.mime_type,
       m.byte_size,
       m.sha256_hex,
       m.rights_statement,
       m.captured_at,
       a.record_status,
       a.access_level
FROM media_asset AS m
JOIN record_anchor AS a ON a.anchor_id = m.anchor_id
JOIN concept AS mt ON mt.concept_id = m.media_type_concept_id
WHERE a.record_status <> 'withdrawn';

CREATE OR REPLACE VIEW v_audit_history AS
SELECT al.audit_id,
       al.table_name,
       al.record_id,
       al.operation,
       al.changed_at,
       al.request_id,
       al.database_user,
       au.display_name AS application_user,
       al.old_data,
       al.new_data
FROM audit_log AS al
LEFT JOIN application_user AS au ON au.user_id = al.changed_by_user_id;

-- Seed islemlerinden sonra audit etkinlestirilir; ilk kurulum sozlukleri logu sisirmez.
DO $audit_triggers$
DECLARE
    audited_table text;
BEGIN
    FOREACH audited_table IN ARRAY ARRAY[
        'application_user', 'record_anchor', 'concept_scheme', 'concept',
        'heritage_asset', 'person', 'organization', 'place', 'event',
        'cultural_document', 'media_asset', 'source', 'source_citation', 'inscription',
        'entity_name', 'entity_identifier', 'classification_assignment', 'entity_relation',
        'event_participation', 'temporal_phase', 'geometry_assertion', 'address_assignment',
        'measurement', 'observation', 'material_usage', 'technique_assignment',
        'text_expression', 'assertion', 'evidence', 'intervention', 'entity_profile',
        'edit_submission'
    ]
    LOOP
        EXECUTE format('DROP TRIGGER IF EXISTS %I ON km.%I',
                       'trg_' || audited_table || '_audit', audited_table);
        EXECUTE format(
            'CREATE TRIGGER %I AFTER INSERT OR UPDATE OR DELETE ON km.%I '
            || 'FOR EACH ROW EXECUTE FUNCTION km.write_audit_log()',
            'trg_' || audited_table || '_audit', audited_table
        );
    END LOOP;
END;
$audit_triggers$;

-- Kurulum sonunda kritik nesne, seed ve audit triggerlarini dogrular.
DO $installation_check$
DECLARE
    physical_table_count integer;
    asset_type_count integer;
    relation_type_count integer;
    audit_trigger_count integer;
BEGIN
    SELECT count(*) INTO physical_table_count
    FROM information_schema.tables
    WHERE table_schema = 'km' AND table_type = 'BASE TABLE';

    SELECT count(*) INTO asset_type_count
    FROM concept AS c
    JOIN concept_scheme AS cs ON cs.scheme_id = c.scheme_id
    WHERE cs.scheme_code = 'asset_type' AND cs.version = '1.0';

    SELECT count(*) INTO relation_type_count
    FROM concept AS c
    JOIN concept_scheme AS cs ON cs.scheme_id = c.scheme_id
    WHERE cs.scheme_code = 'relation_type' AND cs.version = '1.0';

    SELECT count(*) INTO audit_trigger_count
    FROM pg_trigger AS t
    JOIN pg_class AS cl ON cl.oid = t.tgrelid
    JOIN pg_namespace AS ns ON ns.oid = cl.relnamespace
    WHERE ns.nspname = 'km'
      AND t.tgname LIKE 'trg_%_audit'
      AND NOT t.tgisinternal;

    IF physical_table_count < 33 THEN
        RAISE EXCEPTION 'Kurulum eksik: km semasinda en az 33 fiziksel tablo bekleniyor; bulunan %.', physical_table_count;
    END IF;
    IF asset_type_count < 78 THEN
        RAISE EXCEPTION 'Kurulum eksik: en az 78 asset_type baslangic kavrami bekleniyor; bulunan %.', asset_type_count;
    END IF;
    IF relation_type_count < 21 THEN
        RAISE EXCEPTION 'Kurulum eksik: en az 21 relation_type baslangic kavrami bekleniyor; bulunan %.', relation_type_count;
    END IF;
    IF audit_trigger_count < 32 THEN
        RAISE EXCEPTION 'Kurulum eksik: 32 audit triggeri bekleniyor; bulunan %.', audit_trigger_count;
    END IF;
END;
$installation_check$;

COMMENT ON TABLE application_user IS 'Web uygulamasi kullanicisi; parola yerine harici kimlik saglayici subject degeri saklanir.';
COMMENT ON TABLE record_anchor IS 'Butun generic iliskilerin gercek foreign key ile hedefledigi ortak ust kimlik.';
COMMENT ON COLUMN record_anchor.record_kind_code IS 'Alt tablonun kapali tur kodu; alt tabloda composite FK ve CHECK ile dogrulanir.';
COMMENT ON COLUMN record_anchor.revision_no IS 'Web duzeltmelerinde iyimser eszamanlilik kontrolu icin artan revizyon numarasi.';
COMMENT ON TABLE concept_scheme IS 'Kategori, rol, malzeme, teknik, iliski, birim ve durum sozluklerinin surumlu semasi.';
COMMENT ON TABLE concept IS 'Bir concept_scheme icindeki hiyerarsik kontrollu kavram.';
COMMENT ON TABLE heritage_asset IS 'Yapi, tasinir, parca, koleksiyon, mezar, mezarlik ve benzeri fiziksel/kavramsal miras kimligi.';
COMMENT ON TABLE person IS 'Kisi kimligi; roller ve iliskiler bu tabloda kolon olarak gomulmez.';
COMMENT ON TABLE organization IS 'Kurum, topluluk, atelye, lonca, birlik veya isletme kimligi; fiziksel yapidan ayridir.';
COMMENT ON TABLE place IS 'Modern ve tarihi yerler icin tek kimlik tablosu; hiyerarsi entity_relation ile tarihlenir.';
COMMENT ON TABLE event IS 'Gerceklesmis uretim, insa, defin, tasima, onarim, analiz ve benzeri olay.';
COMMENT ON TABLE cultural_document IS 'Kendisi tarihi/kulturel kayit veya miras nesnesi olan belge.';
COMMENT ON TABLE media_asset IS 'Fotograf, cizim, harita, ses, video, 3B model veya sayisal dosya ust verisi.';
COMMENT ON TABLE source IS 'Arastirmada bilgi kaynagi olarak kullanilan yayin, arsiv kaydi, katalog, web veya sozlu kaynak.';
COMMENT ON TABLE source_citation IS 'Bir source icindeki sayfa, varak, satir, sekil veya kayit locatoru.';
COMMENT ON TABLE inscription IS 'Fiziksel kitabe/yazit kimligi; alternatif okumalar text_expression satirlaridir.';
COMMENT ON TABLE entity_name IS 'Kaynakli, tarihli, cok dilli resmi, tarihi, yerel ve alternatif ad kullanimi.';
COMMENT ON TABLE entity_identifier IS 'Envanter, katalog, raf, arsiv, muze ve harici sistem tanimlayicisi.';
COMMENT ON TABLE classification_assignment IS 'Her anchor turune ortak, kaynakli ve tarihli kategori/sinif atamasi.';
COMMENT ON TABLE entity_relation IS 'Butun anchor turleri arasinda tarihli, rollu, kesinlikli ve FK-guvenli genel iliski.';
COMMENT ON COLUMN entity_relation.subject_anchor_id IS 'Iliskinin kaynak/ozne ucu; record_anchor foreign keyidir.';
COMMENT ON COLUMN entity_relation.object_anchor_id IS 'Iliskinin hedef/nesne ucu; record_anchor foreign keyidir.';
COMMENT ON TABLE event_participation IS 'Olaya katilan kisi, kurum, varlik veya yer ile olay rolunu baglar.';
COMMENT ON TABLE temporal_phase IS 'Islev, kullanim, statu, ikamet, mulkiyet, custody ve organizasyon-site kullanim evresi.';
COMMENT ON TABLE geometry_assertion IS 'Guncel, tarihi, tahmini, onerilen veya yeniden kurulmus PostGIS geometrisi.';
COMMENT ON COLUMN geometry_assertion.geometry IS 'Canonical EPSG:4326 geometri; kaynak SRID source_srid alaninda korunur.';
COMMENT ON TABLE address_assignment IS 'Bir hedefin kaynakli ve tarihli adres/yerellik atamasi.';
COMMENT ON TABLE measurement IS 'Kaynak, tarih, yontem, birim ve ozgun ifade tasiyan olcum kaydi.';
COMMENT ON TABLE observation IS 'Durum, hasar, risk, teknik gozlem ve bilimsel analiz sonucunun ortak kaydi.';
COMMENT ON TABLE material_usage IS 'Hedefte kullanilan malzeme kavramini, rolu, miktari ve fiziksel lotu baglar.';
COMMENT ON TABLE technique_assignment IS 'Yapim, bezeme, uretim veya onarim tekniginin kaynakli hedef atamasi.';
COMMENT ON TABLE text_expression IS 'Kitabenin diplomatik okuma, transkripsiyon, transliterasyon veya ceviri surumu.';
COMMENT ON TABLE assertion IS 'Kaynakli, kesinlikli ve tek tip deger/hedef tasiyan; celiskili alternatifleri koruyan iddia.';
COMMENT ON COLUMN assertion.value_kind IS 'Anchor, concept, text, number, boolean veya date_range dallarindan tam birini secer.';
COMMENT ON TABLE evidence IS 'Bir assertioni destekleyen, curuten veya sinirlayan atif, kayit ya da gozlem bagi.';
COMMENT ON TABLE intervention IS 'Mudahale onerisi, resmi karar ve gerceklesmis eylemi ayni semantikte fakat ayri asamayla tutar.';
COMMENT ON TABLE entity_profile IS 'Seyrek konu ayrintilari icin surumlu ve harici JSON Schema ile dogrulanan JSONB uzantisi.';
COMMENT ON TABLE edit_submission IS 'Kullanicinin JSON yuklemesi veya duzeltme onerisi ile editor kararini saklayan kuyruk.';
COMMENT ON TABLE audit_log IS 'Domain tablolarindaki ekleme, degistirme ve silme islemlerinin web kullanicisi ve istek kimligiyle satir bazli denetim izi.';
COMMENT ON COLUMN audit_log.changed_by_user_id IS 'Backend km.application_user_id transaction ayarini verirse islemi yapan web kullanicisi.';
COMMENT ON COLUMN audit_log.request_id IS 'Ayni HTTP/API isteginde yapilan birden fazla degisikligi birlikte izlemek icin korelasyon kimligi.';

COMMIT;
