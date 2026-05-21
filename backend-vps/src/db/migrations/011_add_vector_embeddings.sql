ALTER TABLE user_notes ADD COLUMN embedding F32_BLOB(768);
ALTER TABLE knowledge_base ADD COLUMN embedding F32_BLOB(768);

CREATE INDEX IF NOT EXISTS user_notes_embedding_idx
  ON user_notes(libsql_vector_idx(embedding));

CREATE INDEX IF NOT EXISTS knowledge_base_embedding_idx
  ON knowledge_base(libsql_vector_idx(embedding));
