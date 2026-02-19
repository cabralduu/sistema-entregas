const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const app = express();

app.use(express.json());
app.use(express.static("public"));

// ============================================================
// BANCO DE DADOS — com WAL mode e índices para performance
// ============================================================
const db = new sqlite3.Database("./database.db");

db.run("PRAGMA journal_mode=WAL");
db.run("PRAGMA cache_size=10000");

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS entregas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      cliente TEXT NOT NULL,
      endereco TEXT NOT NULL,
      status TEXT DEFAULT 'pendente',
      motorista TEXT,
      criado_em DATETIME DEFAULT (datetime('now', 'localtime')),
      atualizado_em DATETIME DEFAULT (datetime('now', 'localtime'))
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS motoristas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT UNIQUE NOT NULL,
      senha TEXT NOT NULL
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS admins (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      usuario TEXT UNIQUE NOT NULL,
      senha TEXT NOT NULL
    )
  `);

  // Índices para acelerar consultas frequentes
  db.run(`CREATE INDEX IF NOT EXISTS idx_entregas_status ON entregas(status)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_entregas_motorista ON entregas(motorista)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_entregas_criado ON entregas(criado_em)`);

  db.run(`INSERT OR IGNORE INTO admins (usuario, senha) VALUES ('admin', '1234')`);
});

// ============================================================
// HELPER — paginação
// ============================================================
function getPaginacao(query) {
  const pagina = Math.max(1, parseInt(query.pagina) || 1);
  const limite = Math.min(100, Math.max(1, parseInt(query.limite) || 20));
  const offset = (pagina - 1) * limite;
  return { pagina, limite, offset };
}

// ============================================================
// ROTAS — ENTREGAS
// ============================================================

// GET /entregas — lista com paginação e filtro
app.get("/entregas", (req, res) => {
  const { motorista, status } = req.query;
  const { pagina, limite, offset } = getPaginacao(req.query);

  let sql, params;

  if (motorista === "admin") {
    if (status && status !== "todas") {
      sql = `SELECT * FROM entregas WHERE status = ? ORDER BY criado_em DESC LIMIT ? OFFSET ?`;
      params = [status, limite, offset];
    } else {
      sql = `SELECT * FROM entregas ORDER BY criado_em DESC LIMIT ? OFFSET ?`;
      params = [limite, offset];
    }
  } else if (motorista) {
    sql = `SELECT * FROM entregas WHERE status = 'pendente' OR motorista = ? ORDER BY criado_em DESC LIMIT ? OFFSET ?`;
    params = [motorista, limite, offset];
  } else {
    return res.status(400).json({ erro: "Parâmetro 'motorista' obrigatório" });
  }

  db.all(sql, params, (err, rows) => {
    if (err) return res.status(500).json({ erro: "Erro ao buscar entregas" });
    res.json({ data: rows, pagina, limite });
  });
});

// POST /entregas — cria entrega com validação
app.post("/entregas", (req, res) => {
  const { cliente, endereco } = req.body;

  if (!cliente || cliente.trim().length === 0)
    return res.status(400).json({ erro: "Campo 'cliente' é obrigatório" });
  if (!endereco || endereco.trim().length === 0)
    return res.status(400).json({ erro: "Campo 'endereco' é obrigatório" });

  db.run(
    "INSERT INTO entregas (cliente, endereco) VALUES (?, ?)",
    [cliente.trim(), endereco.trim()],
    function (err) {
      if (err) return res.status(500).json({ erro: "Erro ao criar entrega" });
      res.status(201).json({ id: this.lastID, sucesso: true });
    }
  );
});

// PUT /entregas/:id/coletar — verifica se ainda está pendente
app.put("/entregas/:id/coletar", (req, res) => {
  const id = parseInt(req.params.id);
  const { motorista } = req.body;

  if (isNaN(id)) return res.status(400).json({ erro: "ID inválido" });
  if (!motorista) return res.status(400).json({ erro: "Campo 'motorista' obrigatório" });

  db.get("SELECT status FROM entregas WHERE id = ?", [id], (err, row) => {
    if (err) return res.status(500).json({ erro: "Erro ao verificar entrega" });
    if (!row) return res.status(404).json({ erro: "Entrega não encontrada" });
    if (row.status !== "pendente")
      return res.status(409).json({ erro: "Esta entrega já foi coletada por outro motorista" });

    db.run(
      "UPDATE entregas SET status = 'coletada', motorista = ?, atualizado_em = datetime('now','localtime') WHERE id = ?",
      [motorista.trim(), id],
      (err) => {
        if (err) return res.status(500).json({ erro: "Erro ao coletar entrega" });
        res.json({ sucesso: true });
      }
    );
  });
});

// PUT /entregas/:id/finalizar
app.put("/entregas/:id/finalizar", (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ erro: "ID inválido" });

  db.run(
    "UPDATE entregas SET status = 'finalizada', atualizado_em = datetime('now','localtime') WHERE id = ?",
    [id],
    function (err) {
      if (err) return res.status(500).json({ erro: "Erro ao finalizar entrega" });
      if (this.changes === 0) return res.status(404).json({ erro: "Entrega não encontrada" });
      res.json({ sucesso: true });
    }
  );
});

// DELETE /entregas/:id
app.delete("/entregas/:id", (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ erro: "ID inválido" });

  db.run("DELETE FROM entregas WHERE id = ?", [id], function (err) {
    if (err) return res.status(500).json({ erro: "Erro ao excluir entrega" });
    if (this.changes === 0) return res.status(404).json({ erro: "Entrega não encontrada" });
    res.json({ sucesso: true });
  });
});

// GET /stats — estatísticas para o painel admin (NOVO)
app.get("/stats", (req, res) => {
  db.get(
    `SELECT 
      COUNT(*) as total,
      SUM(CASE WHEN status = 'pendente' THEN 1 ELSE 0 END) as pendentes,
      SUM(CASE WHEN status = 'coletada' THEN 1 ELSE 0 END) as coletadas,
      SUM(CASE WHEN status = 'finalizada' THEN 1 ELSE 0 END) as finalizadas
    FROM entregas`,
    [],
    (err, row) => {
      if (err) return res.status(500).json({ erro: "Erro ao buscar estatísticas" });
      res.json(row);
    }
  );
});

// ============================================================
// ROTAS — AUTH
// ============================================================

app.post("/login", (req, res) => {
  const { nome, senha } = req.body;
  if (!nome || !senha) return res.status(400).json({ erro: "Preencha todos os campos" });

  db.get(
    "SELECT * FROM motoristas WHERE nome = ? AND senha = ?",
    [nome.trim(), senha],
    (err, row) => {
      if (err) return res.status(500).json({ erro: "Erro no servidor" });
      if (!row) return res.status(401).json({ erro: "Usuário ou senha inválidos" });
      res.json({ sucesso: true, nome: row.nome });
    }
  );
});

app.post("/login-admin", (req, res) => {
  const { usuario, senha } = req.body;
  if (!usuario || !senha) return res.status(400).json({ erro: "Preencha todos os campos" });

  db.get(
    "SELECT * FROM admins WHERE usuario = ? AND senha = ?",
    [usuario.trim(), senha],
    (err, row) => {
      if (err) return res.status(500).json({ erro: "Erro no servidor" });
      if (!row) return res.status(401).json({ erro: "Usuário ou senha inválidos" });
      res.json({ sucesso: true });
    }
  );
});

app.post("/cadastro", (req, res) => {
  const { nome, senha } = req.body;

  if (!nome || nome.trim().length < 2)
    return res.status(400).json({ erro: "Nome deve ter pelo menos 2 caracteres" });
  if (!senha || senha.length < 4)
    return res.status(400).json({ erro: "Senha deve ter pelo menos 4 caracteres" });

  db.get("SELECT id FROM motoristas WHERE nome = ?", [nome.trim()], (err, row) => {
    if (err) return res.status(500).json({ erro: "Erro no servidor" });
    if (row) return res.status(409).json({ erro: "Nome já cadastrado" });

    db.run(
      "INSERT INTO motoristas (nome, senha) VALUES (?, ?)",
      [nome.trim(), senha],
      function (err) {
        if (err) return res.status(500).json({ erro: "Erro ao cadastrar motorista" });
        res.status(201).json({ sucesso: true });
      }
    );
  });
});

// GET /motoristas — lista motoristas para o admin
app.get("/motoristas", (req, res) => {
  db.all("SELECT id, nome FROM motoristas ORDER BY nome", [], (err, rows) => {
    if (err) return res.status(500).json({ erro: "Erro ao buscar motoristas" });
    res.json(rows);
  });
});

// DELETE /motoristas/:id — exclui motorista
app.delete("/motoristas/:id", (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ erro: "ID inválido" });

  db.run("DELETE FROM motoristas WHERE id = ?", [id], function (err) {
    if (err) return res.status(500).json({ erro: "Erro ao excluir motorista" });
    if (this.changes === 0) return res.status(404).json({ erro: "Motorista não encontrado" });
    res.json({ sucesso: true });
  });
});

// ============================================================
// TRATAMENTO DE ERROS
// ============================================================
app.use((req, res) => res.status(404).json({ erro: "Rota não encontrada" }));

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ erro: "Erro interno do servidor" });
});

// ============================================================
// START
// ============================================================
const PORT = process.env.PORT || 3000;

// Só sobe o servidor se não estiver em modo de teste
if (process.env.NODE_ENV !== "test") {
  app.listen(PORT, () => {
    console.log(`✅ Servidor rodando na porta ${PORT}`);
  });
}

module.exports = app;
