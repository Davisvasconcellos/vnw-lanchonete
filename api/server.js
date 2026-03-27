require('dotenv').config()

const express = require('express')
const cors = require('cors')
const { Pool } = require('pg')

const app = express()

app.use(cors())
app.use(express.json())

// =============================
// SERVER
// =============================
const PORT = process.env.PORT || 3000



// =============================
// DB CONNECTION (Render-safe)
// =============================
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DB_SSL === 'true'
    ? { rejectUnauthorized: false }
    : false
})

// teste rápido de conexão
pool.connect()
  .then(() => console.log('🟢 PostgreSQL conectado'))
  .catch(err => console.error('🔴 Erro DB:', err))

// =============================
// ROUTES
// =============================

// 🔹 GET / (Health Check)
app.get('/', (req, res) => {
  res.json({ status: 'online' });
});

// 🔹 GET /produtos
app.get('/produtos', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        p.id,
        c.nome AS categoria,
        p.nome,
        p.descricao,
        p.preco,
        p.disponivel,
        p.imagem_url
      FROM produtos p
      JOIN categorias c ON p.categoria_id = c.id
      ORDER BY c.nome, p.nome
    `)

    res.json(result.rows)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// 🔹 GET /clientes
app.get('/clientes', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, nome, telefone, email, endereco, data_cadastro
      FROM clientes
      ORDER BY nome
    `)

    res.json(result.rows)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// 🔹 POST /clientes
