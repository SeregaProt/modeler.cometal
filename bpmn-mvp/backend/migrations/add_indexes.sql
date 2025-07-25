-- Добавление индексов для оптимизации производительности базы данных

-- Индексы для таблицы users
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_email_role ON users(email, role);

-- Индексы для таблицы projects
CREATE INDEX IF NOT EXISTS idx_projects_created_by ON projects(created_by);
CREATE INDEX IF NOT EXISTS idx_projects_created_at ON projects(created_at);
CREATE INDEX IF NOT EXISTS idx_projects_name ON projects(name);

-- Индексы для таблицы project_users
CREATE INDEX IF NOT EXISTS idx_project_users_project_id ON project_users(project_id);
CREATE INDEX IF NOT EXISTS idx_project_users_user_id ON project_users(user_id);
CREATE INDEX IF NOT EXISTS idx_project_users_project_user ON project_users(project_id, user_id);
CREATE INDEX IF NOT EXISTS idx_project_users_role ON project_users(role);

-- Индексы для таблицы processes
CREATE INDEX IF NOT EXISTS idx_processes_project_id ON processes(project_id);
CREATE INDEX IF NOT EXISTS idx_processes_updated_at ON processes(updated_at);
CREATE INDEX IF NOT EXISTS idx_processes_name ON processes(name);
CREATE INDEX IF NOT EXISTS idx_processes_author ON processes(author);
CREATE INDEX IF NOT EXISTS idx_processes_project_updated ON processes(project_id, updated_at);

-- Составные индексы для часто используемых запросов
CREATE INDEX IF NOT EXISTS idx_projects_created_by_date ON projects(created_by, created_at);
CREATE INDEX IF NOT EXISTS idx_processes_project_name ON processes(project_id, name);

-- Индекс для полнотекстового поиска (если поддерживается)
-- CREATE INDEX IF NOT EXISTS idx_processes_name_fts ON processes(name);
-- CREATE INDEX IF NOT EXISTS idx_projects_name_fts ON projects(name);