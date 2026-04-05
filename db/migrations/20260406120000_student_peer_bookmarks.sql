-- migrate:up
CREATE TABLE student_peer_bookmarks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    peer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (student_id, peer_id),
    CHECK (student_id <> peer_id)
);

CREATE INDEX idx_peer_bookmarks_student ON student_peer_bookmarks(student_id);
CREATE INDEX idx_peer_bookmarks_peer ON student_peer_bookmarks(peer_id);

-- migrate:down
DROP TABLE IF EXISTS student_peer_bookmarks;