app.post('/clientes', async (req, res) => {
  const { nome, telefone, email, endereco } = req.body

  try {
    const result = await pool.query(`
      INSERT INTO clientes (nome, telefone, email, endereco)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `, [nome, telefone, email, endereco])

    res.status(201).json(result.rows[0])
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// 🔹 POST /produtos
app.post('/produtos', async (req, res) => {
  const { categoria_id, nome, descricao, preco, disponivel } = req.body

  try {
    const result = await pool.query(`
      INSERT INTO produtos (categoria_id, nome, descricao, preco, disponivel)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [categoria_id, nome, descricao, preco, disponivel])

    res.status(201).json(result.rows[0])
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// 🔹 GET /pedidos (com itens agregados)
app.get('/pedidos', async (req, res) => {
  try {
    const result = await pool.query(`
SELECT 
  p.id,
  p.data_pedido,
  COALESCE(c.nome, 'Cliente Balcão') AS cliente,
  p.tipo,
  p.status,
  p.total,
  STRING_AGG(
    pr.nome || ' (x' || ip.quantidade || ')',
    ', '
  ) AS itens
FROM pedidos p
LEFT JOIN clientes c ON p.cliente_id = c.id
LEFT JOIN itens_pedido ip ON p.id = ip.pedido_id
LEFT JOIN produtos pr ON ip.produto_id = pr.id
GROUP BY p.id, p.status, c.nome
ORDER BY
  CASE p.status
    WHEN 'pendente' THEN 1
    WHEN 'em_preparo' THEN 2
    WHEN 'pronto' THEN 3
    WHEN 'entregue' THEN 4
    WHEN 'cancelado' THEN 5
    WHEN 'finalizado' THEN 6 
    ELSE 99
  END,
  p.data_pedido DESC,
  p.id ASC;
    `)

    res.json(result.rows)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// 🔹 PATCH /pedidos/:id/status
app.patch('/pedidos/:id/status', async (req, res) => {
  const { id } = req.params
  const { status } = req.body

  try {
    const result = await pool.query(`
      UPDATE pedidos
      SET status = $1
      WHERE id = $2
      RETURNING *
    `, [status, id])

    res.json(result.rows[0])
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// 🔹 POST /pedidos (criar um novo pedido)
app.post('/pedidos', async (req, res) => {
  const { cliente_id, itens, observacao } = req.body; // itens = [{ produto_id: 1, quantidade: 2 }, ...]

  if (!itens || itens.length === 0) {
    return res.status(400).json({ error: 'O pedido precisa ter pelo menos um item.' });
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 1. Pega os preços dos produtos do banco de dados para segurança
    const productIds = itens.map(item => item.produto_id);
    const pricesResult = await client.query('SELECT id, preco FROM produtos WHERE id = ANY($1::int[])', [productIds]);
    
    const priceMap = pricesResult.rows.reduce((map, product) => {
      map[product.id] = parseFloat(product.preco);
      return map;
    }, {});

    // 2. Calcula o total do pedido no backend
    const total = itens.reduce((sum, item) => {
      return sum + (priceMap[item.produto_id] || 0) * item.quantidade;
    }, 0);

    // 3. Insere na tabela 'pedidos'
    const pedidoResult = await client.query(
      'INSERT INTO pedidos (cliente_id, observacao, total) VALUES ($1, $2, $3) RETURNING id, status, data_pedido',
      [cliente_id === 0 ? null : cliente_id, observacao, total]
    );
    const newPedido = pedidoResult.rows[0];

    // 4. Insere cada item na tabela 'itens_pedido'
    const itensValues = itens.map(item => 
      `(${newPedido.id}, ${item.produto_id}, ${item.quantidade}, ${priceMap[item.produto_id]})`
    ).join(',');

    await client.query(
      `INSERT INTO itens_pedido (pedido_id, produto_id, quantidade, preco_unitario) VALUES ${itensValues}`
    );

    await client.query('COMMIT');

    res.status(201).json(newPedido);

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Erro ao criar pedido:', error);
    res.status(500).json({ error: 'Falha ao criar o pedido.' });
  } finally {
    client.release();
  }
});


// ========== LISTAGENS / RELATÓRIOS ==========

// 1) listar todos os pedidos com nome do cliente
app.get('/consultas/pedidos', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        p.id AS pedido_id,
        p.data_pedido,
        COALESCE(c.nome, 'Cliente Balcão') AS cliente,
        p.tipo,
        p.status,
        p.total
      FROM pedidos p
      LEFT JOIN clientes c ON p.cliente_id = c.id
      ORDER BY p.data_pedido DESC;
    `)
    res.json(result.rows)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// 1.b) histórico de um cliente
app.get('/consultas/historico-cliente/:cliente_id', async (req, res) => {
  const { cliente_id } = req.params
  try {
    const result = await pool.query(`
      SELECT 
        p.id, 
        p.data_pedido, 
        p.status, 
        p.total,
        STRING_AGG(pr.nome, ', ') AS itens
      FROM pedidos p
      LEFT JOIN itens_pedido ip ON p.id = ip.pedido_id
      LEFT JOIN produtos pr ON ip.produto_id = pr.id
      WHERE p.cliente_id = $1
      GROUP BY p.id
      ORDER BY p.data_pedido DESC;
    `, [cliente_id])
    res.json(result.rows)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// 1.c) detalhe completo de um pedido com itens resumidos (ex: para UI de detalhe)
app.get('/consultas/pedido-resumido/:pedido_id', async (req, res) => {
  const { pedido_id } = req.params
  try {
    const result = await pool.query(`
      SELECT 
        p.id AS pedido_id,
        p.data_pedido,
        COALESCE(c.nome, 'Cliente Balcão') AS cliente_nome,
        c.telefone,
        c.email,
        c.endereco,
        p.tipo,
        p.status,
        p.observacao,
        p.total,
        STRING_AGG(pr.nome || ' (x' || ip.quantidade || ' - R$' || ip.preco_unitario || ')', ', ') AS itens
      FROM pedidos p
      LEFT JOIN clientes c ON p.cliente_id = c.id
      LEFT JOIN itens_pedido ip ON p.id = ip.pedido_id
      LEFT JOIN produtos pr ON ip.produto_id = pr.id
      WHERE p.id = $1
      GROUP BY p.id, c.nome, c.endereco,c.telefone,c.email
    `, [pedido_id])
    res.json(result.rows)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// 2) detalhe completo de um pedido (itens e subtotal por item)
app.get('/consultas/pedido-detalhe/:pedido_id', async (req, res) => {
  const { pedido_id } = req.params
  try {
    const result = await pool.query(`
      SELECT 
        pr.nome AS produto,
        pr.imagem_url,
        ip.preco_unitario,
        (ip.quantidade * ip.preco_unitario) AS subtotal
      FROM itens_pedido ip
      JOIN produtos pr ON ip.produto_id = pr.id
      WHERE ip.pedido_id = $1;
    `, [pedido_id])
    res.json(result.rows)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// 3) total de vendas por status
app.get('/consultas/vendas-por-status', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        status,
        COUNT(*) AS quantidade,
        SUM(total) AS valor_total
      FROM pedidos 
      GROUP BY status
      ORDER BY 
        CASE status 
            WHEN 'pendente' THEN 1
            WHEN 'em_preparo' THEN 2
            WHEN 'pronto' THEN 3
            WHEN 'entregue' THEN 4
            WHEN 'cancelado' THEN 5
        END;
    `)
    res.json(result.rows)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// 4) produtos mais vendidos
app.get('/consultas/produtos-mais-vendidos', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        pr.nome,
        pr.imagem_url,
        SUM(ip.quantidade) AS quantidade_vendida,
        SUM(ip.quantidade * ip.preco_unitario) AS valor_total_vendido
      FROM itens_pedido ip
      JOIN produtos pr ON ip.produto_id = pr.id
      GROUP BY pr.nome, pr.imagem_url
      ORDER BY quantidade_vendida DESC;
    `)
    res.json(result.rows)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// 5) vendas do dia
app.get('/consultas/vendas-hoje', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        COUNT(*) AS total_pedidos,
        SUM(total) AS faturamento_dia
      FROM pedidos
      WHERE DATE(data_pedido) = CURRENT_DATE;
    `)
    res.json(result.rows[0] || { total_pedidos: 0, faturamento_dia: 0 })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// 6) top 10 produtos mais vendidos
app.get('/consultas/top10-produtos', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        pr.nome,
        SUM(ip.quantidade) AS quantidade_vendida,
        SUM(ip.quantidade * ip.preco_unitario) AS valor_total
      FROM itens_pedido ip
      JOIN produtos pr ON ip.produto_id = pr.id
      GROUP BY pr.nome
      ORDER BY quantidade_vendida DESC
      LIMIT 10;
    `)
    res.json(result.rows)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// 7) lista de produtos com categoria
app.get('/consultas/produtos', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        p.id,
        c.nome AS categoria,
        p.nome,
        p.descricao,
        p.preco,
        p.disponivel,
        p.imagem_url
      FROM produtos p
      JOIN categorias c ON p.categoria_id = c.id
      ORDER BY c.nome, p.nome;
    `)
    res.json(result.rows)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// 8) lista de clientes
app.get('/consultas/clientes', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        id,
        nome,
        telefone,
        email,
        endereco,
        data_cadastro
      FROM clientes
      ORDER BY nome;
    `)
    res.json(result.rows)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})














app.listen(PORT, () => {
  console.log(`🚀 API rodando em http://localhost:${PORT}`)
})