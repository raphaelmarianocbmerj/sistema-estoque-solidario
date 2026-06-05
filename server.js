const express = require('express');
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const path = require('path');

const app = express();
app.use(express.json());

// Pega a pasta atual onde o usuário deu o duplo clique no .exe
const diretorioAtual = process.cwd();

// Serve os arquivos da pasta "public"
app.use(express.static(path.join(diretorioAtual, 'public')));

let db;

// Inicialização Automática do Banco SQLite
(async () => {
    try {
        db = await open({
            filename: path.join(diretorioAtual, 'banco_estoque.sqlite'),
            driver: sqlite3.Database
        });

        // Criar as tabelas
        await db.exec(`
            CREATE TABLE IF NOT EXISTS Doador (
                id_doador INTEGER PRIMARY KEY AUTOINCREMENT,
                nome TEXT NOT NULL,
                telefone TEXT,
                data_cadastro DATE DEFAULT CURRENT_DATE
            );
            CREATE TABLE IF NOT EXISTS Categoria (
                id_categoria INTEGER PRIMARY KEY AUTOINCREMENT,
                nome_categoria TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS Doacao_Estoque (
                id_doacao INTEGER PRIMARY KEY AUTOINCREMENT,
                descricao_item TEXT NOT NULL,
                quantidade INTEGER NOT NULL,
                tipo_medida TEXT NOT NULL,
                data_entrada DATE DEFAULT CURRENT_DATE,
                id_doador INTEGER,
                id_categoria INTEGER,
                FOREIGN KEY (id_doador) REFERENCES Doador(id_doador),
                FOREIGN KEY (id_categoria) REFERENCES Categoria(id_categoria)
            );
        `);

        // Inserir categorias base se a tabela estiver vazia
        const catCount = await db.get('SELECT COUNT(*) as count FROM Categoria');
        if (catCount.count === 0) {
            await db.exec(`
                INSERT INTO Categoria (nome_categoria) VALUES 
                ('Alimentos Não Perecíveis'), 
                ('Vestuário e Calçados'), 
                ('Higiene e Limpeza');
            `);
        }
        console.log('✅ Banco de dados SQLite pronto a utilizar na pasta local!');
    } catch (error) {
        console.error('❌ Erro ao iniciar o banco de dados:', error);
    }
})();

// === ROTAS DA API ===

app.get('/api/categorias', async (req, res) => {
    const rows = await db.all('SELECT * FROM Categoria ORDER BY nome_categoria');
    res.json(rows);
});

app.get('/api/doadores', async (req, res) => {
    const rows = await db.all('SELECT * FROM Doador ORDER BY nome');
    res.json(rows);
});

app.post('/api/doadores', async (req, res) => {
    const { nome, telefone } = req.body;
    const result = await db.run('INSERT INTO Doador (nome, telefone) VALUES (?, ?)', [nome, telefone]);
    res.status(201).json({ id_doador: result.lastID });
});

app.post('/api/doacoes', async (req, res) => {
    const { descricao, quantidade, tipoMedida, idDoador, idCategoria } = req.body;
    await db.run(
        'INSERT INTO Doacao_Estoque (descricao_item, quantidade, tipo_medida, id_doador, id_categoria) VALUES (?, ?, ?, ?, ?)',
        [descricao, quantidade, tipoMedida, idDoador, idCategoria]
    );
    res.status(201).send('Doação registrada com sucesso!');
});

app.get('/api/estoque', async (req, res) => {
    const sql = `
        SELECT d.id_doacao, d.descricao_item, d.quantidade, d.tipo_medida, 
               c.nome_categoria, doa.nome as nome_doador 
        FROM Doacao_Estoque d
        JOIN Categoria c ON d.id_categoria = c.id_categoria
        JOIN Doador doa ON d.id_doador = doa.id_doador
        ORDER BY d.id_doacao DESC
    `;
    const rows = await db.all(sql);
    res.json(rows);
});

// Ligar o Servidor
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`🚀 Sistema rodando na porta ${PORT}! Abrindo navegador...`);
    // Abre o navegador automaticamente
    require('child_process').exec(`start http://localhost:${PORT}`);
});